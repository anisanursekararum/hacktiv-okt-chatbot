'use client';

import React, { useState, useEffect } from 'react';
import { Receipt, Check, Download, AlertCircle, Plus, DollarSign, Calendar, Tag, Trash2 } from 'lucide-react';
import { Expense } from '@/lib/db/storage';

import { ConfirmationModal } from './ConfirmationModal';

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [tab, setTab] = useState<'ALL' | 'DRAFT' | 'CONFIRMED'>('ALL');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    try {
      const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('my_pa_logged_in_user') || '{}')?.email : '';
      const res = await fetch(`/api/items?type=expenses${email ? `&email=${encodeURIComponent(email)}` : ''}`);
      const data = await res.json();
      setExpenses(data.expenses || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleConfirm = async (id: string) => {
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'expenses',
        id,
        updates: { status: 'CONFIRMED' },
      }),
    });
    fetchExpenses();
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await fetch(`/api/items?type=expenses&id=${deleteTargetId}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleConfirmAllDrafts = async () => {
    const drafts = expenses.filter((e) => e.status === 'DRAFT');
    for (const d of drafts) {
      await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'expenses',
          id: d.id,
          updates: { status: 'CONFIRMED' },
        }),
      });
    }
    fetchExpenses();
  };

  const exportCSV = () => {
    let csv = 'Date,Description,Category,Amount,Status\n';
    expenses.forEach((e) => {
      csv += `"${e.transaction_date.split('T')[0]}","${e.description}","${e.category}",${e.amount},"${e.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `omnia_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const drafts = expenses.filter((e) => e.status === 'DRAFT');
  const totalSpent = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const filtered = expenses.filter((e) => {
    if (tab === 'DRAFT' && e.status !== 'DRAFT') return false;
    if (tab === 'CONFIRMED' && e.status !== 'CONFIRMED') return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header & Stats Banner */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-amber-500" />
            <span>Financial Expenses</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Total recorded: <span className="font-bold text-slate-800 dark:text-slate-200">IDR {totalSpent.toLocaleString()}</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {drafts.length > 0 && (
            <button
              onClick={handleConfirmAllDrafts}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Confirm All Drafts ({drafts.length})</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center space-x-1.5 transition border border-slate-200/60 dark:border-slate-700/60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Draft Notification Banner */}
      {drafts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              You have {drafts.length} draft expense(s) awaiting your confirmation before final reporting.
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
        {(['ALL', 'DRAFT', 'CONFIRMED'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              tab === t
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {t} ({expenses.filter((e) => (t === 'ALL' ? true : e.status === t)).length})
          </button>
        ))}
      </div>

      {/* Expenses List */}
      <div className="space-y-2.5">
        {filtered.map((exp) => {
          const isDraft = exp.status === 'DRAFT';
          return (
            <div
              key={exp.id}
              className={`glass-card p-4 rounded-2xl border transition flex items-center justify-between gap-4 ${
                isDraft
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-slate-200/80 dark:border-slate-800/80'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    isDraft ? 'bg-amber-500/20 text-amber-600' : 'bg-emerald-500/20 text-emerald-600'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-100">
                    {exp.description}
                  </p>
                  <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Tag className="w-3 h-3" />
                      <span>{exp.category}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{exp.transaction_date.split('T')[0]}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  IDR {Number(exp.amount).toLocaleString()}
                </span>

                {isDraft ? (
                  <button
                    onClick={() => handleConfirm(exp.id)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-xs transition shadow-xs"
                  >
                    Confirm
                  </button>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    CONFIRMED
                  </span>
                )}

                <button
                  onClick={(e) => requestDelete(exp.id, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove this expense"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No expenses found in this category.
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Expense Record"
        message="Are you sure you want to delete this expense record? The record will be safely archived."
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
