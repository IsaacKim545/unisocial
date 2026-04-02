const fetch = require("node-fetch");

const LATE_BASE_URL = "https://getlate.dev/api/v1";
const PLATFORMS = ["twitter","instagram","tiktok","linkedin","facebook","youtube","threads","reddit","pinterest","bluesky","telegram","snapchat","googlebusiness"];
const PLATFORM_FEATURES = {
  twitter:{maxChars:280,media:["image","video","gif"],threads:true},instagram:{maxChars:2200,media:["image","video","carousel"],stories:true,reels:true},
  tiktok:{maxChars:2200,media:["video"],minDuration:1,maxDuration:600},linkedin:{maxChars:3000,media:["image","video","document"],articles:true},
  facebook:{maxChars:63206,media:["image","video"],pages:true},youtube:{maxChars:5000,media:["video"],requiresTitle:true,shorts:true},
  threads:{maxChars:500,media:["image","video"]},reddit:{maxChars:40000,media:["image","video","link"],requiresTitle:true},
  pinterest:{maxChars:500,media:["image","video"],requiresLink:true},bluesky:{maxChars:300,media:["image"]},
  telegram:{maxChars:4096,media:["image","video","document"]},snapchat:{maxChars:250,media:["image","video"]},
  googlebusiness:{maxChars:1500,media:["image"],types:["update","offer","event"]},
};

class LateService {
  constructor(apiKey) { this.apiKey = apiKey; this.headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }; }

  async createPost({ content, platforms, mediaItems, scheduledFor, platformSpecific }) {
    const body = { content, platforms: platforms.map(p => { const e = { platform: p.platform, accountId: p.accountId }; if (platformSpecific?.[p.platform]) e.platformSpecificData = platformSpecific[p.platform]; return e; }) };
    if (mediaItems?.length > 0) body.mediaItems = mediaItems;
    if (scheduledFor) body.scheduledFor = scheduledFor; else body.publishNow = true;
    const res = await fetch(`${LATE_BASE_URL}/posts`, { method: "POST", headers: this.headers, body: JSON.stringify(body) });
    const text = await res.text(); if (!res.ok) throw new Error(`Late API error (${res.status}): ${text}`);
    try { return JSON.parse(text); } catch { return { raw: text }; }
  }

  async deletePost(postId) { const res = await fetch(`${LATE_BASE_URL}/posts/${postId}`, { method: "DELETE", headers: this.headers }); if (!res.ok) throw new Error(`Late API delete error (${res.status})`); return res.json(); }

  async uploadMedia(fileBuffer, filename) {
    const FormData = require("form-data"); const path = require("path"); const form = new FormData();
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = { ".jpg":"image/jpeg",".jpeg":"image/jpeg",".png":"image/png",".gif":"image/gif",".webp":"image/webp",".mp4":"video/mp4",".mov":"video/quicktime",".avi":"video/x-msvideo",".webm":"video/webm" };
    form.append("file", fileBuffer, { filename, contentType: mimeTypes[ext] || "application/octet-stream" });
    const res = await fetch(`${LATE_BASE_URL}/media`, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, ...form.getHeaders() }, body: form });
    const text = await res.text(); if (!res.ok) throw new Error(`Late media upload error (${res.status}): ${text}`);
    try { return JSON.parse(text); } catch { return { url: text }; }
  }

  async getAccounts(profileId) { let url = `${LATE_BASE_URL}/accounts`; if (profileId) url += `?profileId=${profileId}`; const res = await fetch(url, { headers: this.headers }); if (!res.ok) throw new Error(`Late API accounts error (${res.status})`); const data = await res.json(); return data.accounts || data; }
  async getProfiles() { const res = await fetch(`${LATE_BASE_URL}/profiles`, { headers: this.headers }); if (!res.ok) throw new Error(`Late API profiles error (${res.status})`); return res.json(); }
  getConnectUrl(platform, profileId, redirectUrl) { let url = `${LATE_BASE_URL}/connect/${platform}?profileId=${profileId}`; if (redirectUrl) url += `&redirect_url=${encodeURIComponent(redirectUrl)}`; return url; }
  async getAnalytics(postId) { const res = await fetch(`${LATE_BASE_URL}/analytics/posts/${postId}`, { headers: this.headers }); if (!res.ok) return { analytics: null }; return res.json(); }

  static getPlatforms() { return PLATFORMS; }
  static getPlatformFeatures(platform) { return PLATFORM_FEATURES[platform] || null; }
  static getAllPlatformFeatures() { return PLATFORM_FEATURES; }
}

module.exports = LateService;
