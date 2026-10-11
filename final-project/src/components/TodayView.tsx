'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, DollarSign, ShoppingCart, RefreshCw, Sun, ChevronRight } from 'lucide-react';
import { Task, Expense, Grocery } from '@/lib/db/storage';

export function TodayView({ onNavigateTab }: { onNavigateTab: (tab: any) => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      setCurrentTime(timeStr);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = () => {
    setLoading(true);
    fetch('/api/items')
      .then((res) => res.json())
      .then((data) => {
        setTasks(data.tasks || []);
        setExpenses(data.expenses || []);
        setGroceries(data.groceries || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
  const completedToday = tasks.filter((t) => t.status === 'COMPLETED' && t.completed_at?.startsWith(todayStr));
  const todayExpenses = expenses.filter((e) => e.transaction_date.startsWith(todayStr));
  const todaySpent = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const activeGroceries = groceries.filter((g) => g.status === 'ACTIVE');

  const toggleTask = async (task: Task) => {
    const nextStatus = task.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tasks',
        id: task.id,
        updates: { status: nextStatus },
      }),
    });
    loadData();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Sun className="w-4 h-4" />
            <span>Today's Daily Briefing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </h2>
          <div className="flex items-center space-x-2 mt-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl w-max">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime || 'Loading time...'}</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            You have {pendingTasks.length} pending tasks and {activeGroceries.length} shopping items today.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Tasks */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">To-Dos Today</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {pendingTasks.length} Pending
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {pendingTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                onClick={() => toggleTask(t)}
                className="flex items-center space-x-2.5 p-2 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer transition text-xs"
              >
                <Circle className="w-4 h-4 text-slate-400 hover:text-emerald-500 shrink-0" />
                <span className="truncate text-slate-700 dark:text-slate-200">{t.title}</span>
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2">All tasks completed! Great job!</p>
            )}
          </div>
          <button
            onClick={() => onNavigateTab('tasks')}
            className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline pt-2 border-t border-slate-200/60 dark:border-slate-700/60"
          >
            <span>Manage All Tasks</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 2: Today's Expenses */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Spending Today</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              IDR {todaySpent.toLocaleString()}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {todayExpenses.slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-xl text-xs text-slate-700 dark:text-slate-200">
                <span className="truncate">{e.description}</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                  IDR {Number(e.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {todayExpenses.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2">No expenses logged for today yet.</p>
            )}
          </div>
          <button
            onClick={() => onNavigateTab('expenses')}
            className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline pt-2 border-t border-slate-200/60 dark:border-slate-700/60"
          >
            <span>View All Expenses</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Card 3: Groceries */}
        <div className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Groceries</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              {activeGroceries.length} Items
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {activeGroceries.slice(0, 4).map((g) => (
              <div key={g.id} className="flex items-center space-x-2 p-2 rounded-xl text-xs text-slate-700 dark:text-slate-200">
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="truncate">{g.item} ({g.quantity})</span>
              </div>
            ))}
            {activeGroceries.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2">Shopping list is clear!</p>
            )}
          </div>
          <button
            onClick={() => onNavigateTab('groceries')}
            className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline pt-2 border-t border-slate-200/60 dark:border-slate-700/60"
          >
            <span>Open Shopping List</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
