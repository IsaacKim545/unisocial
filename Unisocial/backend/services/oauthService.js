const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const MicrosoftStrategy = require("passport-microsoft").Strategy;
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");

const PROVIDERS = {
  google: { icon: "G", name: "Google" },
  microsoft: { icon: "M", name: "Microsoft" },
  apple: { icon: "", name: "Apple" },
};

// ─── 공통: OAuth 사용자 찾기/생성 ──────────────────────────
async function findOrCreateOAuthUser(provider, profile) {
  const email = profile.emails?.[0]?.value || profile.email;
  if (!email) throw new Error("Email not provided by " + provider);

  // 1) 이미 같은 OAuth로 가입된 유저 확인
  let result = await pool.query(
    "SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2",
    [provider, profile.id]
  );
  if (result.rows.length > 0) return result.rows[0];

  // 2) 같은 이메일로 가입된 유저 확인 → OAuth 연결
  result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  if (result.rows.length > 0) {
    const user = result.rows[0];
    await pool.query(
      "UPDATE users SET oauth_provider = $1, oauth_id = $2, email_verified = true WHERE id = $3",
      [provider, profile.id, user.id]
    );
    return { ...user, oauth_provider: provider, oauth_id: profile.id };
  }

  // 3) 새 유저 생성
  const displayName = profile.displayName || email.split("@")[0];
  // 유니크 username 생성
  let username = displayName.replace(/[^a-zA-Z0-9가-힣]/g, "").slice(0, 30) || "user";
  const existing = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
  if (existing.rows.length > 0) username += "_" + Date.now().toString(36).slice(-4);

  const newUser = await pool.query(
    `INSERT INTO users (email, username, oauth_provider, oauth_id, email_verified, language)
     VALUES ($1, $2, $3, $4, true, $5) RETURNING *`,
    [email, username, provider, profile.id, "ko"]
  );
  return newUser.rows[0];
}

// ─── JWT 발급 ───────────────────────────────────────────
function issueToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// ─── Google Strategy ────────────────────────────────────
function setupGoogle() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log("ℹ️  Google OAuth: not configured (GOOGLE_CLIENT_ID missing)");
    return false;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: (process.env.BASE_URL || "http://localhost:3001") + "/api/auth/google/callback",
    scope: ["email", "profile"],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser("google", profile);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
  console.log("✅ Google OAuth configured");
  return true;
}

// ─── Microsoft Strategy ─────────────────────────────────
function setupMicrosoft() {
  if (!process.env.MICROSOFT_CLIENT_ID || !process.env.MICROSOFT_CLIENT_SECRET) {
    console.log("ℹ️  Microsoft OAuth: not configured (MICROSOFT_CLIENT_ID missing)");
    return false;
  }

  passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: (process.env.BASE_URL || "http://localhost:3001") + "/api/auth/microsoft/callback",
    scope: ["user.read"],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser("microsoft", profile);
      done(null, user);
    } catch (err) {
      done(err);
    }
  }));
  console.log("✅ Microsoft OAuth configured");
  return true;
}

// ─── Apple Strategy ─────────────────────────────────────
function setupApple() {
  // Apple Sign In은 추가 설정이 복잡 (private key 파일 필요)
  // 여기서는 수동 OAuth2 플로우로 구현
  if (!process.env.APPLE_CLIENT_ID || !process.env.APPLE_CLIENT_SECRET) {
    console.log("ℹ️  Apple OAuth: not configured (APPLE_CLIENT_ID missing)");
    return false;
  }
  console.log("✅ Apple OAuth configured");
  return true;
}

// ─── 초기화 ─────────────────────────────────────────────
function initOAuth(app) {
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user, done) => done(null, user));

  app.use(passport.initialize());

  const enabled = {
    google: setupGoogle(),
    microsoft: setupMicrosoft(),
    apple: setupApple(),
  };

  // ─── OAuth Routes ─────────────────────────────────────
  const router = require("express").Router();

  // 활성화된 프로바이더 목록 반환
  router.get("/providers", (req, res) => {
    res.json({
      providers: Object.entries(enabled)
        .filter(([, v]) => v)
        .map(([k]) => ({ id: k, ...PROVIDERS[k] })),
    });
  });

  // ─── Google ───────────────────────────────────────────
  if (enabled.google) {
    router.get("/google", passport.authenticate("google", { session: false, scope: ["email", "profile"] }));

    router.get("/google/callback",
      passport.authenticate("google", { session: false, failureRedirect: (process.env.FRONTEND_URL || "http://localhost:5173") + "/?error=google_failed" }),
      (req, res) => {
        const token = issueToken(req.user);
        const user = JSON.stringify({ id: req.user.id, email: req.user.email, username: req.user.username, language: req.user.language });
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/?token=${token}&user=${encodeURIComponent(user)}`);
      }
    );
  }

  // ─── Microsoft ────────────────────────────────────────
  if (enabled.microsoft) {
    router.get("/microsoft", passport.authenticate("microsoft", { session: false }));

    router.get("/microsoft/callback",
      passport.authenticate("microsoft", { session: false, failureRedirect: (process.env.FRONTEND_URL || "http://localhost:5173") + "/?error=microsoft_failed" }),
      (req, res) => {
        const token = issueToken(req.user);
        const user = JSON.stringify({ id: req.user.id, email: req.user.email, username: req.user.username, language: req.user.language });
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/?token=${token}&user=${encodeURIComponent(user)}`);
      }
    );
  }

  // ─── Apple (수동 OAuth2 플로우) ───────────────────────
  if (enabled.apple) {
    router.get("/apple", (req, res) => {
      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        redirect_uri: (process.env.BASE_URL || "http://localhost:3001") + "/api/auth/apple/callback",
        response_type: "code id_token",
        scope: "name email",
        response_mode: "form_post",
      });
      res.redirect("https://appleid.apple.com/auth/authorize?" + params.toString());
    });

    router.post("/apple/callback", require("express").urlencoded({ extended: true }), async (req, res) => {
      try {
        const { id_token, code } = req.body;
        // id_token 디코드 (JWT 페이로드)
        const payload = JSON.parse(Buffer.from(id_token.split(".")[1], "base64").toString());
        const profile = {
          id: payload.sub,
          emails: [{ value: payload.email }],
          displayName: req.body.user ? JSON.parse(req.body.user).name?.firstName : payload.email.split("@")[0],
        };
        const user = await findOrCreateOAuthUser("apple", profile);
        const token = issueToken(user);
        const userData = JSON.stringify({ id: user.id, email: user.email, username: user.username, language: user.language });
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(`${frontendUrl}/?token=${token}&user=${encodeURIComponent(userData)}`);
      } catch (err) {
        console.error("Apple OAuth error:", err);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        res.redirect(frontendUrl + "/?error=apple_failed");
      }
    });
  }

  return router;
}

module.exports = { initOAuth };
