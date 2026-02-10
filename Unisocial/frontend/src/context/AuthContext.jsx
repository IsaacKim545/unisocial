import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUser, setPendingUser] = useState(null); // 이메일 인증 대기

  // 초기 로드: 저장된 토큰 복원
  useEffect(() => {
    const saved = localStorage.getItem("sh_token") || sessionStorage.getItem("sh_token");
    const savedUser = localStorage.getItem("sh_user") || sessionStorage.getItem("sh_user");
    if (saved && savedUser) {
      setToken(saved);
      setUser(JSON.parse(savedUser));
      api.setToken(saved);
    }
    setLoading(false);
  }, []);

  // 401 처리
  useEffect(() => {
    api.onUnauthorized = () => logout();
  }, []);

  const saveSession = useCallback((data, remember = false) => {
    const store = remember ? localStorage : sessionStorage;
    store.setItem("sh_token", data.token);
    store.setItem("sh_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    api.setToken(data.token);
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const data = await api.post("/auth/login", { email, password });
    if (data.requireVerification) {
      setPendingUser({ email, password, remember });
      return { needVerify: true };
    }
    saveSession(data, remember);
    return { needVerify: false };
  }, [saveSession]);

  const signup = useCallback(async (username, email, password) => {
    const data = await api.post("/auth/register", { username, email, password });
    setPendingUser({ email, password, remember: false });
    return data;
  }, []);

  const verify = useCallback(async (code) => {
    if (!pendingUser) throw new Error("No pending user");
    const data = await api.post("/auth/verify", { email: pendingUser.email, code });
    saveSession(data, pendingUser.remember);
    setPendingUser(null);
    return data;
  }, [pendingUser, saveSession]);

  const resendCode = useCallback(async () => {
    if (!pendingUser) throw new Error("No pending user");
    return api.post("/auth/resend-code", { email: pendingUser.email });
  }, [pendingUser]);

  const forgotPassword = useCallback(async (email) => {
    return api.post("/auth/forgot-password", { email });
  }, []);

  const resetPassword = useCallback(async (email, code, newPassword) => {
    return api.post("/auth/reset-password", { email, code, newPassword });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setPendingUser(null);
    api.setToken(null);
    localStorage.removeItem("sh_token");
    localStorage.removeItem("sh_user");
    sessionStorage.removeItem("sh_token");
    sessionStorage.removeItem("sh_user");
  }, []);

  return (
    <AuthContext.Provider value={{
      user, token, loading, pendingUser, setPendingUser,
      login, signup, verify, resendCode, forgotPassword, resetPassword, logout,
      isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
