const { ai, MODEL } = require("./gemini");
const { getCurrentWeather, getLocation } = require("./tools");

const reactAgentPrompt = `
You are a helpful assistant that can look up the user's location and check the weather. 
Use the available tools to answer questions about outdoor activities and weather-related queries.`;

const tools = [
    {
        functionDeclarations: [
            {
                name: "getCurrentWeather",
                description: "Returns the current weather of the location specified",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "City name or location"
                        }
                    },
                    required: ["location"]
                }
            },
            {
                name: "getLocation",
                description: "Returns the user's current location details. No parameters needed.",
                parameters: {
                    type: "object",
                    properties: {}
                }
            }
        ]
    }
];

function createMessage(role, content) {
    // If content is already an array of parts, use it directly
    if (Array.isArray(content)) {
        return {
            role,
            parts: content
        };
    }

    // If it's a function response object with name and response
    if (role === 'function' && content.name && content.response !== undefined) {
       // force responseData data to be an object
        const responseData = (typeof content.response === 'object' && content.response !== null && !Array.isArray(content.response))
            ? content.response
            : { result: content.response };

        return {
            role: 'function',
            parts: [{
                functionResponse: {
                    name: content.name,
                    response: responseData
                }
            }]
        };
    }

    // Otherwise, wrap text content in a parts array
    return {
        role,
        parts: [{ text: content }]
    };
};

async function agentLoop(messages, maxIterations = 10) {
    let iterations = 0;

    while (iterations < maxIterations) {
        iterations++;
        console.log(`\n--- Iteration ${iterations} ---`);

        const response = await ai.models.generateContent({
            model: MODEL,
            contents: messages,
            config: {
                tools: tools,
                systemInstruction: reactAgentPrompt
            }
        });

        // Display any text response
        if (response.text) {
            console.log("Thinking:", response.text);
        }

        // Check if response has function calls
        const functionCalls = response.functionCalls;

        // Extract the model's content from the raw response structure
        const modelContent = response.candidates?.[0]?.content;

        if (functionCalls && functionCalls.length > 0) {
            console.log("Calling functions:");

            // Add model's response to messages (only if it exists)
            if (modelContent) {
                messages.push(modelContent);
            }

            // Execute each function call
            for (const call of functionCalls) {
                let result;

                // Handle function names that may have prefixes like 'generic:'
                const functionName = call.name.split(':').pop();

                if (functionName === "getLocation") {
                    result = await getLocation();
                } else if (functionName === "getCurrentWeather") {
                    result = await getCurrentWeather(call.args.location);
                } else {
                    result = { error: `Unknown function: ${call.name}` };
                }

                console.log(`   - ${functionName}(${call.args ? JSON.stringify(call.args) : ''}) → ${JSON.stringify(result)}`);

                // Add function response to messages using our helper
                messages.push(createMessage('function', {
                    name: call.name,
                    response: result
                }));
            }
            // Continue loop to let model process function results
        } else {
            // No function calls - add response to messages and continue
            if (modelContent) {
                messages.push(modelContent);
            }

            // Check if this looks like a final answer
            if (response.text) {
                return response.text;
            }
        }
    }

    return "Max iterations reached without a final result.";
}

async function startAgent(query) {
    const messages = [
        createMessage('user', query)
    ];

    const response = await agentLoop(messages);
    console.log("Final Answer =>", response);
}

async function main() {
    startAgent("What outdoor activities can I do today?")
}

main();