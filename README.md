# UniSocial

13개 소셜 미디어 플랫폼을 하나의 대시보드에서 관리하는 크로스포스팅 SaaS.

## 지원 플랫폼

Twitter(X), Instagram, TikTok, LinkedIn, Facebook, YouTube, Threads, Reddit, Pinterest, Bluesky, Telegram, Snapchat, Google Business

## 주요 기능

- **크로스포스팅** — 한 번의 작성으로 여러 플랫폼에 동시 게시
- **예약 게시** — 원하는 시간에 자동 발행 (Basic 이상)
- **AI 캡션 추천** — Claude API 기반 플랫폼별 최적화 캡션 생성
- **콘텐츠 번역** — DeepL API로 20개 언어 번역
- **다국어 UI** — 한국어, English, 中文, 日本語
- **구독 결제** — PortOne 기반 정기결제 (Free / Basic / Pro)
- **OAuth 로그인** — Google, Microsoft, Apple

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion |
| **Backend** | Firebase Cloud Functions (Node.js 20, Express) |
| **Database** | Cloud Firestore |
| **Auth** | Firebase Authentication |
| **Storage** | Firebase Storage |
| **배포 리전** | asia-northeast3 (서울) |
| **외부 API** | Late API, Claude API, DeepL API, PortOne V2 |

## 프로젝트 구조

```
Unisocial/
├── backend/
│   ├── firebase.json
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   ├── storage.rules
│   └── functions/
│       ├── index.js              # Cloud Functions 엔트리포인트
│       ├── config/
│       │   ├── firebase.js       # Firebase Admin + Firestore 헬퍼
│       │   └── i18n.js           # 다국어 메시지 (ko/en/zh/ja)
│       ├── middleware/
│       │   ├── auth.js           # Firebase Auth 토큰 검증
│       │   └── usageLimit.js     # 플랜별 사용량 제한
│       ├── routes/
│       │   ├── auth.js           # 회원가입, 로그인, 비밀번호 재설정
│       │   ├── posts.js          # 게시물 CRUD + Late API 연동
│       │   ├── social.js         # 소셜 계정 연결/동기화
│       │   ├── ai.js             # AI 캡션, 아이디어, 번역
│       │   └── subscription.js   # 구독, 결제, 웹훅
│       └── services/
│           ├── aiService.js      # Claude API
│           ├── emailService.js   # SMTP 이메일 인증
│           ├── lateService.js    # Late API (13개 플랫폼)
│           ├── paymentService.js # PortOne V2 결제
│           └── translateService.js # DeepL 번역
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── config/firebase.js    # Firebase 클라이언트 SDK
        ├── api/client.js         # API 클라이언트 (Firebase Auth 토큰)
        ├── context/              # Auth, Accounts, Lang, Toast
        ├── pages/                # Dashboard, Compose, History, Accounts, ...
        └── components/           # Layout, Sidebar, ErrorBoundary, ...
```

## 시작하기

### 사전 요구사항

- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Firebase 프로젝트 생성 (Authentication, Firestore, Storage 활성화)

### 백엔드 설정

```bash
cd Unisocial/backend/functions
cp .env.example .env
# .env 파일에 API 키 설정
npm install
```

### 프론트엔드 설정

```bash
cd Unisocial/frontend
npm install
# .env 파일에 Firebase 설정 추가 (src/.env.example 참고)
```

### 로컬 개발 (에뮬레이터)

```bash
cd Unisocial/backend
firebase emulators:start
```

```bash
cd Unisocial/frontend
npm run dev
```

### 배포

```bash
cd Unisocial/backend
firebase deploy
```

## 구독 플랜

| | Free | Basic (₩3,900/월) | Pro (₩9,900/월) |
|---|---|---|---|
| 게시물 | 5회/월 | 50회/월 | 무제한 |
| AI 추천 | 3회/월 | 30회/월 | 무제한 |
| 예약 게시 | - | O | O |
| 히스토리 | 7일 | 30일 | 무제한 |
