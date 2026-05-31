const { AppDataSource } = require('../config/data-source');
const { processMessage, summarizeConversation } = require('../services/groqService');

/**
 * GET /api/sessions/:id/messages
 * Get paginated message history for a session.
 */
async function getMessages(req, res) {
  try {
    const sessionId = req.params.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const convRepo = AppDataSource.getRepository('Conversation');

    const [messages, total] = await convRepo.findAndCount({
      where: { session_id: sessionId },
      order: { sequence_number: 'ASC' },
      skip: offset,
      take: limit,
    });

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
        has_more: offset + limit < total,
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * POST /api/sessions/:id/messages
 * Send a message (text or form answer) and get AI response.
 */
async function sendMessage(req, res) {
  try {
    const sessionId = req.params.id;
    const { content, message_type = 'text', form_data, question_id } = req.body;

    const sessionRepo = AppDataSource.getRepository('ConversationSession');
    const convRepo = AppDataSource.getRepository('Conversation');
    const answerRepo = AppDataSource.getRepository('ConversationAnswer');

    // Verify session exists and is active
    const session = await sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Session is no longer active' });
    }

    // Get current message count for sequence numbering
    const messageCount = await convRepo.count({
      where: { session_id: sessionId },
    });

    // Build user message content
    let userContent = content || '';
    if (message_type === 'form_response' && form_data) {
      userContent =
        userContent ||
        Object.values(form_data)
          .flat()
          .map((v) => String(v).replace(/_/g, ' '))
          .join(', ');
    }

    // Save the user message
    const userMessage = convRepo.create({
      session_id: sessionId,
      role: 'user',
      content: userContent,
      message_type: message_type,
      metadata: form_data ? { answer_value: form_data } : null,
      sequence_number: messageCount + 1,
    });
    const savedUserMsg = await convRepo.save(userMessage);

    // If this is a form response, save to conversation_answers
    if (message_type === 'form_response' && form_data) {
      const answer = answerRepo.create({
        session_id: sessionId,
        conversation_id: savedUserMsg.id,
        question_id: question_id || null,
        answer_value: form_data,
      });
      await answerRepo.save(answer);

      // Update collected preferences on the session
      const currentPrefs = session.collected_preferences || {};
      session.collected_preferences = { ...currentPrefs, ...form_data };
      await sessionRepo.save(session);

      // Mark all prior form requests in this session as inactive in the database
      try {
        await convRepo
          .createQueryBuilder()
          .update()
          .set({ is_active: false })
          .where('session_id = :sessionId AND message_type = :type AND is_active = true', {
            sessionId,
            type: 'form_request',
          })
          .execute();
      } catch (dbErr) {
        console.error('Failed to deactivate prior form requests:', dbErr.message);
      }
    }

    // --- Get active messages for AI context ---
    let contextSummary = session.summary || null;

    // Fetch only active messages for context
    const activeMessages = await convRepo.find({
      where: { session_id: sessionId, is_active: true },
      order: { sequence_number: 'ASC' },
    });

    // Process with Gemini (pass summary as additional context)
    const aiResponse = await processMessage(activeMessages, userContent, contextSummary);

    // Save the assistant response
    const assistantMessage = convRepo.create({
      session_id: sessionId,
      role: 'assistant',
      content: aiResponse.textContent,
      message_type: aiResponse.formConfig ? 'form_request' : 'text',
      form_config: aiResponse.formConfig || null,
      metadata: {
        function_called: aiResponse.functionCallName,
        search_results: aiResponse.searchResults || null,
      },
      sequence_number: messageCount + 2,
    });
    const savedAssistantMsg = await convRepo.save(assistantMessage);

    // --- Rolling summarization: check if active messages hit 10 ---
    const activeCount = await convRepo.count({
      where: { session_id: sessionId, is_active: true },
    });

    if (activeCount >= 10) {
      // Fetch all active messages to summarize (including form configs)
      const toSummarize = await convRepo.find({
        where: { session_id: sessionId, is_active: true },
        order: { sequence_number: 'ASC' },
      });

      try {
        // Build summary content including form interactions
        const summaryInput = toSummarize.map((m) => {
          let text = `${m.role}: ${m.content || ''}`;
          if (m.form_config) {
            text += ` [Form: ${m.form_config.form_component_type || 'unknown'} - "${m.form_config.label || ''}"]`;
          }
          if (m.metadata?.answer_value) {
            text += ` [Answer: ${JSON.stringify(m.metadata.answer_value)}]`;
          }
          return text;
        });

        const newSummary = await summarizeConversation(
          toSummarize,
          contextSummary
        );

        // Update session summary (cumulative)
        session.summary = newSummary;
        await sessionRepo.save(session);

        // Mark all active messages as inactive
        await convRepo
          .createQueryBuilder()
          .update()
          .set({ is_active: false })
          .where('session_id = :sessionId AND is_active = true', { sessionId })
          .execute();

        console.log(`Summarized and archived ${toSummarize.length} messages for session ${sessionId}`);
      } catch (sumErr) {
        console.error('Summarization failed, keeping messages active:', sumErr.message);
      }
    }

    res.json({
      user_message: savedUserMsg,
      assistant_message: savedAssistantMsg,
    });
  } catch (error) {
    // Full error details in server console only
    console.error('─── MESSAGE ERROR ───');
    console.error('Message:', error?.message);
    console.error('Status:', error?.status || error?.statusCode);
    console.error('Code:', error?.code);
    console.error('Name:', error?.name);
    console.error('Details:', error?.errorDetails || error?.details);
    console.error('Stack:', error?.stack);
    console.error('─────────────────────');

    const errMsg = (error?.message || '').toLowerCase();
    const errStatus = error?.status || error?.statusCode || 0;

    if (errStatus === 429 || errMsg.includes('429') || errMsg.includes('resource exhausted') || errMsg.includes('rate limit')) {
      return res.status(429).json({ error: 'Please wait a moment and try again.', code: 'RATE_LIMITED' });
    }
    if (errStatus === 403 || errMsg.includes('403') || errMsg.includes('api key') || errMsg.includes('permission denied')) {
      return res.status(403).json({ error: 'Service configuration error. Please contact support.', code: 'AUTH_FAILED' });
    }
    if (error?.code === 'ECONNABORTED' || errMsg.includes('timeout') || errMsg.includes('deadline')) {
      return res.status(504).json({ error: 'Response took too long. Please try again.', code: 'TIMEOUT' });
    }

    res.status(500).json({ error: 'Something went wrong. Please try again.', code: 'INTERNAL_ERROR' });
  }
}

module.exports = { getMessages, sendMessage };
