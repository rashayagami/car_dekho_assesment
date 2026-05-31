const { EntitySchema } = require('typeorm');

const Conversation = new EntitySchema({
  name: 'Conversation',
  tableName: 'conversations',
  columns: {
    id: {
      primary: true,
      type: 'uuid',
      generated: 'uuid',
    },
    session_id: {
      type: 'uuid',
    },
    role: {
      type: 'varchar', // user | assistant | system
    },
    content: {
      type: 'text',
      nullable: true,
    },
    message_type: {
      type: 'varchar',
      default: 'text', // text | form_request | form_response | recommendation
    },
    form_config: {
      type: 'jsonb',
      nullable: true,
    },
    metadata: {
      type: 'jsonb',
      nullable: true,
    },
    sequence_number: {
      type: 'int',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      createDate: true,
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
  },
  relations: {
    session: {
      type: 'many-to-one',
      target: 'ConversationSession',
      joinColumn: { name: 'session_id' },
      inverseSide: 'conversations',
      onDelete: 'CASCADE',
    },
    answers: {
      type: 'one-to-many',
      target: 'ConversationAnswer',
      inverseSide: 'conversation',
    },
  },
  indices: [
    {
      name: 'IDX_CONV_SESSION_SEQ',
      columns: ['session_id', 'sequence_number'],
    },
  ],
});

module.exports = { Conversation };
