import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { useToast } from "../context/ToastContext";
import { AuthShell } from "./Login";

export default function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth();
  const { lang, setLang, t } = useLang();
  const { toast, toastError } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: email, 2: code+newPw
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPw, setNewPw] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email) return toastError(t("fillAll"));
    setLoading(true);
    try {
      await forgotPassword(email);
      toast(t("resetSent"));
      setStep(2);
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!code || !newPw) return toastError(t("fillAll"));
    setLoading(true);
    try {
      await resetPassword(email, code, newPw);
      toast("✅ " + t("changePw"));
      navigate("/login");
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

      <h1 className="text-2xl font-bold mb-2 text-surface-800 dark:text-surface-100">{t("forgot")}</h1>

      {step === 1 ? (
        <>
          <p className="text-sm text-surface-500 mb-6">{t("forgotInfo")}</p>
          <form onSubmit={handleSendCode} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="name@email.com" autoFocus />
            <button type="submit" disabled={loading} className="btn-primary w-full h-11">
              {loading ? <Loader2 size={16} className="animate-spin" /> : t("sendCode")}
            </button>
          </form>
        </>
      ) : (
        <>
          <p className="text-sm text-surface-500 mb-6">{t("resetInfo")}</p>
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("resetCode")}</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="input text-center text-xl tracking-[.3em] font-mono" placeholder="000000" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-1.5">{t("newPw")}</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full h-11">
              {loading ? <Loader2 size={16} className="animate-spin" /> : t("changePw")}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
