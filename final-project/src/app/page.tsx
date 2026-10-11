'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from '@/components/Sidebar';
import { ChatView } from '@/components/ChatView';
import { TodayView } from '@/components/TodayView';
import { TasksView } from '@/components/TasksView';
import { ExpensesView } from '@/components/ExpensesView';
import { GroceriesView } from '@/components/GroceriesView';
import { NotesView } from '@/components/NotesView';
import { RemindersView } from '@/components/RemindersView';
import { SettingsView } from '@/components/SettingsView';
import { GoogleLoginModal } from '@/components/GoogleLoginModal';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import {
  MessageSquare,
  Calendar,
  CheckSquare,
  Receipt,
  ShoppingCart,
  BookOpen,
  Bell,
  Settings as SettingsIcon,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('chat');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Sync state with clean URL path (e.g. /tasks, /expenses, /notes, without #)
  useEffect(() => {
    const handleUrlSync = () => {
      const pathname = window.location.pathname.replace('/', '') as NavTab;
      const validTabs: NavTab[] = ['chat', 'today', 'tasks', 'expenses', 'groceries', 'notes', 'reminders', 'settings'];
      if (validTabs.includes(pathname)) {
        setActiveTab(pathname);
      } else {
        // Also support fallback from previous hash if present
        const hash = window.location.hash.replace('#', '') as NavTab;
        if (validTabs.includes(hash)) {
          setActiveTab(hash);
          window.history.replaceState(null, '', `/${hash}`);
        }
      }
    };

    handleUrlSync();
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, []);

  const changeTab = (tab: NavTab) => {
    setActiveTab(tab);
    const newPath = tab === 'chat' ? '/' : `/${tab}`;
    window.history.pushState(null, '', newPath);
  };

  // Auth gate check
  useEffect(() => {
    const saved = localStorage.getItem('my_pa_logged_in_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email) {
          setUser(parsed);
        }
      } catch (e) {}
    }
    setIsAuthChecking(false);
  }, []);

  // Automated background runner: checks and dispatches due reminders every 30s
  useEffect(() => {
    if (!user?.email) return;

    // Trigger check immediately
    fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email }),
    }).catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email }),
      }).catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, [user?.email]);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('my_pa_logged_in_user');
    setUser(null);
    setIsLogoutModalOpen(false);
  };

  const handleLoginSuccess = (loggedInUser: { name: string; email: string }) => {
    setUser(loggedInUser);
  };

  const mobileTabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'today', label: 'Today', icon: <Calendar className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-5 h-5" /> },
    { id: 'groceries', label: 'Groceries', icon: <ShoppingCart className="w-5 h-5" /> },
    { id: 'notes', label: 'Notes', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'reminders', label: 'Alerts', icon: <Bell className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" /> },
  ];

  // Avoid flash while loading
  if (isAuthChecking) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Loading My PA...
      </div>
    );
  }

  // Strict Auth Gate: Must log in first before seeing dashboard
  if (!user) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40 flex items-center justify-center">
        <GoogleLoginModal isOpen={true} onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={changeTab}
          userEmail={user.email}
          userName={user.name}
          onLogout={handleLogout}
        />
      </div>

      {/* Main View Area with URL Hash routing */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'today' && <TodayView onNavigateTab={changeTab} />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'groceries' && <GroceriesView />}
        {activeTab === 'notes' && <NotesView />}
        {activeTab === 'reminders' && <RemindersView />}
        {activeTab === 'settings' && <SettingsView onLogout={handleLogout} />}
      </main>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        title="Log Out of Google"
        message="Are you sure you want to log out? Your local session will be cleared and you will be returned to the sign-in screen."
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        variant="danger"
        iconType="logout"
        onConfirm={confirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-slate-200/80 dark:border-slate-800/80 z-40 px-2 py-1.5 flex justify-around items-center">
        {mobileTabs.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => changeTab(tab.id)}
              className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-medium transition ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <span className={isActive ? 'text-emerald-500' : ''}>{tab.icon}</span>
              <span className="mt-0.5">{tab.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => changeTab('settings')}
          className={`flex flex-col items-center py-1 px-2 rounded-xl text-[10px] font-medium transition ${
            activeTab === 'settings'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="mt-0.5">More</span>
        </button>
      </nav>
    </div>
  );
}
