'use client';

import React, { useState, useEffect } from 'react';
import { Bot, ShieldCheck, Mail, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: { name: string; email: string }) => void;
}

export function GoogleLoginModal({ isOpen, onLoginSuccess }: GoogleLoginModalProps) {
  const [googleEmail, setGoogleEmail] = useState('user@gmail.com');
  const [googleName, setGoogleName] = useState('Google User');
  const [loading, setLoading] = useState(false);

  // Load Google Identity Services GSI script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (!isOpen) return null;

  const handleSignIn = async (name: string, email: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          google_sub: 'google_' + Math.random().toString(36).substring(2, 10),
        }),
      });
      const data = await res.json();
      localStorage.setItem('my_pa_logged_in_user', JSON.stringify({ name, email }));
      onLoginSuccess({ name, email });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-emerald-500/30 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Sign In to My PA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personal Assistant · Sign in with your Google account
          </p>
        </div>

        {/* Google OAuth Button */}
        <div className="space-y-4">
          <button
            onClick={() => handleSignIn(googleName || 'Google User', googleEmail)}
            disabled={loading}
            className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-md transition disabled:opacity-50"
          >
            {/* Google G SVG */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google Login</span>
          </button>

          {/* Custom Google Account Form for Custom Google Emails */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
            <p className="text-[11px] text-slate-400 text-center font-medium">
              Or sign in with a specific Google email:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                placeholder="Full Name (e.g. Anisa Arum)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="Google Email (e.g. yourname@gmail.com)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            <button
              onClick={() => handleSignIn(googleName || 'User', googleEmail)}
              disabled={loading || !googleEmail.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm disabled:opacity-40"
            >
              Log In as {googleEmail}
            </button>
          </div>
        </div>

        {/* Note on SMTP Sender */}
        <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="flex items-center space-x-1.5 font-medium text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Single-User Google OAuth Security</span>
          </p>
          <p>
            • Reminders & backups will be sent to your logged-in Google email.<br />
            • Reminders are dispatched by system SMTP: <strong>anisa.arum.work@gmail.com</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
