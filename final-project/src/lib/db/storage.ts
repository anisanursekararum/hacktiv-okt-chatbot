import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  email: string;
  google_sub?: string;
  full_name: string;
  timezone: string;
  created_at: string;
  archived_at?: string | null;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  media_url?: string | null;
  media_type?: 'text' | 'image' | 'audio' | 'video';
  extracted_items?: any;
  created_at: string;
  archived_at?: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  category: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  due_date?: string | null;
  completed_at?: string | null;
  source_message_id?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number;
  category: string;
  description: string;
  transaction_date: string;
  status: 'DRAFT' | 'CONFIRMED';
  receipt_url?: string | null;
  source_message_id?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface Grocery {
  id: string;
  user_id: string;
  item: string;
  quantity: string;
  status: 'ACTIVE' | 'BOUGHT';
  source_message_id?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface Note {
  id: string;
  user_id: string;
  kind: 'note' | 'plan' | 'idea';
  title: string;
  content: string;
  tags?: string[];
  target_date?: string | null;
  steps?: { title: string; done: boolean }[];
  embedding?: number[];
  source_message_id?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  summary?: string;
  embedding?: number[];
  source_message_id?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface Reminder {
  id: string;
  user_id: string;
  payload: string;
  trigger_time: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  channel: 'email' | 'in_app';
  status: 'SCHEDULED' | 'SENT' | 'FAILED';
  attempts: number;
  sent_at?: string | null;
  source_message_id?: string | null;
  created_at: string;
  archived_at?: string | null;
}

export interface Summary {
  id: string;
  user_id: string;
  scope: 'conversation' | 'daily' | 'weekly';
  period: string;
  content: string;
  created_at: string;
  archived_at?: string | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  model_name: string;
  temperature: number;
  top_p: number;
  top_k: number;
  model_router: boolean;
  backup_frequency: 'daily' | 'weekly' | 'monthly';
  backup_encrypt: boolean;
  created_at: string;
  updated_at: string;
}

export interface OmniaStoreData {
  users: User[];
  chat_messages: ChatMessage[];
  tasks: Task[];
  expenses: Expense[];
  groceries: Grocery[];
  notes: Note[];
  bookmarks: Bookmark[];
  reminders: Reminder[];
  summaries: Summary[];
  user_settings: UserSettings[];
}

const DEFAULT_USER_ID = 'usr_anisa_01';
const DEFAULT_USER_EMAIL = process.env.USER_EMAIL || 'anisa.arum.work@gmail.com';
const DATA_FILE = path.join(process.cwd(), 'data', 'omnia_storage.json');

// Helper: Cosine similarity for Vector RAG search
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class OmniaStorage {
  private data: OmniaStoreData;
  private initialized = false;

  constructor() {
    this.data = this.getDefaultData();
    this.init();
  }

  private getDefaultData(): OmniaStoreData {
    const now = new Date().toISOString();
    return {
      users: [
        {
          id: DEFAULT_USER_ID,
          email: DEFAULT_USER_EMAIL,
          full_name: 'Anisa Arum',
          timezone: 'Asia/Jakarta',
          created_at: now,
          archived_at: null,
        },
      ],
      chat_messages: [],
      tasks: [],
      expenses: [],
      groceries: [],
      notes: [],
      bookmarks: [],
      reminders: [],
      summaries: [],
      user_settings: [
        {
          id: 'set_01',
          user_id: DEFAULT_USER_ID,
          model_name: 'gemini-2.5-flash',
          temperature: 0.3,
          top_p: 0.95,
          top_k: 40,
          model_router: false,
          backup_frequency: 'weekly',
          backup_encrypt: false,
          created_at: now,
          updated_at: now,
        },
      ],
    };
  }

  private init() {
    if (this.initialized) return;
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.getDefaultData(), ...parsed };
      } else {
        this.saveToFile();
      }
      this.initialized = true;
    } catch (err) {
      console.warn('Local storage initialized in-memory:', err);
      this.initialized = true;
    }
  }

  private saveToFile() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist to file:', err);
    }
  }

  public getUserId(): string {
    return DEFAULT_USER_ID;
  }

  public getUser(): User {
    return this.data.users.find((u) => u.id === DEFAULT_USER_ID) || this.data.users[0];
  }

  public setUser(info: { email: string; full_name?: string; google_sub?: string }): User {
    const user = this.getUser();
    if (info.email) user.email = info.email;
    if (info.full_name) user.full_name = info.full_name;
    if (info.google_sub) user.google_sub = info.google_sub;
    this.saveToFile();
    return user;
  }

  public archiveItem(type: 'tasks' | 'expenses' | 'groceries' | 'notes' | 'reminders', id: string): boolean {
    const table = this.data[type] as any[];
    if (!table) return false;
    const item = table.find((x) => x.id === id);
    if (!item) return false;
    item.archived_at = new Date().toISOString();
    this.saveToFile();
    return true;
  }

  // --- Settings ---
  public getSettings(): UserSettings {
    const s = this.data.user_settings.find((item) => item.user_id === DEFAULT_USER_ID);
    if (s) return s;
    return this.data.user_settings[0];
  }

  public updateSettings(partial: Partial<UserSettings>): UserSettings {
    const s = this.getSettings();
    Object.assign(s, partial, { updated_at: new Date().toISOString() });
    this.saveToFile();
    return s;
  }

  // --- Chat Messages (Sliding Window Tier 1) ---
  public addChatMessage(msg: Omit<ChatMessage, 'id' | 'created_at'>): ChatMessage {
    const created: ChatMessage = {
      ...msg,
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.chat_messages.push(created);
    this.saveToFile();
    return created;
  }

  public getRecentMessages(limit = 50): ChatMessage[] {
    return this.data.chat_messages
      .filter((m) => !m.archived_at)
      .slice(-limit);
  }

  public getAllMessages(): ChatMessage[] {
    return this.data.chat_messages.filter((m) => !m.archived_at);
  }

  // --- Tier 2: Rolling Summary ---
  public getLatestSummary(scope: 'conversation' | 'daily' | 'weekly' = 'conversation'): Summary | null {
    const list = this.data.summaries.filter((s) => s.scope === scope && !s.archived_at);
    return list.length ? list[list.length - 1] : null;
  }

  public saveSummary(scope: 'conversation' | 'daily' | 'weekly', period: string, content: string): Summary {
    const s: Summary = {
      id: 'sum_' + Date.now(),
      user_id: DEFAULT_USER_ID,
      scope,
      period,
      content,
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.summaries.push(s);
    this.saveToFile();
    return s;
  }

  // --- Tasks (To-Dos) ---
  public addTask(task: Omit<Task, 'id' | 'created_at'>): Task {
    const created: Task = {
      ...task,
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.tasks.push(created);
    this.saveToFile();
    return created;
  }

  public getTasks(includeCompleted = true): Task[] {
    return this.data.tasks.filter((t) => {
      if (t.archived_at) return false;
      if (!includeCompleted && t.status === 'COMPLETED') return false;
      return true;
    });
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const t = this.data.tasks.find((item) => item.id === id);
    if (!t) return null;
    if (updates.status === 'COMPLETED' && t.status !== 'COMPLETED') {
      updates.completed_at = new Date().toISOString();
    }
    Object.assign(t, updates);
    this.saveToFile();
    return t;
  }

  public fuzzyMatchAndCompleteTask(query: string): Task | null {
    const lower = query.toLowerCase();
    const candidate = this.data.tasks.find((t) => {
      if (t.status === 'COMPLETED' || t.archived_at) return false;
      const tLower = t.title.toLowerCase();
      return tLower.includes(lower) || lower.includes(tLower) || this.tokenOverlap(tLower, lower) > 0.4;
    });
    if (candidate) {
      candidate.status = 'COMPLETED';
      candidate.completed_at = new Date().toISOString();
      this.saveToFile();
      return candidate;
    }
    return null;
  }

  private tokenOverlap(a: string, b: string): number {
    const wordsA = new Set(a.split(/\s+/).filter(Boolean));
    const wordsB = new Set(b.split(/\s+/).filter(Boolean));
    let match = 0;
    Array.from(wordsA).forEach((w) => {
      if (wordsB.has(w)) match++;
    });
    return match / Math.max(wordsA.size, wordsB.size, 1);
  }

  // --- Expenses ---
  public addExpense(exp: Omit<Expense, 'id' | 'created_at'>): Expense {
    const created: Expense = {
      ...exp,
      id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.expenses.push(created);
    this.saveToFile();
    return created;
  }

  public getExpenses(): Expense[] {
    return this.data.expenses.filter((e) => !e.archived_at);
  }

  public updateExpense(id: string, updates: Partial<Expense>): Expense | null {
    const e = this.data.expenses.find((item) => item.id === id);
    if (!e) return null;
    Object.assign(e, updates);
    this.saveToFile();
    return e;
  }

  // --- Groceries ---
  public addGrocery(g: Omit<Grocery, 'id' | 'created_at'>): Grocery {
    const created: Grocery = {
      ...g,
      id: 'groc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.groceries.push(created);
    this.saveToFile();
    return created;
  }

  public getGroceries(): Grocery[] {
    return this.data.groceries.filter((g) => !g.archived_at);
  }

  public updateGrocery(id: string, updates: Partial<Grocery>): Grocery | null {
    const g = this.data.groceries.find((item) => item.id === id);
    if (!g) return null;
    Object.assign(g, updates);
    this.saveToFile();
    return g;
  }

  // --- Notes & Plans ---
  public addNote(note: Omit<Note, 'id' | 'created_at'>): Note {
    const created: Note = {
      ...note,
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.notes.push(created);
    this.saveToFile();
    return created;
  }

  public getNotes(kind?: 'note' | 'plan' | 'idea'): Note[] {
    return this.data.notes.filter((n) => {
      if (n.archived_at) return false;
      if (kind && n.kind !== kind) return false;
      return true;
    });
  }

  public updateNote(id: string, updates: Partial<Note>): Note | null {
    const n = this.data.notes.find((item) => item.id === id);
    if (!n) return null;
    Object.assign(n, updates);
    this.saveToFile();
    return n;
  }

  // --- Bookmarks ---
  public addBookmark(bm: Omit<Bookmark, 'id' | 'created_at'>): Bookmark {
    const created: Bookmark = {
      ...bm,
      id: 'bm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.bookmarks.push(created);
    this.saveToFile();
    return created;
  }

  public getBookmarks(): Bookmark[] {
    return this.data.bookmarks.filter((b) => !b.archived_at);
  }

  // --- Reminders ---
  public addReminder(r: Omit<Reminder, 'id' | 'created_at'>): Reminder {
    const created: Reminder = {
      ...r,
      id: 'rem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      created_at: new Date().toISOString(),
      archived_at: null,
    };
    this.data.reminders.push(created);
    this.saveToFile();
    return created;
  }

  public getReminders(): Reminder[] {
    return this.data.reminders.filter((r) => !r.archived_at);
  }

  public updateReminder(id: string, updates: Partial<Reminder>): Reminder | null {
    const r = this.data.reminders.find((item) => item.id === id);
    if (!r) return null;
    Object.assign(r, updates);
    this.saveToFile();
    return r;
  }

  // --- Tier 3 Long-Term Memory: Hybrid Search & Structured Queries ---
  public queryStructuredHistory(startDate: Date, endDate: Date) {
    const startStr = startDate.toISOString();
    const endStr = endDate.toISOString();

    const tasks = this.data.tasks.filter((t) => {
      if (t.archived_at) return false;
      const d = t.due_date || t.created_at;
      return d >= startStr && d <= endStr;
    });

    const expenses = this.data.expenses.filter((e) => {
      if (e.archived_at) return false;
      return e.transaction_date >= startStr && e.transaction_date <= endStr;
    });

    const notes = this.data.notes.filter((n) => {
      if (n.archived_at) return false;
      return n.created_at >= startStr && n.created_at <= endStr;
    });

    return { tasks, expenses, notes };
  }

  public vectorSearchNotes(queryEmbedding: number[], topK = 5): { note: Note; score: number }[] {
    if (!queryEmbedding || queryEmbedding.length === 0) return [];
    const scored = this.data.notes
      .filter((n) => !n.archived_at && n.embedding && n.embedding.length > 0)
      .map((note) => ({
        note,
        score: cosineSimilarity(queryEmbedding, note.embedding!),
      }))
      .filter((item) => item.score > 0.4)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  // --- Undo Action ---
  public undoLastAction(): { type: string; item: any } | null {
    // Finds the most recent item added in the last 10 minutes and archives it
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    // Check tasks
    const lastTask = [...this.data.tasks].reverse().find((t) => !t.archived_at && t.created_at >= tenMinAgo);
    if (lastTask) {
      lastTask.archived_at = new Date().toISOString();
      this.saveToFile();
      return { type: 'task', item: lastTask };
    }

    // Check expenses
    const lastExp = [...this.data.expenses].reverse().find((e) => !e.archived_at && e.created_at >= tenMinAgo);
    if (lastExp) {
      lastExp.archived_at = new Date().toISOString();
      this.saveToFile();
      return { type: 'expense', item: lastExp };
    }

    // Check groceries
    const lastGroc = [...this.data.groceries].reverse().find((g) => !g.archived_at && g.created_at >= tenMinAgo);
    if (lastGroc) {
      lastGroc.archived_at = new Date().toISOString();
      this.saveToFile();
      return { type: 'grocery', item: lastGroc };
    }

    return null;
  }

  // --- Backup & Export ---
  public exportFullBackup(): OmniaStoreData {
    return JSON.parse(JSON.stringify(this.data));
  }

  public importBackup(backup: Partial<OmniaStoreData>): { imported: Record<string, number> } {
    const stats: Record<string, number> = {};
    const tables: (keyof OmniaStoreData)[] = [
      'users',
      'chat_messages',
      'tasks',
      'expenses',
      'groceries',
      'notes',
      'bookmarks',
      'reminders',
      'summaries',
      'user_settings',
    ];

    for (const table of tables) {
      const incoming = (backup[table] || []) as any[];
      stats[table] = 0;
      for (const item of incoming) {
        const existingIdx = (this.data[table] as any[]).findIndex((x) => x.id === item.id);
        if (existingIdx >= 0) {
          (this.data[table] as any[])[existingIdx] = item;
        } else {
          (this.data[table] as any[]).push(item);
          stats[table]++;
        }
      }
    }
    this.saveToFile();
    return { imported: stats };
  }
}

// Singleton storage instance
export const storage = new OmniaStorage();
