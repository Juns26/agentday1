// 1. import the GenAI object
const { ai, MODEL } = require("./gemini");

// 2. Asynchronous main function
async function main() {
  // 3. Generate a response from the LLM
  // await included to enforce the flow of generation first
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: "Give me a list of activity ideas based on my current location and weather"
  });

  // 4. Show the output
  console.log(response.text);
}

main();