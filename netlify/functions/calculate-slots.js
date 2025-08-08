// This is a Netlify serverless function.
// It is designed to be triggered by an HTTP request,
// likely from a service like Make.com.

// A helper function to format a Date object into a string like "9am" or "9:30am".
// This is used to create the comparison strings for our slots.
const formatTime = (date) => {
  let hours = date.getHours();
  let minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'

  // If minutes is 0, just return the hour and am/pm. Otherwise, add the minutes.
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
    // Define the full list of all possible 30-minute time slots for the day, from 9am to 6pm.
    const allSlots = [
      '9am to 9:30am',
      '9:30am to 10am',
      '10am to 10:30am',
      '10:30am to 11am',
      '11am to 11:30am',
      '11:30am to 12pm',
      '12pm to 12:30pm',
      '12:30pm to 1pm',
      '1pm to 1:30pm',
      '1:30pm to 2pm',
      '2pm to 2:30pm',
      '2:30pm to 3pm',
      '3pm to 3:30pm',
      '3:30pm to 4pm',
      '4pm to 4:30pm',
      '4:30pm to 5pm',
      '5pm to 5:30pm',
      '5:30pm to 6pm'
    ];

    let rawBusySlots = [];
    
    // CONDITION: The body is empty or invalid.
    // This check prevents errors if no data is sent from Make.com.
    if (event.body) {
      // The incoming data from Make.com is a JSON string.
      // We now assume the body is the calendar body object directly, not an array.
      const body = JSON.parse(event.body);

      // Get the busy array, which is nested inside the 'calendars' object.
      // We assume the email address key is 'haseebinfo607@gmail.com' based on your example.
      // CONDITION: The 'busy' array exists but is empty.
      // If the 'busy' array is not found, an empty array is used as a fallback.
      rawBusySlots = body.calendars['haseebinfo607@gmail.com'].busy || [];
    }
    
    // CONDITION: Handling busy slots of any length (e.g., 10 minutes, 1 hour, etc.).
    // We convert each busy slot into one or more 30-minute intervals
    // that match the format of our 'allSlots' array.
    const busySlots = [];
    rawBusySlots.forEach(slot => {
      let current = new Date(slot.start);
      const end = new Date(slot.end);

      // Loop in 30-minute increments from the start time until we reach the end time.
      while (current.getTime() < end.getTime()) {
        const next = new Date(current.getTime() + 30 * 60000); // Add 30 minutes in milliseconds
        // Format the 30-minute interval and add it to our busySlots array.
        busySlots.push(`${formatTime(current)} to ${formatTime(next)}`);
        current = next;
      }
    });

    let availableSlots = [];

    // CONDITION: The busy array is empty (no appointments).
    if (busySlots.length === 0) {
      availableSlots = allSlots;
    } else {
      // CONDITION: There are one or more busy slots.
      // We filter the 'allSlots' array to find the ones that are NOT in the 'busySlots' array.
      // We use a Set for faster lookups.
      const busySet = new Set(busySlots);
      availableSlots = allSlots.filter(slot => !busySet.has(slot));
    }

    // Now, we need to format the final output string as requested.
    let resultMessage = "These are the available time slots ";

    // Handle different numbers of available slots for correct grammar.
    // CONDITION: No available slots.
    if (availableSlots.length === 0) {
      resultMessage = "There are no available time slots.";
    } else if (availableSlots.length === 1) {
      // CONDITION: Exactly one available slot.
      resultMessage += availableSlots[0];
    } else {
      // CONDITION: More than one available slot.
      // For more than one slot, join with commas, and use ' and ' for the last one.
      const lastSlot = availableSlots.pop();
      resultMessage += availableSlots.join(', ') + ' and ' + lastSlot;
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
