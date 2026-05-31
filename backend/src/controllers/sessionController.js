const { AppDataSource } = require('../config/data-source');

/**
 * POST /api/sessions
 * Create a new conversation session.
 */
async function createSession(req, res) {
  try {
    const sessionRepo = AppDataSource.getRepository('ConversationSession');
    const session = sessionRepo.create({
      user_identifier: req.body.user_identifier || null,
      status: 'active',
    });
    const saved = await sessionRepo.save(session);
    res.status(201).json({ session: saved });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

/**
 * GET /api/sessions/:id
 * Get session details.
 */
async function getSession(req, res) {
  try {
    const sessionRepo = AppDataSource.getRepository('ConversationSession');
    const session = await sessionRepo.findOne({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
}

/**
 * PATCH /api/sessions/:id
 * Update session status.
 */
async function updateSession(req, res) {
  try {
    const sessionRepo = AppDataSource.getRepository('ConversationSession');
    const session = await sessionRepo.findOne({
      where: { id: req.params.id },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (req.body.status) session.status = req.body.status;
    if (req.body.summary) session.summary = req.body.summary;
    if (req.body.collected_preferences) {
      session.collected_preferences = req.body.collected_preferences;
    }

    const updated = await sessionRepo.save(session);
    res.json({ session: updated });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

module.exports = { createSession, getSession, updateSession };
