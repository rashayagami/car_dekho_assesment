const { AppDataSource } = require('../config/data-source');

const SYSTEM_PROMPT = `You are a friendly AI car consultant for the Indian automobile market.

RULES:
- Be warm and brief. One topic per turn.
- Acknowledge the user's response before the next question.

- Dynamic State Tracker & Flow Resumption: If the user indicates they are ready to resume or continue the questionnaire (e.g. saying "ready", "let's go", "ok", "continue"), you MUST inspect the conversation history and count the number of "[form answer: ...]" messages from the user to identify exactly which step is next!
  - 0 form answers in history: You are on Step 1 (Primary Usage).
  - 1 form answer in history: You are on Step 2 (Car Size).
  - 2 form answers in history: You are on Step 3 (Budget Range).
  - 3 form answers in history: You are on Step 4 (Fuel Type).
  - 4 form answers in history: You are on Step 5 (Transmission).
  - 5 form answers in history: You are on Step 6 (Features).
  - 6 form answers in history: You are on Step 7 (Search & Recommendations).
  Always resume EXACTLY from the next step based on this count. Do NOT repeat completed questions or restart from Step 1 under any circumstances!

- Conversational Flexibility: If the user asks general questions, chats off-topic, or asks for explanations (e.g. "what is this", "how does this work", or "who are you"), respond PURELY conversationally in warm, natural plain text FIRST. Explain who you are (CarDekho AI, your intelligent car recommender for the Indian market) and how the process works. Always add a clear instruction at the end telling the user how they can resume (e.g., "Just say 'ready' or 'continue' whenever you are ready, and we will pick up exactly where we left off!"). Do NOT trigger any tools or forms during these conversational turns.

WHEN TO USE FORMS vs PLAIN TEXT:
- Use request_user_input when the question has choices or needs structured data.
- Use plain text for open-ended chat, follow-ups, and final recommendations.

AVAILABLE COMPONENTS (via request_user_input):
chip_select, chip_multi_select, budget_range, number_input, text_input, card_carousel, search_select, rating_select

FLOW:
1. Greet + request_user_input(chip_select, usage options: Daily Commute, Family Trips, Long Drives, Off-Road)
2. Acknowledge + request_user_input(chip_select, car size: Compact/Hatchback, Sedan, SUV, MUV)
3. request_user_input(budget_range)
4. request_user_input(chip_select, fuel: Petrol, Diesel, Electric, Hybrid, CNG)
5. request_user_input(chip_select, transmission: Manual, Automatic, No Preference)
6. request_user_input(chip_multi_select, features: Sunroof, Rear Camera, Touchscreen, Cruise Control, Alloy Wheels, Push Start, Ventilated Seats)
7. search_cars then recommend in plain text.`;

/**
 * Build a form config from a DB question record.
 * Merges the LLM-provided label/description/options with the stored config_json.
 */
function buildFormFromQuestion(question, llmLabel, llmDescription, llmOptions) {
  const config = { ...question.config_json };

  if (llmLabel) config.label = llmLabel;
  if (llmDescription) config.description = llmDescription;

  if (llmOptions.length > 0 && config.fields?.[0]) {
    config.fields[0].options = llmOptions.map((o) => ({
      value: o.toLowerCase().replace(/\s+/g, '_'),
      label: o,
    }));
  }

  config.form_component_type = question.form_component_type;
  config.purpose = question.purpose;
  config.submit_button_text = config.submitButtonText || config.submit_button_text || 'Next';

  return config;
}

/**
 * Minimal fallback builders for component types not in the DB.
 */
