const { Router } = require('express');
const {
  createSession,
  getSession,
  updateSession,
} = require('../controllers/sessionController');

const router = Router();

router.post('/', createSession);
router.get('/:id', getSession);
router.patch('/:id', updateSession);

module.exports = router;
