# 🚀# UniSocial — United Social Platforms

A social media management tool that allows you to manage 13 social media platforms in one place. Supports Korean, English, Chinese, and Japanese.
13개 소셜미디어 플랫폼을 통합 관리할 수 있는 소셜 미디어 관리 도구. 한국어·English·中文·日本語 지원.

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React PWA   │────→│  Express Backend  │────→│  Late API   │──→ 13 Platforms
│  (Frontend)  │     │                  │     └─────────────┘
└──────────────┘     │  PostgreSQL      │
                     │  Claude AI       │──→ Caption/Translation
                     │  PortOne         │──→ Payments (KR)
                     └──────────────────┘
```

## Supported Platforms (13)

| Platform | Text | Image | Video | Scheduling | Notes |
|----------|:----:|:-----:|:-----:|:----------:|-------|
| Instagram | ✅ | ✅ | ✅ | ✅ | Reels, Stories, Carousel |
| TikTok | ✅ | — | ✅ | ✅ | 1s~10min |
| YouTube | ✅ | — | ✅ | ✅ | Requires title, Shorts auto-detect |
| Twitter/X | ✅ | ✅ | ✅ | ✅ | 280 chars, Threads |
| Facebook | ✅ | ✅ | ✅ | ✅ | Pages supported |
| LinkedIn | ✅ | ✅ | ✅ | ✅ | Articles, Documents |
| Threads | ✅ | ✅ | ✅ | ✅ | 500 chars |
| Reddit | ✅ | ✅ | ✅ | ✅ | Requires title |
| Pinterest | ✅ | ✅ | ✅ | ✅ | Requires link |
| Bluesky | ✅ | ✅ | — | ✅ | 300 chars |
| Telegram | ✅ | ✅ | ✅ | ✅ | Documents |
| Snapchat | ✅ | ✅ | ✅ | ✅ | |
| Google Business | ✅ | ✅ | — | ✅ | Updates, Offers, Events |

## Languages (4)

| Language | Code | API responses | AI captions | Translation |
|----------|:----:|:------------:|:-----------:|:-----------:|
| 한국어 | `ko` | ✅ | ✅ | ✅ |
| English | `en` | ✅ | ✅ | ✅ |
| 中文 | `zh` | ✅ | ✅ | ✅ |
| 日本語 | `ja` | ✅ | ✅ | ✅ |

Set language via: `?lang=en`, header `X-Language: en`, or user preference.

## Quick Start

```bash
cd backend
npm install
cp .env.example .env    # Fill in LATE_API_KEY + DATABASE_URL
npm start               # → http://localhost:3001
```

### Prerequisites

| Required | URL | Notes |
|----------|-----|-------|
| Node.js 18+ | nodejs.org | |
| PostgreSQL | | `createdb social_hub` |
| Late account | https://getlate.dev | Free: 10 posts/month |

| Optional | URL | Notes |
|----------|-----|-------|
| Anthropic API | https://console.anthropic.com | AI captions (default fallback works without) |
| PortOne | https://admin.portone.io | Payments (needs Korean business registration) |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register (with language pref) |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | My info |
| PATCH | `/api/auth/language` | Update language |

### Posts (Cross-posting)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/posts` | **Cross-post to multiple platforms** |
| GET | `/api/posts` | Post history |
| DELETE | `/api/posts/:id` | Delete post |

### Social Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/accounts` | Connected accounts |
| POST | `/api/social/sync` | Sync from Late |
| GET | `/api/social/connect/:platform` | Get OAuth URL |
| GET | `/api/social/profiles` | Late profiles |
| GET | `/api/social/platforms` | Platform features |
| DELETE | `/api/social/accounts/:id` | Disconnect |

### AI (Claude)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/suggest` | Caption + hashtags (multilingual) |
| POST | `/api/ai/ideas` | Content ideas (multilingual) |
| POST | `/api/ai/translate` | **Translate content across languages** |

### Subscription (PortOne)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscription/plans` | Plan list |
| GET | `/api/subscription/me` | My subscription |
| GET | `/api/subscription/usage` | Usage stats |
| POST | `/api/subscription/subscribe` | Start subscription |
| POST | `/api/subscription/cancel` | Cancel |

## Cross-posting Example

```bash
curl -X POST http://localhost:3001/api/posts \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -H "X-Language: ko" \
  -d '{
    "content": "새로운 영상 올렸습니다! 🎬",
    "platforms": ["youtube", "instagram", "twitter", "threads"],
    "platformSpecific": {
      "youtube": { "title": "새 영상 타이틀", "visibility": "public" },
      "reddit": { "title": "Check out my new video" }
    },
    "mediaItems": [{"type": "video", "url": "https://...mp4"}]
  }'
```

## Translation Example

```bash
curl -X POST http://localhost:3001/api/ai/translate \
  -H "Authorization: Bearer YOUR_JWT" \
  -d '{
    "content": "오늘 새로운 영상을 올렸어요! 많이 봐주세요 🎬",
    "fromLang": "ko",
    "toLangs": ["en", "zh", "ja"]
  }'

# Response:
# {
#   "translations": {
#     "en": "I uploaded a new video today! Please check it out 🎬",
#     "zh": "今天上传了新视频！请多多观看 🎬",
#     "ja": "今日新しい動画をアップしました！ぜひご覧ください 🎬"
#   }
# }
```

## Project Structure

```
backend/
├── server.js                     # Express + i18n middleware
├── package.json
├── .env.example
├── config/
│   ├── database.js               # PostgreSQL schema (no band)
│   └── i18n.js                   # 🆕 ko/en/zh/ja translations
├── middleware/
│   ├── auth.js                   # JWT auth
│   └── usageLimit.js             # Plan usage limits
├── services/
│   ├── lateService.js            # 🔄 Late API (13 platforms)
│   ├── aiService.js              # 🔄 Claude AI (multilingual + translate)
│   └── paymentService.js         # PortOne payments
└── routes/
    ├── auth.js                   # 🔄 Auth + language preference
    ├── posts.js                  # 🔄 Cross-posting (Late only)
    ├── social.js                 # 🔄 Account management (Late only)
    ├── ai.js                     # 🔄 AI + translation endpoint
    └── subscription.js           # Subscription management
```

## Subscription Plans

| | Free | Basic ₩3,900/mo | Pro ₩9,900/mo |
|--|:--:|:--:|:--:|
| Cross-posting | 5/mo | 50/mo | Unlimited |
| AI Captions | 3/mo | 30/mo | Unlimited |
| Platforms | All 13 | All 13 | All 13 |
| Scheduling | ❌ | ✅ | ✅ |
| Translation | ❌ | ✅ | ✅ |
| History | 7 days | 30 days | Unlimited |

## Cost

| Item | MVP (Free) | Production |
|------|:----------:|:----------:|
| Late API | $0 (10/mo) | $13+ |
| Render | $0 | $14 |
| Claude AI | $0 (fallback) | ~$5 |
| **Total** | **$0** | **~$32/mo** |
| **Break-even** | | **Basic × 9** |