const FALLBACK_BUILDERS = {
  chip_select: (label, desc, opts) => ({
    label, description: desc, submit_button_text: 'Next',
    form_component_type: 'chip_select', purpose: 'chip_select',
    fields: [{ name: 'selection', label, type: 'chip_select', options: opts.map((o) => ({ value: o.toLowerCase().replace(/\s+/g, '_'), label: o })) }],
  }),
  chip_multi_select: (label, desc, opts) => ({
    label, description: desc, submit_button_text: 'Next',
    form_component_type: 'chip_multi_select', purpose: 'chip_multi_select',
    fields: [{ name: 'selections', label, type: 'chip_select', multiple: true, options: opts.map((o) => ({ value: o.toLowerCase().replace(/\s+/g, '_'), label: o })) }],
  }),
  budget_range: (label, desc) => ({
    label, description: desc, submit_button_text: 'Next',
    form_component_type: 'budget_range', purpose: 'budget_range',
    fields: [
      { name: 'min_budget', label: 'Minimum (₹ Lakhs)', type: 'number', placeholder: 'e.g. 5' },
      { name: 'max_budget', label: 'Maximum (₹ Lakhs)', type: 'number', placeholder: 'e.g. 15' },
    ],
  }),
  text_input: (label, desc) => ({
    label, description: desc, submit_button_text: 'Next',
    form_component_type: 'text_input', purpose: 'text_input',
    fields: [{ name: 'value', label, type: 'text', placeholder: 'Type here...' }],
  }),
};

let questionCache = null;

async function resolveFormConfig(componentType, label, description, options) {
  if (!questionCache) {
    const questionRepo = AppDataSource.getRepository('Question');
    const allQuestions = await questionRepo.find();
    questionCache = {};
    for (const q of allQuestions) {
      questionCache[q.form_component_type] = q;
    }
  }

  const dbQuestion = questionCache[componentType];
  if (dbQuestion) {
    return buildFormFromQuestion(dbQuestion, label, description, options || []);
  }

  const builder = FALLBACK_BUILDERS[componentType] || FALLBACK_BUILDERS.text_input;
  return builder(label || '', description || '', options || []);
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'request_user_input',
      description: 'Show a UI form to the user.',
      parameters: {
        type: 'object',
        properties: {
          component: { type: 'string' },
          label: { type: 'string' },
          description: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
        },
        required: ['component', 'label'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_cars',
      description: 'Search car database with filters.',
      parameters: {
        type: 'object',
        properties: {
          min_price: { type: 'number' },
          max_price: { type: 'number' },
          body_types: { type: 'array', items: { type: 'string' } },
          fuel_types: { type: 'array', items: { type: 'string' } },
          transmissions: { type: 'array', items: { type: 'string' } },
          min_seating: { type: 'number' },
          brands: { type: 'array', items: { type: 'string' } },
          features: { type: 'array', items: { type: 'string' } },
          color: { type: 'string', description: 'Color preference (e.g. red, blue, black, white)' },
          drivetrain: { type: 'string', description: 'Drivetrain preference (e.g. 4x4, AWD, FWD, RWD)' },
          query: { type: 'string', description: 'Generic search query for keywords like colors, specific variants, or models.' },
        },
      },
    },
  },
];

function buildChatHistory(messages) {
  const history = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    let content = msg.content || '';

    if (msg.message_type === 'form_request' && msg.form_config) {
      content += ` [asked: ${msg.form_config.form_component_type || 'form'}]`;
    }

    if (msg.message_type === 'form_response' && msg.metadata?.answer_value) {
      content = `[form answer: ${JSON.stringify(msg.metadata.answer_value)}]`;
    }

    if (!content.trim()) continue;
    history.push({ role, content });
  }

  return history;
}

/**
 * Standard HTTP POST request to Groq API with robust error handling and fallback
 */
async function callGroqAPI(messages, tools = null) {
  const apiKey = process.env.GROQ_API_KEY;
  const preferredModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  const payload = {
    model: preferredModel,
    messages,
  };
  if (tools) {
    payload.tools = tools;
  }

  console.log(`Calling Groq API using model: ${payload.model}...`);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Groq API Error Response:', errorBody);

    // Dynamic fallback to ensure 100% uptime in case the requested model is invalid or unauthorized
    if (preferredModel === 'openai/gpt-oss-120b') {
      console.warn('Requested model not available on Groq account. Falling back to llama-3.3-70b-versatile.');
      payload.model = 'llama-3.3-70b-versatile';
      const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (fallbackResponse.ok) {
        return await fallbackResponse.json();
      }
    }
    throw new Error(`Groq API returned status ${response.status}: ${errorBody}`);
  }

  return await response.json();
}

