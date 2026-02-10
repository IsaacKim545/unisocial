import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { LANGS_UI } from "../i18n";
import api from "../api/client";

// 항상 표시할 OAuth 프로바이더 목록
const ALL_OAUTH = [
  { id: "google", labelKey: "gLogin", icon: "google" },
  { id: "microsoft", labelKey: "mLogin", icon: "microsoft" },
  { id: "apple", labelKey: "aLogin", icon: "apple" },
];

export default function Login() {
  const { login, verify, resendCode, pendingUser, setPendingUser, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLang();
  const { toast, toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [activeProviders, setActiveProviders] = useState([]);

  // 활성화된 OAuth 프로바이더 확인
  useEffect(() => {
    fetch("/api/auth/providers")
      .then((r) => r.json())
      .then((d) => setActiveProviders((d.providers || []).map((p) => p.id)))
      .catch(() => setActiveProviders([]));
  }, []);

  // OAuth 콜백 처리 (URL에 token이 있을 때)
  useEffect(() => {
    const token = searchParams.get("token");
    const userStr = searchParams.get("user");
    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr));
        localStorage.setItem("sh_token", token);
        localStorage.setItem("sh_user", JSON.stringify(user));
        api.setToken(token);
        window.location.href = "/";
      } catch (e) {
        console.error("OAuth callback error:", e);
      }
    }
    const error = searchParams.get("error");
    if (error) toastError("OAuth: " + error);
  }, [searchParams]);

  // 이미 로그인된 경우
  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toastError(t("fillAll"));
    setLoading(true);
    try {
      const res = await login(email, password, remember);
      if (!res.needVerify) navigate("/");
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return toastError(t("code6"));
    setLoading(true);
    try {
      await verify(code);
      navigate("/");
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try { await resendCode(); toast(t("codeSent")); }
    catch (err) { toastError(err.message); }
  };

  // ── 이메일 인증 화면 ──
  if (pendingUser) {
    return (
      <AuthShell lang={lang} setLang={setLang}>
        <button onClick={() => setPendingUser(null)} className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors">
          <ArrowLeft size={16} /> {t("verifyBack")}
        </button>
        <h1 className="text-2xl font-bold mb-2 text-surface-800 dark:text-surface-100">{t("verify")}</h1>
        <p className="text-sm text-surface-500 mb-6">{t("vinfo")}</p>
        <form onSubmit={handleVerify} className="space-y-4">
          <input type="text" value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="input text-center text-2xl tracking-[.5em] font-mono" placeholder="000000" autoFocus />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : t("verify")}
          </button>
          <button type="button" onClick={handleResend} className="btn-ghost w-full text-sm">{t("resend")}</button>
        </form>
      </AuthShell>
    );
  }

  // ── 로그인 화면 ──
  return (
    <AuthShell lang={lang} setLang={setLang}>
      <h1 className="text-2xl font-bold mb-1 text-surface-800 dark:text-surface-100">{t("login")}</h1>
      <p className="text-sm text-surface-500 mb-8">{t("tag")}</p>

      {/* OAuth 버튼 — 설정된 프로바이더만 표시 */}
      {activeProviders.length > 0 && (
        <>
          <div className="space-y-2.5 mb-6">
            {ALL_OAUTH.filter((p) => activeProviders.includes(p.id)).map((p) => (
              <a key={p.id} href={`/api/auth/${p.id}`}
                className="btn-secondary w-full justify-center gap-3 h-11">
                {p.icon === "google" && <GoogleIcon />}
                {p.icon === "microsoft" && <MsIcon />}
                {p.icon === "apple" && <AppleIcon />}
                {t(p.labelKey)}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
            <span className="text-xs text-surface-400 uppercase tracking-wider">{t("or")}</span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-surface-700" />
          </div>
        </>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="name@email.com" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("password")}</label>
          <div className="relative">
            <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="input pr-10" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors">
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded border-surface-300 text-brand-500 focus:ring-brand-400" />
            {t("remember")}
          </label>
          <Link to="/forgot-password" className="text-sm text-brand-500 hover:text-brand-600 font-medium transition-colors">{t("forgot")}</Link>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full h-11">
          {loading ? <Loader2 size={16} className="animate-spin" /> : t("login")}
        </button>
      </form>

      <p className="text-center text-sm text-surface-500 mt-6">
        <Link to="/signup" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">{t("signup")}</Link>
      </p>
    </AuthShell>
  );
}

// ── Auth Shell ──
function AuthShell({ children, lang, setLang }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-surface-50 to-surface-100 dark:from-surface-950 dark:to-surface-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-brand-200/20 dark:bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-200/20 dark:bg-purple-500/5 rounded-full blur-3xl" />
      </div>
      <div className="absolute top-4 right-4 flex gap-1">
        {LANGS_UI.map((l) => (
          <button key={l.id} onClick={() => setLang(l.id)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${lang === l.id ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 font-medium" : "text-surface-400 hover:text-surface-600"}`}>
            {l.label.split(" ")[0]}
          </button>
        ))}
      </div>
      <div className="relative w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-lg font-bold shadow-glow">U</div>
          <span className="text-xl font-bold tracking-tight text-surface-800 dark:text-surface-100">UniSocial</span>
        </div>
        <div className="card p-8 animate-fade-in">{children}</div>
      </div>
    </div>
  );
}

// ── Icons ──
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21">
      <rect fill="#F25022" x="1" y="1" width="9" height="9" />
      <rect fill="#7FBA00" x="11" y="1" width="9" height="9" />
      <rect fill="#00A4EF" x="1" y="11" width="9" height="9" />
      <rect fill="#FFB900" x="11" y="11" width="9" height="9" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.53-3.2 0-1.44.62-2.2.44-3.06-.4C3.79 16.17 4.36 9.02 8.93 8.75c1.27.07 2.16.72 2.91.77.94-.2 1.84-.77 2.84-.7 1.2.1 2.1.58 2.7 1.49-2.49 1.49-1.9 4.77.34 5.69-.5 1.32-1.15 2.62-2.67 4.28zM12.03 8.67c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

export { AuthShell };
