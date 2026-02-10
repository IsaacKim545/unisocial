const fetch = require("node-fetch");

const LATE_BASE_URL = "https://getlate.dev/api/v1";

// Late 지원 전체 플랫폼
const PLATFORMS = [
  "twitter", "instagram", "tiktok", "linkedin", "facebook",
  "youtube", "threads", "reddit", "pinterest", "bluesky",
  "telegram", "snapchat", "googlebusiness",
];

// 플랫폼별 특수 설정 가이드
const PLATFORM_FEATURES = {
  twitter:       { maxChars: 280, media: ["image", "video", "gif"], threads: true },
  instagram:     { maxChars: 2200, media: ["image", "video", "carousel"], stories: true, reels: true },
  tiktok:        { maxChars: 2200, media: ["video"], minDuration: 1, maxDuration: 600 },
  linkedin:      { maxChars: 3000, media: ["image", "video", "document"], articles: true },
  facebook:      { maxChars: 63206, media: ["image", "video"], pages: true },
  youtube:       { maxChars: 5000, media: ["video"], requiresTitle: true, shorts: true },
  threads:       { maxChars: 500, media: ["image", "video"] },
  reddit:        { maxChars: 40000, media: ["image", "video", "link"], requiresTitle: true },
  pinterest:     { maxChars: 500, media: ["image", "video"], requiresLink: true },
  bluesky:       { maxChars: 300, media: ["image"] },
  telegram:      { maxChars: 4096, media: ["image", "video", "document"] },
  snapchat:      { maxChars: 250, media: ["image", "video"] },
  googlebusiness:{ maxChars: 1500, media: ["image"], types: ["update", "offer", "event"] },
};

class LateService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
  }

  // ─── 크로스 포스팅 (핵심) ─────────────────────────────────
  async createPost({ content, platforms, mediaItems, scheduledFor, platformSpecific }) {
    const body = {
      content,
      platforms: platforms.map((p) => {
        const entry = {
          platform: p.platform,
          accountId: p.accountId,
        };
        // 플랫폼별 추가 설정
        if (platformSpecific?.[p.platform]) {
          entry.platformSpecificData = platformSpecific[p.platform];
        }
        return entry;
      }),
    };

    if (mediaItems && mediaItems.length > 0) {
      body.mediaItems = mediaItems;
    }
    if (scheduledFor) {
      body.scheduledFor = scheduledFor;
    } else {
      body.publishNow = true;
    }

    console.log("🔗 Late API POST body:", JSON.stringify(body, null, 2));

    const res = await fetch(`${LATE_BASE_URL}/posts`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    const responseText = await res.text();
    console.log("🔗 Late API Response status:", res.status);
    console.log("🔗 Late API Response body:", responseText);

    if (!res.ok) {
      throw new Error(`Late API error (${res.status}): ${responseText}`);
    }

    try {
      return JSON.parse(responseText);
    } catch {
      return { raw: responseText };
    }
  }

  // ─── 게시물 조회 ──────────────────────────────────────────
  async getPosts({ limit = 20, offset = 0 } = {}) {
    const res = await fetch(
      `${LATE_BASE_URL}/posts?limit=${limit}&offset=${offset}`,
      { headers: this.headers }
    );

    if (!res.ok) throw new Error(`Late API get posts error (${res.status})`);
    return res.json();
  }

  // ─── 게시물 삭제 ──────────────────────────────────────────
  async deletePost(postId) {
    const res = await fetch(`${LATE_BASE_URL}/posts/${postId}`, {
      method: "DELETE",
      headers: this.headers,
    });

    if (!res.ok) throw new Error(`Late API delete error (${res.status})`);
    return res.json();
  }

  // ─── 미디어 업로드 ────────────────────────────────────────
  async uploadMedia(fileBuffer, filename) {
    const FormData = require("form-data");
    const path = require("path");
    const form = new FormData();
    
    // MIME type 결정
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp',
      '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    form.append("file", fileBuffer, { filename, contentType });

    console.log(`📎 Uploading media to Late: ${filename} (${contentType}, ${fileBuffer.length} bytes)`);

    const res = await fetch(`${LATE_BASE_URL}/media`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...form.getHeaders(),
      },
      body: form,
    });

    const responseText = await res.text();
    console.log(`📎 Late media response (${res.status}):`, responseText);

    if (!res.ok) throw new Error(`Late media upload error (${res.status}): ${responseText}`);
    
    try {
      return JSON.parse(responseText);
    } catch {
      return { url: responseText };
    }
  }

  // ─── 연결된 소셜 계정 목록 ────────────────────────────────
  async getAccounts(profileId) {
    let url = `${LATE_BASE_URL}/accounts`;
    if (profileId) {
      url += `?profileId=${profileId}`;
    }

    const res = await fetch(url, {
      headers: this.headers,
    });

    if (!res.ok) throw new Error(`Late API accounts error (${res.status})`);
    const data = await res.json();
    return data.accounts || data;
  }

  // ─── 프로필 목록 ──────────────────────────────────────────
  async getProfiles() {
    const res = await fetch(`${LATE_BASE_URL}/profiles`, {
      headers: this.headers,
    });

    if (!res.ok) throw new Error(`Late API profiles error (${res.status})`);
    return res.json();
  }

  // ─── 계정 연결 URL (사용자에게 전달) ──────────────────────
  getConnectUrl(platform, profileId, redirectUrl) {
    let url = `${LATE_BASE_URL}/connect/${platform}?profileId=${profileId}`;
    if (redirectUrl) {
      url += `&redirect_url=${encodeURIComponent(redirectUrl)}`;
    }
    return url;
  }

  // ─── 분석 데이터 ──────────────────────────────────────────
  async getAnalytics(postId) {
    const res = await fetch(`${LATE_BASE_URL}/analytics/posts/${postId}`, {
      headers: this.headers,
    });

    if (!res.ok) return { analytics: null };
    return res.json();
  }

  // ─── 유틸: 플랫폼 정보 ────────────────────────────────────
  static getPlatforms() {
    return PLATFORMS;
  }

  static getPlatformFeatures(platform) {
    return PLATFORM_FEATURES[platform] || null;
  }

  static getAllPlatformFeatures() {
    return PLATFORM_FEATURES;
  }
}

module.exports = LateService;
