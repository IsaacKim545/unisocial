// Late API 기준 플랫폼 ID 사용 (백엔드/DB와 일치)
export const PLATFORMS = [
  { id: "twitter", n: "X (Twitter)", i: "𝕏", c: "#000000", type: "both" },
  { id: "youtube", n: "YouTube", i: "▶️", c: "#FF0000", type: "media" },
  { id: "instagram", n: "Instagram", i: "📸", c: "#E4405F", type: "media" },
  { id: "tiktok", n: "TikTok", i: "🎵", c: "#000000", type: "media" },
  { id: "facebook", n: "Facebook", i: "👤", c: "#1877F2", type: "both" },
  { id: "linkedin", n: "LinkedIn", i: "💼", c: "#0A66C2", type: "both" },
  { id: "threads", n: "Threads", i: "🧵", c: "#000000", type: "both" },
  { id: "reddit", n: "Reddit", i: "🤖", c: "#FF4500", type: "both" },
  { id: "telegram", n: "Telegram", i: "✈️", c: "#26A5E4", type: "both" },
  { id: "pinterest", n: "Pinterest", i: "📌", c: "#BD081C", type: "media" },
  { id: "bluesky", n: "Bluesky", i: "🦋", c: "#0085FF", type: "text" },
  { id: "googlebusiness", n: "Google Business", i: "🏢", c: "#4285F4", type: "both" },
  { id: "snapchat", n: "Snapchat", i: "👻", c: "#FFFC00", type: "media" },
];

// 플랫폼별 필드 정의 (Late API ID 기준)
export const PLATFORM_FIELDS = {
  twitter: {
    fields: [
      { k: "text", type: "textarea", max: 280, req: true },
      { k: "media", type: "file", accept: "image/*,video/*", multi: true },
    ],
  },
  youtube: {
    fields: [
      { k: "title", type: "input", max: 100, req: true },
      { k: "description", type: "textarea", max: 5000 },
      { k: "tags", type: "input", max: 500, hint: true },
      { k: "video", type: "file", accept: "video/*", req: true },
      { k: "thumbnail", type: "file", accept: "image/*" },
    ],
  },
  instagram: {
    fields: [
      { k: "media", type: "file", accept: "image/*,video/*", multi: true, req: true },
      { k: "caption", type: "textarea", max: 2200 },
      { k: "firstComment", type: "input", max: 2200 },
    ],
  },
  tiktok: {
    fields: [
      { k: "video", type: "file", accept: "video/*", req: true },
      { k: "caption", type: "textarea", max: 2200 },
    ],
  },
  facebook: {
    fields: [
      { k: "text", type: "textarea", max: 63206, req: true },
      { k: "media", type: "file", accept: "image/*,video/*", multi: true },
      { k: "link", type: "input", max: 2000 },
    ],
  },
  linkedin: {
    fields: [
      { k: "text", type: "textarea", max: 3000, req: true },
      { k: "media", type: "file", accept: "image/*,video/*", multi: true },
      { k: "link", type: "input", max: 2000 },
    ],
  },
  threads: {
    fields: [
      { k: "text", type: "textarea", max: 500, req: true },
      { k: "media", type: "file", accept: "image/*,video/*", multi: true },
    ],
  },
  reddit: {
    fields: [
      { k: "subreddit", type: "input", max: 100, req: true },
      { k: "title", type: "input", max: 300, req: true },
      { k: "text", type: "textarea", max: 40000 },
      { k: "media", type: "file", accept: "image/*,video/*", multi: true },
      { k: "link", type: "input", max: 2000 },
    ],
  },
  telegram: {
    fields: [
      { k: "text", type: "textarea", max: 4096, req: true },
      { k: "media", type: "file", accept: "image/*,video/*", multi: true },
    ],
  },
  pinterest: {
    fields: [
      { k: "media", type: "file", accept: "image/*", req: true },
      { k: "title", type: "input", max: 100, req: true },
      { k: "description", type: "textarea", max: 500 },
      { k: "link", type: "input", max: 2000 },
    ],
  },
  bluesky: {
    fields: [
      { k: "text", type: "textarea", max: 300, req: true },
      { k: "media", type: "file", accept: "image/*", multi: true },
    ],
  },
  googlebusiness: {
    fields: [
      { k: "text", type: "textarea", max: 1500, req: true },
      { k: "media", type: "file", accept: "image/*", multi: true },
    ],
  },
  snapchat: {
    fields: [
      { k: "media", type: "file", accept: "image/*,video/*", req: true },
      { k: "caption", type: "textarea", max: 250 },
    ],
  },
};

// 필드 라벨 다국어
export const FIELD_LABELS = {
  ko: { text: "텍스트", caption: "캡션", description: "설명", title: "제목", tags: "태그", media: "미디어", video: "동영상", thumbnail: "썸네일", link: "링크", subreddit: "서브레딧", firstComment: "첫 번째 댓글" },
  en: { text: "Text", caption: "Caption", description: "Description", title: "Title", tags: "Tags", media: "Media", video: "Video", thumbnail: "Thumbnail", link: "Link", subreddit: "Subreddit", firstComment: "First Comment" },
  zh: { text: "文本", caption: "说明", description: "描述", title: "标题", tags: "标签", media: "媒体", video: "视频", thumbnail: "缩略图", link: "链接", subreddit: "版块", firstComment: "第一条评论" },
  ja: { text: "テキスト", caption: "キャプション", description: "説明", title: "タイトル", tags: "タグ", media: "メディア", video: "動画", thumbnail: "サムネイル", link: "リンク", subreddit: "サブレディット", firstComment: "最初のコメント" },
};
