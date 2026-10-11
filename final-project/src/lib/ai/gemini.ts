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
  mediaAttachment?: { mimeType: string; dataBase64: string },
  userId?: string
): Promise<ExtractedClassification> {
  const settings = storage.getSettings();
  const modelName = settings.model_name || 'gemini-1.5-flash';
  const temperature = Number(settings.temperature) || 0.2;

  const rollingSummary = storage.getLatestSummary('conversation');
  const recentMessages = storage.getRecentMessages(6, userId);

  const now = new Date();
  const currentDateStr = now.toISOString().split('T')[0];
  const currentTimeStr = now.toLocaleTimeString('en-US', { hour12: false });
  const timezone = storage.getUser().timezone || 'Asia/Jakarta';

  // Retrieve current active database records for this user
  const storedTasks = storage.getTasks(true, userId).filter((t) => !t.archived_at);
  const storedExpenses = storage.getExpenses(userId).slice(-10);
  const storedGroceries = storage.getGroceries(userId).filter((g) => g.status === 'ACTIVE');

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
   - "groceries": Shopping list items, supermarket ingredients, groceries to buy (e.g. "ayam telor", "telur", "susu", "sayur", "minyak", "beras", "eggs", "milk", etc.).
     CRITICAL RULE: If a food/grocery item does NOT have a specific price or money amount mentioned, it MUST be classified as "groceries", NEVER "expenses"!
   - "expenses": Transactions where money was spent WITH AN EXPLICIT NUMERICAL COST OR PRICE (e.g. "makan siang 35k", "spent 50000 on books", "bayar listrik 150rb", "ayam 30k").
     CRITICAL RULE: NEVER classify an item without an explicit price as an expense!
   - "tasks": New to-dos. Accurately assign a category: "work", "learning", "research", "personal", "finance", or "general".
   - "task_completions": Tasks the user finished (e.g. "review QPR is done").
   - "notes": Knowledge notes, ideas, thoughts, meeting notes, or items starting with "catat", "note:", "idea:".
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
    return fallbackHeuristicParser(userText, currentDateStr, userId);
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
    return fallbackHeuristicParser(userText, currentDateStr, userId);
  }
}

// Common grocery vocabulary in Indonesian and English
const GROCERY_WORDS = [
  'ayam', 'telor', 'telur', 'daging', 'ikan', 'sayur', 'bayam', 'kangkung', 'wortel', 'tomat',
  'cabai', 'cabe', 'bawang', 'beras', 'minyak', 'gula', 'garam', 'susu', 'roti', 'keju',
  'mentega', 'kopi', 'teh', 'mie', 'indomie', 'sabun', 'sampo', 'shampoo', 'odol', 'pasta gigi',
  'deterjen', 'detergent', 'tisu', 'tissue', 'buah', 'apel', 'jeruk', 'pisang', 'tempe', 'tahu',
  'kentang', 'bumbu', 'kecap', 'saus', 'chicken', 'egg', 'eggs', 'milk', 'bread', 'butter',
  'cheese', 'meat', 'beef', 'fish', 'vegetable', 'vegetables', 'rice', 'oil', 'sugar', 'salt',
  'fruit', 'fruits', 'apple', 'apples', 'banana', 'bananas'
];

