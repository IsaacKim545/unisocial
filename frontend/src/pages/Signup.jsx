import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { AuthShell } from "./Login";

export default function Signup() {
  const { signup } = useAuth();
  const { lang, setLang, t } = useLang();
  const { toastError } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!username || !email || !password) return toastError(t("fillAll"));
    setLoading(true);
    try {
      await signup(username, email, password);
      navigate("/login"); // verify flow will show
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell lang={lang} setLang={setLang}>
      <Link to="/login" className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors">
        <ArrowLeft size={16} /> {t("back")}
      </Link>

      <h1 className="text-2xl font-bold mb-1 text-surface-800 dark:text-surface-100">{t("signup")}</h1>
      <p className="text-sm text-surface-500 mb-8">{t("tag")}</p>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("username")}</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="input" autoFocus />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("email")}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="name@email.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("password")}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" />
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full h-11">
          {loading ? <Loader2 size={16} className="animate-spin" /> : t("signup")}
        </button>
      </form>

      <p className="text-center text-sm text-surface-500 mt-6">
        <Link to="/login" className="text-brand-500 hover:text-brand-600 font-medium transition-colors">{t("login")}</Link>
      </p>
    </AuthShell>
  );
}
