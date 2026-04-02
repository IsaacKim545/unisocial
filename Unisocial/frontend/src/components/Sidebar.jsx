import { NavLink } from "react-router-dom";
import { LayoutDashboard, PenSquare, Clock, Link2, LogOut, Globe, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LangContext";
import { LANGS_UI } from "../i18n";
import { useState } from "react";

const NAV = [
  { to: "/", icon: LayoutDashboard, key: "dash" },
  { to: "/compose", icon: PenSquare, key: "comp" },
  { to: "/history", icon: Clock, key: "hist" },
  { to: "/accounts", icon: Link2, key: "acct" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const [langOpen, setLangOpen] = useState(false);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col
        bg-white dark:bg-surface-900
        border-r border-surface-100 dark:border-surface-800
        transition-all duration-300 ease-out
        ${collapsed ? "w-[68px]" : "w-[240px]"}
        max-md:w-[240px] max-md:${collapsed ? "-translate-x-full" : "translate-x-0"}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-100 dark:border-surface-800 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-sm font-bold shadow-glow shrink-0">
          U
        </div>
        {!collapsed && (
          <span className="font-bold text-[15px] tracking-tight text-surface-800 dark:text-surface-100 truncate">
            UniSocial
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV.map(({ to, icon: Icon, key }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
              ${isActive
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400 shadow-sm"
                : "text-surface-500 hover:text-surface-700 hover:bg-surface-50 dark:hover:text-surface-300 dark:hover:bg-surface-800"
              }`
            }
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" />
            {!collapsed && <span>{t(key)}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-surface-100 dark:border-surface-800 p-3 space-y-2">
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-surface-500 hover:text-surface-700 hover:bg-surface-50 dark:hover:text-surface-300 dark:hover:bg-surface-800 transition-all"
          >
            <Globe size={16} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 text-left">{LANGS_UI.find((l) => l.id === lang)?.label}</span>
                <ChevronDown size={14} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </>
            )}
          </button>
          {langOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 shadow-card p-1 animate-scale-in">
              {LANGS_UI.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setLang(l.id); setLangOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    lang === l.id
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                      : "hover:bg-surface-50 dark:hover:bg-surface-700"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User & logout */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate text-surface-700 dark:text-surface-200">{user?.username}</div>
              <div className="text-[11px] text-surface-400 truncate">{user?.email}</div>
            </div>
          )}
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-surface-400 hover:text-danger hover:bg-danger-light dark:hover:bg-danger/10 transition-colors shrink-0"
            title={t("out")}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
