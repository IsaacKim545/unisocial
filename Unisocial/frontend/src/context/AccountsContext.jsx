import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import api from "../api/client";

const AccountsContext = createContext(null);

const SYNC_INTERVAL = 60 * 60 * 1000; // 1시간

export function AccountsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [disconnectedAccounts, setDisconnectedAccounts] = useState([]); // is_active=false
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const hasSynced = useRef(false);

  // 로그인 시 자동 로드 + 동기화
  useEffect(() => {
    if (!isAuthenticated) {
      setAccounts([]);
      setDisconnectedAccounts([]);
      setLoading(false);
      hasSynced.current = false;
      return;
    }
    loadAndSync();
  }, [isAuthenticated]);

  async function loadAndSync() {
    setLoading(true);
    setSyncError(null);
    try {
      // 1. DB에서 기존 계정 먼저 로드 (빠른 표시)
      const d = await api.get("/social/accounts");
      const all = d.accounts || [];
      setAccounts(all.filter((a) => a.is_active));
      setDisconnectedAccounts(all.filter((a) => !a.is_active));

      // 2. 마지막 동기화가 1시간 이상 지났으면 자동 동기화
      const lastSync = localStorage.getItem("sh_last_sync");
      const shouldSync = !lastSync || (Date.now() - parseInt(lastSync)) > SYNC_INTERVAL;

      if (shouldSync && !hasSynced.current) {
        hasSynced.current = true;
        await syncAccounts(true);
      }
    } catch (err) {
      console.error("Account load error:", err);
    } finally {
      setLoading(false);
    }
  }

  // 동기화 (Late API → DB → UI)
  const syncAccounts = useCallback(async (silent = false) => {
    setSyncing(true);
    setSyncError(null);
    try {
      const d = await api.post("/social/sync");
      const synced = (d.accounts || []).filter((a) => a.is_active);
      setAccounts(synced);
      setLastSynced(new Date());
      localStorage.setItem("sh_last_sync", Date.now().toString());

      // 비활성 계정도 새로고침
      try {
        const all = await api.get("/social/accounts");
        setDisconnectedAccounts((all.accounts || []).filter((a) => !a.is_active));
      } catch {}

      return { success: true, synced: d.synced || synced.length };
    } catch (err) {
      const msg = err.message || "Sync failed";
      if (!silent) setSyncError(msg);
      console.error("Sync error:", msg);
      return { success: false, error: msg };
    } finally {
      setSyncing(false);
    }
  }, []);

  // 연결 해제 — sync 호출 안 함, 응답의 accounts로 직접 갱신
  const disconnectAccount = useCallback(async (accountId) => {
    const d = await api.del(`/social/accounts/${accountId}`);
    // 서버가 현재 active 목록을 반환
    setAccounts(d.accounts || []);
    // 해제된 계정을 disconnected 목록에 추가
    const all = await api.get("/social/accounts");
    setDisconnectedAccounts((all.accounts || []).filter((a) => !a.is_active));
    return d;
  }, []);

  // 재연결 — 해제된 계정 다시 활성화
  const reconnectAccount = useCallback(async (accountId) => {
    const d = await api.post(`/social/accounts/${accountId}/reconnect`, {});
    setAccounts(d.accounts || []);
    const all = await api.get("/social/accounts");
    setDisconnectedAccounts((all.accounts || []).filter((a) => !a.is_active));
    return d;
  }, []);

  const connectedPlatforms = accounts.map((a) => a.platform);
  const hasAccounts = accounts.length > 0;

  return (
    <AccountsContext.Provider value={{
      accounts, disconnectedAccounts, loading, syncing, lastSynced, syncError,
      connectedPlatforms, hasAccounts,
      syncAccounts, disconnectAccount, reconnectAccount,
      refreshAccounts: loadAndSync,
    }}>
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const ctx = useContext(AccountsContext);
  if (!ctx) throw new Error("useAccounts must be inside AccountsProvider");
  return ctx;
}
