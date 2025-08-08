// This is a Netlify serverless function.
// It is designed to be triggered by an HTTP request,
// likely from a service like Make.com.

// Helper function to convert a Date object into a numerical representation (e.g., 9:30 becomes 930)
// This is crucial for avoiding time zone issues and making comparisons reliable.
const getNumericalTime = (date) => {
  return date.getHours() * 100 + date.getMinutes();
};

// Helper function to format a numerical time (e.g., 930) back into a string ("9:30am")
// This is used for the final output string.
const formatNumericalTime = (num) => {
  const hours = Math.floor(num / 100);
  const minutes = num % 100;
  const ampm = hours >= 12 ? 'pm' : 'am';
  let formattedHours = hours % 12;
  formattedHours = formattedHours ? formattedHours : 12; // The hour '0' should be '12'

  if (minutes === 0) {
    return `${formattedHours}${ampm}`;
  } else {
    return `${formattedHours}:${minutes < 10 ? '0' + minutes : minutes}${ampm}`;
  }
};

// The handler function is the main entry point for the function.
// It receives the event (the incoming request) and the context.
exports.handler = async (event, context) => {
  // Use a try-catch block for robust error handling.
  try {
    // Define the full list of all possible 30-minute time slots for the day,
    // from 9am to 6pm, as numerical representations.
    const allSlots = [
      '9:00', '9:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
    ];

    let rawBusySlots = [];
    
    // Check if the event body exists and is not an empty string before parsing.
    if (event.body) {
      const body = JSON.parse(event.body);
      rawBusySlots = body.calendars['haseebinfo607@gmail.com'].busy || [];
    }
    
    // This is for debugging purposes. It will log the raw busy slots received.
    console.log('Raw Busy Slots:', JSON.stringify(rawBusySlots));
    
    // We convert each busy slot into one or more 30-minute intervals
    // that match the format of our 'allSlots' array.
    const busySlots = [];
    rawBusySlots.forEach(slot => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);

      // Loop in 30-minute increments from the start time until we reach the end time.
      let current = start;
      while (current.getTime() < end.getTime()) {
        const next = new Date(current.getTime() + 30 * 60000); // Add 30 minutes in milliseconds
        
        // We format the intervals using a consistent time zone. UTC is a good choice.
        const startString = `${current.getUTCHours()}:${current.getUTCMinutes() < 10 ? '0' + current.getUTCMinutes() : current.getUTCMinutes()}`;
        const endString = `${next.getUTCHours()}:${next.getUTCMinutes() < 10 ? '0' + next.getUTCMinutes() : next.getUTCMinutes()}`;

        // Check if the formatted busy slot overlaps with any of our hardcoded slots.
        const busyStartHour = current.getHours();
        const busyStartMinute = current.getMinutes();
        const busyEndHour = next.getHours();
        const busyEndMinute = next.getMinutes();

        // Convert the busy time to a string that matches our allSlots array.
        // This is the core fix for the time zone mismatch.
        const formattedBusySlot = `${busyStartHour}:${busyStartMinute < 10 ? '0' + busyStartMinute : busyStartMinute}`;

        if (allSlots.includes(formattedBusySlot)) {
            busySlots.push(formattedBusySlot);
        }
        
        current = next;
      }
    });

    let availableSlots = [];

    // Case 1: The busy array is empty.
    if (busySlots.length === 0) {
      availableSlots = allSlots;
    } else {
      // Case 2: There are busy slots.
      // We filter the 'allSlots' array to find the ones that are NOT in the 'busySlots' array.
      // We use a Set for faster lookups.
      const busySet = new Set(busySlots);
      availableSlots = allSlots.filter(slot => !busySet.has(slot));
    }

    // Now, we need to format the final output string as requested.
    let resultMessage = "These are the available time slots ";

    // Handle different numbers of available slots for correct grammar.
    if (availableSlots.length === 0) {
      resultMessage = "There are no available time slots.";
    } else if (availableSlots.length === 1) {
      resultMessage += `${formatNumericalTime(parseInt(availableSlots[0].replace(':', '')))} to ${formatNumericalTime(parseInt(availableSlots[0].replace(':', '')) + 30)}`;
    } else {
      // For more than one slot, join with commas, and use ' and ' for the last one.
      const formattedAvailableSlots = availableSlots.map((slot, index) => {
        const startTime = parseInt(slot.replace(':', ''));
        const endTime = startTime + 30;
        return `${formatNumericalTime(startTime)} to ${formatNumericalTime(endTime)}`;
      });
      const lastSlot = formattedAvailableSlots.pop();
      resultMessage += formattedAvailableSlots.join(', ') + ' and ' + lastSlot;
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
