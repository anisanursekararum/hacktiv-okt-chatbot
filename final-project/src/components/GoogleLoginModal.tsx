'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bot, ShieldCheck, Mail, ArrowRight, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface GoogleLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: { name: string; email: string }) => void;
}

export function GoogleLoginModal({ isOpen, onLoginSuccess }: GoogleLoginModalProps) {
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Fetch client ID from server config
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => res.json())
      .then((data) => {
        if (data.googleClientId && !data.googleClientId.includes('your-google')) {
          setClientId(data.googleClientId);
        }
      })
      .catch((err) => console.error('Failed to get auth config:', err));
  }, []);

  // Parse JWT credential token from Google
  const decodeJwtPayload = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Initialize official Google Identity Services
  useEffect(() => {
    if (!isOpen) return;

    const initializeGoogleGSI = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id || !clientId) return;

      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (response.credential) {
              const payload = decodeJwtPayload(response.credential);
              const email = payload?.email || 'google.user@gmail.com';
              const name = payload?.name || payload?.given_name || 'Google User';
              const sub = payload?.sub || 'google_user';

              await handleBackendLogin(name, email, sub);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: false,
        });

        if (googleBtnContainerRef.current) {
          googleBtnContainerRef.current.innerHTML = '';
          google.accounts.id.renderButton(googleBtnContainerRef.current, {
            theme: 'filled_blue',
            size: 'large',
            shape: 'pill',
            width: 320,
            text: 'continue_with',
          });
        }
      } catch (err: any) {
        console.error('Google GSI Init error:', err);
      }
    };

    if (!(window as any).google?.accounts?.id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogleGSI;
      document.body.appendChild(script);
    } else {
      initializeGoogleGSI();
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const handleBackendLogin = async (name: string, email: string, sub?: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          google_sub: sub || 'google_' + Math.random().toString(36).substring(2, 10),
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      localStorage.setItem('my_pa_logged_in_user', JSON.stringify({ name, email }));
      onLoginSuccess({ name, email });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerGooglePrompt = () => {
    const google = (window as any).google;
    if (google?.accounts?.id && clientId) {
      google.accounts.id.prompt();
    } else if (!clientId) {
      setErrorMsg('GOOGLE_CLIENT_ID is not configured in .env yet. You can sign in with your email below.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-emerald-50/30 to-teal-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/40 backdrop-blur-xl animate-fade-in">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl space-y-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
            <Bot className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Sign In to My PA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Personal Assistant · Secure Google Single-User Access
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Official Google OAuth GSI Button */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div ref={googleBtnContainerRef} className="w-full flex justify-center min-h-[44px]" />

          {/* Trigger button fallback */}
          {(!clientId || !Boolean((window as any).google)) && (
            <button
              onClick={handleTriggerGooglePrompt}
              className="w-full flex items-center justify-center space-x-3 px-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm shadow-md transition"
            >
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
              <span>Sign In with Google</span>
            </button>
          )}
        </div>

        {/* Direct Google Account Sign-In Form */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-3">
          <p className="text-[11px] text-slate-400 text-center font-medium">
            Or sign in directly with your Google email:
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (googleEmail.trim()) {
                handleBackendLogin(googleName.trim() || 'Google User', googleEmail.trim());
              }
            }}
            className="space-y-2.5"
          >
            <input
              type="text"
              value={googleName}
              onChange={(e) => setGoogleName(e.target.value)}
              placeholder="Your Name (e.g. Anisa Arum)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
            <input
              type="email"
              required
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              placeholder="Google Email (e.g. yourname@gmail.com)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />

            <button
              type="submit"
              disabled={loading || !googleEmail.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-sm disabled:opacity-40"
            >
              {loading ? 'Authenticating...' : `Continue to My PA`}
            </button>
          </form>
        </div>

        {/* Security Info */}
        <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
          <p className="flex items-center space-x-1.5 font-medium text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Single-User Architecture</span>
          </p>
          <p>
            • System SMTP sender: <strong>anisa.arum.work@gmail.com</strong>.<br />
            • Reminders & backups will be sent to your authenticated Google email.
          </p>
        </div>
      </div>
    </div>
  );
}
