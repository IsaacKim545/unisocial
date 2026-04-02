import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut, GoogleAuthProvider, OAuthProvider, signInWithPopup } from "firebase/auth";
import { firebaseAuth } from "../config/firebase";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try { const data = await api.get("/auth/me"); setUser(data.user); }
        catch { setUser({ id: firebaseUser.uid, email: firebaseUser.email, username: firebaseUser.displayName || firebaseUser.email?.split("@")[0] }); }
      } else { setUser(null); }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => { api.onUnauthorized = () => logout(); }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const data = await api.post("/auth/login", { email, password });
    if (data.requireVerification) { setPendingUser({ email, password, remember }); return { needVerify: true }; }
    await api.signInWithCustomToken(data.customToken);
    if (remember) localStorage.setItem("sh_remember", "true");
    setUser(data.user);
    return { needVerify: false };
  }, []);

  const signup = useCallback(async (username, email, password) => {
    const data = await api.post("/auth/signup", { username, email, password });
    setPendingUser({ email, password, remember: false, ...data.pendingUser });
    return data;
  }, []);

  const verify = useCallback(async (code) => {
    if (!pendingUser) throw new Error("No pending user");
    const data = await api.post("/auth/verify", { email: pendingUser.email, code, username: pendingUser.username, passwordHash: pendingUser.passwordHash, language: pendingUser.language });
    await api.signInWithCustomToken(data.customToken);
    setUser(data.user);
    setPendingUser(null);
    return data;
  }, [pendingUser]);

  const resendCode = useCallback(async () => { if (!pendingUser) throw new Error("No pending user"); return api.post("/auth/resend-code", { email: pendingUser.email }); }, [pendingUser]);
  const forgotPassword = useCallback(async (email) => api.post("/auth/forgot-password", { email }), []);
  const resetPassword = useCallback(async (email, code, newPassword) => api.post("/auth/reset-password", { email, code, newPassword }), []);

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
    try { const data = await api.get("/auth/me"); setUser(data.user); } catch { setUser({ id: result.user.uid, email: result.user.email, username: result.user.displayName }); }
  }, []);

  const loginWithMicrosoft = useCallback(async () => {
    const result = await signInWithPopup(firebaseAuth, new OAuthProvider("microsoft.com"));
    try { const data = await api.get("/auth/me"); setUser(data.user); } catch { setUser({ id: result.user.uid, email: result.user.email, username: result.user.displayName }); }
  }, []);

  const loginWithApple = useCallback(async () => {
    const provider = new OAuthProvider("apple.com"); provider.addScope("email"); provider.addScope("name");
    const result = await signInWithPopup(firebaseAuth, provider);
    try { const data = await api.get("/auth/me"); setUser(data.user); } catch { setUser({ id: result.user.uid, email: result.user.email, username: result.user.displayName }); }
  }, []);

  const logout = useCallback(async () => { await signOut(firebaseAuth); setUser(null); setPendingUser(null); localStorage.removeItem("sh_remember"); }, []);

  return (
    <AuthContext.Provider value={{ user, token: firebaseAuth.currentUser ? true : null, loading, pendingUser, setPendingUser, login, signup, verify, resendCode, forgotPassword, resetPassword, loginWithGoogle, loginWithMicrosoft, loginWithApple, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error("useAuth must be inside AuthProvider"); return ctx; }