/**
 * Process a message using Groq tool calling.
 */
/**
 * Attempt to parse a tool call embedded as plain text inside brackets.
 * Supports both full-width Chinese brackets 【...】 and standard brackets [...]
 * Returns { name, args, cleanedText } if found, else null.
 */
function parseBracketedToolCall(text) {
  if (!text) return null;
  const bracketRegex = /(?:【|\[)(request_user_input|search_cars)\s*:\s*({.*?})(?:】|\])/;
  const match = text.match(bracketRegex);
  if (match) {
    try {
      const name = match[1];
      const args = JSON.parse(match[2]);
      const cleanedText = text.replace(bracketRegex, '').trim();
      return { name, args, cleanedText };
    } catch (e) {
      console.error('Failed to parse bracketed tool arguments:', e);
    }
  }
  return null;
}

/**
 * Handle execution of tool calls (either native or bracket-parsed text fallbacks)
 */
async function handleToolCall(functionName, args, message, messages) {
  // Handle form request
  if (functionName === 'request_user_input') {
    const componentType = args.component || 'text_input';
    const formConfig = await resolveFormConfig(componentType, args.label, args.description, args.options);

    return {
      textContent: message.content || args.description || '',
      formConfig,
      functionCallName: 'request_user_input',
    };
  }

  // Handle car search
  if (functionName === 'search_cars') {
    const carService = require('./carService');
    let cars = await carService.searchCars(args);
    let originalFiltersExhausted = false;

    // Dynamic, self-healing search broadening to ensure we ALWAYS have cars to show the user!
    if (cars.length === 0) {
      console.log('Zero cars matched original criteria. Broadening search...');
      originalFiltersExhausted = true;
      const broadArgs = { ...args };
      
      // Step 1: Remove highly specific constraints (features, color, drivetrain, and query)
      if (broadArgs.features || broadArgs.color || broadArgs.drivetrain || broadArgs.query) {
        delete broadArgs.features;
        delete broadArgs.color;
        delete broadArgs.drivetrain;
        delete broadArgs.query;
        cars = await carService.searchCars(broadArgs);
      }
      
      // Step 2: If still empty, remove fuel type constraint
      if (cars.length === 0 && broadArgs.fuel_types) {
        delete broadArgs.fuel_types;
        cars = await carService.searchCars(broadArgs);
      }

      // Step 3: If still empty, remove transmission constraint
      if (cars.length === 0 && broadArgs.transmissions) {
        delete broadArgs.transmissions;
        cars = await carService.searchCars(broadArgs);
      }

      // Step 4: If still empty, search with zero constraints to show the general premium fleet!
      if (cars.length === 0) {
        cars = await carService.searchCars({});
      }
    }

    // Super-compact pipe-separated plain-text representation of cars to minimize Groq token usage dramatically
    const compactCarsText = cars.slice(0, 5).map((c) => 
      `${c.brand} ${c.model} (${c.body_type}): ₹${(Number(c.price_ex_showroom)/100000).toFixed(1)}L, ${c.fuel_type}, ${c.transmission}, ${c.mileage_kmpl || 'N/A'}kmpl, ${c.seating_capacity}str`
    ).join(' | ');

    // Append tool interaction to history
    messages.push(message);
    messages.push({
      role: 'tool',
      tool_call_id: message.tool_calls?.[0]?.id || 'call_fake_search_' + Date.now(),
      name: 'search_cars',
      content: JSON.stringify({ 
        count: cars.length, 
        list: compactCarsText, 
        note: originalFiltersExhausted ? "No cars matched the original tight filters, so search results were dynamically broadened to show the closest premium alternatives!" : null 
      }),
    });

    const followUpJson = await callGroqAPI(messages, tools);
    const followUpChoice = followUpJson.choices?.[0];
    const followUpMessage = followUpChoice?.message;
    const followUpText = followUpMessage?.content || '';

    // Check for native tool call in follow-up
    if (followUpMessage?.tool_calls?.[0]) {
      const followUpCall = followUpMessage.tool_calls[0];
      if (followUpCall.function.name === 'request_user_input') {
        const fArgs = JSON.parse(followUpCall.function.arguments || '{}');
        const cType = fArgs.component || 'text_input';
        const fConfig = await resolveFormConfig(cType, fArgs.label, fArgs.description, fArgs.options);
        return {
          textContent: followUpMessage.content || fArgs.description || '',
          formConfig: fConfig,
          functionCallName: 'request_user_input',
        };
      }
    }

    // Check for bracketed tool call in follow-up
    const followUpBracketed = parseBracketedToolCall(followUpText);
    if (followUpBracketed && followUpBracketed.name === 'request_user_input') {
      const cType = followUpBracketed.args.component || 'text_input';
      const fConfig = await resolveFormConfig(cType, followUpBracketed.args.label, followUpBracketed.args.description, followUpBracketed.args.options);
      return {
        textContent: followUpBracketed.cleanedText || followUpBracketed.args.description || '',
        formConfig: fConfig,
        functionCallName: 'request_user_input',
      };
    }

    return {
      textContent: followUpText || 'Here are my recommendations.',
      formConfig: null,
      functionCallName: 'search_cars',
      searchResults: cars.slice(0, 5),
    };
  }
}

