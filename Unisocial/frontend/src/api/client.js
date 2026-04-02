import { firebaseAuth } from "../config/firebase";
import { signInWithCustomToken } from "firebase/auth";

const BASE = import.meta.env.VITE_API_BASE || "/api";

class ApiClient {
  constructor() { this.lang = "ko"; this.onUnauthorized = null; }
  setLang(lang) { this.lang = lang; }
  async getToken() { const user = firebaseAuth.currentUser; if (!user) return null; return user.getIdToken(); }
  async signInWithCustomToken(customToken) { const credential = await signInWithCustomToken(firebaseAuth, customToken); return credential.user; }
  async request(path, options = {}) {
    const token = await this.getToken();
    const headers = { "Content-Type": "application/json", "Accept-Language": this.lang, ...options.headers };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (options.body instanceof FormData) delete headers["Content-Type"];
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    if (res.status === 401) { this.onUnauthorized?.(); throw new Error("Unauthorized"); }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }
  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: "POST", body: JSON.stringify(body) }); }
  put(path, body) { return this.request(path, { method: "PUT", body: JSON.stringify(body) }); }
  del(path) { return this.request(path, { method: "DELETE" }); }
  async upload(files) { const fd = new FormData(); for (const f of files) fd.append("files", f); return this.request("/upload", { method: "POST", body: fd }); }
}

const api = new ApiClient();
export default api;
