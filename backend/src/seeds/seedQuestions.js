const { AppDataSource } = require('../config/data-source');

const questions = [
  {
    title: 'Tell us about yourself',
    description: 'Help us understand your lifestyle to recommend the best car',
    purpose: 'user_info_collection',
    is_required: true,
    form_component_type: 'user_basic_info',
    category: 'personal',
    display_order: 1,
    config_json: {
      label: 'Tell us about yourself',
      description: 'This helps us understand your lifestyle and recommend the perfect car',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'age',
          label: 'Your Age',
          type: 'number',
          placeholder: 'e.g. 28',
          validation: {
            required: 'Please enter your age',
            min: { value: 18, message: 'Must be 18+' },
          },
        },
        {
          name: 'profession',
          label: 'Profession',
          type: 'select',
          options: [
            { value: 'salaried', label: 'Salaried Professional' },
            { value: 'business', label: 'Business Owner' },
            { value: 'freelancer', label: 'Freelancer' },
            { value: 'student', label: 'Student' },
            { value: 'retired', label: 'Retired' },
            { value: 'other', label: 'Other' },
          ],
          validation: { required: 'Please select your profession' },
        },
        {
          name: 'is_married',
          label: 'Are you married?',
          type: 'toggle',
          defaultValue: false,
          validation: {},
        },
        {
          name: 'kid_count',
          label: 'Number of kids',
          type: 'number',
          placeholder: '0',
          conditional: { field: 'is_married', value: true },
          validation: { min: { value: 0, message: 'Cannot be negative' } },
        },
        {
          name: 'young_kid_count',
          label: 'How many are under 6 years old?',
          type: 'number',
          placeholder: '0',
          conditional: { field: 'kid_count', operator: 'gt', value: 0 },
          validation: { min: { value: 0, message: 'Cannot be negative' } },
        },
      ],
    },
  },
  {
    title: "What's your budget range?",
    description: 'Select or enter your comfortable budget range',
    purpose: 'budget_collection',
    is_required: true,
    form_component_type: 'budget_range',
    category: 'budget',
    display_order: 2,
    config_json: {
      label: "What's your budget?",
      description: 'This helps us filter cars within your price range',
      submitButtonText: 'Set Budget',
      fields: [
        {
          name: 'budget_min',
          label: 'Minimum Budget (₹)',
          type: 'number',
          placeholder: 'e.g. 500000',
          validation: {
            required: 'Please enter a minimum budget',
            min: { value: 100000, message: 'Minimum ₹1 lakh' },
          },
        },
        {
          name: 'budget_max',
          label: 'Maximum Budget (₹)',
          type: 'number',
          placeholder: 'e.g. 1500000',
          validation: {
            required: 'Please enter a maximum budget',
          },
        },
        {
          name: 'budget_preset',
          label: 'Or pick a range',
          type: 'chip_select',
          options: [
            { value: '3-5L', label: '₹3-5 Lakh' },
            { value: '5-8L', label: '₹5-8 Lakh' },
            { value: '8-12L', label: '₹8-12 Lakh' },
            { value: '12-20L', label: '₹12-20 Lakh' },
            { value: '20L+', label: '₹20 Lakh+' },
          ],
          validation: {},
        },
      ],
    },
  },
  {
    title: 'What body type do you prefer?',
    description: 'Choose one or more body styles you like',
    purpose: 'body_type_selection',
    is_required: true,
    form_component_type: 'card_select',
    category: 'body_type',
    display_order: 3,
    config_json: {
      label: 'Choose your preferred body type',
      description: 'You can select multiple options',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'body_type',
          label: 'Body Type',
          type: 'card_grid',
          multiple: true,
          options: [
            { value: 'hatchback', label: 'Hatchback', icon: '🚗', description: 'Compact & city-friendly' },
            { value: 'sedan', label: 'Sedan', icon: '🚘', description: 'Comfort & elegance' },
            { value: 'suv', label: 'SUV', icon: '🚙', description: 'Power & presence' },
            { value: 'muv', label: 'MUV', icon: '🚐', description: 'Space for the family' },
            { value: 'coupe', label: 'Coupe', icon: '🏎️', description: 'Sporty & stylish' },
          ],
          validation: { required: 'Please select at least one body type' },
        },
      ],
    },
  },
  {
    title: 'Fuel type preference',
    description: 'Which fuel type works best for you?',
    purpose: 'fuel_type_selection',
    is_required: true,
    form_component_type: 'single_select',
    category: 'fuel',
    display_order: 4,
    config_json: {
      label: 'Which fuel type do you prefer?',
      description: 'Consider your daily commute and running costs',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'fuel_type',
          label: 'Fuel Type',
          type: 'radio',
          options: [
            { value: 'petrol', label: 'Petrol', description: 'Best for city driving' },
            { value: 'diesel', label: 'Diesel', description: 'Great mileage for long drives' },
            { value: 'electric', label: 'Electric', description: 'Zero emissions, low running cost' },
            { value: 'hybrid', label: 'Hybrid', description: 'Best of both worlds' },
            { value: 'cng', label: 'CNG', description: 'Most economical' },
            { value: 'no_preference', label: 'No Preference', description: "I'm open to anything" },
          ],
          validation: { required: 'Please select a fuel type' },
        },
      ],
    },
  },
  {
    title: 'Transmission preference',
    description: 'Manual or automatic?',
    purpose: 'transmission_selection',
    is_required: true,
    form_component_type: 'single_select',
    category: 'transmission',
    display_order: 5,
    config_json: {
      label: 'What transmission do you prefer?',
      description: 'Automatic is great for city traffic, manual for control enthusiasts',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'transmission',
          label: 'Transmission',
          type: 'radio',
          options: [
            { value: 'manual', label: 'Manual', description: 'Full control' },
            { value: 'automatic', label: 'Automatic', description: 'Effortless driving' },
            { value: 'no_preference', label: 'No Preference', description: "I'm flexible" },
          ],
          validation: { required: 'Please select a transmission type' },
        },
      ],
    },
  },
  {
    title: 'How will you mainly use this car?',
    description: 'Tell us about your primary driving patterns',
    purpose: 'usage_pattern',
    is_required: false,
    form_component_type: 'multi_select_with_other',
    category: 'usage',
    display_order: 6,
    config_json: {
      label: 'Primary usage',
      description: 'Select all that apply',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'usage',
          label: 'How will you use this car?',
          type: 'checkbox_group',
          options: [
            { value: 'daily_commute', label: 'Daily Office Commute' },
            { value: 'city_errands', label: 'City Errands & Shopping' },
            { value: 'highway_trips', label: 'Highway / Long Road Trips' },
            { value: 'weekend_getaway', label: 'Weekend Getaways' },
            { value: 'family_outings', label: 'Family Outings' },
            { value: 'off_road', label: 'Off-Road Adventures' },
          ],
          validation: {},
        },
        {
          name: 'daily_km',
          label: 'Approximate daily driving (km)',
          type: 'number',
          placeholder: 'e.g. 30',
          validation: {},
        },
      ],
    },
  },
  {
    title: 'Must-have features',
    description: 'What features are non-negotiable for you?',
    purpose: 'feature_selection',
    is_required: false,
    form_component_type: 'multi_select_with_other',
    category: 'features',
    display_order: 7,
    config_json: {
      label: 'Select must-have features',
      description: 'Choose features that matter most to you',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'features',
          label: 'Features',
          type: 'chip_select',
          multiple: true,
          options: [
            { value: 'sunroof', label: 'Sunroof' },
            { value: 'wireless_charging', label: 'Wireless Charging' },
            { value: 'adas', label: 'ADAS / Safety Assist' },
            { value: 'cruise_control', label: 'Cruise Control' },
            { value: 'ventilated_seats', label: 'Ventilated Seats' },
            { value: 'touchscreen', label: 'Touchscreen Infotainment' },
            { value: 'android_auto', label: 'Android Auto / CarPlay' },
            { value: 'rear_camera', label: 'Rear Camera' },
            { value: '360_camera', label: '360° Camera' },
            { value: 'auto_headlights', label: 'Auto Headlights' },
            { value: 'push_start', label: 'Push Button Start' },
            { value: 'alloy_wheels', label: 'Alloy Wheels' },
          ],
          validation: {},
        },
        {
          name: 'other_features',
          label: 'Any other features?',
          type: 'text',
          placeholder: 'Type any additional features...',
          validation: {},
        },
      ],
    },
  },
  {
    title: 'Brand preference',
    description: 'Do you have a preferred brand?',
    purpose: 'brand_preference',
    is_required: false,
    form_component_type: 'text_with_suggestions',
    category: 'brand',
    display_order: 8,
    config_json: {
      label: 'Any brand preference?',
      description: "Select from popular brands or type your own. Skip if you're open to all.",
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'preferred_brands',
          label: 'Brands',
          type: 'chip_select',
          multiple: true,
          options: [
            { value: 'maruti_suzuki', label: 'Maruti Suzuki' },
            { value: 'hyundai', label: 'Hyundai' },
            { value: 'tata', label: 'Tata' },
            { value: 'mahindra', label: 'Mahindra' },
            { value: 'kia', label: 'Kia' },
            { value: 'toyota', label: 'Toyota' },
            { value: 'honda', label: 'Honda' },
            { value: 'mg', label: 'MG' },
            { value: 'skoda', label: 'Škoda' },
            { value: 'volkswagen', label: 'Volkswagen' },
          ],
          validation: {},
        },
        {
          name: 'other_brand',
          label: 'Other brand',
          type: 'text',
          placeholder: 'Type a brand name...',
          validation: {},
        },
      ],
    },
  },
  {
    title: 'How important is safety?',
    description: 'Rate how much safety matters to you',
    purpose: 'safety_priority',
    is_required: false,
    form_component_type: 'slider_with_labels',
    category: 'features',
    display_order: 9,
    config_json: {
      label: 'How important are these factors?',
      description: 'Rate each on a scale of 1 (not important) to 5 (critical)',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'safety_importance',
          label: 'Safety Rating',
          type: 'range_slider',
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 3,
          labels: ['Not Important', 'Nice to Have', 'Important', 'Very Important', 'Critical'],
          validation: {},
        },
        {
          name: 'mileage_importance',
          label: 'Fuel Efficiency',
          type: 'range_slider',
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 3,
          labels: ['Not Important', 'Nice to Have', 'Important', 'Very Important', 'Critical'],
          validation: {},
        },
        {
          name: 'performance_importance',
          label: 'Performance / Power',
          type: 'range_slider',
          min: 1,
          max: 5,
          step: 1,
          defaultValue: 3,
          labels: ['Not Important', 'Nice to Have', 'Important', 'Very Important', 'Critical'],
          validation: {},
        },
      ],
    },
  },
  {
    title: 'Do you have a car to trade in?',
    description: 'Let us know about your current vehicle',
    purpose: 'trade_in_info',
    is_required: false,
    form_component_type: 'yes_no_with_detail',
    category: 'usage',
    display_order: 10,
    config_json: {
      label: 'Do you currently own a car?',
      description: 'This helps us understand your upgrade needs',
      submitButtonText: 'Continue',
      fields: [
        {
          name: 'owns_car',
          label: 'Do you currently own a car?',
          type: 'toggle',
          defaultValue: false,
          validation: {},
        },
        {
          name: 'current_car',
          label: 'Which car do you currently drive?',
          type: 'text',
          placeholder: 'e.g. Maruti Swift 2019',
          conditional: { field: 'owns_car', value: true },
          validation: {},
        },
        {
          name: 'current_car_issue',
          label: "What don't you like about it?",
          type: 'textarea',
          placeholder: 'e.g. Not enough space, poor mileage...',
          conditional: { field: 'owns_car', value: true },
          validation: {},
        },
      ],
    },
  },
];

async function seedQuestions() {
  const questionRepo = AppDataSource.getRepository('Question');

  const existingCount = await questionRepo.count();
  if (existingCount > 0) {
    console.log(`Questions already seeded (${existingCount} found). Skipping.`);
    return;
  }

  for (const q of questions) {
    const entity = questionRepo.create(q);
    await questionRepo.save(entity);
  }

  console.log(`✅ Seeded ${questions.length} questions.`);
}

module.exports = { seedQuestions };
