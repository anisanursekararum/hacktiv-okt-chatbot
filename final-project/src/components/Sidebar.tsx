'use client';

import React from 'react';
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  Receipt,
  ShoppingCart,
  BookOpen,
  Bell,
  Settings,
  Sun,
  Moon,
  Bot,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';

export type NavTab = 'chat' | 'today' | 'tasks' | 'expenses' | 'groceries' | 'notes' | 'reminders' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userEmail: string;
  userName: string;
  onLogout?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, userEmail, userName, onLogout }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'chat', label: 'Chat Assistant', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'today', label: 'Today Overview', icon: <Calendar className="w-5 h-5" /> },
    { id: 'tasks', label: 'To-Dos', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-5 h-5" /> },
    { id: 'groceries', label: 'Groceries', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'notes', label: 'Notes & Plans', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'reminders', label: 'Reminders', icon: <Bell className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between p-4 h-full shrink-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center space-x-3 px-3 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              My PA
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Personal Assistant</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span className={isActive ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & User Status */}
      <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/60 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition"
        >
          <span className="flex items-center space-x-2">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-teal-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
            <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </span>
          <span className="text-[10px] uppercase font-semibold text-slate-400 px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">
            Toggle
          </span>
        </button>

        {/* Authenticated User Status with Logout Button */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/40">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs shrink-0">
              {userName ? userName.charAt(0).toUpperCase() : 'A'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <p className="text-xs font-semibold truncate text-slate-800 dark:text-slate-200">{userName}</p>
                <span title="Google OAuth Verified">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0 ml-1"
              title="Logout from Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
