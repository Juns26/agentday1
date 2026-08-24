const { ai, MODEL } = require("./gemini");

/**
 * EXERCISE: Array Operations Agent
 * 
 * Goal: Build an agent that can perform statistical operations on arrays
 * using the same pattern from 03-simple-agents.js
 * 
 * The agent has access to ONLY these basic operations:
 * 
 * Array operations:
 * - sum(array): Returns the sum of all numbers
 * - count(array): Returns the count of elements
 * - average(array): Returns the mean/average
 * - findMin(array): Returns the minimum value
 * - findMax(array): Returns the maximum value
 * - getElement(array, index): Returns the element at the specified index
 * - sort(array): Returns a sorted copy of the array
 * - sumOfSquares(array): Returns the sum of squared values
 * 
 * Math operations:
 * - add(a, b): Returns a + b
 * - subtract(a, b): Returns a - b
 * - multiply(a, b): Returns a * b
 * - divide(a, b): Returns a / b
 * - power(a, b): Returns a^b
 * - sqrt(a): Returns square root of a
 * 
 * Advanced statistics the LLM should be able to derive:
 * - Range: max - min
 * - Variance: (sumOfSquares / count) - (average^2)
 * - Standard Deviation: sqrt(variance)
 * - Median: middle value of sorted array
 * - Quartiles: Q1 (25th percentile), Q2 (median), Q3 (75th percentile)
 * - Interquartile Range (IQR): Q3 - Q1
 * - Coefficient of Variation: (stdDev / average) * 100
 */

// Array operation functions
const sum = (arr) => arr.reduce((acc, val) => acc + val, 0);
const count = (arr) => arr.length;
const average = (arr) => arr.length > 0 ? sum(arr) / count(arr) : 0;
const findMin = (arr) => arr.length > 0 ? Math.min(...arr) : null;
const findMax = (arr) => arr.length > 0 ? Math.max(...arr) : null;
const getElement = (arr, index) => arr[index];
const sort = (arr) => [...arr].sort((a, b) => a - b);
const sumOfSquares = (arr) => arr.reduce((acc, val) => acc + val * val, 0);

// Math operation functions
const add = (a, b) => a + b;
const subtract = (a, b) => a - b;
const multiply = (a, b) => a * b;
const divide = (a, b) => b !== 0 ? a / b : null;
const power = (a, b) => Math.pow(a, b);
const sqrt = (a) => a >= 0 ? Math.sqrt(a) : null;

// Sample data
const testData = [23, 45, 12, 67, 34, 89, 15, 56, 78, 90];

// TODO: Write the agent prompt
// Your prompt should instruct the model to:
// 1. Return an array of responses with "type" field (thought/action/result)
// 2. Explain the response format for each type:
//    - thought: has "content" field with reasoning
//    - action: has "function" and "parameters" fields
//    - result: has "content" field with final answer
// 3. Describe the Thought -> Action -> Observation cycle
// 4. List all available actions with their parameters:
//    Array: sum, count, average, findMin, findMax, getElement, sort, sumOfSquares
//    Math: add, subtract, multiply, divide, power, sqrt
// 5. IMPORTANT: Instruct the model to ALWAYS use the provided tools for calculations,
//    never do math in its head
// 6. Provide an example session showing the complete cycle
//
// Hint: Look at 03-simple-agents.js lines 9-44 for reference
const arrayAgentPrompt = `
You must return an array of responses. Each response has a "type" field which can be thought/action/result".

- If type is "thought": include a "content" field with your thinking as a string
- If type is "action": include a "function" field with the function name and "parameters" field with an array of parameters
- If type is "result": include a "content" field with the final answer as a string

You cycle through Thought->Action->Observation until you reach the final result.

Available actions:
- Array operations: sum, count, average, findMin, findMax, getElement, sort, sumOfSquares
- Math operations: add, subtract, multiply, divide, power, sqrt

You are only allowed to use the operations defined in the Available actions and not perform the operations on your own.

For example:
Question: Find the sum of 5 and 10.
Response: [
  {
    "type": "thought",
    "content": "I need to find the sum of 5 and 10. I will use the add function."
  },
  {
    "type": "action",
    "function": "add",
    "parameters": [5, 10]
  }]
You will receive the result from the add action which is 15.
Response: [
  {
    "type": "result",
    "content": "The sum of 5 and 10 is 15."
  }]
`;

