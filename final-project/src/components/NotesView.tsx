'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Sparkles, Plus, Search, Tag, CheckCircle2, Circle, Calendar, Target, Trash2 } from 'lucide-react';
import { Note } from '@/lib/db/storage';

import { ConfirmationModal } from './ConfirmationModal';

export function NotesView() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [kindFilter, setKindFilter] = useState<'ALL' | 'note' | 'plan' | 'idea'>('ALL');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newKind, setNewKind] = useState<'note' | 'plan' | 'idea'>('note');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchNotes = async () => {
    try {
      const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('my_pa_logged_in_user') || '{}')?.email : '';
      const res = await fetch(`/api/items?type=notes${email ? `&email=${encodeURIComponent(email)}` : ''}`);
      const data = await res.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await fetch(`/api/items?type=notes&id=${deleteTargetId}`, { method: 'DELETE' });
      fetchNotes();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `/${newKind === 'plan' ? 'plan' : 'note'} ${newTitle.trim()}: ${newContent.trim()}`,
        }),
      });
      setNewTitle('');
      setNewContent('');
      setShowAdd(false);
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = notes.filter((n) => {
    if (kindFilter !== 'ALL' && n.kind !== kindFilter) return false;
    if (
      search &&
      !n.title.toLowerCase().includes(search.toLowerCase()) &&
      !n.content.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-purple-500" />
            <span>Notes, Ideas & Plans</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Indexed with Vector Embeddings for intelligent semantic retrieval.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>{showAdd ? 'Close' : 'Create Note / Plan'}</span>
        </button>
      </div>

      {/* Add Note Card */}
      {showAdd && (
        <form onSubmit={handleCreateNote} className="glass-card rounded-2xl p-5 border border-purple-500/30 space-y-3">
          <div className="flex items-center space-x-2">
            {(['note', 'plan', 'idea'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setNewKind(k)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                  newKind === k
                    ? 'bg-purple-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title or objective..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />

          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Write note content, thoughts, or milestone details..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />

          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs shadow-sm transition disabled:opacity-40"
          >
            Save to Long-Term Memory
          </button>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex space-x-1.5 w-full sm:w-auto">
          {(['ALL', 'note', 'plan', 'idea'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKindFilter(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                kindFilter === k
                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes or tags..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((note) => {
          const isPlan = note.kind === 'plan';
          return (
            <div
              key={note.id}
              className="glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-3 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      note.kind === 'plan'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : note.kind === 'idea'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                    }`}
                  >
                    {note.kind}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-400">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => requestDelete(note.id, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                      title="Remove note"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{note.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {note.content}
                </p>

                {/* Plan Milestones Checklist */}
                {isPlan && note.steps && note.steps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1">
                      <Target className="w-3.5 h-3.5 text-blue-500" />
                      <span>Roadmap Milestones</span>
                    </p>
                    {note.steps.map((st, i) => (
                      <div key={i} className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300">
                        {st.done ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        )}
                        <span className={st.done ? 'line-through text-slate-400' : ''}>{st.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {note.tags.map((t, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-slate-400 text-sm">
            No notes or plans found.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Note or Plan"
        message="Are you sure you want to delete this note? It will be archived and removed from search results."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        iconType="trash"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