/**
 * Process a message using Groq tool calling, supporting native tool calling and text bracket parser fallbacks.
 */
async function processMessage(conversationHistory, userMessage, contextSummary = null) {
  let systemPrompt = SYSTEM_PROMPT;
  if (contextSummary) {
    systemPrompt += `\n\nCONVERSATION CONTEXT:\n${contextSummary}\n\nDo not re-ask answered questions.`;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...buildChatHistory(conversationHistory),
    { role: 'user', content: userMessage }
  ];

  const responseJson = await callGroqAPI(messages, tools);
  const choice = responseJson.choices?.[0];
  const message = choice?.message;
  const rawTextContent = message?.content || '';

  // 1. Check for native tool calls
  if (message?.tool_calls?.[0]) {
    const toolCall = message.tool_calls[0];
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments || '{}');
    return await handleToolCall(functionName, args, message, messages);
  }

  // 2. Check for text-based bracketed tool calls (the fallback for custom models)
  const bracketedCall = parseBracketedToolCall(rawTextContent);
  if (bracketedCall) {
    const fakeMessage = { ...message, content: bracketedCall.cleanedText };
    return await handleToolCall(bracketedCall.name, bracketedCall.args, fakeMessage, messages);
  }

  return {
    textContent: rawTextContent || 'Could you try again?',
    formConfig: null,
    functionCallName: null,
  };
}

/**
 * Summarize conversation messages for rolling context.
 */
async function summarizeConversation(messages, existingSummary = null) {
  const transcript = messages
    .map((m) => `${m.role}: ${m.content || '[form interaction]'}`)
    .join('\n');

  let prompt = 'Summarize this car-finding conversation concisely. Capture:\n';
  prompt += '- User preferences (budget, car type, fuel, features, etc.)\n';
  prompt += '- Decisions made so far\n';
  prompt += '- What was about to happen next\n\n';

  if (existingSummary) {
    prompt += `Previous summary:\n${existingSummary}\n\nNew messages:\n`;
  }

  prompt += transcript;

  const messagesToSend = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: prompt }
  ];

  try {
    const responseJson = await callGroqAPI(messagesToSend);
    return responseJson.choices?.[0]?.message?.content || existingSummary || '';
  } catch (err) {
    console.error('Groq summarization failed:', err.message);
    return existingSummary || '';
  }
}

module.exports = { processMessage, summarizeConversation };
