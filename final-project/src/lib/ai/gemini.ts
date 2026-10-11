import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import { storage } from '../db/storage';
import { parseNaturalDateTime } from '../utils/dateTimeParser';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export interface ExtractedClassification {
  tasks: Array<{
    title: string;
    category?: string;
    due_date?: string | null;
  }>;
  task_completions: string[]; // Queries or titles of tasks the user marked completed
  expenses: Array<{
    amount: number;
    category?: string;
    description: string;
  }>;
  groceries: Array<{
    item: string;
    quantity?: string;
  }>;
  notes: Array<{
    kind?: 'note' | 'plan' | 'idea';
    title: string;
    content: string;
    tags?: string[];
  }>;
  reminders: Array<{
    payload: string;
    trigger_time: string;
    recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
    channel?: 'email' | 'in_app';
  }>;
  conversational_reply: string;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!ai || !text.trim()) {
    // Fallback deterministic mock 768-dim vector for testing/offline
    return Array.from({ length: 768 }, (_, i) => Math.sin(i + text.length) * 0.05);
  }
  try {
    const response = await (ai as any).models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    if (response?.embedding?.values) {
      return response.embedding.values;
    }
  } catch (err) {
    console.warn('Embedding fallback triggered:', err);
  }
  return Array.from({ length: 768 }, (_, i) => Math.sin(i + text.length) * 0.05);
}

