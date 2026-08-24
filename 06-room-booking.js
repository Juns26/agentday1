const { ai, MODEL } = require("./gemini");
const {
    getRelativeDateTime,
    checkIsRoomAvailable,
    showAllReservations,
    findReservation,
    addReservation,
    updateReservation,
    deleteReservation
} = require("./room");

/**
 * Create a message according to the Gemini API format
 * @param {string} role - 'user', 'model', or 'function'
 * @param {string|object} content - Text string, parts array, or function response object
 * @returns {object} Formatted message object
 */
const createMessage = (role, content) => {
    if (Array.isArray(content)) {
        return { role, parts: content };
    }

    if (role === 'function' && content.name && content.response !== undefined) {
        const responseData = (typeof content.response === 'object'
            && content.response !== null
            && !Array.isArray(content.response))
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

    return { role, parts: [{ text: content }] };
};

// System Prompt
const systemPrompt = `You are a helpful assistant that manages room checkings and booking related tasks using the provided tools.

IMPORTANT: You MUST use the available function tools to answer questions. Do NOT make up or simulate data.

For complex requests:
1. First call createPlan with the goal and steps
2. Then call executePlan
3. Execute each step using the appropriate tools
4. Provide a final answer based on the actual tool results

CRITICAL: Before calling any function, ALWAYS explain your reasoning:
- What you're about to do
- Why you're calling this specific function
- What you expect to learn from it
- How it fits into the overall plan

Think step-by-step and narrate your thought process. Be verbose in your explanations.`;

function createPlan(args) {
    const newPlan = {
        goal: args.goal,
        steps: args.steps,
        currentStep: 0,
        completed: false
    };
    
    console.log("Plan created");
    console.log(`   Goal: ${newPlan.goal}`);
    newPlan.steps.forEach((step, i) => {
        console.log(`      ${i + 1}. ${step}`);
    });

    return newPlan;
}

const executePlan = (currentPlan) => {
    if (!currentPlan) {
        return { error: "No plan has been created yet. Call createPlan first." };
    }
    console.log(`\n-> Executing Plan: ${currentPlan.goal}`);
    return { message: "Plan execution started.", plan: currentPlan };
};

const showPlanProgress = (currentPlan) => {
    if (!currentPlan) return;

    console.log(`\nPlan Progress: ${currentPlan.goal}`);
    currentPlan.steps.forEach((step, i) => {
        const status = i < currentPlan.currentStep ? '[x]'
            : i === currentPlan.currentStep ? '[>]'
            : '[]';
        console.log(`   ${status} ${i + 1}. ${step}`);
    });
    console.log(`   Progress: ${currentPlan.currentStep}/${currentPlan.steps.length} steps completed\n`);
};

const updatePlanProgress = (currentPlan, functionName) => {
    if (currentPlan && !currentPlan.completed
        && functionName !== 'createPlan'
        && functionName !== 'executePlan') {

        if (currentPlan.currentStep < currentPlan.steps.length) {
            currentPlan.currentStep++;
            showPlanProgress(currentPlan);

            if (currentPlan.currentStep >= currentPlan.steps.length) {
                currentPlan.completed = true;
                console.log('Plan completed!\n');
            }
        }
    }
};

const tools = [{
  functionDeclarations: [
    // ----- Planning tools (as before) -----
    {
      name: "createPlan",
      description: "Create a structured plan for complex multi‑step requests. Always call this first when multiple actions are needed.",
      parameters: {
        type: "OBJECT",
        properties: {
          goal: {
            type: "STRING",
            description: "A concise statement of the user's overall objective."
          },
          steps: {
            type: "ARRAY",
            description: "An ordered list of detailed steps to achieve the goal.",
            items: { type: "STRING" }
          }
        },
        required: ["goal", "steps"]
      }
    },
    {
      name: "executePlan",
      description: "Start executing the plan that was previously created. This triggers step‑by‑step processing.",
      parameters: {
        type: "OBJECT",
        properties: {}  // no arguments needed
      }
    },

    // ----- Room availability -----
    {
      name: "checkIsRoomAvailable",
      description: "Check if a room is available for a given time slot. Returns true if available, false otherwise.",
      parameters: {
        type: "OBJECT",
        properties: {
          roomId: {
            type: "STRING",
            description: "The UUID of the room."
          },
          start_datetime: {
            type: "STRING",
            description: "Start time in ISO‑8601 format (e.g., '2025-03-20T09:00:00.000Z')."
          },
          end_datetime: {
            type: "STRING",
            description: "End time in ISO‑8601 format."
          }
        },
        required: ["roomId", "start_datetime", "end_datetime"]
      }
    },

    // ----- List all reservations -----
    {
      name: "showAllReservations",
      description: "Retrieve all reservations. Optionally filter by a specific room ID.",
      parameters: {
        type: "OBJECT",
        properties: {
          roomId: {
            type: "STRING",
            description: "Optional – if provided, only reservations for that room are returned."
          }
        },
        required: []  // roomId is optional
      }
    },

    // ----- Find a single reservation by ID -----
    {
      name: "findReservation",
      description: "Find a reservation by its UUID.",
      parameters: {
        type: "OBJECT",
        properties: {
          reservationId: {
            type: "STRING",
            description: "The UUID of the reservation to find."
          }
        },
        required: ["reservationId"]
      }
    },

    // ----- Add a new reservation -----
    {
      name: "addReservation",
      description: "Add a new reservation for a room. The room must be available and the times must be within operating hours.",
      parameters: {
        type: "OBJECT",
        properties: {
          roomId: {
            type: "STRING",
            description: "The UUID of the room."
          },
          start_datetime: {
            type: "STRING",
            description: "Start time in ISO‑8601 format."
          },
          end_datetime: {
            type: "STRING",
            description: "End time in ISO‑8601 format."
          }
        },
        required: ["roomId", "start_datetime", "end_datetime"]
      }
    },

    // ----- Update an existing reservation -----
    {
      name: "updateReservation",
      description: "Update the start and end times of an existing reservation. The new times must not conflict with other reservations and must be within operating hours.",
      parameters: {
        type: "OBJECT",
        properties: {
          reservationId: {
            type: "STRING",
            description: "The UUID of the reservation to update."
          },
          start_datetime: {
            type: "STRING",
            description: "New start time in ISO‑8601 format."
          },
          end_datetime: {
            type: "STRING",
            description: "New end time in ISO‑8601 format."
          }
        },
        required: ["reservationId", "start_datetime", "end_datetime"]
      }
    },

    // ----- Delete a reservation -----
    {
      name: "deleteReservation",
      description: "Delete a reservation by its UUID.",
      parameters: {
        type: "OBJECT",
        properties: {
          reservationId: {
            type: "STRING",
            description: "The UUID of the reservation to delete."
          }
        },
        required: ["reservationId"]
      }
    }
  ]
}];

let currentPlan = null

const functionMap = {
    getRelativeDateTime,
    checkIsRoomAvailable,
    showAllReservations,
    findReservation,
    addReservation,
    updateReservation,
    deleteReservation,
    createPlan,
    executePlan
}

const dispatchFunction = (functionName, args) => {
    if (!functionMap[functionName]) {
        return { error: `Unknown function: ${functionName}` };
    }

    try {
        switch (functionName) {
            case "createPlan": {
                const newPlan = createPlan(args);
                currentPlan = newPlan;   // store the plan globally
                return newPlan;
            }
            case "executePlan": {
                return executePlan(currentPlan);
            }
            case "checkIsRoomAvailable": {
                return checkIsRoomAvailable(args.roomId, args.start_datetime, args.end_datetime);
            }
            case "showAllReservations": {
                return showAllReservations(args.roomId); // roomId is optional
            }
            case "findReservation": {
                return findReservation(args.reservationId);
            }
            case "addReservation": {
                return addReservation(args.roomId, args.start_datetime, args.end_datetime);
            }
            case "updateReservation": {
                return updateReservation(args.reservationId, args.start_datetime, args.end_datetime);
            }
            case "deleteReservation": {
                return deleteReservation(args.reservationId);
            }
            default: {
                return { error: `Function not handled: ${functionName}` };
            }
        }
    } catch (error) {
        return { error: error.message };
    }
};

// -- AGENT LOOP --
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
                systemInstruction: systemPrompt,
                thinkingConfig: {
                    thinkingLevel: 'medium',
	                includeThoughts: true
                }
            }
        });

        const functionCalls = response.functionCalls;
        const modelContent = response.candidates?.[0]?.content;

        // TODO: Extract and display thinking text from modelContent.parts (Step 5b)
        const thoughtSummary = modelContent?.parts?.filter
            (part => part.thought === true && typeof part.text === "string")
            .map(part => part.text)
            .join("") ?? "";

        if (thoughtSummary.trim()) {
            console.log("Thought summary:", thoughtSummary);
        }

        if (functionCalls && functionCalls.length > 0) {
            console.log("Calling functions:");

            if (modelContent) {
                messages.push(modelContent);
            }

            for (const call of functionCalls) {
                const functionName = call.name.split(':').pop();
                const args = call.args || {};

                const result = dispatchFunction(functionName, args);

                console.log(`   -${functionName}(${JSON.stringify(args)}) →${JSON.stringify(result)}`);

                // TODO: Call updatePlanProgress(functionName) here (Step 5c)
                updatePlanProgress(currentPlan, functionName);
                
                messages.push(createMessage('function', {
                    name: call.name,
                    response: result
                }));
            }
        } else {
            if (modelContent) {
                messages.push(modelContent);
            }

            if (response.text) {
                console.log("\nFinal Answer:");
                return response.text;
            }
        }
    }

    return "Max iterations reached without a final result.";
}

// --ENTRY POINT --
async function startAgent(query) {
    const messages = [
        createMessage('user', query)
    ];

    const response = await agentLoop(messages);
    console.log("\n" + response);
}

async function main() {
    await startAgent(
        "Show me all the current bookings, " +
        "then create a booking for any rooms available tomorrow for 2 hours."
    );
}

main();