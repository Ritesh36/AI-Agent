// import {OpenAI} from "openai";

// const OPENAI_API_KEY = 
//     "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"

// const client = new OpenAI({
//     apiKey: OPENAI_API_KEY
// });

// async function init() {
//     const response = await client.chat.completions.create({
//         model: 'gpt-4.1-mini',
//         messages: [{ role: 'user', content: 'Hey There'}]
//     });

//     console.log(response.choices[0].message.content)
// }

// init();

import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

async function getWeatherInfo(cityName) {
    return `${cityName} has 43 Degree C`;
}

const TOOLS_MAP = {
    getWeatherInfo: getWeatherInfo,
}

const SYSTEM_PROMPT = `
    You are an helpfull AI Assistant who is designed to resolve user query.
    You work on START, THINK, ACTION, OBSERVE and OUTPUT Mode.

    In the START Phase, user gives a query to you,
    Then, you THINK how to resolve that query atleast 3-4 times and make sure that all is clear.
    If there is need to call a tool, you call an ACTION event with tool and input parameters.
    If there is an ACTION call, wait for the OBSERVE that is output of the tool,
    Based on the OBSERVE from prev step, you either output or repeat the loop.

    Rules:
    - Always wait for next step.
    - Always output a single step and wait for the next step.
    - Output must be strictly JSON
    - Only call tool action from Available tools
    - Strictly follow the output format in JSON
    
    Available Tools:
    - getWeatherInfo(city: string): string

    Example:
    START: what is weather of solapur?
    THINK: The user is asking for the weather of Solapur.
    THINK: From the available tools, I must call getWeatherInfo tool for solapur as input.
    ACTION: Call the tool getWeatherInfo(solapur)
    OBSERVE: 32 Degree C
    THINK: The output of getWeatherInfo for solapur is 32 Degree C
    OUTPUT: Hey, The weather of solapur is 32 Degree C which is quite HOT!

    Output Example:
    { "role": "user", "content": "what is weather of solapur?" }
    { "step": "think", "content": "The user is asking for the weather of Solapur" }
    { "step": "think", "content": "From the available tools, I must call getWeatherInfo tool for solapur as input." }
    { "step": "action", "tool": "getWeatherInfo", "input": "Solapur"  }
    { "step": "observe", "content": "32 Degree C" }
    { "step": "think", "content": "The output of getWeatherInfo for solapur is 32 Degree C" }
    { "step": "think", "content": "The output of getWeatherInfo for solapur is 32 Degree C which is quite HOT" }
    

    Output Format:
    { "step": "string", "tool": "string", "input": "string", "content": "string" }
`;

async function safeRequest(requestFn, ...args) {
    while (true) {
        try {
            return await requestFn(...args);
        } catch (err) {
            if (err.status === 429) {
                console.log("Rate limited. Waiting 5 seconds...");
                await new Promise(res => setTimeout(res, 5000));
            } else {
                throw err;
            }
        }
    }
}




async function init() {

    const messages = [
    { 
        role: "system",
        content: SYSTEM_PROMPT 
    },
];

    const userQuery = 'what is the weather of Delhi and solapur?';
    messages.push({'role': 'user', 'content': userQuery});

    while(true) {
    const response = await openai.chat.completions.create({
        model: "gemini-2.0-flash",
        response_format: {type: 'json_object'},
        messages: messages
    })

    messages.push({ 'role': "assistant", "content": response.choices[0].message.content })
    const parsed_response = JSON.parse(response.choices[0].message.content);

    if(parsed_response.step && parsed_response.step == "think") {
        console.log(`BRAIN : ${parsed_response.content}`);
        continue;
    }

    if(parsed_response.step && parsed_response.step == "output") {
        console.log(`BOT : ${parsed_response.content}`);
        break;
    }

    if(parsed_response.step && parsed_response.step == "action") {
        const tool = parsed_response.tool
        const input = parsed_response.input

        const value = TOOLS_MAP[tool](input);
        console.log(`TOOL CALL : ${tool}: (${input})`);

        messages.push({ "role": "assistant",
            "content": JSON.stringify({ "step": "observe", "content": value}),
        })
        continue;
        }
    }
}

init();
