const { auth } = require("../config/firebase");

async function authMiddleware(req, res, next) {
  let idToken = null;
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    idToken = header.split(" ")[1];
  }
  if (!idToken && req.query.token) {
    idToken = req.query.token;
  }
  if (!idToken) {
    return res.status(401).json({ error: "인증이 필요합니다." });
  }
  try {
    const decoded = await auth.verifyIdToken(idToken);
    req.user = { id: decoded.uid, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
  }
}

module.exports = authMiddleware;
