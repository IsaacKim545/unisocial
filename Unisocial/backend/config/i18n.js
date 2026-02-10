// ─── 다국어 지원 (ko, en, zh, ja) ──────────────────────────
const messages = {
  ko: {
    // 공통
    error_server: "서버 내부 오류가 발생했습니다.",
    error_unauthorized: "인증이 필요합니다.",
    error_forbidden: "접근 권한이 없습니다.",
    // 인증
    auth_signup_success: "회원가입이 완료되었습니다.",
    auth_login_success: "로그인 성공",
    auth_email_exists: "이미 사용 중인 이메일입니다.",
    auth_username_exists: "이미 사용 중인 사용자명입니다.",
    auth_invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
    auth_fields_required: "이메일, 비밀번호, 사용자명을 입력해주세요.",
    // 게시물
    post_created: "게시되었습니다.",
    post_scheduled: "예약되었습니다.",
    post_deleted: "삭제되었습니다.",
    post_not_found: "게시물을 찾을 수 없습니다.",
    post_content_required: "내용과 플랫폼을 지정해주세요.",
    post_error: "게시 중 오류가 발생했습니다.",
    // 소셜 계정
    social_synced: "계정이 동기화되었습니다.",
    social_sync_error: "계정 동기화 중 오류가 발생했습니다.",
    social_disconnected: "연결이 해제되었습니다.",
    social_not_found: "계정을 찾을 수 없습니다.",
    social_connect_url: "아래 URL에서 계정을 연결하세요.",
    // AI
    ai_topic_required: "주제를 입력해주세요.",
    ai_error: "AI 추천 생성 중 오류가 발생했습니다.",
    // 구독
    sub_plan_invalid: "유효한 유료 플랜을 선택해주세요.",
    sub_billing_required: "결제 수단을 먼저 등록해주세요.",
    sub_started: "구독이 시작되었습니다!",
    sub_cancelled: "구독이 취소되었습니다.",
    sub_no_active: "활성 구독이 없습니다.",
    sub_until: "까지 현재 플랜을 이용할 수 있습니다.",
    sub_billing_registered: "결제 수단이 등록되었습니다.",
    // 사용량
    usage_limit_reached: "이번 달 사용 한도에 도달했습니다.",
    usage_upgrade: "플랜을 업그레이드해주세요.",
    usage_schedule_upgrade: "예약 게시는 Basic 이상 플랜에서 사용 가능합니다.",
    // 플랫폼
    platforms: {
      twitter: "X (Twitter)",
      instagram: "Instagram",
      tiktok: "TikTok",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      youtube: "YouTube",
      threads: "Threads",
      reddit: "Reddit",
      pinterest: "Pinterest",
      bluesky: "Bluesky",
      telegram: "Telegram",
      snapchat: "Snapchat",
      googlebusiness: "Google Business",
    },
  },

  en: {
    error_server: "An internal server error occurred.",
    error_unauthorized: "Authentication required.",
    error_forbidden: "Access denied.",
    auth_signup_success: "Account created successfully.",
    auth_login_success: "Login successful.",
    auth_email_exists: "This email is already in use.",
    auth_username_exists: "This username is already taken.",
    auth_invalid_credentials: "Invalid email or password.",
    auth_fields_required: "Please enter email, password, and username.",
    post_created: "Post published.",
    post_scheduled: "Post scheduled.",
    post_deleted: "Post deleted.",
    post_not_found: "Post not found.",
    post_content_required: "Content and platforms are required.",
    post_error: "An error occurred while posting.",
    social_synced: "Accounts synced.",
    social_sync_error: "Error syncing accounts.",
    social_disconnected: "Account disconnected.",
    social_not_found: "Account not found.",
    social_connect_url: "Connect your account at the URL below.",
    ai_topic_required: "Please enter a topic.",
    ai_error: "Error generating AI suggestions.",
    sub_plan_invalid: "Please select a valid paid plan.",
    sub_billing_required: "Please register a payment method first.",
    sub_started: "Subscription started!",
    sub_cancelled: "Subscription cancelled.",
    sub_no_active: "No active subscription.",
    sub_until: "You can use the current plan until",
    sub_billing_registered: "Payment method registered.",
    usage_limit_reached: "Monthly usage limit reached.",
    usage_upgrade: "Please upgrade your plan.",
    usage_schedule_upgrade: "Scheduled posting requires Basic plan or above.",
    platforms: {
      twitter: "X (Twitter)",
      instagram: "Instagram",
      tiktok: "TikTok",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      youtube: "YouTube",
      threads: "Threads",
      reddit: "Reddit",
      pinterest: "Pinterest",
      bluesky: "Bluesky",
      telegram: "Telegram",
      snapchat: "Snapchat",
      googlebusiness: "Google Business",
    },
  },

  zh: {
    error_server: "服务器内部错误。",
    error_unauthorized: "需要认证。",
    error_forbidden: "无访问权限。",
    auth_signup_success: "注册成功。",
    auth_login_success: "登录成功。",
    auth_email_exists: "该邮箱已被使用。",
    auth_username_exists: "该用户名已被使用。",
    auth_invalid_credentials: "邮箱或密码不正确。",
    auth_fields_required: "请输入邮箱、密码和用户名。",
    post_created: "发布成功。",
    post_scheduled: "已预约发布。",
    post_deleted: "已删除。",
    post_not_found: "未找到帖子。",
    post_content_required: "请输入内容并选择平台。",
    post_error: "发布时发生错误。",
    social_synced: "账户已同步。",
    social_sync_error: "同步账户时发生错误。",
    social_disconnected: "已断开连接。",
    social_not_found: "未找到账户。",
    social_connect_url: "请通过以下链接连接账户。",
    ai_topic_required: "请输入主题。",
    ai_error: "生成AI推荐时发生错误。",
    sub_plan_invalid: "请选择有效的付费方案。",
    sub_billing_required: "请先注册支付方式。",
    sub_started: "订阅已开始！",
    sub_cancelled: "订阅已取消。",
    sub_no_active: "没有活跃的订阅。",
    sub_until: "可以使用当前方案直到",
    sub_billing_registered: "支付方式已注册。",
    usage_limit_reached: "本月使用限额已达到。",
    usage_upgrade: "请升级您的方案。",
    usage_schedule_upgrade: "预约发布需要Basic以上方案。",
    platforms: {
      twitter: "X (推特)",
      instagram: "Instagram",
      tiktok: "TikTok (抖音国际版)",
      linkedin: "领英",
      facebook: "脸书",
      youtube: "YouTube",
      threads: "Threads",
      reddit: "Reddit",
      pinterest: "Pinterest",
      bluesky: "Bluesky",
      telegram: "Telegram",
      snapchat: "Snapchat",
      googlebusiness: "Google 商家",
    },
  },

  ja: {
    error_server: "サーバー内部エラーが発生しました。",
    error_unauthorized: "認証が必要です。",
    error_forbidden: "アクセス権限がありません。",
    auth_signup_success: "会員登録が完了しました。",
    auth_login_success: "ログイン成功。",
    auth_email_exists: "このメールアドレスは既に使用されています。",
    auth_username_exists: "このユーザー名は既に使用されています。",
    auth_invalid_credentials: "メールアドレスまたはパスワードが正しくありません。",
    auth_fields_required: "メール、パスワード、ユーザー名を入力してください。",
    post_created: "投稿されました。",
    post_scheduled: "予約されました。",
    post_deleted: "削除されました。",
    post_not_found: "投稿が見つかりません。",
    post_content_required: "内容とプラットフォームを指定してください。",
    post_error: "投稿中にエラーが発生しました。",
    social_synced: "アカウントが同期されました。",
    social_sync_error: "アカウント同期中にエラーが発生しました。",
    social_disconnected: "接続が解除されました。",
    social_not_found: "アカウントが見つかりません。",
    social_connect_url: "下記URLからアカウントを接続してください。",
    ai_topic_required: "トピックを入力してください。",
    ai_error: "AI提案の生成中にエラーが発生しました。",
    sub_plan_invalid: "有効な有料プランを選択してください。",
    sub_billing_required: "先に支払い方法を登録してください。",
    sub_started: "サブスクリプションが開始されました！",
    sub_cancelled: "サブスクリプションがキャンセルされました。",
    sub_no_active: "有効なサブスクリプションがありません。",
    sub_until: "まで現在のプランをご利用いただけます。",
    sub_billing_registered: "支払い方法が登録されました。",
    usage_limit_reached: "今月の使用上限に達しました。",
    usage_upgrade: "プランをアップグレードしてください。",
    usage_schedule_upgrade: "予約投稿はBasic以上のプランで利用可能です。",
    platforms: {
      twitter: "X (Twitter)",
      instagram: "Instagram",
      tiktok: "TikTok",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      youtube: "YouTube",
      threads: "Threads",
      reddit: "Reddit",
      pinterest: "Pinterest",
      bluesky: "Bluesky",
      telegram: "Telegram",
      snapchat: "Snapchat",
      googlebusiness: "Googleビジネス",
    },
  },
};

// 지원 언어 목록
const SUPPORTED_LANGUAGES = ["ko", "en", "zh", "ja"];
const DEFAULT_LANGUAGE = "ko";

// 메시지 가져오기
function t(lang, key) {
  const l = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  return messages[l]?.[key] || messages[DEFAULT_LANGUAGE]?.[key] || key;
}

// 요청에서 언어 감지 미들웨어
function detectLanguage(req, res, next) {
  // 1. 쿼리 파라미터 ?lang=en
  // 2. 헤더 X-Language: en
  // 3. Accept-Language 헤더
  // 4. 기본값: ko
  req.lang =
    req.query.lang ||
    req.headers["x-language"] ||
    (req.headers["accept-language"] || "").split(",")[0]?.split("-")[0] ||
    DEFAULT_LANGUAGE;

  if (!SUPPORTED_LANGUAGES.includes(req.lang)) {
    req.lang = DEFAULT_LANGUAGE;
  }

  // 응답 헤더에 언어 표시
  res.setHeader("Content-Language", req.lang);
  next();
}

module.exports = { t, detectLanguage, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, messages };