const createMessage = (role, content) => ({
    role,
    parts: [{ text: content }]
});

async function main() {
    console.log("Test Data:", testData);
    console.log("\n");

    // Test queries - uncomment to test different scenarios
    // await startAgent(`What is the sum and average of the array ${JSON.stringify(testData)}?`);
    await startAgent(`Calculate the variance of ${JSON.stringify(testData)}`);
    // await startAgent(`Calculate the standard deviation of ${JSON.stringify(testData)}`);
    // await startAgent(`Find the median of ${JSON.stringify(testData)}`);
    // await startAgent(`Calculate the interquartile range (IQR) of ${JSON.stringify(testData)}`);
    // await startAgent(`Give me complete statistics (count, sum, average, min, max, range, variance, std dev, median) for ${JSON.stringify(testData)}`);
}

async function startAgent(query) {
    console.log("Query:", query);
    const messages = [createMessage("user", query)];

    const response = await agentLoop(messages);
    console.log("\n[Final Answer]:", response);
    console.log("\n" + "=".repeat(80) + "\n");
}

const schema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            type: { type: "string", enum: ["thought", "action", "result"] },
            content: { type: "string" },
            function: { type: "string" },
            parameters: { type: "array", items: { type: "number" } } // or maybe any type
        },
        required: ["type"]
    }
}

// TODO: Implement the agentLoop function
// Follow the pattern from 03-simple-agents.js
async function agentLoop(messages, maxIterations = 20) {
    let iterations = 0;

    while (iterations < maxIterations) {
        iterations++;
        console.log(`\n--- Iteration ${iterations} ---`);

        // TODO: Call the AI model with the messages
        // Use responseMimeType: "application/json" and define the responseSchema
        const response = await ai.models.generateContent({
            model: MODEL,
            contents: messages,
            config: {
                systemInstruction: arrayAgentPrompt,
                responseMimeType: "application/json",
                responseSchema: schema
                // TODO: Define the schema for the response array
                // Hint: Look at 03-simple-agents.js lines 94-112
            }
        });

        const responses = JSON.parse(response.text);
        console.log(JSON.stringify(responses, null, 2));

        // TODO: Check if we have a final result
        // If yes, return the result content
        for (const r of responses) {
            if (r.type === "result") {
                return r.content;
            }

            // TODO: Execute any actions
            // Find the action in responses
            // Call the appropriate function:
            //   Array: sum, count, average, findMin, findMax, getElement, sort, sumOfSquares
            //   Math: add, subtract, multiply, divide, power, sqrt
            // Add the observation to messages
            if (r.type === "action") {
                console.log("Action: ", r);
                let observation = null;

                if (r.function === "sum") {
                    observation = sum(r.parameters);
                } else if (r.function === "count") {
                    observation = count(r.parameters);
                } else if (r.function === "average") {
                    observation = average(r.parameters);
                } else if (r.function === "findMin") {
                    observation = findMin(r.parameters);
                } else if (r.function === "findMax") {
                    observation = findMax(r.parameters);
                } else if (r.function === "getElement") {
                    observation = getElement(r.parameters);
                } else if (r.function === "sort") {
                    observation = sort(r.parameters);
                } else if (r.function === "sumOfSquares") {
                    observation = sumOfSquares(r.parameters);
                } else if (r.function === "add") {
                    observation = add(r.parameters);
                } else if (r.function === "subtract") {
                    observation = subtract(r.parameters);
                } else if (r.function === "multiply") {
                    observation = multiply(r.parameters);
                } else if (r.function === "divide") {
                    observation = divide(r.parameters);
                } else if (r.function === "power") {
                    observation = power(r.parameters);
                } else if (r.function === "sqrt") {
                    observation = sqrt(r.parameters);
                } else {
                    observation = "Unknown function, " + r.function;
                }
                console.log(`\n Observation: ${JSON.stringify(observation)}`);
                messages.push(createMessage("model", response.text));
                messages.push(createMessage("user", `Observation: ${JSON.stringify(observation)}`));
            }
        }

        // Continue the loop    
    }

    return "Max iterations reached without a final result.";
}

main();