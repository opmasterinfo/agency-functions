// calculate-slots.js
exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Hello, World! Your function is working.",
    }),
  };
};
