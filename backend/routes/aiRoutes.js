const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimit');
const { chatWithAI } = require('../controllers/aiController');
const router = express.Router();
const aiLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 12, message: 'طلبات Moaaz AI كثيرة. انتظر دقيقة ثم حاول مجدداً.' });
router.post('/chat', protect, aiLimiter, chatWithAI);
module.exports = router;
