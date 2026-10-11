import { storage } from '../db/storage';
import { sendEmail } from '../email/smtp';
import { generateEmbedding } from '../ai/gemini';
import { parseNaturalDateTime } from '../utils/dateTimeParser';

export interface SkillContext {
  userId?: string;
  userEmail?: string;
}

export interface SkillDefinition {
  name: string;
  aliases?: string[];
  description: string;
  example: string;
  execute: (args: string, ctx?: SkillContext) => Promise<{ reply: string; data?: any }>;
}

export const SKILLS: Record<string, SkillDefinition> = {
  info: {
    name: '/info',
    aliases: ['/config'],
    description: 'Displays the cheat sheet of all available skills, active AI model, and parameters.',
    example: '/info or /info expense',
    execute: async (args, ctx) => {
      const settings = storage.getSettings();
      const currentEmail = ctx?.userEmail || storage.getUser().email;
      if (args.trim()) {
        const query = args.trim().replace(/^\//, '').toLowerCase();
        const skill = Object.values(SKILLS).find(
          (s) => s.name.replace('/', '') === query || s.aliases?.some((a) => a.replace('/', '') === query)
        );
        if (skill) {
          return {
            reply: `Skill: ${skill.name}\n- Description: ${skill.description}\n- Example: ${skill.example}${skill.aliases ? `\n- Aliases: ${skill.aliases.join(', ')}` : ''}`,
          };
        }
      }

      const skillList = Object.values(SKILLS)
        .map((s) => `• ${s.name} : ${s.description} (example: ${s.example})`)
        .join('\n');

      const configInfo = `=== My PA Cheat Sheet & System Config ===

AI Model: ${settings.model_name}
Temperature: ${settings.temperature} | Top P: ${settings.top_p} | Top K: ${settings.top_k}
Email Recipient: ${currentEmail}

Available Skills (19 Built-in Commands):
${skillList}

Tip: You can also click the "Cheat Sheet" button at the top of the chat or in the sidebar menu anytime without scrolling.`;

      return { reply: configInfo };
    },
  },

  'send-email': {
    name: '/send-email',
    description: 'Summarize data and email it to the registered user address.',
    example: '/send-email summarize what I did on 9 October 2026',
    execute: async (args, ctx) => {
      const targetEmail = ctx?.userEmail || storage.getUser().email;
      const user = ctx?.userEmail ? storage.getUser(ctx.userEmail) : storage.getUser();
      const subject = `My PA Summary Report`;
      const body = args.trim() || 'Summary of your latest activities and records.';
      const res = await sendEmail({
        to: targetEmail,
        subject,
        text: `Hello ${user.full_name || 'there'},\n\nHere is your requested My PA summary:\n\n${body}\n\nGenerated automatically by My PA.`,
      });

      return {
        reply: res.success
          ? `Dispatched email summary to **${targetEmail}**.`
          : `Failed to send email: ${res.error}`,
      };
    },
  },

  'email-reminder': {
    name: '/email-reminder',
    description: 'Schedule an email reminder sent to your registered Gmail address.',
    example: '/email-reminder besok jam 6 pagi ingetin buat release patch167',
    execute: async (args, ctx) => {
      const { triggerTime, payload } = parseNaturalDateTime(args);
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const targetEmail = ctx?.userEmail || storage.getUser().email;

      const reminder = storage.addReminder({
        user_id: userId,
        payload: payload || args || 'Scheduled Reminder',
        trigger_time: triggerTime,
        recurrence: 'none',
        channel: 'email',
        status: 'SCHEDULED',
        attempts: 0,
      });

      const formattedDate = new Date(reminder.trigger_time).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        reply: `Scheduled email reminder: **"${reminder.payload}"** for **${formattedDate}**. Destination: **${targetEmail}**.`,
        data: reminder,
      };
    },
  },

  today: {
    name: '/today',
    description: "Today's summary: active todos, deadlines, and today's expenses.",
    example: '/today',
    execute: async (_args, ctx) => {
      const userId = ctx?.userId;
      const todayStr = new Date().toISOString().split('T')[0];
      const tasks = storage.getTasks(true, userId).filter((t) => !t.completed_at || t.created_at.startsWith(todayStr));
      const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
      const expenses = storage.getExpenses(userId).filter((e) => e.transaction_date.startsWith(todayStr));
      const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const groceries = storage.getGroceries(userId).filter((g) => g.status === 'ACTIVE');

      let reply = `### Today's Overview (${todayStr})\n\n`;
      reply += `**To-Dos (${pendingTasks.length} pending):**\n`;
      if (pendingTasks.length === 0) {
        reply += `_No pending tasks for today!_\n`;
      } else {
        pendingTasks.forEach((t) => {
          reply += `• [ ] ${t.title} ${t.due_date ? `(Due: ${new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}\n`;
        });
      }

      reply += `\n**Expenses Today:** IDR ${totalSpent.toLocaleString()}\n`;
      if (expenses.length > 0) {
        expenses.forEach((e) => {
          reply += `• ${e.description}: IDR ${Number(e.amount).toLocaleString()} [${e.status}]\n`;
        });
      }

      if (groceries.length > 0) {
        reply += `\n**Active Shopping Items (${groceries.length}):** ${groceries.map((g) => g.item).join(', ')}\n`;
      }

      return { reply, data: { pendingTasks, totalSpent, expenses } };
    },
  },

  deadline: {
    name: '/deadline',
    description: 'Shows nearest deadlines within the specified days (default 7 days).',
    example: '/deadline 7 days',
    execute: async (args, ctx) => {
      const userId = ctx?.userId;
      const daysMatch = args.match(/\d+/);
      const days = daysMatch ? parseInt(daysMatch[0], 10) : 7;
      const targetDate = new Date(Date.now() + days * 24 * 3600 * 1000);

      const tasks = storage.getTasks(false, userId).filter((t) => {
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= new Date() && d <= targetDate;
      });

      if (tasks.length === 0) {
        return { reply: `No upcoming deadlines found within the next ${days} days.` };
      }

      const list = tasks.map((t) => `• **${t.title}** - Due: ${new Date(t.due_date!).toLocaleDateString()}`).join('\n');
      return { reply: `### Upcoming Deadlines (Next ${days} Days):\n${list}` };
    },
  },

  recap: {
    name: '/recap',
    description: 'Generates a recap of a past period (e.g. yesterday, last week).',
    example: '/recap yesterday',
    execute: async (args, ctx) => {
      const userId = ctx?.userId;
      const isYesterday = /yesterday/i.test(args);
      const target = isYesterday ? new Date(Date.now() - 24 * 3600 * 1000) : new Date();
      const dateStr = target.toISOString().split('T')[0];

      const tasks = storage.getTasks(true, userId).filter((t) => t.created_at.startsWith(dateStr) || t.completed_at?.startsWith(dateStr));
      const completed = tasks.filter((t) => t.status === 'COMPLETED');
      const expenses = storage.getExpenses(userId).filter((e) => e.transaction_date.startsWith(dateStr));
      const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

      let reply = `### Recap for ${isYesterday ? 'Yesterday' : dateStr}\n`;
      reply += `• **Tasks Completed:** ${completed.length} of ${tasks.length}\n`;
      completed.forEach((c) => (reply += `  ✓ ${c.title}\n`));
      reply += `• **Total Spending:** IDR ${total.toLocaleString()}\n`;
      return { reply };
    },
  },

  'daily-briefing': {
    name: '/daily-briefing',
    description: "Delivers today's briefing with agenda, priority todos, and pending bills.",
    example: '/daily-briefing',
    execute: async (_args, ctx) => {
      const userId = ctx?.userId;
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const pendingTasks = storage.getTasks(false, userId);
      const drafts = storage.getExpenses(userId).filter((e) => e.status === 'DRAFT');

      let reply = `### ☀️ Daily Briefing – ${today}\n\n`;
      reply += `**Priority Actions (${pendingTasks.length} tasks):**\n`;
      if (pendingTasks.length === 0) {
        reply += `_Your agenda is completely clear!_\n`;
      } else {
        pendingTasks.slice(0, 5).forEach((t, i) => (reply += `${i + 1}. ${t.title}\n`));
      }

      if (drafts.length > 0) {
        reply += `\n**Pending Expense Confirmations (${drafts.length}):**\n`;
        drafts.forEach((d) => (reply += `• ${d.description}: IDR ${Number(d.amount).toLocaleString()}\n`));
      }

      return { reply };
    },
  },

  todo: {
    name: '/todo',
    description: 'Explicitly add or manage a task.',
    example: '/todo finish proposal revision',
    execute: async (args, ctx) => {
      if (!args.trim()) return { reply: 'Please provide a task description.' };
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const task = storage.addTask({
        user_id: userId,
        title: args.trim(),
        category: 'general',
        status: 'PENDING',
        due_date: new Date().toISOString(),
      });
      return {
        reply: `Added task: **"${task.title}"** (Status: PENDING).`,
        data: task,
      };
    },
  },

  grocery: {
    name: '/grocery',
    aliases: ['/groceries', '/shopping'],
    description: 'Manage shopping list items (add or view).',
    example: '/grocery ayam, telor or /grocery susu',
    execute: async (args, ctx) => {
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const cleaned = args.replace(/^(add|tambah|beli|\+)\s+/i, '').trim();

      if (!cleaned || cleaned.toLowerCase() === 'list' || cleaned.toLowerCase() === 'view') {
        const active = storage.getGroceries(userId).filter((g) => g.status === 'ACTIVE');
        if (active.length === 0) return { reply: 'Your shopping list is currently empty!' };
        return {
          reply: `### Shopping List:\n` + active.map((g) => `• [ ] ${g.item} (${g.quantity})`).join('\n'),
        };
      }

      // Split by comma, "dan", "and", newline, or if none, check space separated
      let rawItems = cleaned.split(/,|\bdan\b|\band\b|\n/i).map((s) => s.trim()).filter(Boolean);
      if (rawItems.length === 1 && rawItems[0].includes(' ') && !rawItems[0].match(/\d+\s*(kg|g|pcs|buah|ikat|liter)/i)) {
        // e.g. "ayam telor" -> ["ayam", "telor"]
        const spaceSeparated = rawItems[0].split(/\s+/).filter(Boolean);
        if (spaceSeparated.length <= 4) {
          rawItems = spaceSeparated;
        }
      }

      const added = rawItems.map((item) =>
        storage.addGrocery({
          user_id: userId,
          item,
          quantity: '1',
          status: 'ACTIVE',
        })
      );

      return {
        reply: `Added to grocery list: **${added.map((g) => g.item).join(', ')}**.`,
        data: added,
      };
    },
  },

  expense: {
    name: '/expense',
    description: 'Log an expense and view totals.',
    example: '/expense lunch 45k',
    execute: async (args, ctx) => {
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const match = args.match(/(\d+(?:[.,]\d+)?)\s*(k|rb|thousand)?/i);
      let amount = 0;
      if (match) {
        amount = parseFloat(match[1].replace(',', '.'));
        if (match[2]) amount *= 1000;
      }
      const desc = args.replace(match ? match[0] : '', '').trim() || 'General Expense';
      const exp = storage.addExpense({
        user_id: userId,
        amount,
        category: /food|lunch|dinner|coffee|makan/i.test(desc) ? 'food' : 'general',
        description: desc,
        transaction_date: new Date().toISOString(),
        status: 'DRAFT',
      });
      return {
        reply: `Recorded expense draft: **IDR ${amount.toLocaleString()}** for "${desc}". Awaiting confirmation.`,
        data: exp,
      };
    },
  },

  'export-expenses': {
    name: '/export-expenses',
    description: 'Compile expenses into CSV format for spreadsheets.',
    example: '/export-expenses this month',
    execute: async (_args, ctx) => {
      const userId = ctx?.userId;
      const expenses = storage.getExpenses(userId);
      let csv = 'Date,Description,Category,Amount,Status\n';
      expenses.forEach((e) => {
        csv += `"${e.transaction_date.split('T')[0]}","${e.description}","${e.category}",${e.amount},"${e.status}"\n`;
      });
      return {
        reply: `### Exported Expenses (CSV):\n\`\`\`csv\n${csv}\`\`\``,
        data: { csv },
      };
    },
  },

  note: {
    name: '/note',
    aliases: ['/notes', '/catat'],
    description: 'Save a free-form knowledge note with tags.',
    example: '/note SaaS idea: invoice aggregator for SMEs',
    execute: async (args, ctx) => {
      const content = args.trim();
      if (!content) return { reply: 'Please provide note content (e.g. `/note Meeting notes with team`).' };

      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const embedding = await generateEmbedding(content);
      const note = storage.addNote({
        user_id: userId,
        kind: 'note',
        title: content.slice(0, 40),
        content,
        tags: ['quick-note'],
        embedding,
      });
      return {
        reply: `Saved note: **"${note.title}"** (stored in long-term memory).`,
        data: note,
      };
    },
  },

  'web-clipper': {
    name: '/web-clipper',
    aliases: ['/link'],
    description: 'Save a web link with title and summary.',
    example: '/link https://news.ycombinator.com',
    execute: async (args, ctx) => {
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const url = args.trim();
      const bm = storage.addBookmark({
        user_id: userId,
        url,
        title: `Bookmark: ${url}`,
        summary: `Saved bookmark from ${url}`,
      });
      return {
        reply: `Saved bookmark: **${url}**.`,
        data: bm,
      };
    },
  },

  plan: {
    name: '/plan',
    description: 'Break a long-term goal into milestone steps and target dates.',
    example: '/plan year-end savings target',
    execute: async (args, ctx) => {
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const title = args.trim() || 'Long-Term Plan';
      const steps = [
        { title: 'Define budget and track daily expenses', done: false },
        { title: 'Allocate 20% to emergency fund', done: false },
        { title: 'Review progress monthly', done: false },
      ];
      const note = storage.addNote({
        user_id: userId,
        kind: 'plan',
        title,
        content: `Structured plan for: ${title}`,
        steps,
        target_date: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      });
      return {
        reply: `Created strategic plan: **"${title}"** with ${steps.length} roadmap milestones.`,
        data: note,
      };
    },
  },

  remind: {
    name: '/remind',
    description: 'Set an in-app reminder (no email).',
    example: '/remind check milk stock',
    execute: async (args, ctx) => {
      const userId = ctx?.userId || (ctx?.userEmail ? storage.getUser(ctx.userEmail).id : storage.getUserId());
      const rem = storage.addReminder({
        user_id: userId,
        payload: args.trim(),
        trigger_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        recurrence: 'none',
        channel: 'in_app',
        status: 'SCHEDULED',
        attempts: 0,
      });
      return {
        reply: `In-app reminder set for: **"${rem.payload}"**.`,
        data: rem,
      };
    },
  },

  review: {
    name: '/review',
    aliases: ['/weekly-report'],
    description: "Weekly report: tasks done vs pending, total spending, and next week's focus.",
    example: '/review this week',
    execute: async (_args, ctx) => {
      const userId = ctx?.userId;
      const tasks = storage.getTasks(true, userId);
      const done = tasks.filter((t) => t.status === 'COMPLETED');
      const pending = tasks.filter((t) => t.status === 'PENDING');
      const expenses = storage.getExpenses(userId);
      const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

      let reply = `### 📊 Weekly Performance Review\n\n`;
      reply += `• **Tasks Completed:** ${done.length}\n`;
      reply += `• **Tasks In Progress / Pending:** ${pending.length}\n`;
      reply += `• **Total Recorded Spending:** IDR ${total.toLocaleString()}\n`;
      reply += `• **Recommendation:** Focus on finishing top pending items before introducing new projects.\n`;

      return { reply };
    },
  },

  search: {
    name: '/search',
    description: 'Hybrid search across all notes using semantic vector search and keywords.',
    example: '/search property tax',
    execute: async (args, ctx) => {
      const userId = ctx?.userId;
      const query = args.trim();
      const embedding = await generateEmbedding(query);
      const vectorResults = storage.vectorSearchNotes(embedding, 3);
      const allNotes = storage.getNotes(undefined, userId);
      const keywordResults = allNotes.filter(
        (n) => n.title.toLowerCase().includes(query.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase())
      );

      const combined = Array.from(new Set([...vectorResults.map((r) => r.note), ...keywordResults]));

      if (combined.length === 0) {
        return { reply: `No matching notes found for "${query}".` };
      }

      let reply = `### Search Results for "${query}":\n`;
      combined.slice(0, 5).forEach((n) => {
        reply += `• **${n.title}** (${n.kind}): ${n.content.slice(0, 100)}...\n`;
      });
      return { reply, data: combined };
    },
  },

  undo: {
    name: '/undo',
    description: 'Undo the last action taken in the database.',
    example: '/undo',
    execute: async (_args, ctx) => {
      const userId = ctx?.userId;
      const undone = storage.undoLastAction(userId);
      if (!undone) {
        return { reply: 'No recent actions to undo within the last 10 minutes.' };
      }
      return {
        reply: `Undone last ${undone.type}: **"${undone.item.title || undone.item.description || undone.item.item}"** has been archived.`,
      };
    },
  },

  backup: {
    name: '/backup',
    description: 'Email full JSON backup file to your registered Google email address now.',
    example: '/backup',
    execute: async (_args, ctx) => {
      const targetEmail = ctx?.userEmail || storage.getUser().email;
      const fullBackup = storage.exportFullBackup(ctx?.userId);
      const jsonContent = JSON.stringify(fullBackup, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `my_pa_backup_${dateStr}.json`;

      const res = await sendEmail({
        to: targetEmail,
        subject: `My PA Backup Export - ${dateStr}`,
        text: `Attached is your complete My PA backup file for ${dateStr}.\nYou can re-import this JSON file at any time via Settings -> Import Backup.`,
        attachments: [
          {
            filename,
            content: jsonContent,
            contentType: 'application/json',
          },
        ],
      });

      return {
        reply: res.success
          ? `Dispatched full JSON backup (${filename}) to **${targetEmail}**.`
          : `Failed to dispatch backup email: ${res.error}`,
      };
    },
  },
};

export async function executeSkill(
  commandStr: string,
  userId?: string,
  userEmail?: string
): Promise<{ reply: string; data?: any } | null> {
  const trimmed = commandStr.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const trigger = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  for (const skill of Object.values(SKILLS)) {
    const main = skill.name.replace('/', '').toLowerCase();
    const aliases = skill.aliases?.map((a) => a.replace('/', '').toLowerCase()) || [];
    if (trigger === main || aliases.includes(trigger)) {
      return await skill.execute(args, { userId, userEmail });
    }
  }

  return {
    reply: `Unknown command \`/${trigger}\`. Type \`/info\` to see the cheat sheet of all available skills.`,
  };
}
