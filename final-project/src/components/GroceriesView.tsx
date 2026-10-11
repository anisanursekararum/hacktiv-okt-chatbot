'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { Grocery } from '@/lib/db/storage';

import { ConfirmationModal } from './ConfirmationModal';

export function GroceriesView() {
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [loading, setLoading] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const fetchGroceries = async () => {
    try {
      const email = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('my_pa_logged_in_user') || '{}')?.email : '';
      const res = await fetch(`/api/items?type=groceries${email ? `&email=${encodeURIComponent(email)}` : ''}`);
      const data = await res.json();
      setGroceries(data.groceries || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroceries();
  }, []);

  const handleToggle = async (item: Grocery) => {
    const nextStatus = item.status === 'BOUGHT' ? 'ACTIVE' : 'BOUGHT';
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'groceries',
        id: item.id,
        updates: { status: nextStatus },
      }),
    });
    fetchGroceries();
  };

  const requestDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await fetch(`/api/items?type=groceries&id=${deleteTargetId}`, { method: 'DELETE' });
      fetchGroceries();
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    setLoading(true);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `/grocery add ${newItem.trim()} (${newQty})` }),
      });
      setNewItem('');
      setNewQty('1');
      fetchGroceries();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const active = groceries.filter((g) => g.status === 'ACTIVE');
  const bought = groceries.filter((g) => g.status === 'BOUGHT');

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-indigo-500" />
            <span>Groceries & Shopping List</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {active.length} items to buy · {bought.length} items purchased
          </p>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAdd} className="flex items-center space-x-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add grocery item (e.g. 'Eggs', 'Fresh milk', 'Avocado')..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <input
            type="text"
            value={newQty}
            onChange={(e) => setNewQty(e.target.value)}
            placeholder="Qty"
            className="w-20 px-3 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <button
            type="submit"
            disabled={loading || !newItem.trim()}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      </div>

      {/* Active Items */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          To Buy ({active.length})
        </h3>
        <div className="space-y-2">
          {active.map((g) => (
            <div
              key={g.id}
              onClick={() => handleToggle(g)}
              className="glass-card p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between transition"
            >
              <div className="flex items-center space-x-3">
                <Circle className="w-5 h-5 text-slate-400 hover:text-indigo-500 shrink-0" />
                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{g.item}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  {g.quantity}
                </span>
                <button
                  onClick={(e) => requestDelete(g.id, e)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove grocery item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {active.length === 0 && (
            <p className="text-xs text-slate-400 italic p-4 text-center">Nothing left to buy! Shopping cart is clear.</p>
          )}
        </div>
      </div>

      {/* Bought Items */}
      {bought.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Bought ({bought.length})
          </h3>
          <div className="space-y-2">
            {bought.map((g) => (
              <div
                key={g.id}
                onClick={() => handleToggle(g)}
                className="glass-card p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 opacity-60 cursor-pointer flex items-center justify-between transition"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span className="text-sm line-through text-slate-400 dark:text-slate-500">{g.item}</span>
                </div>
                <span className="text-xs text-slate-400">{g.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Grocery Item"
        message="Are you sure you want to remove this item from your shopping list?"
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        iconType="trash"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
