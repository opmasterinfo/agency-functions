// This is a Netlify serverless function.
// It is designed to be triggered by an HTTP request,
// likely from a service like Make.com.

// Helper function to convert a Date object's hours and minutes into a single number
// representing minutes from midnight in the specified timezone.
const timeToMinutesInTimezone = (date, offsetHours) => {
  // Get the UTC time
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  
  // Apply the timezone offset to get local time in minutes
  let totalMinutes = (utcHours + offsetHours) * 60 + utcMinutes;
  
  // Handle cases where the offset pushes the time into the previous or next day
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60;
  }
  if (totalMinutes >= 24 * 60) {
    totalMinutes -= 24 * 60;
  }
  
  return totalMinutes;
};

// Helper function to convert minutes from midnight back into a formatted time string.
const minutesToTime = (minutes) => {
  let hours = Math.floor(minutes / 60);
  let mins = minutes % 60;
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'

  return `${hours}${mins === 0 ? '' : ':' + (mins < 10 ? '0' + mins : mins)}${ampm}`;
};

// The handler function is the main entry point for the function.
// It receives the event (the incoming request) and the context.
exports.handler = async (event, context) => {
  // Use a try-catch block for robust error handling.
  try {
    // Define the timezone offset from the calendar data.
    const timezoneOffset = -4; // -04:00 from the calendar output
    
    // Define the full list of all possible 30-minute time slots as minutes from midnight
    // in the -04:00 timezone.
    const allSlotsInMinutes = [];
    const startTimeInMinutes = 9 * 60; // 9:00 AM in minutes
    const endTimeInMinutes = 18 * 60; // 6:00 PM in minutes

    for (let time = startTimeInMinutes; time < endTimeInMinutes; time += 30) {
      allSlotsInMinutes.push(time);
    }
    
    let rawBusySlots = [];
    
    // Check if the event body exists and is not an empty string before parsing.
    if (event.body) {
      const body = JSON.parse(event.body);
      rawBusySlots = body.calendars['haseebinfo607@gmail.com'].busy || [];
    }
    
    // This is for debugging purposes. It will log the raw busy slots received.
    console.log('Raw Busy Slots:', JSON.stringify(rawBusySlots));
    
    const busySlotsInMinutes = new Set();
    rawBusySlots.forEach(slot => {
      const busyStart = new Date(slot.start);
      const busyEnd = new Date(slot.end);

      const busyStartMinutes = timeToMinutesInTimezone(busyStart, timezoneOffset);
      const busyEndMinutes = timeToMinutesInTimezone(busyEnd, timezoneOffset);

      // Loop through all 30-minute intervals that the busy slot covers.
      for (let time = busyStartMinutes; time < busyEndMinutes; time += 30) {
        busySlotsInMinutes.add(time);
      }
    });

    let availableSlotsInMinutes = allSlotsInMinutes.filter(
      (slot) => !busySlotsInMinutes.has(slot)
    );
    
    // Now, we need to format the final output string as requested.
    let resultMessage = "These are the available time slots ";

    // Handle different numbers of available slots for correct grammar.
    if (availableSlotsInMinutes.length === 0) {
      resultMessage = "There are no available time slots.";
    } else {
      const formattedAvailableSlots = availableSlotsInMinutes.map((slotTime) => {
        const startTime = minutesToTime(slotTime);
        const endTime = minutesToTime(slotTime + 30);
        return `${startTime} to ${endTime}`;
      });
      
      const lastSlot = formattedAvailableSlots.pop();
      if (formattedAvailableSlots.length > 0) {
        resultMessage += formattedAvailableSlots.join(', ') + ' and ' + lastSlot;
      } else {
        resultMessage += lastSlot;
      }
    }

    // Return the response. The body is the plain text string.
    // The Content-Type header is set to 'text/plain' to ensure it's not treated as JSON.
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
      body: resultMessage,
    };

  } catch (error) {
    // If anything goes wrong, return an error message with a 500 status.
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: 'An error occurred while processing the request.'
    };
  }
};
