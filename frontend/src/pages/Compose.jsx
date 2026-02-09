import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Upload, X, Clock, CalendarDays, Zap, Loader2, Film, Send,
  ZoomIn, GripVertical, CheckCircle, XCircle, AlertTriangle
} from "lucide-react";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { useAccounts } from "../context/AccountsContext";
import { PLATFORMS, PLATFORM_FIELDS, FIELD_LABELS } from "../data/platforms";
import { LANGS_DIST } from "../i18n";
import api from "../api/client";

export default function Compose() {
  const { lang, t } = useLang();
  const { toast, toastError, toastInfo } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { accounts, connectedPlatforms, hasAccounts } = useAccounts();
  const [selPlat, setSelPlat] = useState("");
  const [fields, setFields] = useState({});
  const [files, setFiles] = useState({});
  const [schedMode, setSchedMode] = useState("now");
  const [schedDate, setSchedDate] = useState("");
  const [schedDelay, setSchedDelay] = useState(1);
  const [selLangs, setSelLangs] = useState(["ko"]);
  const [publishing, setPublishing] = useState(false);
  const [transStatus, setTransStatus] = useState(null);
  const [editId, setEditId] = useState(null);
  const [lightbox, setLightbox] = useState(null); // { url, type }
  const [publishResult, setPublishResult] = useState(null); // { success, failed, total }
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const eid = searchParams.get("edit");
    if (eid) loadPost(eid);
  }, [searchParams]);

  async function loadPost(id) {
    try {
      const d = await api.get("/posts/" + id);
      const p = d.post;
      if (!p || p.status !== "scheduled") {
        toastError(t("editOnly") || "Only scheduled posts can be edited.");
        return;
      }
      const pls = (typeof p.platforms === "string" ? JSON.parse(p.platforms) : p.platforms) || [];
      const spec = (typeof p.platform_specific === "string" ? JSON.parse(p.platform_specific) : p.platform_specific) || {};
      const media = (typeof p.media_urls === "string" ? JSON.parse(p.media_urls) : p.media_urls) || [];
      const platId = pls[0];
      if (!platId) return;

      setEditId(parseInt(id));
      setSelPlat(platId);

      const pf = PLATFORM_FIELDS[platId];
      const newFields = {};
      const platSpec = spec[platId] || {};
      if (pf) {
        const mainKey = pf.fields.find((f) => ["text", "caption", "description"].includes(f.k) && f.type === "textarea")?.k;
        if (mainKey) newFields[mainKey] = p.content || "";
        if (platSpec.title) newFields.title = platSpec.title;
        if (platSpec.firstComment) newFields.firstComment = platSpec.firstComment;
        if (platSpec.tags) newFields.tags = Array.isArray(platSpec.tags) ? platSpec.tags.join(", ") : platSpec.tags;
        if (platSpec.subreddit) newFields.subreddit = platSpec.subreddit;
        if (platSpec.link) newFields.link = platSpec.link;
      }
      setFields(newFields);

      if (media.length > 0) {
        const fileKey = pf?.fields.find((f) => f.type === "file")?.k || "media";
        setFiles({ [fileKey]: media.map((m) => (typeof m === "string" ? { url: m, type: "image" } : m)) });
      }

      if (p.scheduled_at) {
        setSchedMode("date");
        const dt = new Date(p.scheduled_at);
        setSchedDate(new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      }
      toastInfo(t("editMode"));
    } catch (err) {
      toastError(err.message);
    }
  }

  const fl = (key) => FIELD_LABELS[lang]?.[key] || FIELD_LABELS.en?.[key] || key;
  const connectedPlatIds = connectedPlatforms;

  function selectPlat(id) {
    if (selPlat === id) { setSelPlat(""); setFields({}); setFiles({}); }
    else { setSelPlat(id); setFields({}); setFiles({}); }
    setPublishResult(null);
  }

  function updateField(key, val) {
    setFields((prev) => ({ ...prev, [key]: val }));
  }

  async function handleUpload(fieldKey, fileList) {
    setUploading(true);
    try {
      const d = await api.upload(fileList);
      setFiles((prev) => ({
        ...prev,
        [fieldKey]: [...(prev[fieldKey] || []), ...d.files],
      }));
    } catch (err) {
      toastError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function removeFile(fieldKey, idx) {
    setFiles((prev) => ({
      ...prev,
      [fieldKey]: (prev[fieldKey] || []).filter((_, i) => i !== idx),
    }));
  }

  function getScheduledFor() {
    if (schedMode === "date") return schedDate ? new Date(schedDate).toISOString() : null;
    if (schedMode === "delay") return new Date(Date.now() + schedDelay * 3600000).toISOString();
    return null;
  }

  function toggleLang(id) {
    setSelLangs((prev) => {
      if (prev.includes(id)) return prev.length <= 1 ? prev : prev.filter((x) => x !== id);
      return [...prev, id];
    });
  }

  async function handlePublish() {
    if (!selPlat) return toastError(t("selAt"));
    const pf = PLATFORM_FIELDS[selPlat];
    if (!pf) return;

    for (const f of pf.fields) {
      if (!f.req) continue;
      if (f.type === "file") {
        if (!(files[f.k]?.length > 0)) return toastError(`${fl(f.k)} — ${t("reqMark")}`);
      } else {
        if (!fields[f.k]?.trim()) return toastError(`${fl(f.k)} — ${t("reqMark")}`);
      }
    }

    const mainKey = pf.fields.find((f) => ["text", "caption", "description"].includes(f.k) && f.type === "textarea")?.k;
    const content = fields[mainKey] || fields.title || "";
    const allFiles = Object.values(files).flat();
    const mediaItems = allFiles.length ? allFiles.map((f) => ({ type: f.type, url: f.url })) : undefined;
    const spec = {};
    if (fields.title) spec.title = fields.title;
    if (fields.firstComment) spec.firstComment = fields.firstComment;
    if (fields.tags) spec.tags = fields.tags.split(",").map((s) => s.trim()).filter(Boolean);
    if (fields.subreddit) spec.subreddit = fields.subreddit;
    if (fields.link) spec.link = fields.link;

    const scheduledFor = getScheduledFor();
    const isScheduled = !!scheduledFor;

    setPublishing(true);
    setTransStatus(null);
    setPublishResult(null);

    async function postOne(c) {
      const body = { content: c, platforms: [selPlat], platformSpecific: { [selPlat]: spec } };
      if (mediaItems) body.mediaItems = mediaItems;
      if (scheduledFor) body.scheduledFor = scheduledFor;
      const url = editId ? "/posts/" + editId : "/posts";
      const method = editId ? "put" : "post";
      return api[method](url, body);
    }

    try {
      if (selLangs.length <= 1) {
        await postOne(content);
        setPublishResult({ success: 1, failed: 0, total: 1, isScheduled, isEdit: !!editId });
      } else {
        setTransStatus({ phase: "translating" });
        const fromLang = selLangs[0];
        const toLangs = selLangs.filter((l) => l !== fromLang);
        const contentMap = { [fromLang]: content };

        if (toLangs.length > 0) {
          try {
            const tr = await api.post("/ai/translate", { content, fromLang, toLangs });
            Object.assign(contentMap, tr.translations || {});
            setTransStatus({ phase: "posting" });
          } catch (e) {
            setTransStatus({ phase: "fallback", msg: e.message.includes("DEEPL_API_KEY") ? t("noApiKey") : t("transFail") });
            toLangs.forEach((l) => { contentMap[l] = content; });
          }
        }

        let ok = 0;
        const results = [];
        for (const [tl, tc] of Object.entries(contentMap)) {
          try {
            await postOne(tc);
            ok++;
            results.push({ lang: tl, ok: true });
          } catch (e) {
            results.push({ lang: tl, ok: false, err: e.message });
          }
        }
        setTransStatus({ phase: "done", results });
        setPublishResult({ success: ok, failed: results.filter((r) => !r.ok).length, total: results.length, isScheduled, isEdit: !!editId, results });
      }
    } catch (err) {
      toastError(err.message);
      setPublishResult({ success: 0, failed: 1, total: 1, error: err.message });
    } finally {
      setPublishing(false);
    }
  }

  function resetForm() {
    setEditId(null);
    setSelPlat("");
    setFields({});
    setFiles({});
    setSchedMode("now");
    setTransStatus(null);
    setPublishResult(null);
  }

  const pf = PLATFORM_FIELDS[selPlat];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">
        {editId ? `✏️ ${t("edit")}` : `✏️ ${t("comp")}`}
      </h1>

      {/* ── 게시 결과 ── */}
      {publishResult && (
        <PublishResultCard result={publishResult} t={t}
          onNewPost={resetForm}
          onGoHistory={() => navigate("/history")}
          onGoDashboard={() => navigate("/")} />
      )}

      {/* ── 계정 없음 안내 ── */}
      {!hasAccounts && !publishResult && (
        <div className="card p-6 text-center animate-scale-in">
          <AlertTriangle size={32} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-lg font-bold text-surface-800 dark:text-surface-100 mb-1">
            {lang === "ko" ? "연결된 소셜 계정이 없습니다" : "No connected accounts"}
          </h2>
          <p className="text-sm text-surface-500 mb-4">
            {lang === "ko" ? "게시하려면 먼저 소셜미디어 계정을 연결해야 합니다." : "Connect your social accounts first to start posting."}
          </p>
          <button onClick={() => navigate("/accounts")} className="btn-primary text-sm">
            {lang === "ko" ? "계정 연결하기" : "Connect Accounts"}
          </button>
        </div>
      )}

      {/* ── 플랫폼 선택 ── */}
      {!publishResult && hasAccounts && (
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3">{t("selp")}</h3>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((pl) => {
            const isConn = connectedPlatIds.includes(pl.id);
            const isSel = selPlat === pl.id;
            return (
              <button key={pl.id} onClick={() => isConn && selectPlat(pl.id)} disabled={!isConn}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all border ${
                  isSel
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/50 shadow-sm"
                    : isConn
                      ? "border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600 text-surface-600 dark:text-surface-400"
                      : "border-surface-100 dark:border-surface-800 text-surface-300 dark:text-surface-600 cursor-not-allowed"
                }`}>
                <span className="text-base">{pl.i}</span>
                <span className="hidden sm:inline">{pl.n}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ── 에디터 ── */}
      {selPlat && pf && !publishResult && (
        <div className="card p-5 space-y-5 animate-scale-in">
          <div className="flex items-center gap-3 pb-3 border-b border-surface-100 dark:border-surface-800">
            <span className="text-xl">{PLATFORMS.find((p) => p.id === selPlat)?.i}</span>
            <span className="font-semibold text-surface-800 dark:text-surface-100">{PLATFORMS.find((p) => p.id === selPlat)?.n}</span>
            <PlatTypeBadge type={PLATFORMS.find((p) => p.id === selPlat)?.type} t={t} />
          </div>
          {pf.fields.map((f) => (
            <FieldRenderer key={f.k} field={f} value={fields[f.k] || ""} files={files[f.k] || []}
              onChange={(v) => updateField(f.k, v)}
              onUpload={(fileList) => handleUpload(f.k, fileList)}
              onRemoveFile={(idx) => removeFile(f.k, idx)}
              onPreview={(file) => setLightbox(file)}
              uploading={uploading}
              fl={fl} t={t} />
          ))}
        </div>
      )}

      {/* ── 배포 언어 ── */}
      {selPlat && !publishResult && (
        <div className="card p-5 animate-scale-in">
          <h3 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3">{t("distLang")}</h3>
          <div className="flex flex-wrap gap-2">
            {LANGS_DIST.map((l) => (
              <button key={l.id} onClick={() => toggleLang(l.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all border ${
                  selLangs.includes(l.id)
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/50"
                    : "border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300"
                }`}>
                {l.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-surface-400 mt-2">
            {selLangs.length <= 1 ? t("distNote1") : t("distNoteN").replace("{n}", selLangs.length)}
          </p>
        </div>
      )}

      {/* ── 예약 ── */}
      {selPlat && !publishResult && (
        <div className="card p-5 animate-scale-in">
          <h3 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3">{t("schedTitle")}</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { mode: "now", icon: Zap, label: t("schedNow") },
              { mode: "date", icon: CalendarDays, label: t("schedDate") },
              { mode: "delay", icon: Clock, label: t("schedDelay") },
            ].map(({ mode, icon: Icon, label }) => (
              <button key={mode} onClick={() => setSchedMode(mode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  schedMode === mode
                    ? "border-brand-400 bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400 dark:border-brand-500/50"
                    : "border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300"
                }`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          {schedMode === "date" && <input type="datetime-local" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="input mt-3 max-w-xs" />}
          {schedMode === "delay" && (
            <div className="flex items-center gap-3 mt-3">
              <input type="number" min={1} max={720} value={schedDelay} onChange={(e) => setSchedDelay(parseInt(e.target.value) || 1)} className="input w-24 text-center" />
              <span className="text-sm text-surface-500">{t("schedHourUnit")}</span>
            </div>
          )}
        </div>
      )}

      {/* ── 번역 상태 ── */}
      {transStatus && !publishResult && (
        <div className="card p-4 text-sm animate-scale-in">
          {transStatus.phase === "translating" && <div className="flex items-center gap-2 text-brand-500"><Loader2 size={16} className="animate-spin" /> {t("translating")}</div>}
          {transStatus.phase === "posting" && <div className="flex items-center gap-2 text-emerald-600"><Loader2 size={16} className="animate-spin" /> {t("pubing")}</div>}
          {transStatus.phase === "fallback" && <div className="text-amber-600 flex items-center gap-2"><AlertTriangle size={16} /> {transStatus.msg}</div>}
        </div>
      )}

      {/* ── 게시 버튼 ── */}
      {selPlat && !publishResult && (
        <button onClick={handlePublish} disabled={publishing}
          className="btn-primary w-full h-12 text-base gap-2">
          {publishing ? (
            <><Loader2 size={18} className="animate-spin" /> {t("pubing")}</>
          ) : editId ? (
            <><Send size={18} /> {t("editSave")}</>
          ) : schedMode !== "now" ? (
            <><CalendarDays size={18} /> {t("schedDate")}</>
          ) : (
            <><Send size={18} /> {t("pub")}</>
          )}
        </button>
      )}

      {/* ── 라이트박스 ── */}
      {lightbox && <Lightbox file={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── 플랫폼 타입 뱃지 ──
function PlatTypeBadge({ type, t }) {
  const styles = {
    media: "bg-rose-50 text-rose-600 dark:bg-rose-500/10",
    text: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    both: "bg-brand-50 text-brand-600 dark:bg-brand-500/10",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${styles[type] || styles.both}`}>
      {t(type === "media" ? "mediaT" : type === "text" ? "textT" : "bothT")}
    </span>
  );
}

// ── 게시 결과 카드 ──
function PublishResultCard({ result, t, onNewPost, onGoHistory, onGoDashboard }) {
  const allSuccess = result.failed === 0 && result.success > 0;
  const allFailed = result.success === 0;

  return (
    <div className="card p-6 animate-scale-in">
      <div className="text-center mb-5">
        {allSuccess ? (
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
        ) : allFailed ? (
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
            <XCircle size={32} className="text-danger" />
          </div>
        ) : (
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle size={32} className="text-amber-500" />
          </div>
        )}
        <h2 className="text-xl font-bold text-surface-800 dark:text-surface-100">
          {allSuccess
            ? (result.isEdit ? t("editDone") : result.isScheduled ? t("schedOk") : t("pubd"))
            : allFailed ? t("fail")
            : `${result.success}/${result.total} ${t("pubd")}`}
        </h2>
        {result.error && <p className="text-sm text-danger mt-1">{result.error}</p>}
      </div>

      {/* 다국어 결과 상세 */}
      {result.results && result.results.length > 1 && (
        <div className="border-t border-surface-100 dark:border-surface-800 pt-4 mb-5 space-y-2">
          {result.results.map((r, i) => {
            const langInfo = LANGS_DIST.find((l) => l.id === r.lang);
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                r.ok ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "bg-red-50/50 dark:bg-red-500/5"
              }`}>
                <span>{langInfo?.label.split(" ")[0] || r.lang}</span>
                <span className="flex-1 text-surface-500 truncate text-xs">{langInfo?.label.split(" ").slice(1).join(" ")}</span>
                {r.ok ? <CheckCircle size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-danger" />}
                {r.err && <span className="text-[11px] text-danger">{r.err}</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onNewPost} className="btn-primary flex-1">{t("comp")}</button>
        <button onClick={onGoDashboard} className="btn-secondary flex-1">{t("dash")}</button>
        <button onClick={onGoHistory} className="btn-ghost flex-1">{t("hist")}</button>
      </div>
    </div>
  );
}

// ── 라이트박스 ──
function Lightbox({ file, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors">
        <X size={24} />
      </button>
      <div className="max-w-4xl max-h-[85vh] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {file.type === "video" ? (
          <video src={file.url} controls autoPlay className="max-h-[85vh] rounded-2xl shadow-2xl" />
        ) : (
          <img src={file.url} alt="" className="max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
        )}
      </div>
    </div>
  );
}

// ── 필드 렌더러 (드래그앤드롭 + 프로그레스바 + 미리보기) ──
function FieldRenderer({ field: f, value, files, onChange, onUpload, onRemoveFile, onPreview, uploading, fl, t }) {
  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // 드래그앤드롭
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragOut = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      onUpload(e.dataTransfer.files);
    }
  }, [onUpload]);

  if (f.type === "input") {
    return (
      <div>
        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">
          {fl(f.k)} {f.req && <span className="text-danger text-xs">*</span>}
        </label>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={f.max} className="input" placeholder={fl(f.k)} />
        {f.hint && <p className="text-[11px] text-surface-400 mt-1 italic">{t("tagsHint")}</p>}
      </div>
    );
  }

  if (f.type === "textarea") {
    const len = value?.length || 0;
    const max = f.max || 99999;
    const pct = Math.min((len / max) * 100, 100);
    const isOver = len > max;
    const isNear = pct > 80;

    return (
      <div>
        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">
          {fl(f.k)} {f.req && <span className="text-danger text-xs">*</span>}
        </label>
        <textarea value={value} onChange={(e) => onChange(e.target.value)} maxLength={f.max}
          className="input min-h-[120px] resize-y" placeholder={fl(f.k)} />
        {/* 캐릭터 프로그레스바 */}
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex-1 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOver ? "bg-danger" : isNear ? "bg-amber-400" : "bg-brand-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className={`text-[11px] font-mono tabular-nums shrink-0 ${
            isOver ? "text-danger font-semibold" : isNear ? "text-amber-500" : "text-surface-400"
          }`}>
            {len.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  if (f.type === "file") {
    return (
      <div>
        <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">
          {fl(f.k)} {f.req && <span className="text-danger text-xs">*</span>}
        </label>
        <input ref={fileRef} type="file" accept={f.accept} multiple={f.multi} className="hidden"
          onChange={(e) => { if (e.target.files.length) onUpload(e.target.files); e.target.value = ""; }} />

        {/* 드래그앤드롭 영역 */}
        <div
          onDragEnter={handleDragIn}
          onDragLeave={handleDragOut}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`w-full flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed rounded-xl text-sm cursor-pointer transition-all ${
            dragOver
              ? "border-brand-400 bg-brand-50/50 dark:bg-brand-500/10 text-brand-500 scale-[1.01]"
              : uploading
                ? "border-brand-300 bg-brand-50/30 dark:bg-brand-500/5 text-brand-400"
                : files.length > 0
                  ? "border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5"
                  : "border-surface-200 dark:border-surface-700 text-surface-400 hover:border-brand-300 hover:text-brand-500"
          }`}
        >
          {uploading ? (
            <><Loader2 size={20} className="animate-spin" /> {t("mediaUploading")}</>
          ) : dragOver ? (
            <><Upload size={20} className="animate-bounce" /> {lang === "ko" ? "여기에 놓으세요!" : "Drop here!"}</>
          ) : files.length > 0 ? (
            <><Upload size={18} /> {files.length} {t("uploaded")} — {lang === "ko" ? "클릭 또는 드래그하여 추가" : "Click or drag to add more"}</>
          ) : (
            <>
              <Upload size={20} />
              <span>{t("clickUpload")} — {fl(f.k)}</span>
              <span className="text-[11px] text-surface-400">{lang === "ko" ? "또는 파일을 여기로 드래그하세요" : "or drag & drop files here"}</span>
            </>
          )}
        </div>

        {/* 미디어 미리보기 그리드 */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-3">
            {files.map((file, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700 group shadow-sm hover:shadow-md transition-shadow">
                {file.type === "video" ? (
                  <div className="w-full h-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center">
                    <Film size={22} className="text-surface-400" />
                  </div>
                ) : (
                  <img src={file.url} alt="" className="w-full h-full object-cover" />
                )}
                {/* 호버 오버레이 */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); onPreview(file); }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
                    <ZoomIn size={14} className="text-white" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); onRemoveFile(i); }}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-red-500/80 transition-colors">
                    <X size={14} className="text-white" />
                  </button>
                </div>
                {/* 순번 */}
                <div className="absolute top-1 left-1 w-5 h-5 rounded-md bg-black/40 text-white text-[10px] font-bold flex items-center justify-center">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