// Fallback intelligent heuristic parser when API limit is reached or offline
export function fallbackHeuristicParser(input: string, _todayStr: string, userId?: string): ExtractedClassification {
  const result: ExtractedClassification = {
    tasks: [],
    task_completions: [],
    expenses: [],
    groceries: [],
    notes: [],
    reminders: [],
    conversational_reply: '',
  };

  const rawTrimmed = input.trim();
  if (!rawTrimmed) return result;

  // 1. Check query question (e.g. "task ku yang berkaitan sama work apa aja")
  if (
    /(?:task|tugas|kerjaan).*(?:apa aja|apa saja|yang mana|list)/i.test(rawTrimmed) ||
    /(?:what are|show).*(?:task|todo)/i.test(rawTrimmed)
  ) {
    const isWork = /work|kerja|kerjaan|kantor/i.test(rawTrimmed);
    const isLearning = /learn|belajar|kursus|training/i.test(rawTrimmed);
    const tasks = storage.getTasks(false, userId);
    const matches = tasks.filter((t) => {
      const cat = (t.category || '').toLowerCase();
      if (isWork) {
        if (cat === 'learning' || cat === 'personal') return false;
        return cat === 'work' || /qpr|intern|report|proposal|meeting|tiket|audit|presentation/i.test(t.title);
      }
      if (isLearning) {
        if (cat === 'work' || cat === 'personal') return false;
        return cat === 'learning' || /sap|course|study|kursus|training/i.test(t.title);
      }
      return true;
    });

    result.conversational_reply = matches.length > 0
      ? `Berikut to-do kamu${isWork ? ' terkait work' : isLearning ? ' terkait learning' : ''}:\n` + matches.map((m, idx) => `${idx + 1}. ${m.title} (${m.category})`).join('\n')
      : `Tidak ada task yang ditemukan${isWork ? ' untuk kategori work' : ''}.`;
    return result;
  }

  // Split multi-part input by newline, comma, or "and" / "dan"
  const lines = rawTrimmed.split(/\n|\band\b|\bdan\b/i).map((s) => s.trim()).filter(Boolean);

  for (const seg of lines) {
    const lower = seg.toLowerCase();

    // 2. Check note / idea: e.g. "note: ...", "catat: ...", "catatan: ...", "idea: ...", "ide: ...", "ingat: ..."
    const notePrefixMatch = seg.match(/^(?:note|catat|catatan|idea|ide|plan|remember|ingat|penting):\s*(.*)/i);
    if (notePrefixMatch) {
      const content = notePrefixMatch[1].trim() || seg;
      const isIdea = /idea|ide/i.test(seg);
      const isPlan = /plan/i.test(seg);
      result.notes.push({
        kind: isIdea ? 'idea' : isPlan ? 'plan' : 'note',
        title: content.slice(0, 40),
        content,
        tags: [isIdea ? 'idea' : isPlan ? 'plan' : 'quick-note'],
      });
      continue;
    }

    if (/^note\s+down\s+/i.test(seg) || /^catat\s+/i.test(seg)) {
      const content = seg.replace(/^(?:note\s+down|catat)\s+/i, '').trim();
      result.notes.push({
        kind: 'note',
        title: content.slice(0, 40),
        content,
        tags: ['quick-note'],
      });
      continue;
    }

    // 3. Check reminder: e.g. "besok jam 6 pagi ingetin buat release patch167", "remind me tomorrow 9am"
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

    // 4. Check task completion: e.g. "review QPR is done", "selesai review QPR"
    if (/(?:done|finished|completed|selesai|sudah)\s+(.*)/i.test(seg) || /(.*?)\s+(?:is\s+done|sudah\s+selesai)/i.test(seg)) {
      const match = seg.match(/(?:done|finished|completed|selesai|sudah)\s+(.*)/i) ||
                    seg.match(/(.*?)\s+(?:is\s+done|sudah\s+selesai)/i);
      if (match && match[1]) {
        result.task_completions.push(match[1].trim());
        continue;
      }
    }

    // 5. Check if it's an Expense:
    // MUST have an explicit currency or price indicator (Rp, IDR, $, or number followed by k/rb/ribu/thousand/jt, NOT kg)
    const explicitCurrencyMatch = seg.match(/(?:(?:rp\.?|idr|\$)\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(k|rb|ribu|thousand|jt|juta)\b(?!g)|(?:spent|bayar|paid|cost|fee)\s*(\d{3,}))/i);

    if (explicitCurrencyMatch) {
      const numStr = explicitCurrencyMatch[1] || explicitCurrencyMatch[2] || explicitCurrencyMatch[4];
      const unit = (explicitCurrencyMatch[3] || '').toLowerCase();
      let num = parseFloat(numStr.replace(',', '.'));
      if (/k|rb|ribu|thousand/i.test(unit)) {
        num *= 1000;
      } else if (/jt|juta/i.test(unit)) {
        num *= 1000000;
      }

      const desc = seg.replace(explicitCurrencyMatch[0], '').replace(/^(?:spent|paid|pay|bayar|beli|bought|on|for)\s+/i, '').trim() || seg;
      result.expenses.push({
        amount: num,
        category: /lunch|dinner|food|coffee|breakfast|makan/i.test(seg) ? 'food' : /bill|electricity|water|wifi|listrik|pulsa/i.test(seg) ? 'bills' : 'general',
        description: desc || 'Expense',
      });
      continue;
    }

    // 6. Check Groceries (Shopping items):
    // E.g. "ayam telor", "ayam, telor", "beli ayam telor", "telur 1 kg", "susu dan roti", "buy milk and eggs"
    const isGroceryPrefixed = /^(?:beli|belanja|buy|groceries:?|grocery:?|shopping:?)\s+/i.test(seg);
    const containsGroceryWord = GROCERY_WORDS.some((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lower);
    });

    if (isGroceryPrefixed || containsGroceryWord) {
      // Strip leading action words
      const cleanedGrocerySeg = seg.replace(/^(?:beli|belanja|buy|groceries:?|grocery:?|shopping:?)\s+/i, '').trim();
      
      // If contains commas, split by comma
      let itemTokens: string[] = [];
      if (cleanedGrocerySeg.includes(',')) {
        itemTokens = cleanedGrocerySeg.split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        // Check if multiple grocery words exist in this segment (e.g. "ayam telor")
        const words = cleanedGrocerySeg.split(/\s+/).filter(Boolean);
        const matchedWords = words.filter((w) => GROCERY_WORDS.includes(w.toLowerCase()));

        if (matchedWords.length > 1 && words.length <= 4) {
          // e.g. "ayam telor" -> ["ayam", "telor"]
          itemTokens = words;
        } else {
          itemTokens = [cleanedGrocerySeg];
        }
      }

      for (const it of itemTokens) {
        if (!it) continue;
        // Check for quantity in item string, e.g. "telur 1 kg" or "2 susu"
        const qtyMatch = it.match(/(\d+\s*(?:kg|g|liter|l|pcs|butir|ikat|buah|pack)?)/i);
        const itemClean = qtyMatch ? it.replace(qtyMatch[0], '').trim() : it;
        result.groceries.push({
          item: itemClean || it,
          quantity: qtyMatch ? qtyMatch[0].trim() : '1',
        });
      }
      continue;
    }

    // 7. General Tasks:
    // If not matching any above, it's a To-Do task
    const cleanTitle = seg.replace(/^(today\s+)?(i\s+need\s+to|have\s+to|must|harus|perlu|kerjakan|tolong)\s+/i, '').trim();
    if (cleanTitle) {
      const isWork = /qpr|review|intern|meeting|report|laporan|proposal|client|kantor/i.test(cleanTitle);
      const isLearning = /learn|belajar|kursus|training|sap|read|baca/i.test(cleanTitle);
      result.tasks.push({
        title: cleanTitle,
        category: isWork ? 'work' : isLearning ? 'learning' : 'general',
        due_date: new Date().toISOString(),
      });
    }
  }

  // Construct friendly assistant reply
  const summaryParts: string[] = [];
  if (result.groceries.length) {
    summaryParts.push(`${result.groceries.length} grocery item(s) (${result.groceries.map((g) => g.item).join(', ')})`);
  }
  if (result.expenses.length) {
    summaryParts.push(`${result.expenses.length} expense(s)`);
  }
  if (result.tasks.length) {
    summaryParts.push(`${result.tasks.length} task(s)`);
  }
  if (result.notes.length) {
    summaryParts.push(`${result.notes.length} note(s)`);
  }
  if (result.reminders.length) {
    summaryParts.push(`${result.reminders.length} reminder(s)`);
  }

  result.conversational_reply = summaryParts.length
    ? `Noted! Added ${summaryParts.join(', ')} to your records.`
    : `Got it! Stored your message in chat history.`;

  return result;
}
