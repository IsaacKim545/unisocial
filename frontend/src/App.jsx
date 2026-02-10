import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { LangProvider } from "./context/LangContext";
import { ToastProvider } from "./context/ToastContext";
import { AccountsProvider } from "./context/AccountsContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import Compose from "./pages/Compose";
import History from "./pages/History";
import Accounts from "./pages/Accounts";

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <ToastProvider>
            <AccountsProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected routes */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="compose" element={<Compose />} />
                <Route path="history" element={<History />} />
                <Route path="accounts" element={<Accounts />} />
              </Route>
            </Routes>
            </AccountsProvider>
          </ToastProvider>
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
