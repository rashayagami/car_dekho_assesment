const { GoogleGenAI } = require('@google/genai');
const { AppDataSource } = require('../config/data-source');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

const SYSTEM_PROMPT = `You are a friendly AI car consultant for the Indian automobile market.

RULES:
- Be warm and brief. One topic per turn.
- Acknowledge the user's response before the next question.

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

  // Override label/description with what the LLM provided (more contextual)
  if (llmLabel) config.label = llmLabel;
  if (llmDescription) config.description = llmDescription;

  // If LLM provided options, replace the first field's options
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

// Cache DB lookups so we don't query per request
let questionCache = null;

/**
 * Resolve a component type to a full form config.
 * Checks DB first (questions table), falls back to inline builders.
 */
async function resolveFormConfig(componentType, label, description, options) {
  // Load and cache all questions on first call
  if (!questionCache) {
    const questionRepo = AppDataSource.getRepository('Question');
    const allQuestions = await questionRepo.find();
    questionCache = {};
    for (const q of allQuestions) {
      questionCache[q.form_component_type] = q;
    }
  }

  // Try DB first
  const dbQuestion = questionCache[componentType];
  if (dbQuestion) {
    return buildFormFromQuestion(dbQuestion, label, description, options || []);
  }

  // Fallback to inline builder
  const builder = FALLBACK_BUILDERS[componentType] || FALLBACK_BUILDERS.text_input;
  return builder(label || '', description || '', options || []);
}

// Compressed tool declarations — no field descriptions (system prompt covers it)
const tools = [
  {
    functionDeclarations: [
      {
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
      {
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
          },
        },
      },
    ],
  },
];

/**
 * Build conversation history — stripped for minimal tokens.
 */
function buildChatHistory(messages) {
  const history = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const role = msg.role === 'assistant' ? 'model' : 'user';
    let content = msg.content || '';

    // Compact tag instead of full form JSON
    if (msg.message_type === 'form_request' && msg.form_config) {
      content += ` [asked: ${msg.form_config.form_component_type || 'form'}]`;
    }

    // Just the answer data, not the full message
    if (msg.message_type === 'form_response' && msg.metadata?.answer_value) {
      content = `[form answer: ${JSON.stringify(msg.metadata.answer_value)}]`;
    }

    if (!content.trim()) continue;
    history.push({ role, parts: [{ text: content }] });
  }

  return history;
}

/**
 * Process a message using Gemini function calling.
 */
async function processMessage(conversationHistory, userMessage, contextSummary = null) {
  let systemPrompt = SYSTEM_PROMPT;
  if (contextSummary) {
    systemPrompt += `\n\nCONVERSATION CONTEXT:\n${contextSummary}\n\nDo not re-ask answered questions.`;
  }

  const chat = ai.chats.create({
    model: MODEL,
    config: {
      tools,
      systemInstruction: systemPrompt,
    },
    history: buildChatHistory(conversationHistory),
  });

  const result = await chat.sendMessage({ message: userMessage });
  const functionCall = result.functionCalls?.[0];

  if (functionCall) {
    // Handle form request
    if (functionCall.name === 'request_user_input') {
      const args = functionCall.args;
      const componentType = args.component || 'text_input';
      const formConfig = await resolveFormConfig(componentType, args.label, args.description, args.options);

      return {
        textContent: result.text || args.description || '',
        formConfig,
        functionCallName: 'request_user_input',
      };
    }

    // Handle car search
    if (functionCall.name === 'search_cars') {
      const carService = require('./carService');
      const cars = await carService.searchCars(functionCall.args);

      // Slim results to save tokens
      const slimCars = cars.slice(0, 5).map((c) => ({
        name: c.name, brand: c.brand, price: c.ex_showroom_price,
        fuel: c.fuel_type, transmission: c.transmission, body: c.body_type,
        mileage: c.mileage_kmpl, seating: c.seating_capacity,
      }));

      const followUp = await chat.sendMessage({
        message: [
          {
            functionResponse: {
              name: 'search_cars',
              response: { result: { count: cars.length, cars: slimCars } },
            },
          },
        ],
      });

      // Check if model wants another form after seeing results
      const followUpCall = followUp.functionCalls?.[0];
      if (followUpCall && followUpCall.name === 'request_user_input') {
        const fArgs = followUpCall.args;
        const cType = fArgs.component || 'text_input';
        const fConfig = await resolveFormConfig(cType, fArgs.label, fArgs.description, fArgs.options);
        return {
          textContent: followUp.text || fArgs.description || '',
          formConfig: fConfig,
          functionCallName: 'request_user_input',
        };
      }

      return {
        textContent: followUp.text || 'Here are my recommendations.',
        formConfig: null,
        functionCallName: 'search_cars',
        searchResults: cars.slice(0, 5),
      };
    }
  }

  // Plain text response
  return {
    textContent: result.text || 'Could you try again?',
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

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  });

  return response.text || existingSummary || '';
}

module.exports = { processMessage, summarizeConversation };
