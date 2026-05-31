const { EntitySchema } = require('typeorm');

const Question = new EntitySchema({
  name: 'Question',
  tableName: 'questions',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    title: {
      type: 'varchar',
    },
    description: {
      type: 'text',
      nullable: true,
    },
    config_json: {
      type: 'jsonb',
      // Contains: { label, description, submitButtonText, fields: [...] }
    },
    purpose: {
      type: 'varchar', // e.g. budget_collection, body_type_selection, user_info
    },
    is_required: {
      type: 'boolean',
      default: true,
    },
    form_component_type: {
      type: 'varchar', // Flexible string: budget_range, card_select, user_basic_info, etc.
    },
    category: {
      type: 'varchar', // budget, body_type, fuel, brand, features, usage, personal
    },
    display_order: {
      type: 'int',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    answers: {
      type: 'one-to-many',
      target: 'ConversationAnswer',
      inverseSide: 'question',
    },
  },
});

module.exports = { Question };
