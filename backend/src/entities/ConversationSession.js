const { EntitySchema } = require('typeorm');

const ConversationSession = new EntitySchema({
  name: 'ConversationSession',
  tableName: 'conversation_sessions',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    user_identifier: {
      type: 'varchar',
      nullable: true,
    },
    status: {
      type: 'varchar',
      default: 'active', // active | completed | abandoned
    },
    summary: {
      type: 'text',
      nullable: true,
    },
    collected_preferences: {
      type: 'jsonb',
      nullable: true,
    },
    created_at: {
      type: 'timestamp',
      createDate: true,
    },
    updated_at: {
      type: 'timestamp',
      updateDate: true,
    },
  },
  relations: {
    conversations: {
      type: 'one-to-many',
      target: 'Conversation',
      inverseSide: 'session',
    },
    answers: {
      type: 'one-to-many',
      target: 'ConversationAnswer',
      inverseSide: 'session',
    },
  },
});

module.exports = { ConversationSession };
