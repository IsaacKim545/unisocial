# UniSocial

**Full-stack social media management tool — 13 platforms, one dashboard.**

React + Node.js + PostgreSQL로 구현한 소셜 미디어 통합 관리 애플리케이션입니다.  
플랫폼별 게시 양식, 다국어 번역, AI 캡션 생성, 예약 게시를 단일 인터페이스에서 지원합니다.

> **Portfolio Project** — 플랫폼 게시는 Late API에 의존하며, 프로덕션 배포에는 각 플랫폼 공식 API 직접 연동이 필요합니다.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router, Context API, Framer Motion |
| **Backend** | Node.js, Express, PostgreSQL, JWT |
| **External** | Late API (13 platforms), DeepL (translation), Claude AI (caption), PortOne (payment) |

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│  Frontend (Vite)    │  REST   │  Backend (Express)   │
│  React + Tailwind   │────────→│  JWT Auth + PG       │
│  Context API        │         │                      │
│  React Router       │         │  ┌─ Late API ──→ 13 Social Platforms
└─────────────────────┘         │  ├─ DeepL ─────→ 20 Languages
                                │  ├─ Claude AI ──→ Captions & Ideas
                                │  └─ PortOne ───→ Payments (KR)
                                └─────────────────────┘
```

## Features

### Post Editor
- Platform-specific fields: title, caption, tags, subreddit, link 등 플랫폼에 맞는 입력 양식 자동 전환
- 이미지/동영상 업로드 with 드래그 앤 드롭, 미리보기, 라이트박스
- 캐릭터 카운트 프로그레스바 (플랫폼별 제한)
- 3가지 예약 모드: 즉시 게시 / 날짜 지정 / N시간 후

### Multi-language Distribution
- UI 4개 국어: 한국어, English, 中文, 日本語
- DeepL 자동 번역으로 최대 20개 언어 동시 게시
- API 응답, 에러 메시지, 이메일 전체 로컬라이즈

### Authentication
- 이메일 가입 + 6자리 인증 코드
- Google / Microsoft / Apple OAuth
- JWT 세션 (Remember me), 비밀번호 재설정

### Subscription
- Free (₩0, 5건/월) / Basic (₩3,900, 50건/월) / Pro (₩9,900, 무제한)
- PortOne 결제 연동 (한국)

### UI/UX
- 커스텀 디자인 시스템 (DM Sans + JetBrains Mono)
- 다크 모드, 모바일 반응형 (사이드바 → 오버레이 메뉴)
- Toast 알림, Framer Motion 애니메이션

## Project Structure

```
backend/
├── server.js                  # Express 서버 + 미들웨어 설정
├── config/
│   ├── database.js            # PostgreSQL 스키마 + 연결
│   └── i18n.js                # 서버 측 다국어 (ko/en/zh/ja)
├── middleware/
│   ├── auth.js                # JWT 인증
│   └── usageLimit.js          # 플랜별 사용량 제한
├── routes/
│   ├── auth.js                # 회원가입, 로그인, OAuth, 비밀번호 재설정
│   ├── posts.js               # 게시물 CRUD + 예약
│   ├── social.js              # 계정 연결/해제/동기화
│   ├── ai.js                  # AI 캡션 + 번역
│   └── subscription.js        # 구독 관리
└── services/
    ├── lateService.js         # Late API 클라이언트
    ├── aiService.js           # Claude AI 클라이언트
    ├── translateService.js    # DeepL 번역
    ├── emailService.js        # SMTP 이메일
    ├── oauthService.js        # Google/MS/Apple OAuth
    └── paymentService.js      # PortOne 결제

frontend/
├── src/
│   ├── App.jsx                # 라우터 + 프로바이더 설정
│   ├── api/client.js          # API 클라이언트 (토큰, 에러 처리)
│   ├── components/
│   │   ├── ErrorBoundary.jsx  # 에러 경계 (크래시 방지)
│   │   ├── Layout.jsx         # 레이아웃 (사이드바 + 콘텐츠)
│   │   ├── ProtectedRoute.jsx # 인증 가드
│   │   └── Sidebar.jsx        # 네비게이션 사이드바
│   ├── context/
│   │   ├── AuthContext.jsx    # 인증 상태
│   │   ├── AccountsContext.jsx# 소셜 계정 + 자동 동기화
│   │   ├── LangContext.jsx    # 언어 전환
│   │   └── ToastContext.jsx   # 토스트 알림
│   ├── pages/
│   │   ├── Dashboard.jsx      # 통계 + 최근 게시물
│   │   ├── Compose.jsx        # 게시물 에디터
│   │   ├── History.jsx        # 게시 기록
│   │   ├── Accounts.jsx       # 계정 연결/해제
│   │   ├── Login.jsx          # 로그인 + OAuth
│   │   ├── Signup.jsx         # 회원가입 + 이메일 인증
│   │   └── ForgotPassword.jsx # 비밀번호 재설정
│   ├── data/platforms.js      # 13개 플랫폼 정의 + 필드 스키마
│   └── i18n/index.js          # 프론트엔드 다국어
└── tailwind.config.js         # 커스텀 테마
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL

