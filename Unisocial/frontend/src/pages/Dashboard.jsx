import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Clock, Link2, CalendarDays, ArrowRight, Trash2, PenSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { useAccounts } from "../context/AccountsContext";
import { PLATFORMS } from "../data/platforms";
import api from "../api/client";

export default function Dashboard() {
  const { user } = useAuth();
  const { lang, t } = useLang();
  const { toast, toastError } = useToast();
  const { accounts: socialAccounts } = useAccounts();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, scheduled: 0 });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const postData = await api.get("/posts?limit=5");
      const allPosts = postData.posts || [];
      const scheduled = allPosts.filter((p) => p.status === "scheduled").length;
      setStats({ total: postData.total || 0, scheduled });
      setPosts(allPosts);
    } catch (err) {
      console.error(err);
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

  const STAT_CARDS = [
    { key: "tot", value: stats.total, icon: FileText, color: "text-brand-500 bg-brand-50 dark:bg-brand-500/10" },
    { key: "sch", value: stats.scheduled, icon: Clock, color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
    { key: "conn", value: `${socialAccounts.length}/13`, icon: Link2, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
    { key: "mon", value: stats.total, icon: CalendarDays, color: "text-blue-500 bg-blue-50 dark:bg-blue-500/10" },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-surface-200 dark:bg-surface-800 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-surface-200 dark:bg-surface-800 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-surface-200 dark:bg-surface-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">
          {t("welcome")}, {user?.username} 👋
        </h1>
        <p className="text-surface-500 text-sm mt-1">{t("tag")}</p>
      </div>

      {/* 계정 미연결 온보딩 */}
      {socialAccounts.length === 0 && (
        <div className="card p-5 border-l-4 border-brand-400 bg-gradient-to-r from-brand-50/50 to-transparent dark:from-brand-500/5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center shrink-0">
              <Link2 size={24} className="text-brand-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-surface-800 dark:text-surface-100">
                {lang === "ko" ? "소셜 계정을 연결해보세요!" : "Connect your social accounts!"}
              </h3>
              <p className="text-sm text-surface-500 mt-1 mb-3">
                {lang === "ko"
                  ? "X, YouTube, Instagram 등 13개 플랫폼에 한 번에 게시할 수 있습니다. 계정 연결은 1분이면 됩니다."
                  : "Post to X, YouTube, Instagram, and 10 more platforms at once. Connecting takes just 1 minute."}
              </p>
              <button onClick={() => navigate("/accounts")} className="btn-primary text-sm">
                {lang === "ko" ? "계정 연결하기" : "Connect Accounts"} →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, value, icon: Icon, color }) => (
          <div key={key} className="card p-5 flex items-start gap-4 hover:shadow-soft transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-surface-800 dark:text-surface-100">{value}</div>
              <div className="text-xs text-surface-500 mt-0.5">{t(key)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent posts */}
      <div className="card">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-lg font-bold text-surface-800 dark:text-surface-100">{t("rec")}</h2>
          <button onClick={() => navigate("/history")} className="btn-ghost text-xs gap-1">
            {t("hist")} <ArrowRight size={14} />
          </button>
        </div>
        <div className="p-5">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-surface-300 dark:text-surface-600 mb-3" />
              <p className="text-surface-400">{t("nop")}</p>
              <button onClick={() => navigate("/compose")} className="btn-primary mt-4 text-sm">{t("comp")}</button>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => (
                <PostItem key={p.id} post={p} onDelete={handleDelete} onEdit={() => navigate(`/compose?edit=${p.id}`)} t={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PostItem({ post, onDelete, onEdit, t }) {
  const platforms = (typeof post.platforms === "string" ? JSON.parse(post.platforms) : post.platforms) || [];
  const status = post.status || "published";
  const isScheduled = status === "scheduled";

  const statusStyles = {
    published: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    scheduled: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    failed: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="group flex items-start gap-4 p-4 rounded-xl hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
      {/* Platform icons */}
      <div className="flex -space-x-1 shrink-0 pt-0.5">
        {platforms.slice(0, 3).map((pid) => {
          const pl = PLATFORMS.find((x) => x.id === pid);
          return (
            <div key={pid} className="w-7 h-7 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center text-xs border-2 border-white dark:border-surface-900">
              {pl?.i || "📱"}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-700 dark:text-surface-300 line-clamp-2 break-words">
          {post.content || "(no content)"}
        </p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusStyles[status] || statusStyles.published}`}>
            {t(status === "published" ? "pubd" : status === "scheduled" ? "sch" : "fail")}
          </span>
          {post.scheduled_at && (
            <span className="text-[11px] text-brand-500 font-medium">
              📅 {new Date(post.scheduled_at).toLocaleString()}
            </span>
          )}
          <span className="text-[11px] text-surface-400">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isScheduled && (
          <button onClick={onEdit} className="p-1.5 rounded-lg text-surface-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
            <PenSquare size={14} />
          </button>
        )}
        <button onClick={() => onDelete(post.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-danger hover:bg-danger-light dark:hover:bg-danger/10 transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
