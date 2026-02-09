import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  RefreshCw, Loader2, ExternalLink, AlertTriangle, Plus, Unlink,
  Wifi, RotateCcw, CheckCircle, XCircle
} from "lucide-react";
import { useLang } from "../context/LangContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { useAccounts } from "../context/AccountsContext";
import { PLATFORMS } from "../data/platforms";

export default function Accounts() {
  const { lang, t } = useLang();
  const { token } = useAuth();
  const { toast, toastError, toastInfo } = useToast();
  const {
    accounts, disconnectedAccounts, loading, syncing, lastSynced, syncError,
    syncAccounts, disconnectAccount, reconnectAccount,
  } = useAccounts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [actionLoading, setActionLoading] = useState(null); // "platform_id" or "disconnect_id"
  const callbackHandled = useRef(false);

  // OAuth 콜백 처리
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if ((connected || error) && !callbackHandled.current) {
      callbackHandled.current = true;
      setSearchParams({}, { replace: true });

      if (error) {
        const msgs = {
          no_profile: lang === "ko" ? "Late에 프로필이 없습니다. Late 대시보드에서 프로필을 먼저 만들어주세요." : "No Late profile found. Create one at getlate.dev first.",
          connect_failed: lang === "ko" ? "연결에 실패했습니다. 다시 시도해주세요." : "Connection failed. Please try again.",
        };
        toastError(msgs[error] || error);
      }

      if (connected) {
        const pl = PLATFORMS.find((p) => p.id === connected);
        toastInfo(lang === "ko" ? `${pl?.n || connected} 연결 완료! 동기화 중...` : `${pl?.n || connected} connected! Syncing...`);
        syncAccounts(false).then((r) => {
          if (r.success) toast(lang === "ko" ? "동기화 완료" : "Sync complete");
        });
      }
    }
  }, [searchParams]);

  async function handleSync() {
    const result = await syncAccounts(false);
    if (result.success) toast(`${t("syncd")} (${result.synced})`);
    else toastError(result.error);
  }

  function handleConnect(platformId) {
    setActionLoading(`connect_${platformId}`);
    window.location.href = `/api/social/connect/${platformId}?token=${encodeURIComponent(token)}`;
  }

  async function handleDisconnect(acct) {
    const name = PLATFORMS.find((p) => p.id === acct.platform)?.n || acct.platform;
    if (!confirm(lang === "ko" ? `${name} 연결을 해제하시겠습니까?` : `Disconnect ${name}?`)) return;

    setActionLoading(`disconnect_${acct.id}`);
    try {
      await disconnectAccount(acct.id);
      toast(lang === "ko" ? `${name} 연결 해제됨` : `${name} disconnected`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReconnect(acct) {
    const name = PLATFORMS.find((p) => p.id === acct.platform)?.n || acct.platform;
    setActionLoading(`reconnect_${acct.id}`);
    try {
      await reconnectAccount(acct.id);
      toast(lang === "ko" ? `${name} 다시 연결됨` : `${name} reconnected`);
    } catch (err) {
      toastError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const connectedIds = accounts.map((a) => a.platform);
  const disconnectedIds = disconnectedAccounts.map((a) => a.platform);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">🔗 {t("acct")}</h1>
          <p className="text-sm text-surface-500 mt-1">
            {lang === "ko"
              ? `${connectedIds.length}개 플랫폼 연결됨`
              : `${connectedIds.length} platform(s) connected`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="text-[11px] text-surface-400 hidden sm:block">
              {lang === "ko" ? "마지막 동기화: " : "Last sync: "}
              {new Date(lastSynced).toLocaleTimeString(lang === "ko" ? "ko-KR" : "en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button onClick={handleSync} disabled={syncing} className="btn-secondary text-sm">
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {t("sync")}
          </button>
        </div>
      </div>

      {/* 동기화 에러 */}
      {syncError && (
        <div className="card p-4 border-l-4 border-amber-400 bg-amber-50/50 dark:bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-surface-800 dark:text-surface-100 mb-1">
                {lang === "ko" ? "동기화 실패" : "Sync Failed"}
              </p>
              <p className="text-surface-600 dark:text-surface-400 mb-2">{syncError}</p>
              <a href="https://getlate.dev" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-brand-500 hover:text-brand-600 font-medium">
                Late Dashboard <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 연결된 계정 섹션 */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 bg-surface-200 dark:bg-surface-800 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* 연결됨 */}
          {accounts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-500" />
                {lang === "ko" ? `연결된 계정 (${accounts.length})` : `Connected (${accounts.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {accounts.map((acct) => {
                  const pl = PLATFORMS.find((p) => p.id === acct.platform);
                  if (!pl) return null;
                  const isLoading = actionLoading === `disconnect_${acct.id}`;

                  return (
                    <div key={acct.id} className="card p-4 relative overflow-hidden ring-1 ring-emerald-200 dark:ring-emerald-800">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: pl.c }} />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: `${pl.c}15` }}>
                          {pl.i}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-surface-800 dark:text-surface-100">{pl.n}</div>
                          <div className="text-xs text-surface-500 truncate">@{acct.platform_username || "—"}</div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      </div>
                      <button onClick={() => handleDisconnect(acct)} disabled={isLoading}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                          text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
                          active:scale-[0.98] transition-all">
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />}
                        {lang === "ko" ? "연결 해제" : "Disconnect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 연결 해제됨 (재연결 가능) */}
          {disconnectedAccounts.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3 flex items-center gap-2">
                <XCircle size={14} className="text-surface-400" />
                {lang === "ko" ? `연결 해제됨 (${disconnectedAccounts.length})` : `Disconnected (${disconnectedAccounts.length})`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {disconnectedAccounts.map((acct) => {
                  const pl = PLATFORMS.find((p) => p.id === acct.platform);
                  if (!pl) return null;
                  const isLoading = actionLoading === `reconnect_${acct.id}`;

                  return (
                    <div key={acct.id} className="card p-4 relative overflow-hidden opacity-60">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-surface-200 dark:bg-surface-700" />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 bg-surface-100 dark:bg-surface-800">
                          {pl.i}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-surface-800 dark:text-surface-100">{pl.n}</div>
                          <div className="text-xs text-surface-400 truncate">@{acct.platform_username || "—"}</div>
                        </div>
                      </div>
                      <button onClick={() => handleReconnect(acct)} disabled={isLoading}
                        className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium
                          text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10
                          active:scale-[0.98] transition-all">
                        {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                        {lang === "ko" ? "다시 연결" : "Reconnect"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 새로 연결 가능한 플랫폼 */}
          {(() => {
            const allKnown = [...connectedIds, ...disconnectedIds];
            const available = PLATFORMS.filter((pl) => !allKnown.includes(pl.id));
            if (available.length === 0) return null;

            return (
              <div>
                <h2 className="text-sm font-semibold text-surface-600 dark:text-surface-400 mb-3 flex items-center gap-2">
                  <Plus size={14} />
                  {lang === "ko" ? `연결 가능 (${available.length})` : `Available (${available.length})`}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {available.map((pl) => {
                    const isLoading = actionLoading === `connect_${pl.id}`;

                    return (
                      <div key={pl.id} className="card p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-surface-200 dark:bg-surface-700" />
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: `${pl.c}10` }}>
                            {pl.i}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-surface-800 dark:text-surface-100">{pl.n}</div>
                            <div className="text-xs text-surface-400">
                              {pl.type === "media" ? (lang === "ko" ? "미디어" : "Media")
                                : pl.type === "text" ? (lang === "ko" ? "텍스트" : "Text")
                                : (lang === "ko" ? "텍스트+미디어" : "Text+Media")}
                            </div>
                          </div>
                        </div>
                        <button onClick={() => handleConnect(pl.id)} disabled={isLoading}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium
                            border-2 border-dashed active:scale-[0.98] transition-all"
                          style={{
                            borderColor: `${pl.c}30`,
                            color: pl.c === "#000000" || pl.c === "#FFFC00" ? "#666" : pl.c,
                          }}>
                          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                          {lang === "ko" ? "연결하기" : "Connect"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* 안내 */}
      <div className="card p-4 bg-surface-50/50 dark:bg-surface-800/30">
        <div className="flex items-start gap-3">
          <Wifi size={16} className="text-surface-400 shrink-0 mt-0.5" />
          <div className="text-xs text-surface-500 space-y-1">
            <p>
              {lang === "ko"
                ? "'연결하기'를 누르면 해당 플랫폼 로그인 페이지로 이동합니다. 인증 후 자동으로 돌아옵니다."
                : "Tap 'Connect' to go to the platform's login page. You'll be redirected back after authorization."}
            </p>
            <p>
              {lang === "ko"
                ? "'연결 해제'는 UniSocial에서만 해제됩니다. Late 대시보드의 연결은 유지됩니다."
                : "Disconnect only removes the link in UniSocial. The Late connection remains intact."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
