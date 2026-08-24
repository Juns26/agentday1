// 05-planning-agent-starter.js

const { ai, MODEL } = require("./gemini");
const {
    getTodayDate,
    getDateAfterDays,
    getAllTodos,
    findTodosDueWithinDays,
    addTodo,
    updateTodo,
    markTodoCompleted,
    placeOrder,
    findOrderByItem,
    getAllOrders
} = require("./todo");

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

// -- SYSTEM PROMPT --
// TODO: Expand this prompt with planning instructions (Step 1)
const systemPrompt = `You are a helpful assistant that manages todos and orders using the provided tools.

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

// -- TOOLS ARRAY --
// TODO: Add createPlan and executePlan tool declarations (Step 3)
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

const tools = [
    {
        functionDeclarations: [
        {
            name: "createPlan",
            description: "Creates a plan by breaking down a complex task into steps. Call this FIRST before executing any complex request.",
            parameters: {
                type: "object",
                properties: {
                    goal: {
                        type: "string",
                        description: "The overall goal to achieve"
                    },
                    steps: {
                        type: "array",
                        description: "Array of steps to execute in order",
                        items: {
                            type: "string"
                        }
                    }
                },
                required: ["goal", "steps"]
            }
        },
        {
            name: "executePlan",
            description: "Signals that the agent is ready to execute the created plan step by step",
            parameters: {
                type: "object",
                properties: {}
            }
        },
            {
                name: "getTodayDate",
                description: "Returns today's date in YYYY-MM-DD format",
                parameters: { type: "object", properties: {} }
            },
            {
                name: "getDateAfterDays",
                description: "Returns the date after N days from today",
                parameters: {
                    type: "object",
                    properties: {
                        days: { type: "number", description: "Number of days to add" }
                    },
                    required: ["days"]
                }
            },
            {
                name: "getAllTodos",
                description: "Returns all todos in the system",
                parameters: { type: "object", properties: {} }
            },
            {
                name: "findTodosDueWithinDays",
                description: "Finds incomplete todos due within N days",
                parameters: {
                    type: "object",
                    properties: {
                        days: { type: "number", description: "Number of days to look ahead" }
                    },
                    required: ["days"]
                }
            },
            {
                name: "addTodo",
                description: "Adds a new todo item",
                parameters: {
                    type: "object",
                    properties: {
                        title: { type: "string" },
                        details: { type: "string" },
                        dateDue: { type: "string", description: "YYYY-MM-DD" },
                        priority: { type: "string", enum: ["low", "medium", "high"] }
                    },
                    required: ["title"]
                }
            },
            {
                name: "updateTodo",
                description: "Updates an existing todo by ID",
                parameters: {
                    type: "object",
                    properties: {
                        todoId: { type: "number" },
                        updates: { type: "object" }
                    },
                    required: ["todoId", "updates"]
                }
            },
            {
                name: "markTodoCompleted",
                description: "Marks a todo as completed by ID",
                parameters: {
                    type: "object",
                    properties: {
                        todoId: { type: "number" }
                    },
                    required: ["todoId"]
                }
            },
            {
                name: "placeOrder",
                description: "Places an order for items",
                parameters: {
                    type: "object",
                    properties: {
                        items: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    quantity: { type: "number" },
                                    price: { type: "number" }
                                }
                            }
                        },
                        total: { type: "number" },
                        date: { type: "string" },
                        status: { type: "string" }
                    },
                    required: ["items"]
                }
            },
            {
                name: "findOrderByItem",
                description: "Finds orders containing a specific item",
                parameters: {
                    type: "object",
                    properties: {
                        itemName: { type: "string" }
                    },
                    required: ["itemName"]
                }
            },
            {
                name: "getAllOrders",
                description: "Returns all orders in the system",
                parameters: { type: "object", properties: {} }
            }
        ]
    }
];

// -- PLANNING STATE --
// TODO: Add currentPlan state variable (Step 2)
let currentPlan = null

// -- FUNCTION DISPATCH --
const functionMap = {
    getTodayDate,
    getDateAfterDays,
    getAllTodos,
    findTodosDueWithinDays,
    addTodo,
    updateTodo,
    markTodoCompleted,
    placeOrder,
    findOrderByItem,
    getAllOrders,
    createPlan,
    executePlan
    // TODO: Add createPlan and executePlan to the map (Step 4)
};

const dispatchFunction = (functionName, args) => {
    if (!functionMap[functionName]) {
        return { error: `Unknown function:${functionName}` };
    }

    try {
        switch (functionName) {
            case "getTodayDate":
                return getTodayDate();
            case "getAllTodos":
                return getAllTodos();
            case "getAllOrders":
                return getAllOrders();
            case "getDateAfterDays":
                return getDateAfterDays(args.days);
            case "findTodosDueWithinDays":
                return findTodosDueWithinDays(args.days);
            case "addTodo":
                return addTodo(args);
            case "placeOrder":
                return placeOrder(args);
            case "updateTodo":
                return updateTodo(args.todoId, args.updates);
            case "markTodoCompleted":
                return markTodoCompleted(args.todoId);
            case "findOrderByItem":
                return findOrderByItem(args.itemName);
            // TODO: Add cases for createPlan and executePlan (Step 4)
            default:
                return { error: `Function not handled:${functionName}` };
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
                systemInstruction: systemPrompt
                // TODO: Add thinkingConfig (Step 5a)
            }
        });

        const functionCalls = response.functionCalls;
        const modelContent = response.candidates?.[0]?.content;

        // TODO: Extract and display thinking text from modelContent.parts (Step 5b)

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
        "Show me all todos due in the next 3 days, " +
        "then create an order for any items that need to be purchased."
    );
}

main();