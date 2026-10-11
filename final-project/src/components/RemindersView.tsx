'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, Clock, Send, Plus, CheckCircle2, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { Reminder } from '@/lib/db/storage';

export function RemindersView() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newPayload, setNewPayload] = useState('');
  const [newChannel, setNewChannel] = useState<'email' | 'in_app'>('email');
  const [dispatching, setDispatching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchReminders = async () => {
    try {
      const res = await fetch('/api/reminders');
      const data = await res.json();
      setReminders(data.reminders || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Remove this reminder?')) return;
    try {
      await fetch(`/api/items?type=reminders&id=${id}`, { method: 'DELETE' });
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayload.trim()) return;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `/email-reminder ${newPayload.trim()}`,
        }),
      });
      setNewPayload('');
      fetchReminders();
    } catch (err) {
      console.error(err);
    }
  };

  // Test / dispatch due reminders via API
  const handleTriggerDispatch = async () => {
    setDispatching(true);
    setMessage(null);
    try {
      const res = await fetch('/api/reminders', { method: 'POST' });
      const data = await res.json();
      setMessage(`Processed ${data.processed || 0} reminders.`);
      fetchReminders();
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header and Trigger Button */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Bell className="w-6 h-6 text-rose-500" />
            <span>Reminders & Alerts</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automated alerts dispatched via Gmail SMTP (anisa.arum.work@gmail.com) and in-app.
          </p>
        </div>

        <button
          onClick={handleTriggerDispatch}
          disabled={dispatching}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${dispatching ? 'animate-spin' : ''}`} />
          <span>Check & Send Due Reminders</span>
        </button>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs">
          {message}
        </div>
      )}

      {/* Quick Add Form */}
      <form onSubmit={handleCreate} className="glass-card rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Schedule New Reminder</h3>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={newPayload}
            onChange={(e) => setNewPayload(e.target.value)}
            placeholder="e.g. 'besok jam 6 pagi ingetin buat release patch167' or 'pay property tax tomorrow 9am'..."
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />

          <button
            type="submit"
            disabled={!newPayload.trim()}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center space-x-1 shadow-sm transition disabled:opacity-40 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Email Reminder</span>
          </button>
        </div>
      </form>

      {/* Reminders List */}
      <div className="space-y-2.5">
        {reminders.map((r) => {
          const isSent = r.status === 'SENT';
          const isFailed = r.status === 'FAILED';
          return (
            <div
              key={r.id}
              className={`glass-card p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                isSent
                  ? 'border-slate-200/40 dark:border-slate-800/40 opacity-70'
                  : isFailed
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs bg-rose-500/10 text-rose-600"
                >
                  <Mail className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
                    {r.payload}
                  </p>
                  <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(r.trigger_time).toLocaleString()}</span>
                    </span>
                    <span className="capitalize text-emerald-600 dark:text-emerald-400 font-medium">Channel: Gmail SMTP</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isSent
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isFailed
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {r.status}
                </span>

                <button
                  onClick={(e) => handleDelete(r.id, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove reminder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {reminders.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No reminders scheduled yet.
          </div>
        )}
      </div>
    </div>
  );
}