### Install & Run

```bash
# Backend
cd backend
npm install
cp .env.example .env    # API 키 설정
npm start               # → http://localhost:3001
```

```bash
# Frontend
cd frontend
npm install
npm run dev             # → http://localhost:5173
```

### Environment Variables

`backend/.env.example` 참조. 주요 항목:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL 연결 문자열 |
| `JWT_SECRET` | ✅ | JWT 서명 키 |
| `LATE_API_KEY` | ✅ | Late API 키 ([getlate.dev](https://getlate.dev)) |
| `FRONTEND_URL` | ✅ | 프론트엔드 URL |
| `DEEPL_API_KEY` | | DeepL 번역 (무료 플랜 가능) |
| `ANTHROPIC_API_KEY` | | Claude AI 캡션 생성 |
| `SMTP_*` | | 이메일 발송 (미설정 시 콘솔 출력) |
| `GOOGLE_CLIENT_*` | | Google OAuth |
| `MICROSOFT_CLIENT_*` | | Microsoft OAuth |
| `APPLE_CLIENT_*` | | Apple OAuth |
| `PORTONE_*` | | PortOne 결제 (사업자등록 필요) |

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | 회원가입 (이메일 인증) |
| POST | `/api/auth/verify` | 인증 코드 확인 |
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/forgot-password` | 비밀번호 재설정 요청 |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 |

### Posts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/posts` | 게시물 생성 |
| GET | `/api/posts` | 게시 기록 조회 |
| PUT | `/api/posts/:id` | 예약 게시물 수정 |
| DELETE | `/api/posts/:id` | 게시물 삭제 |

### Social Accounts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/social/accounts` | 연결된 계정 목록 |
| POST | `/api/social/sync` | Late API 동기화 |
| GET | `/api/social/connect/:platform` | 플랫폼 OAuth 연결 |
| DELETE | `/api/social/accounts/:id` | 계정 연결 해제 |
| POST | `/api/social/accounts/:id/reconnect` | 재연결 |

### AI & Translation
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/ai/suggest` | AI 캡션 + 해시태그 생성 |
| POST | `/api/ai/ideas` | 콘텐츠 아이디어 |
| POST | `/api/ai/translate` | 다국어 번역 (최대 20개) |

### Subscription
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subscription/plans` | 플랜 목록 |
| GET | `/api/subscription/me` | 내 구독 정보 |
| POST | `/api/subscription/subscribe` | 구독 |
| POST | `/api/subscription/cancel` | 구독 취소 |

## Supported Platforms

| Platform | Type | ID |
|----------|------|----|
| X (Twitter) | Text + Media | `twitter` |
| YouTube | Media | `youtube` |
| Instagram | Media | `instagram` |
| TikTok | Media | `tiktok` |
| Facebook | Text + Media | `facebook` |
| LinkedIn | Text + Media | `linkedin` |
| Threads | Text + Media | `threads` |
| Reddit | Text + Media | `reddit` |
| Telegram | Text + Media | `telegram` |
| Pinterest | Media | `pinterest` |
| Bluesky | Text | `bluesky` |
| Google Business | Text + Media | `googlebusiness` |
| Snapchat | Media | `snapchat` |

## Limitations

- **Late API 의존**: 플랫폼 게시가 Late API에 의존합니다. 프로덕션에는 각 플랫폼 공식 API(X API, Meta Graph API 등) 직접 연동이 필요합니다.
- **결제 테스트**: PortOne 라이브 테스트에는 한국 사업자등록이 필요합니다.
- **미디어 호스팅**: catbox.moe를 사용한 퍼블릭 URL 변환. 프로덕션에는 S3 또는 Cloudflare R2가 필요합니다.
