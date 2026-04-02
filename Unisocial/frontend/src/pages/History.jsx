import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Trash2, PenSquare, Search, Filter, Loader2 } from "lucide-react";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { PLATFORMS } from "../data/platforms";
import api from "../api/client";

export default function History() {
  const { t } = useLang();
  const { toast, toastError } = useToast();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, published, scheduled, failed

  useEffect(() => { loadPosts(); }, []);

  async function loadPosts() {
    try {
      const d = await api.get("/posts?limit=100");
      setPosts(d.posts || []);
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm(t("delConfirm"))) return;
    try {
      await api.del("/posts/" + id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast(t("deleted"));
    } catch (err) {
      toastError(err.message);
    }
  }

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const FILTERS = [
    { id: "all", label: "All" },
    { id: "published", label: t("pubd") },
    { id: "scheduled", label: t("sch") },
    { id: "failed", label: t("fail") },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">📋 {t("hist")}</h1>
        <div className="flex gap-1.5 bg-surface-100 dark:bg-surface-800 rounded-xl p-1">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f.id
                  ? "bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-100 shadow-sm"
                  : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <FileText size={48} className="mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <p className="text-surface-400">{t("nop")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const platforms = (typeof p.platforms === "string" ? JSON.parse(p.platforms) : p.platforms) || [];
            const status = p.status || "published";
            const isScheduled = status === "scheduled";
            const statusColor = {
              published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
              scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
              failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
            };

            return (
              <div key={p.id} className="card group p-5 hover:shadow-soft transition-all">
                <div className="flex items-start gap-4">
                  <div className="flex -space-x-1.5 shrink-0 pt-0.5">
                    {platforms.map((pid) => {
                      const pl = PLATFORMS.find((x) => x.id === pid);
                      return (
                        <div key={pid} className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center text-sm border-2 border-white dark:border-surface-900">
                          {pl?.i || "📱"}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-surface-700 dark:text-surface-300 line-clamp-3 break-words leading-relaxed">
                      {p.content || "(no content)"}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${statusColor[status]}`}>
                        {t(status === "published" ? "pubd" : status === "scheduled" ? "sch" : "fail")}
                      </span>
                      {platforms.map((pid) => {
                        const pl = PLATFORMS.find((x) => x.id === pid);
                        return <span key={pid} className="text-[11px] text-surface-500">{pl?.i} {pl?.n || pid}</span>;
                      })}
                      {p.scheduled_at && (
                        <span className="text-[11px] text-brand-500 font-medium">📅 {new Date(p.scheduled_at).toLocaleString()}</span>
                      )}
                      <span className="text-[11px] text-surface-400">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {isScheduled && (
                      <button onClick={() => navigate(`/compose?edit=${p.id}`)}
                        className="p-2 rounded-xl text-surface-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors" title={t("edit")}>
                        <PenSquare size={16} />
                      </button>
                    )}
                    <button onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-xl text-surface-400 hover:text-danger hover:bg-danger-light dark:hover:bg-danger/10 transition-colors" title={t("del")}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
