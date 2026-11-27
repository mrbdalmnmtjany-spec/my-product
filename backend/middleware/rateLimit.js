/**
 * Rate limiter بسيط في الذاكرة — مفيش داعي لمكتبة خارجية أو Redis لمشروع بالحجم ده.
 * بيحسب المحاولات لكل IP خلال نافذة زمنية، ولو حد عدّى الحد بيرجعله 429.
 *
 * ملحوظة: في حالة تشغيل السيرفر على أكتر من instance (load balancer)،
 * كل instance هيبقى له عداده الخاص. لو المشروع كبر لحد كده، الأفضل ننقل
 * الحالة لـ Redis. لحجم المشروع الحالي ده كفاية ومفيش تعقيد زيادة.
 */
const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map(); // ip -> [timestamps]

  // تنظيف دوري عشان الـ Map ميكبرش للأبد على سيرفر شغال لفترة طويلة
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of hits.entries()) {
      const fresh = timestamps.filter((t) => now - t < windowMs);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || "unknown";
    const now = Date.now();
    const timestamps = (hits.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      return res.status(429).json({
        message: message || "محاولات كتيرة، استنى شوية وحاول تاني",
      });
    }

    timestamps.push(now);
    hits.set(key, timestamps);
    next();
  };
};

module.exports = { createRateLimiter };
