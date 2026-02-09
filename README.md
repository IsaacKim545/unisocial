# UniSocial — United Social Platforms

Full-stack social media management tool (React + Node.js + PostgreSQL)

> **Portfolio Project**: 소셜 미디어 통합 관리 도구의 풀스택 구현. 플랫폼 게시 기능은 Late API에 의존하며, 프로덕션 배포를 위해서는 각 플랫폼 공식 API 직접 연동이 필요합니다.

## Tech Stack

**Frontend**: React 18, Vite, Tailwind CSS, React Router, Context API, Framer Motion  
**Backend**: Node.js, Express, PostgreSQL, JWT  
**External**: Late API (platform integration), DeepL (translation), Claude AI (caption), PortOne (payment)

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   React + Vite   │────→│  Express + PG    │
│   Tailwind CSS   │     │                  │──→ Late API ──→ Social Platforms
│   Context API    │     │  JWT Auth        │──→ DeepL ──→ Translation
│   React Router   │     │  Usage Limits    │──→ Claude AI ──→ Captions
└──────────────────┘     │                  │──→ PortOne ──→ Payments
                         └──────────────────┘
```

## Features

### Authentication
- Email signup + 6-digit verification code
- Google / Microsoft / Apple OAuth
- JWT session (Remember me)
- Password reset via email

### Post Editor
- Platform-specific field switching (title, caption, tags, subreddit, etc.)
- Media upload (image/video) + preview with lightbox
- Drag & drop file upload
- Character count progress bar per platform
- 3 scheduling modes: immediate / date / delay

### Multi-language
- UI: 한국어, English, 中文, 日本語
- API responses, error messages, emails all localized
- DeepL translation (up to 20 target languages per post)

### Subscription
- 3 tiers: Free (₩0, 5/mo), Basic (₩3,900, 50/mo), Pro (₩9,900, unlimited)
- PortOne payment integration (Korea)
- Usage tracking + plan-based limits

### Frontend
- Custom design system (DM Sans / JetBrains Mono)
- Mobile responsive (sidebar → overlay menu)
- Dark mode support
- Toast notification system
- Framer Motion animations

## Project Structure

```
backend/
├── server.js
├── config/
│   ├── database.js            # PostgreSQL schema
│   └── i18n.js                # ko/en/zh/ja translations
├── middleware/
│   ├── auth.js                # JWT auth (header + query param)
│   └── usageLimit.js          # Plan usage limits
├── routes/
│   ├── auth.js                # Signup, login, OAuth, password reset
│   ├── posts.js               # Post, schedule, edit, delete
│   ├── social.js              # Account sync, connect, disconnect
│   ├── ai.js                  # AI caption, translation
│   └── subscription.js        # Subscription management
└── services/
    ├── lateService.js         # Late API client
    ├── aiService.js           # Claude AI client
    ├── translateService.js    # DeepL translation
    ├── emailService.js        # Email delivery
    ├── oauthService.js        # Google/MS/Apple OAuth
    └── paymentService.js      # PortOne payment

frontend/
├── src/
│   ├── api/client.js          # API client (token, error handling)
│   ├── context/
│   │   ├── AuthContext.jsx    # Auth state
│   │   ├── AccountsContext.jsx# Social accounts + auto sync
│   │   ├── LangContext.jsx    # Language switching
│   │   └── ToastContext.jsx   # Notifications
│   ├── pages/
│   │   ├── Dashboard.jsx      # Stats + recent posts + onboarding
│   │   ├── Compose.jsx        # Post editor (per-platform fields)
│   │   ├── History.jsx        # Post history
│   │   ├── Accounts.jsx       # Connect / disconnect / reconnect
│   │   ├── Login.jsx          # Login + OAuth
│   │   ├── Signup.jsx         # Signup + email verification
│   │   └── ForgotPassword.jsx
│   └── data/platforms.js      # 13 platform definitions + field schema
└── tailwind.config.js         # Custom theme
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL

### Install

```bash
# Backend
cd backend
npm install
cp .env.example .env    # Set API keys
npm start               # → http://localhost:3001

# Frontend
cd frontend
npm install
npm run dev             # → http://localhost:5173
```

### Environment Variables (.env)

```
DATABASE_URL=postgresql://user:pass@localhost:5432/social_hub
JWT_SECRET=your-secret
LATE_API_KEY=your-late-api-key
FRONTEND_URL=http://localhost:5173

# Optional
DEEPL_API_KEY=your-deepl-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Signup (email verification) |
| POST | `/api/auth/verify` | Verify code |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/forgot-password` | Password reset request |
| POST | `/api/auth/reset-password` | Password reset |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/posts` | Create post |
| GET | `/api/posts` | Post history |
| PUT | `/api/posts/:id` | Edit scheduled post |
| DELETE | `/api/posts/:id` | Delete |

### Social Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/accounts` | Connected accounts |
| POST | `/api/social/sync` | Sync from Late |
| GET | `/api/social/connect/:platform` | Platform OAuth |
| DELETE | `/api/social/accounts/:id` | Disconnect |
| POST | `/api/social/accounts/:id/reconnect` | Reconnect |

### AI / Translation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/suggest` | AI caption + hashtags |
| POST | `/api/ai/ideas` | Content ideas |
| POST | `/api/ai/translate` | Translate (up to 20 languages) |

### Subscription
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscription/plans` | Plan list |
| GET | `/api/subscription/me` | My subscription |
| POST | `/api/subscription/subscribe` | Subscribe |
| POST | `/api/subscription/cancel` | Cancel |

## Limitations

- **Late API dependency**: Platform posting relies on Late API. Direct platform API integration (X API, Meta Graph API, etc.) is needed for production.
- **Payment testing**: PortOne integration requires Korean business registration for live testing.
- **Media hosting**: Uses catbox.moe for public URL conversion. Production would need S3 or CloudFlare R2.

## License

MIT
| Late API | $0 (10/mo) | $13+ |
| Render | $0 | $14 |
| Claude AI | $0 (fallback) | ~$5 |
| **Total** | **$0** | **~$32/mo** |
| **Break-even** | | **Basic × 9** |
