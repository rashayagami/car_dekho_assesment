const { Router } = require('express');
const {
  getMessages,
  sendMessage,
} = require('../controllers/chatController');

const router = Router();

router.get('/:id/messages', getMessages);
router.post('/:id/messages', sendMessage);

module.exports = router;
