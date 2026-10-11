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
  const [user, setUser] = useState({
    name: 'Anisa Arum',
    email: 'anisa.arum.work@gmail.com',
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  useEffect(() => {
    // Check saved session
    const saved = localStorage.getItem('my_pa_logged_in_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      } catch (e) {}
    } else {
      setIsLoginModalOpen(true);
    }

    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.user && !saved) {
          setUser({
            name: data.user.name || 'Anisa Arum',
            email: data.user.email || 'anisa.arum.work@gmail.com',
          });
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('my_pa_logged_in_user');
    setIsLoginModalOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: { name: string; email: string }) => {
    setUser(loggedInUser);
    setIsLoginModalOpen(false);
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Google Login Modal */}
      <GoogleLoginModal
        isOpen={isLoginModalOpen}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userEmail={user.email}
          userName={user.name}
          onLogout={handleLogout}
        />
      </div>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {activeTab === 'chat' && <ChatView />}
        {activeTab === 'today' && <TodayView onNavigateTab={setActiveTab} />}
        {activeTab === 'tasks' && <TasksView />}
        {activeTab === 'expenses' && <ExpensesView />}
        {activeTab === 'groceries' && <GroceriesView />}
        {activeTab === 'notes' && <NotesView />}
        {activeTab === 'reminders' && <RemindersView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Navigation Bar (PWA optimized) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-panel border-t border-slate-200/80 dark:border-slate-800/80 z-40 px-2 py-1.5 flex justify-around items-center">
        {mobileTabs.slice(0, 5).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
          onClick={() => setActiveTab('settings')}
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
