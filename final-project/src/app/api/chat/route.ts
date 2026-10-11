import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';
import { executeSkill } from '@/lib/skills/engine';
import { parseStreamOfConsciousness, generateEmbedding } from '@/lib/ai/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, mediaAttachment } = body;

    if (!content && !mediaAttachment) {
      return NextResponse.json({ error: 'Message content or media attachment is required' }, { status: 400 });
    }

    const trimmed = (content || '').trim();

    // 1. Check if user issued a slash command skill (e.g. /today, /info, /expense)
    if (trimmed.startsWith('/')) {
      const skillResult = await executeSkill(trimmed);
      if (skillResult) {
        // Record user slash command and assistant response in chat messages
        const userMsg = storage.addChatMessage({
          user_id: storage.getUserId(),
          role: 'user',
          content: trimmed,
          media_type: 'text',
        });

        const assistantMsg = storage.addChatMessage({
          user_id: storage.getUserId(),
          role: 'assistant',
          content: skillResult.reply,
          media_type: 'text',
          extracted_items: skillResult.data,
        });

        return NextResponse.json({
          message: assistantMsg,
          extracted: skillResult.data,
          skillExecuted: true,
        });
      }
    }

    // 2. Stream-of-consciousness natural language chat message
    let mediaType: 'text' | 'image' | 'audio' | 'video' = 'text';
    if (mediaAttachment?.mimeType) {
      if (mediaAttachment.mimeType.startsWith('image/')) mediaType = 'image';
      else if (mediaAttachment.mimeType.startsWith('audio/')) mediaType = 'audio';
      else if (mediaAttachment.mimeType.startsWith('video/')) mediaType = 'video';
    }

    const userMsg = storage.addChatMessage({
      user_id: storage.getUserId(),
      role: 'user',
      content: trimmed,
      media_url: mediaAttachment ? `data:${mediaAttachment.mimeType};base64,...` : null,
      media_type: mediaType,
    });

    // 3. Multi-Modal Gemini Classification Engine
    const classification = await parseStreamOfConsciousness(trimmed, mediaAttachment);

    // 4. Save Extracted Structured Entities into Matching Tables
    const createdItems: {
      tasks: any[];
      expenses: any[];
      groceries: any[];
      notes: any[];
      reminders: any[];
      completedTasks: any[];
    } = {
      tasks: [],
      expenses: [],
      groceries: [],
      notes: [],
      reminders: [],
      completedTasks: [],
    };

    // A. Tasks
    for (const t of classification.tasks) {
      const task = storage.addTask({
        user_id: storage.getUserId(),
        title: t.title,
        category: t.category || 'general',
        status: 'PENDING',
        due_date: t.due_date || new Date().toISOString(),
        source_message_id: userMsg.id,
      });
      createdItems.tasks.push(task);
    }

    // B. Completed Tasks
    for (const title of classification.task_completions) {
      const doneTask = storage.fuzzyMatchAndCompleteTask(title);
      if (doneTask) createdItems.completedTasks.push(doneTask);
    }

    // C. Expenses (Stored as DRAFT awaiting confirmation)
    for (const exp of classification.expenses) {
      const expense = storage.addExpense({
        user_id: storage.getUserId(),
        amount: exp.amount,
        category: exp.category || 'general',
        description: exp.description,
        transaction_date: new Date().toISOString(),
        status: 'DRAFT',
        receipt_url: mediaType === 'image' ? userMsg.media_url : null,
        source_message_id: userMsg.id,
      });
      createdItems.expenses.push(expense);
    }

    // D. Groceries
    for (const g of classification.groceries) {
      const item = storage.addGrocery({
        user_id: storage.getUserId(),
        item: g.item,
        quantity: g.quantity || '1',
        status: 'ACTIVE',
        source_message_id: userMsg.id,
      });
      createdItems.groceries.push(item);
    }

    // E. Notes & Plans
    for (const n of classification.notes) {
      const embedding = await generateEmbedding(`${n.title} ${n.content}`);
      const note = storage.addNote({
        user_id: storage.getUserId(),
        kind: n.kind || 'note',
        title: n.title,
        content: n.content,
        tags: n.tags || ['quick-note'],
        embedding,
        source_message_id: userMsg.id,
      });
      createdItems.notes.push(note);
    }

    // F. Reminders
    for (const r of classification.reminders) {
      const reminder = storage.addReminder({
        user_id: storage.getUserId(),
        payload: r.payload,
        trigger_time: r.trigger_time,
        recurrence: r.recurrence || 'none',
        channel: r.channel || 'email',
        status: 'SCHEDULED',
        attempts: 0,
        source_message_id: userMsg.id,
      });
      createdItems.reminders.push(reminder);
    }

    // 5. Tier 2 Rolling Summary Update Check (+20 messages threshold)
    const allMsgs = storage.getAllMessages();
    if (allMsgs.length > 0 && allMsgs.length % 20 === 0) {
      const recent = allMsgs.slice(-20).map((m) => `${m.role}: ${m.content}`).join('\n');
      storage.saveSummary('conversation', `rolling_${allMsgs.length}`, `Key points of recent dialog:\n${recent.slice(0, 500)}`);
    }

    // 6. Save Assistant Response
    const assistantMsg = storage.addChatMessage({
      user_id: storage.getUserId(),
      role: 'assistant',
      content: classification.conversational_reply,
      media_type: 'text',
      extracted_items: createdItems,
    });

    return NextResponse.json({
      message: assistantMsg,
      extracted: createdItems,
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET() {
  const messages = storage.getRecentMessages(50);
  return NextResponse.json({ messages });
}
