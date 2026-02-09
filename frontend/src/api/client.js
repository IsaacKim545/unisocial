const BASE = "/api";

class ApiClient {
  constructor() {
    this.token = null;
    this.lang = "ko";
    this.onUnauthorized = null;
  }

  setToken(token) {
    this.token = token;
  }

  setLang(lang) {
    this.lang = lang;
  }

  async request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      "Accept-Language": this.lang,
      ...options.headers,
    };
    if (this.token) headers["Authorization"] = `Bearer ${this.token}`;

    // FormData일 경우 Content-Type 삭제 (브라우저가 boundary 자동설정)
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    const res = await fetch(`${BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
      this.onUnauthorized?.();
      throw new Error("Unauthorized");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  get(path) { return this.request(path); }
  post(path, body) { return this.request(path, { method: "POST", body: JSON.stringify(body) }); }
  put(path, body) { return this.request(path, { method: "PUT", body: JSON.stringify(body) }); }
  del(path) { return this.request(path, { method: "DELETE" }); }

  async upload(files) {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    return this.request("/upload", { method: "POST", body: fd });
  }
}

const api = new ApiClient();
export default api;
