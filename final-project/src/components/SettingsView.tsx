'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Cpu,
  Sliders,
  Download,
  Mail,
  Upload,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { UserSettings } from '@/lib/db/storage';

export function SettingsView() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data.settings);
      setUser(data.user);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: 'AI parameters updated successfully!' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const resetDefaults = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      model_name: 'gemini-2.5-flash',
      temperature: 0.3,
      top_p: 0.95,
      top_k: 40,
    });
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleEmailBackup = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'email' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg({ type: 'success', text: data.message || 'Backup dispatched to your registered email!' });
      } else {
        setStatusMsg({ type: 'error', text: data.message || 'Failed to email backup' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        const res = await fetch('/api/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'import', backupData: parsed }),
        });
        const data = await res.json();
        if (data.success) {
          setStatusMsg({
            type: 'success',
            text: `Backup restored successfully! Merged tables without duplicates.`,
          });
        }
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: 'Invalid JSON backup file: ' + err.message });
      }
    };
    reader.readAsText(file);
  };

  if (!settings) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-300" />
          <span>System Settings & Configuration</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Adjust Google Gemini model parameters, backup policies, and single-user authentication.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl flex items-center space-x-2 text-xs ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* AI Engine Configuration Card */}
      <form onSubmit={handleSaveSettings} className="glass-card rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Google Gemini AI Engine</h3>
          </div>
          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Active Gemini Model Name
          </label>
          <select
            value={settings.model_name}
            onChange={(e) => setSettings({ ...settings, model_name: e.target.value })}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended Free-Tier Default)</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash (Ultra-fast, Free-Tier)</option>
            <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            <option value="gemini-1.5-pro">gemini-1.5-pro (High reasoning, Deep Tier)</option>
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Free tier default uses Flash-class models to avoid billing charges.
          </p>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Temperature */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Temperature</span>
              <span className="text-emerald-500">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">0.0–0.2 parsing, 0.7 conversation</p>
          </div>

          {/* Top P */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Top P</span>
              <span className="text-emerald-500">{settings.top_p}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.top_p}
              onChange={(e) => setSettings({ ...settings, top_p: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Nucleus sampling threshold</p>
          </div>

          {/* Top K */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span>Top K</span>
              <span className="text-emerald-500">{settings.top_k}</span>
            </div>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={settings.top_k}
              onChange={(e) => setSettings({ ...settings, top_k: parseInt(e.target.value, 10) })}
              className="w-full accent-emerald-500"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">Vocabulary token limit</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition"
        >
          <Save className="w-4 h-4" />
          <span>Save Parameters</span>
        </button>
      </form>

      {/* Backup & Export Section */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
          <Download className="w-5 h-5 text-teal-500" />
          <span>Database Backup & Restore</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          History is kept forever and archived, never permanently deleted. Export all tables in JSON or restore a previous snapshot.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-200/60 dark:border-slate-700"
          >
            <Download className="w-4 h-4" />
            <span>Download JSON Backup</span>
          </button>

          <button
            onClick={handleEmailBackup}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            <span>Email Backup to {user?.email}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-200/60 dark:border-slate-700"
          >
            <Upload className="w-4 h-4" />
            <span>Import / Restore Backup</span>
          </button>
        </div>
      </div>

      {/* Authentication & User Info */}
      <div className="glass-card rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <span>My PA Authentication Profile</span>
          </h3>
          <button
            onClick={() => {
              localStorage.removeItem('my_pa_logged_in_user');
              window.location.reload();
            }}
            className="px-3 py-1 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition"
          >
            Log Out from Google
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Google OAuth 2.0 single-user architecture. Logging in on multiple devices (laptop, iPhone) connects to the same synchronized history.
        </p>
        <div className="pt-2 text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
          <p>• <strong>Logged In Google Account:</strong> {user?.name} ({user?.email})</p>
          <p>• <strong>Reminders & Backup Recipient:</strong> Sent directly to <strong>{user?.email}</strong></p>
          <p>• <strong>System SMTP Sender:</strong> <code>anisa.arum.work@gmail.com</code> (Gmail SMTP)</p>
          <p>• <strong>Timezone:</strong> {user?.timezone} (Asia/Jakarta)</p>
          <p>• <strong>Retention Policy:</strong> Indefinite storage with soft-archiving (items never permanently deleted)</p>
        </div>
      </div>
    </div>
  );
}
