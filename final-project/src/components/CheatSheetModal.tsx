'use client';

import React, { useState } from 'react';
import {
  X,
  Command,
  Copy,
  Check,
  Search,
  Bot,
  Calendar,
  CheckSquare,
  Receipt,
  ShoppingCart,
  BookOpen,
  Bell,
  Cpu,
} from 'lucide-react';
import { SKILL_LIST } from '@/lib/skills/constants';

interface CheatSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand?: (cmd: string) => void;
  userEmail?: string;
}

export function CheatSheetModal({ isOpen, onClose, onSelectCommand, userEmail }: CheatSheetModalProps) {
  const [search, setSearch] = useState('');
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 1500);
  };

  const filteredSkills = SKILL_LIST.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.example.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-panel w-full max-w-2xl max-h-[85vh] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <span>My PA Skill Cheat Sheet</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  19 Commands
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Email Recipient: <span className="font-medium text-slate-700 dark:text-slate-300">{userEmail || 'Active Google Account'}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search command, description, or example..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              autoFocus
            />
          </div>
        </div>

        {/* Commands List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {filteredSkills.map((skill) => {
            const isCopied = copiedCmd === skill.name;
            return (
              <div
                key={skill.name}
                className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 hover:border-emerald-500/40 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10">
                        {skill.name}
                      </span>
                      {skill.aliases && skill.aliases.length > 0 && (
                        <span className="text-[10px] text-slate-400 font-mono">
                          alias: {skill.aliases.join(', ')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1.5 font-medium leading-relaxed">
                      {skill.description}
                    </p>
                    <div className="mt-1.5 flex items-center space-x-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-mono bg-slate-100/70 dark:bg-slate-800/50 px-2.5 py-1 rounded-lg w-fit">
                      <span className="text-slate-400">example:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">{skill.example}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(skill.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Copy command"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {onSelectCommand && (
                      <button
                        onClick={() => {
                          onSelectCommand(skill.example || skill.name);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition shadow-xs"
                      >
                        Use
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSkills.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No matching commands found for "{search}".
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between text-[11px] text-slate-400 px-5">
          <span>Click <strong>Use</strong> to paste into Chat or <strong>Copy</strong> to clipboard</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
