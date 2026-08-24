const reactAgentPrompt = `
You must return an array of responses. Each response has a "type" field which can be "thought", "action", or "result".

- If type is "thought": include a "content" field with your thinking as a string
- If type is "action": include a "function" field with the function name and "parameters" field with an array of parameters
- If type is "result": include a "content" field with the final answer as a string

You cycle through Thought, Action, Observation. At the end of the loop you output a final result.

Available actions:
- getCurrentWeather: 
    Returns the current weather of the location specified.
    Parameters: [location]
- getLocation:
    Returns user's location details. No arguments needed.
    Parameters: []

Example session:
Question: Please give me some ideas for activities to do this afternoon.

You return:
[
  { "type": "thought", "content": "I should look up the user's location so I can give location-specific activity ideas." },
  { "type": "action", "function": "getLocation", "parameters": [] }
]

You will be called again with observation, then you continue:
[
  { "type": "thought", "content": "Now I know the location is New York City. I should get the current weather." },
  { "type": "action", "function": "getCurrentWeather", "parameters": ["New York City"] }
]

After receiving weather observation, you output the final result:
[
  { "type": "result", "content": "Based on the sunny weather in New York City, here are some activity suggestions..." }
]
`

const schema = {
			type: "array",
      items: {
          type: "object",
          properties: {
              type: {
                  type: "string",
                  enum: ["thought", "action", "result"]
              },
              content: { type: "string" },
              function: { type: "string" },
              parameters: {
                  type: "array",
                  items: { type: "string" }
              }
          },
          required: ["type"]
      }
  }

const { ai, MODEL } = require("./gemini");
const { getCurrentWeather, getLocation } = require("./tools");

async function main() {

   
   // note: see step 1 for the full prompt
    const reactAgentPrompt = "You must return an array of responses...";

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: "Query: Give me a list of activity ideas based on my current location and weather." ,
        config: {
              systemInstruction: reactAgentPrompt,
              responseMimeType: "application/json",
              responseSchema: schema
        }
    });

    console.log(response.text);

    //convert JSON string into actual JS object
    const responses = JSON.parse(response.text)
    
    for (const r of responses) {
      if (r.type == 'result') {
        return r.content
      }

      // dispatch, call the functions that AI is requesting
      if (r.type =="action"){
        console.log("Action:",r)
        let observation
      }
    }

}

// human, llm, function

main();