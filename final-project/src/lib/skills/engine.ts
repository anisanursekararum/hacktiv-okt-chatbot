import { storage } from '../db/storage';
import { sendEmail } from '../email/smtp';
import { generateEmbedding } from '../ai/gemini';
import { parseNaturalDateTime } from '../utils/dateTimeParser';

export interface SkillDefinition {
  name: string;
  aliases?: string[];
  description: string;
  example: string;
  execute: (args: string) => Promise<{ reply: string; data?: any }>;
}

export const SKILLS: Record<string, SkillDefinition> = {
  info: {
    name: '/info',
    aliases: ['/config'],
    description: 'Displays the cheat sheet of all available skills, active AI model, and parameters.',
    example: '/info or /info expense',
    execute: async (args) => {
      const settings = storage.getSettings();
      if (args.trim()) {
        const query = args.trim().replace(/^\//, '').toLowerCase();
        const skill = Object.values(SKILLS).find(
          (s) => s.name.replace('/', '') === query || s.aliases?.some((a) => a.replace('/', '') === query)
        );
        if (skill) {
          return {
            reply: `**Skill: ${skill.name}**\n- **Description:** ${skill.description}\n- **Example:** \`${skill.example}\`${skill.aliases ? `\n- **Aliases:** ${skill.aliases.join(', ')}` : ''}`,
          };
        }
      }

      const skillList = Object.values(SKILLS)
        .map((s) => `• **${s.name}**: ${s.description} (e.g. \`${s.example}\`)`)
        .join('\n');

      const configInfo = `### Omnia AI Cheat Sheet & System Config\n\n**Active AI Model:** \`${settings.model_name}\`\n**Temperature:** \`${settings.temperature}\` · **Top P:** \`${settings.top_p}\` · **Top K:** \`${settings.top_k}\`\n**Email Destination:** \`${storage.getUser().email}\`\n\n#### Available Skills (19 Built-in):\n${skillList}`;

      return { reply: configInfo };
    },
  },

  'send-email': {
    name: '/send-email',
    description: 'Summarize data and email it to the registered user address.',
    example: '/send-email summarize what I did on 9 October 2026',
    execute: async (args) => {
      const user = storage.getUser();
      const subject = `Omnia AI Summary Report`;
      const body = args.trim() || 'Summary of your latest activities and records.';
      const res = await sendEmail({
        to: user.email,
        subject,
        text: `Hello ${user.full_name},\n\nHere is your requested Omnia summary:\n\n${body}\n\nGenerated automatically by Omnia AI.`,
      });

      return {
        reply: res.success
          ? `Dispatched email summary to **${user.email}**.`
          : `Failed to send email: ${res.error}`,
      };
    },
  },

  'email-reminder': {
    name: '/email-reminder',
    description: 'Schedule an email reminder sent to your registered Gmail address.',
    example: '/email-reminder besok jam 6 pagi ingetin buat release patch167',
    execute: async (args) => {
      const { triggerTime, payload } = parseNaturalDateTime(args);
      const reminder = storage.addReminder({
        user_id: storage.getUserId(),
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
        reply: `Scheduled email reminder: **"${reminder.payload}"** for **${formattedDate}**. Destination: **${storage.getUser().email}**.`,
        data: reminder,
      };
    },
  },

  today: {
    name: '/today',
    description: "Today's summary: active todos, deadlines, and today's expenses.",
    example: '/today',
    execute: async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const tasks = storage.getTasks().filter((t) => !t.completed_at || t.created_at.startsWith(todayStr));
      const pendingTasks = tasks.filter((t) => t.status === 'PENDING');
      const expenses = storage.getExpenses().filter((e) => e.transaction_date.startsWith(todayStr));
      const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const groceries = storage.getGroceries().filter((g) => g.status === 'ACTIVE');

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
    execute: async (args) => {
      const daysMatch = args.match(/\d+/);
      const days = daysMatch ? parseInt(daysMatch[0], 10) : 7;
      const targetDate = new Date(Date.now() + days * 24 * 3600 * 1000);

      const tasks = storage.getTasks(false).filter((t) => {
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
    execute: async (args) => {
      const isYesterday = /yesterday/i.test(args);
      const target = isYesterday ? new Date(Date.now() - 24 * 3600 * 1000) : new Date();
      const dateStr = target.toISOString().split('T')[0];

      const tasks = storage.getTasks(true).filter((t) => t.created_at.startsWith(dateStr) || t.completed_at?.startsWith(dateStr));
      const completed = tasks.filter((t) => t.status === 'COMPLETED');
      const expenses = storage.getExpenses().filter((e) => e.transaction_date.startsWith(dateStr));
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
    execute: async () => {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const pendingTasks = storage.getTasks(false);
      const drafts = storage.getExpenses().filter((e) => e.status === 'DRAFT');

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
    execute: async (args) => {
      if (!args.trim()) return { reply: 'Please provide a task description.' };
      const task = storage.addTask({
        user_id: storage.getUserId(),
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
    description: 'Manage shopping list items (add or view).',
    example: '/grocery add eggs, milk',
    execute: async (args) => {
      const items = args.replace(/^add\s+/i, '').split(',').map((s) => s.trim()).filter(Boolean);
      if (items.length === 0) {
        const active = storage.getGroceries().filter((g) => g.status === 'ACTIVE');
        if (active.length === 0) return { reply: 'Your shopping list is currently empty!' };
        return {
          reply: `### Shopping List:\n` + active.map((g) => `• [ ] ${g.item} (${g.quantity})`).join('\n'),
        };
      }
      const added = items.map((item) =>
        storage.addGrocery({
          user_id: storage.getUserId(),
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
    execute: async (args) => {
      const match = args.match(/(\d+(?:[.,]\d+)?)\s*(k|rb|thousand)?/i);
      let amount = 0;
      if (match) {
        amount = parseFloat(match[1].replace(',', '.'));
        if (match[2]) amount *= 1000;
      }
      const desc = args.replace(match ? match[0] : '', '').trim() || 'General Expense';
      const exp = storage.addExpense({
        user_id: storage.getUserId(),
        amount,
        category: /food|lunch|dinner|coffee/i.test(desc) ? 'food' : 'general',
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
    execute: async () => {
      const expenses = storage.getExpenses();
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
    description: 'Save a free-form knowledge note with tags.',
    example: '/note SaaS idea: invoice aggregator for SMEs',
    execute: async (args) => {
      const content = args.trim();
      const embedding = await generateEmbedding(content);
      const note = storage.addNote({
        user_id: storage.getUserId(),
        kind: 'note',
        title: content.slice(0, 40),
        content,
        tags: ['quick-note'],
        embedding,
      });
      return {
        reply: `Saved note: **"${note.title}"** (indexed into long-term vector memory).`,
        data: note,
      };
    },
  },

  'web-clipper': {
    name: '/web-clipper',
    aliases: ['/link'],
    description: 'Save a web link with title and summary.',
    example: '/link https://news.ycombinator.com',
    execute: async (args) => {
      const url = args.trim();
      const bm = storage.addBookmark({
        user_id: storage.getUserId(),
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
    execute: async (args) => {
      const title = args.trim() || 'Long-Term Plan';
      const steps = [
        { title: 'Define budget and track daily expenses', done: false },
        { title: 'Allocate 20% to emergency fund', done: false },
        { title: 'Review progress monthly', done: false },
      ];
      const note = storage.addNote({
        user_id: storage.getUserId(),
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
    execute: async (args) => {
      const rem = storage.addReminder({
        user_id: storage.getUserId(),
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
    execute: async () => {
      const tasks = storage.getTasks(true);
      const done = tasks.filter((t) => t.status === 'COMPLETED');
      const pending = tasks.filter((t) => t.status === 'PENDING');
      const expenses = storage.getExpenses();
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
    execute: async (args) => {
      const query = args.trim();
      const embedding = await generateEmbedding(query);
      const vectorResults = storage.vectorSearchNotes(embedding, 3);
      const allNotes = storage.getNotes();
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
    execute: async () => {
      const undone = storage.undoLastAction();
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
    execute: async () => {
      const user = storage.getUser();
      const fullBackup = storage.exportFullBackup();
      const jsonContent = JSON.stringify(fullBackup, null, 2);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `omnia_backup_${dateStr}.json`;

      const res = await sendEmail({
        to: user.email,
        subject: `Omnia AI Backup Export - ${dateStr}`,
        text: `Attached is your complete Omnia AI backup file for ${dateStr}.\nYou can re-import this JSON file at any time via Settings -> Import Backup.`,
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
          ? `Dispatched full JSON backup (${filename}) to **${user.email}**.`
          : `Failed to dispatch backup email: ${res.error}`,
      };
    },
  },
};

export async function executeSkill(commandStr: string): Promise<{ reply: string; data?: any } | null> {
  const trimmed = commandStr.trim();
  if (!trimmed.startsWith('/')) return null;

  const parts = trimmed.slice(1).split(/\s+/);
  const trigger = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  for (const skill of Object.values(SKILLS)) {
    const main = skill.name.replace('/', '').toLowerCase();
    const aliases = skill.aliases?.map((a) => a.replace('/', '').toLowerCase()) || [];
    if (trigger === main || aliases.includes(trigger)) {
      return await skill.execute(args);
    }
  }

  return {
    reply: `Unknown command \`/${trigger}\`. Type \`/info\` to see the cheat sheet of all available skills.`,
  };
}
