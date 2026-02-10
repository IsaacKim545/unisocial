const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// Late 지원 플랫폼 (13개)
const SUPPORTED_PLATFORMS = [
  "twitter", "instagram", "tiktok", "linkedin", "facebook",
  "youtube", "threads", "reddit", "pinterest", "bluesky",
  "telegram", "snapchat", "googlebusiness",
];

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- 사용자
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        username VARCHAR(50) UNIQUE NOT NULL,
        language VARCHAR(5) DEFAULT 'ko',
        email_verified BOOLEAN DEFAULT false,
        oauth_provider VARCHAR(20),
        oauth_id VARCHAR(255),
        billing_key VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- OAuth 컬럼 추가 (기존 테이블 마이그레이션)
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN oauth_provider VARCHAR(20);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN oauth_id VARCHAR(255);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
      DO $$ BEGIN
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      EXCEPTION WHEN others THEN NULL;
      END $$;

      -- 이메일 인증 코드
      CREATE TABLE IF NOT EXISTS email_verifications (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 기존 users 테이블에 email_verified 컬럼 추가 (이미 존재하면 무시)
      DO $$ BEGIN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;

      -- 소셜 계정 연동 (Late 통합)
      CREATE TABLE IF NOT EXISTS social_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(30) NOT NULL,
        platform_username VARCHAR(255),
        late_account_id VARCHAR(255),
        profile_data JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        connected_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, platform, late_account_id)
      );

      -- 게시물
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT DEFAULT '',
        media_urls JSONB DEFAULT '[]',
        platforms JSONB DEFAULT '[]',
        platform_specific JSONB DEFAULT '{}',
        platform_results JSONB DEFAULT '{}',
        late_post_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'draft'
          CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed')),
        scheduled_at TIMESTAMPTZ,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 구독 정보
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR(20) NOT NULL DEFAULT 'free'
          CHECK (plan IN ('free', 'basic', 'pro')),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'cancelling', 'cancelled', 'past_due')),
        billing_key VARCHAR(255),
        portone_payment_id VARCHAR(255),
        amount INTEGER DEFAULT 0,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 결제 내역
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        subscription_id INTEGER REFERENCES subscriptions(id),
        portone_payment_id VARCHAR(255),
        amount INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('paid', 'failed', 'refunded')),
        paid_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- AI 사용 기록
      CREATE TABLE IF NOT EXISTS ai_usage_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(50) NOT NULL,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 인덱스
      CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_posts_scheduled ON posts(scheduled_at) WHERE status = 'scheduled';
      CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_user_month ON ai_usage_log(user_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
    `);

    // 기존 DB 마이그레이션: updated_at 컬럼 추가
    await client.query(`
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE posts ALTER COLUMN content DROP NOT NULL;
    `).catch(() => {});
    console.log("✅ Database tables initialized");
  } catch (err) {
    console.error("❌ DB init failed:", err.message);
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB, SUPPORTED_PLATFORMS };
