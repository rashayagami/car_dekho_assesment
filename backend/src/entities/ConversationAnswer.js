const { EntitySchema } = require('typeorm');

const ConversationAnswer = new EntitySchema({
  name: 'ConversationAnswer',
  tableName: 'conversation_answers',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    session_id: {
      type: 'uuid',
    },
    conversation_id: {
      type: 'uuid',
    },
    question_id: {
      type: 'uuid',
      nullable: true,
    },
    answer_value: {
      type: 'jsonb',
    },
    answered_at: {
      type: 'timestamp',
      createDate: true,
    },
  },
  relations: {
    session: {
      type: 'many-to-one',
      target: 'ConversationSession',
      joinColumn: { name: 'session_id' },
      inverseSide: 'answers',
      onDelete: 'CASCADE',
    },
    conversation: {
      type: 'many-to-one',
      target: 'Conversation',
      joinColumn: { name: 'conversation_id' },
      inverseSide: 'answers',
      onDelete: 'CASCADE',
    },
    question: {
      type: 'many-to-one',
      target: 'Question',
      joinColumn: { name: 'question_id' },
      inverseSide: 'answers',
      nullable: true,
    },
  },
  indices: [
    {
      name: 'IDX_ANSWER_SESSION',
      columns: ['session_id'],
    },
  ],
});

module.exports = { ConversationAnswer };
