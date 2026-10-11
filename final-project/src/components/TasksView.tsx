'use client';

import React, { useState, useEffect } from 'react';
import { CheckSquare, CheckCircle2, Circle, Plus, Calendar, Tag, Trash2, Filter } from 'lucide-react';
import { Task } from '@/lib/db/storage';

export function TasksView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/items?type=tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggle = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tasks',
        id: task.id,
        updates: { status: nextStatus },
      }),
    });
    fetchTasks();
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to remove this task?')) return;
    try {
      await fetch(`/api/items?type=tasks&id=${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setLoading(true);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `/todo ${newTitle.trim()} (category: ${newCategory})` }),
      });
      setNewTitle('');
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Derive all unique categories dynamically
  const categories = Array.from(new Set(['ALL', ...tasks.map((t) => t.category.toLowerCase())]));

  const filtered = tasks.filter((t) => {
    if (statusFilter === 'PENDING' && t.status !== 'PENDING') return false;
    if (statusFilter === 'COMPLETED' && t.status !== 'COMPLETED') return false;
    if (categoryFilter !== 'ALL' && t.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Header and Quick Add */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
              <CheckSquare className="w-6 h-6 text-emerald-500" />
              <span>To-Dos & Tasks</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {tasks.filter((t) => t.status === 'PENDING').length} tasks remaining
            </p>
          </div>

          {/* Filters: Category Dropdown & Status Pills */}
          <div className="flex items-center flex-wrap gap-2.5">
            {/* Category Dropdown */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs shadow-xs">
              <Filter className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <label htmlFor="category-filter" className="text-slate-500 dark:text-slate-400 font-medium">Category:</label>
              <select
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-700 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer capitalize pr-1"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 capitalize">
                    {cat === 'ALL' ? 'All Categories' : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl text-xs font-medium">
              {(['ALL', 'PENDING', 'COMPLETED'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === tab
                      ? 'bg-emerald-500 text-white shadow-xs font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddTask} className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add a new task (e.g. 'Review QPR', 'Intern follow-up', 'SAP study')..."
            disabled={loading}
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="work">work</option>
              <option value="learning">learning</option>
              <option value="research">research</option>
              <option value="personal">personal</option>
              <option value="general">general</option>
            </select>
            <button
              type="submit"
              disabled={loading || !newTitle.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center space-x-1.5 shadow-sm transition disabled:opacity-40 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </form>
      </div>

      {/* Task List Items */}
      <div className="space-y-2.5">
        {filtered.map((task) => {
          const isDone = task.status === 'COMPLETED';
          return (
            <div
              key={task.id}
              className={`glass-card p-4 rounded-2xl border transition flex items-center justify-between gap-4 group ${
                isDone
                  ? 'border-slate-200/40 dark:border-slate-800/40 opacity-70 bg-slate-50/50 dark:bg-slate-900/20'
                  : 'border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <button
                  onClick={() => handleToggle(task)}
                  className="text-slate-400 hover:text-emerald-500 transition shrink-0"
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isDone
                        ? 'line-through text-slate-400 dark:text-slate-500'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="flex items-center space-x-3 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                    <span className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-semibold text-slate-600 dark:text-slate-300">
                      <Tag className="w-3 h-3 text-emerald-500" />
                      <span>{task.category}</span>
                    </span>
                    {task.due_date && (
                      <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                        <Calendar className="w-3 h-3" />
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {task.status}
                </span>

                {/* 1-Click Remove Button (Point 11) */}
                <button
                  onClick={(e) => handleDelete(task.id, e)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                  title="Remove this task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">
            No tasks found matching your filter ({categoryFilter} · {statusFilter}).
          </div>
        )}
      </div>
    </div>
  );
}