export async function parseStreamOfConsciousness(
  userText: string,
  mediaAttachment?: { mimeType: string; dataBase64: string }
): Promise<ExtractedClassification> {
  const settings = storage.getSettings();
  const modelName = settings.model_name || 'gemini-2.5-flash';
  const temperature = Number(settings.temperature) || 0.2; // Low temperature for extraction accuracy

  const rollingSummary = storage.getLatestSummary('conversation');
  const recentMessages = storage.getRecentMessages(6);

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false });
  const timezone = storage.getUser().timezone || 'Asia/Jakarta';

  // Retrieve current active database records
  const storedTasks = storage.getTasks(true).filter((t) => !t.archived_at);
  const storedExpenses = storage.getExpenses().slice(-10);
  const storedGroceries = storage.getGroceries().filter((g) => g.status === 'ACTIVE');

  const systemPrompt = `You are My PA (Personal Assistant), a dedicated and highly accurate AI assistant that parses the user's natural thoughts into structured actions and answers questions about their data.
Current local date: ${currentDateStr}, Time: ${currentTimeStr} (${timezone}).

CURRENT DATA STORED IN USER'S DATABASE:
• Tasks: ${JSON.stringify(storedTasks.map((t) => ({ title: t.title, category: t.category, status: t.status, due: t.due_date })))}
• Active Groceries: ${JSON.stringify(storedGroceries.map((g) => ({ item: g.item, quantity: g.quantity })))}
• Recent Expenses: ${JSON.stringify(storedExpenses.map((e) => ({ desc: e.description, amount: e.amount, category: e.category })))}

${rollingSummary ? `Context from earlier dialog: ${rollingSummary.content}` : ''}

INSTRUCTIONS FOR PROCESSING USER INPUT:
1. QUESTION / QUERY MODE:
   If the user is asking a question or inquiring about their existing tasks, expenses, groceries, notes, or history:
   (For example: "task ku yang berkaitan sama work apa aja", "what are my work tasks?", "what todos do I have?", "apa yang harus dibeli?"):
   - Answer ACCURATELY based ONLY on the stored database items listed above!
   - Pay strict attention to categories (e.g. if asked about "work" tasks, ONLY return tasks where category is "work" or relates directly to work, do NOT include "learning" like SAP or personal items).
   - DO NOT create or duplicate tasks when answering questions. Return empty arrays for "tasks", "task_completions", "expenses", "groceries", "notes", "reminders".
   - Write your clear, direct answer in "conversational_reply" in the user's language (Indonesian or English).

2. RECORDING / ACTION MODE:
   If the user is expressing new items to record or complete:
   - "tasks": New to-dos. Accurately assign a category: "work", "learning", "research", "personal", "finance", or "general".
   - "task_completions": Tasks the user finished (e.g. "review QPR is done").
   - "expenses": Transactions. Return amount as plain number (e.g. 45k -> 45000).
   - "groceries": Shopping items.
   - "notes": Knowledge notes, ideas, or long-term plans.
   - "reminders": Scheduled alerts. Reminders ALWAYS default to channel "email".
     CRITICAL: Calculate "trigger_time" as an ISO string using the specific time requested!
     If the user says "besok jam 6 pagi" or "tomorrow 6am", trigger_time MUST be tomorrow at 06:00:00 local time (${timezone}), NOT the current time!

CRITICAL: Return ONLY a valid JSON object matching this schema without markdown fences:
{
  "tasks": [{ "title": "string", "category": "string", "due_date": "ISO string or null" }],
  "task_completions": ["title of completed task"],
  "expenses": [{ "amount": number, "category": "string", "description": "string" }],
  "groceries": [{ "item": "string", "quantity": "string" }],
  "notes": [{ "kind": "note"|"plan"|"idea", "title": "string", "content": "string", "tags": ["tag"] }],
  "reminders": [{ "payload": "string", "trigger_time": "ISO string", "recurrence": "none"|"daily"|"weekly"|"monthly", "channel": "email" }],
  "conversational_reply": "string"
}`;

  if (!ai) {
    // Resilient offline / test parser
    return fallbackHeuristicParser(userText, currentDateStr);
  }

  try {
    const contents: any[] = [];
    
    // Append conversation history
    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const currentParts: any[] = [];
    if (mediaAttachment) {
      currentParts.push({
        inlineData: {
          mimeType: mediaAttachment.mimeType,
          data: mediaAttachment.dataBase64,
        },
      });
    }
    currentParts.push({ text: userText || 'Process attached media' });

    contents.push({
      role: 'user',
      parts: currentParts,
    });

    const response = await ai.models.generateContent({
      model: modelName,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature,
        topP: Number(settings.top_p) || 0.95,
        topK: Number(settings.top_k) || 40,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const cleaned = text.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    const parsed: ExtractedClassification = JSON.parse(cleaned);

    return {
      tasks: parsed.tasks || [],
      task_completions: parsed.task_completions || [],
      expenses: parsed.expenses || [],
      groceries: parsed.groceries || [],
      notes: parsed.notes || [],
      reminders: parsed.reminders || [],
      conversational_reply: parsed.conversational_reply || 'Captured and categorized your items.',
    };
  } catch (error: any) {
    console.error('Gemini API call failed, falling back to heuristic parser:', error);
    return fallbackHeuristicParser(userText, currentDateStr);
  }
}

// Fallback intelligent heuristic parser when API limit is reached or offline
function fallbackHeuristicParser(input: string, todayStr: string): ExtractedClassification {
  const result: ExtractedClassification = {
    tasks: [],
    task_completions: [],
    expenses: [],
    groceries: [],
    notes: [],
    reminders: [],
    conversational_reply: '',
  };

  const lines = input.split(/,|\n|\band\b/i).map((s) => s.trim()).filter(Boolean);

  for (const seg of lines) {
    const lower = seg.toLowerCase();

    // Check expense: e.g. "pay electricity 150k", "lunch was 45k", "spent 50000 on books"
    const expMatch = seg.match(/(?:spent|paid|pay|lunch|dinner|breakfast|bought|cost|fee|was)\s+.*?(\d+(?:[.,]\d+)?)\s*(k|rb|thousand|usd)?/i) ||
                     seg.match(/(\d+(?:[.,]\d+)?)\s*(k|rb|thousand)\s+(?:for|on)?\s*(.*)/i) ||
                     seg.match(/(?:.*?)(\d+(?:[.,]\d+)?)\s*(k|rb|thousand)/i);
    if (expMatch && (/pay|spent|cost|fee|bill|lunch|dinner|breakfast|food|coffee|k|rb/i.test(seg))) {
      let num = parseFloat(expMatch[1].replace(',', '.'));
      if (expMatch[2] && /k|rb|thousand/i.test(expMatch[2])) num *= 1000;
      else if (/k|rb|thousand/i.test(seg)) num *= 1000;
      result.expenses.push({
        amount: num,
        category: /lunch|dinner|food|coffee|breakfast/i.test(seg) ? 'food' : /bill|electricity|water|wifi/i.test(seg) ? 'bills' : 'general',
        description: seg,
      });
      continue;
    }

    // Check grocery: e.g. "buy milk", "buy milk and eggs"
    if (/buy\s+(milk|eggs|bread|oil|butter|cheese|apples|detergent|rice|meat|fruit)/i.test(seg) || /groceries?:/i.test(seg)) {
      const items = seg.replace(/^(?:buy|groceries:?)\s+/i, '').split(/\band\b|,/i).map(s => s.trim()).filter(Boolean);
      items.forEach(it => {
        result.groceries.push({
          item: it,
          quantity: '1',
        });
      });
      continue;
    }

    // Check query question (e.g. "task ku yang berkaitan sama work apa aja")
    if (/(?:task|tugas|kerjaan).*(?:apa aja|apa saja|yang mana|list)/i.test(seg) || /(?:what are|show).*(?:task|todo)/i.test(seg)) {
      const isWork = /work|kerja|kerjaan|kantor/i.test(seg);
      const isLearning = /learn|belajar|kursus|training/i.test(seg);
      const tasks = storage.getTasks(false);
      const matches = tasks.filter((t) => {
        if (isWork) return t.category.toLowerCase() === 'work' || /review|qpr|intern|report|proposal|meeting/i.test(t.title);
        if (isLearning) return t.category.toLowerCase() === 'learning' || /sap|course|study/i.test(t.title);
        return true;
      });

      result.conversational_reply = matches.length > 0
        ? `Berikut to-do kamu${isWork ? ' terkait work' : isLearning ? ' terkait learning' : ''}:\n` + matches.map((m, idx) => `${idx + 1}. ${m.title} (${m.category})`).join('\n')
        : `Tidak ada task yang ditemukan${isWork ? ' untuk kategori work' : ''}.`;
      return result;
    }

    // Check reminder: e.g. "besok jam 6 pagi ingetin buat release patch167", "remind me tomorrow to pay tax"
    if (/remind|ingetin|ingatkan/i.test(seg)) {
      const { triggerTime, payload } = parseNaturalDateTime(seg);
      result.reminders.push({
        payload,
        trigger_time: triggerTime,
        recurrence: 'none',
        channel: 'email',
      });
      continue;
    }

    // Check note / idea: e.g. "idea: ...", "note: ...", "note down ... idea"
    if (/idea|note\s+down|note:|plan:|remember:/i.test(seg)) {
      result.notes.push({
        kind: /idea/i.test(seg) ? 'idea' : /plan/i.test(seg) ? 'plan' : 'note',
        title: seg.replace(/^note\s+down\s+/i, '').slice(0, 40),
        content: seg,
        tags: ['quick-capture'],
      });
      continue;
    }

    // Default to task
    if (/need to|have to|must|todo|task|schedule/i.test(seg) || seg.length > 5) {
      result.tasks.push({
        title: seg.replace(/^(today\s+)?(i\s+need\s+to|have\s+to|must)\s+/i, '').trim(),
        category: 'general',
        due_date: new Date().toISOString(),
      });
    }
  }

  const summaryParts: string[] = [];
  if (result.tasks.length) summaryParts.push(`${result.tasks.length} task(s)`);
  if (result.expenses.length) summaryParts.push(`${result.expenses.length} expense(s)`);
  if (result.groceries.length) summaryParts.push(`${result.groceries.length} grocery item(s)`);
  if (result.notes.length) summaryParts.push(`${result.notes.length} note(s)`);
  if (result.reminders.length) summaryParts.push(`${result.reminders.length} reminder(s)`);

  result.conversational_reply = summaryParts.length
    ? `I've noted that down: recorded ${summaryParts.join(', ')}.`
    : `Got it! Stored your message in Omnia history.`;

  return result;
}
