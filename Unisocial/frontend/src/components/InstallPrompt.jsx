import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 이미 설치된 경우 감지
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // 이전에 배너를 닫은 경우 24시간 동안 숨김
    const dismissed = localStorage.getItem("pwa_dismissed");
    if (dismissed && Date.now() - parseInt(dismissed) < 24 * 60 * 60 * 1000) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      setIsInstalled(true);
      setShowBanner(false);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa_dismissed", Date.now().toString());
  };

  if (!showBanner || isInstalled) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-black/5 dark:bg-surface-800 dark:ring-white/10">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
          <Download className="h-6 w-6 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-surface-900 dark:text-white">
            UniSocial 앱 설치
          </p>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            홈 화면에 추가하여 더 빠르게 이용하세요
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-600 transition-colors"
        >
          설치
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
