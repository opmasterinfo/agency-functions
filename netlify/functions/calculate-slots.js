// This is a Netlify serverless function.
// It is designed to be triggered by an HTTP request,
// likely from a service like Make.com.

// Helper function to format a Date object into a string like "9am" or "1:30pm".
// This is used for the final output string.
const formatTime = (date) => {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'

  if (minutes === 0) {
    return `${hours}${ampm}`;
  } else {
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes}${ampm}`;
  }
};

// The handler function is the main entry point for the function.
// It receives the event (the incoming request) and the context.
exports.handler = async (event, context) => {
  // Use a try-catch block for robust error handling.
  try {
    // Define the full list of all possible 30-minute time slots as Date objects.
    // We use a consistent reference date and then add time to it.
    const referenceDate = new Date('2025-01-01T09:00:00-05:00'); // Use a fixed reference date to avoid issues
    const allSlots = [];
    for (let i = 0; i < 18; i++) { // 18 slots from 9am to 6pm
      const slotStart = new Date(referenceDate.getTime() + i * 30 * 60000);
      allSlots.push(slotStart);
    }

    let rawBusySlots = [];
    
    // Check if the event body exists and is not an empty string before parsing.
    if (event.body) {
      const body = JSON.parse(event.body);
      rawBusySlots = body.calendars['haseebinfo607@gmail.com'].busy || [];
    }
    
    // This is for debugging purposes. It will log the raw busy slots received.
    console.log('Raw Busy Slots:', JSON.stringify(rawBusySlots));
    
    const busySlotTimes = new Set();
    rawBusySlots.forEach(slot => {
      const busyStart = new Date(slot.start);
      const busyEnd = new Date(slot.end);

      // Loop through all 30-minute intervals that the busy slot covers.
      let current = busyStart;
      while (current.getTime() < busyEnd.getTime()) {
        const matchingSlot = allSlots.find(
          (s) => s.getHours() === current.getHours() && s.getMinutes() === current.getMinutes()
        );
        if (matchingSlot) {
          busySlotTimes.add(matchingSlot.getTime());
        }
        current = new Date(current.getTime() + 30 * 60000);
      }
    });

    let availableSlots = allSlots.filter(slot => !busySlotTimes.has(slot.getTime()));
    
    // Now, we need to format the final output string as requested.
    let resultMessage = "These are the available time slots ";

    // Handle different numbers of available slots for correct grammar.
    if (availableSlots.length === 0) {
      resultMessage = "There are no available time slots.";
    } else {
      const formattedAvailableSlots = availableSlots.map((slot) => {
        const startTime = slot;
        const endTime = new Date(slot.getTime() + 30 * 60000);
        return `${formatTime(startTime)} to ${formatTime(endTime)}`;
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
