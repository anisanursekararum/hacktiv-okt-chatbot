'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  Image as ImageIcon,
  CheckCircle2,
  Receipt,
  ShoppingCart,
  BookOpen,
  Bell,
  Bot,
  Sparkles,
  Command,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { SKILL_LIST } from '@/lib/skills/constants';
import { CheatSheetModal } from './CheatSheetModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  media_url?: string | null;
  media_type?: string;
  extracted_items?: any;
  created_at: string;
}

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [mediaAttachment, setMediaAttachment] = useState<{
    mimeType: string;
    dataBase64: string;
    fileName: string;
    previewUrl: string;
  } | null>(null);

  // Slash command autocomplete popup state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial chat history
  useEffect(() => {
    const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('my_pa_logged_in_user') || '{}')?.email : '';
    if (email) setUserEmail(email);
    fetch(`/api/chat${email ? `?email=${encodeURIComponent(email)}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        } else {
          // Welcome greeting
          const userName = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('my_pa_logged_in_user') || '{}')?.name || 'there' : 'there';
          setMessages([
            {
              id: 'welcome_msg',
              role: 'assistant',
              content:
                `Hello ${userName}! I'm My PA (Personal Assistant).\n\nType anything that comes to your mind—todos, groceries, expenses, notes, or plans—and I'll automatically organize them. You can press Enter to create a new line, and click Send when ready. Type \`/\` to access built-in skills like \`/today\` or \`/email-reminder\`.`,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      })
      .catch((err) => console.error('Failed to load chat history:', err));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle slash command autocomplete detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.startsWith('/')) {
      setShowSlashMenu(true);
      setSlashFilter(val.slice(1).toLowerCase());
      setSelectedSlashIndex(0);
    } else {
      setShowSlashMenu(false);
    }
  };

  const filteredSkills = SKILL_LIST.filter(
    (s) =>
      s.name.toLowerCase().includes(slashFilter) ||
      s.description.toLowerCase().includes(slashFilter) ||
      s.aliases?.some((a) => a.toLowerCase().includes(slashFilter))
  );

  const applySkill = (skillName: string) => {
    setInput(`${skillName} `);
    setShowSlashMenu(false);
  };

  // Handle file uploads (Images, Audio, Docs)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      const previewUrl = reader.result as string;
      setMediaAttachment({
        mimeType: file.type || 'image/jpeg',
        dataBase64: base64String,
        fileName: file.name,
        previewUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() && !mediaAttachment) return;

    const userText = input.trim();
    const currentAttachment = mediaAttachment;

    // Optimistic user bubble
    const tempUserMsg: ChatMessage = {
      id: 'temp_' + Date.now(),
      role: 'user',
      content: userText,
      media_url: currentAttachment?.previewUrl || null,
      media_type: currentAttachment?.mimeType.startsWith('image/')
        ? 'image'
        : currentAttachment?.mimeType.startsWith('audio/')
        ? 'audio'
        : 'text',
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setMediaAttachment(null);
    setShowSlashMenu(false);
    setLoading(true);

    try {
      const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('my_pa_logged_in_user') || '{}')?.email : '';
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: userText,
          userEmail: email,
          mediaAttachment: currentAttachment
            ? {
                mimeType: currentAttachment.mimeType,
                dataBase64: currentAttachment.dataBase64,
              }
            : undefined,
        }),
      });

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'err_' + Date.now(),
            role: 'assistant',
            content: `Error: ${data.error}`,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err_' + Date.now(),
          role: 'assistant',
          content: `Failed to process request: ${err.message || 'Network error'}`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click confirm draft expense from chat
  const handleConfirmExpense = async (expenseId: string) => {
    try {
      await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expenses',
          id: expenseId,
          updates: { status: 'CONFIRMED' },
        }),
      });
      alert('Expense confirmed successfully!');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Top Header */}
      <div className="glass-panel px-6 py-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">My PA Chat</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Personal Assistant · Gemini 2.5 Flash
            </p>
          </div>
        </div>

        {/* Quick Skill Action Pill */}
        <div className="hidden sm:flex items-center space-x-2">
          <button
            onClick={() => {
              setInput('/today');
              setTimeout(() => handleSendMessage(), 50);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-500 text-slate-600 dark:text-slate-300 transition border border-slate-200/60 dark:border-slate-700/60"
          >
            /today
          </button>
          <button
            onClick={() => {
              setInput('/daily-briefing');
              setTimeout(() => handleSendMessage(), 50);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-500 text-slate-600 dark:text-slate-300 transition border border-slate-200/60 dark:border-slate-700/60"
          >
            /daily-briefing
          </button>
          <button
            onClick={() => setIsCheatSheetOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 transition shadow-xs"
            title="Open Skill Cheat Sheet (/info)"
          >
            <Command className="w-3.5 h-3.5" />
            <span>Cheat Sheet (/info)</span>
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/10'
                    : 'glass-card text-slate-800 dark:text-slate-100 border border-slate-200/70 dark:border-slate-800/80'
                }`}
              >
                {/* Media Attachment Thumbnail */}
                {msg.media_url && (
                  <div className="mb-3 rounded-lg overflow-hidden border border-white/20 dark:border-slate-700 max-w-xs">
                    {msg.media_type === 'image' ? (
                      <img src={msg.media_url} alt="Attached receipt/media" className="w-full h-auto object-cover max-h-48" />
                    ) : (
                      <div className="flex items-center space-x-2 p-2 bg-slate-900/40 text-xs">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>Attached {msg.media_type}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                {/* Extracted Entities Badges & Actions */}
                {!isUser && msg.extracted_items && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                    <p className="text-[11px] font-semibold tracking-wider uppercase text-slate-400 dark:text-slate-500 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      <span>Classified & Created Items</span>
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {/* Tasks Badges */}
                      {msg.extracted_items.tasks?.map((t: any, idx: number) => (
                        <span
                          key={`task_${idx}`}
                          className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Task: {t.title}</span>
                        </span>
                      ))}

                      {/* Completed Task Badges */}
                      {msg.extracted_items.completedTasks?.map((c: any, idx: number) => (
                        <span
                          key={`comp_${idx}`}
                          className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 line-through"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Completed: {c.title}</span>
                        </span>
                      ))}

                      {/* Expenses Badges with 1-click Confirm */}
                      {msg.extracted_items.expenses?.map((e: any, idx: number) => (
                        <div
                          key={`exp_${idx}`}
                          className="inline-flex items-center space-x-2 text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>
                            Expense Draft: IDR {Number(e.amount).toLocaleString()} ({e.description})
                          </span>
                          <button
                            onClick={() => handleConfirmExpense(e.id)}
                            className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white px-1.5 py-0.5 rounded font-medium shadow-xs"
                          >
                            Confirm
                          </button>
                        </div>
                      ))}

                      {/* Groceries Badges */}
                      {msg.extracted_items.groceries?.map((g: any, idx: number) => (
                        <span
                          key={`groc_${idx}`}
                          className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Grocery: {g.item}</span>
                        </span>
                      ))}

                      {/* Notes Badges */}
                      {msg.extracted_items.notes?.map((n: any, idx: number) => (
                        <span
                          key={`note_${idx}`}
                          className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Note: {n.title}</span>
                        </span>
                      ))}

                      {/* Reminders Badges */}
                      {msg.extracted_items.reminders?.map((r: any, idx: number) => (
                        <span
                          key={`rem_${idx}`}
                          className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Reminder: {r.payload}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`mt-1 text-[10px] text-right ${
                    isUser ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="glass-card rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 flex items-center space-x-3 text-slate-500 dark:text-slate-400 text-xs">
              <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <span>My PA is analyzing and extracting your thoughts...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slash Command Autocomplete Overlay */}
      {showSlashMenu && filteredSkills.length > 0 && (
        <div className="absolute bottom-24 left-4 right-4 sm:left-6 sm:right-6 max-h-60 overflow-y-auto glass-panel rounded-2xl shadow-2xl border border-emerald-500/30 p-2 z-30">
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
            <span>Omnia Skills (Press to select)</span>
            <Command className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="space-y-1 mt-1">
            {filteredSkills.map((skill, idx) => (
              <button
                key={skill.name}
                type="button"
                onClick={() => applySkill(skill.name)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition ${
                  idx === selectedSlashIndex
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{skill.name}</span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">{skill.description}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  {skill.example}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-4 sm:p-6 glass-panel border-t border-slate-200/80 dark:border-slate-800/80">
        {/* Media Attachment Preview Pill */}
        {mediaAttachment && (
          <div className="mb-3 flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-xs w-max">
            {mediaAttachment.mimeType.startsWith('image/') ? (
              <ImageIcon className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
            <span className="truncate max-w-xs">{mediaAttachment.fileName}</span>
            <button
              onClick={() => setMediaAttachment(null)}
              className="text-slate-400 hover:text-rose-500 transition ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          {/* File input trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,audio/*,video/*"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition"
            title="Attach image (receipt) or audio/video"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Main Chat Input Field (Enter creates new line, only Send sends) */}
          <div className="flex-1 relative">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (val.startsWith('/')) {
                  setShowSlashMenu(true);
                  setSlashFilter(val.slice(1).toLowerCase());
                  setSelectedSlashIndex(0);
                } else {
                  setShowSlashMenu(false);
                }
              }}
              onKeyDown={(e) => {
                // Enter without modifier creates a newline (standard behavior).
                // Ctrl+Enter or Cmd+Enter allows keyboard submit as optional shortcut.
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Write anything (Enter creates new line; click Send to submit)..."
              disabled={loading}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 resize-none"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={loading || (!input.trim() && !mediaAttachment)}
            className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition self-end"
            title="Click to Send"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Cheat Sheet Modal */}
      <CheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
        onSelectCommand={(cmd) => {
          setInput(cmd);
          setIsCheatSheetOpen(false);
        }}
        userEmail={userEmail}
      />
    </div>
  );
}
