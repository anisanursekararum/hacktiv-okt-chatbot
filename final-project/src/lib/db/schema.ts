import { pgTable, text, timestamp, numeric, integer, jsonb, boolean, customType } from 'drizzle-orm/pg-core';

export const vector = customType<{ data: number[]; config: { dimensions: number } }>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 768})`;
  },
});

// 1. users table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  google_sub: text('google_sub'),
  full_name: text('full_name').notNull(),
  timezone: text('timezone').default('Asia/Jakarta').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 2. chat_messages table
export const chat_messages = pgTable('chat_messages', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  role: text('role').notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  media_url: text('media_url'),
  media_type: text('media_type').default('text'), // 'text' | 'image' | 'audio' | 'video'
  extracted_items: jsonb('extracted_items'), // Structured items created from this message
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 3. tasks table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  title: text('title').notNull(),
  category: text('category').default('general').notNull(),
  status: text('status').default('PENDING').notNull(), // 'PENDING' | 'COMPLETED' | 'CANCELLED'
  due_date: timestamp('due_date', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  source_message_id: text('source_message_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 4. expenses table
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  category: text('category').default('general').notNull(), // 'food', 'bills', 'transport', 'shopping', etc.
  description: text('description').notNull(),
  transaction_date: timestamp('transaction_date', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('DRAFT').notNull(), // 'DRAFT' | 'CONFIRMED'
  receipt_url: text('receipt_url'),
  source_message_id: text('source_message_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 5. groceries table
export const groceries = pgTable('groceries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  item: text('item').notNull(),
  quantity: text('quantity').default('1').notNull(),
  status: text('status').default('ACTIVE').notNull(), // 'ACTIVE' | 'BOUGHT'
  source_message_id: text('source_message_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 6. notes table (includes plans and ideas)
export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  kind: text('kind').default('note').notNull(), // 'note' | 'plan' | 'idea'
  title: text('title').notNull(),
  content: text('content').notNull(),
  tags: text('tags').array(),
  target_date: timestamp('target_date', { withTimezone: true }),
  steps: jsonb('steps'), // For plan checklists
  embedding: vector('embedding', { dimensions: 768 }), // Gemini text-embedding-004 dimensions
  source_message_id: text('source_message_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 7. bookmarks table
export const bookmarks = pgTable('bookmarks', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  summary: text('summary'),
  embedding: vector('embedding', { dimensions: 768 }),
  source_message_id: text('source_message_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 8. reminders table
export const reminders = pgTable('reminders', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  payload: text('payload').notNull(),
  trigger_time: timestamp('trigger_time', { withTimezone: true }).notNull(),
  recurrence: text('recurrence').default('none'), // 'none' | 'daily' | 'weekly' | 'monthly'
  channel: text('channel').default('email').notNull(), // 'email' | 'in_app'
  status: text('status').default('SCHEDULED').notNull(), // 'SCHEDULED' | 'SENT' | 'FAILED'
  attempts: integer('attempts').default(0).notNull(),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  source_message_id: text('source_message_id'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 9. summaries table (Tier 2 rolling summary & daily/weekly summaries)
export const summaries = pgTable('summaries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull(),
  scope: text('scope').notNull(), // 'conversation' | 'daily' | 'weekly'
  period: text('period').notNull(), // e.g. 'rolling_50' or '2026-10-11'
  content: text('content').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  archived_at: timestamp('archived_at', { withTimezone: true }),
});

// 10. user_settings table
export const user_settings = pgTable('user_settings', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().unique(),
  model_name: text('model_name').default('gemini-2.5-flash').notNull(),
  temperature: numeric('temperature', { precision: 3, scale: 2 }).default('0.3').notNull(),
  top_p: numeric('top_p', { precision: 3, scale: 2 }).default('0.95').notNull(),
  top_k: integer('top_k').default(40).notNull(),
  model_router: boolean('model_router').default(false).notNull(),
  backup_frequency: text('backup_frequency').default('weekly').notNull(), // 'daily' | 'weekly' | 'monthly'
  backup_encrypt: boolean('backup_encrypt').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
