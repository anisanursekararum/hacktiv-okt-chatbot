import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/db/storage';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const email = searchParams.get('email');

  const currentUser = email ? storage.getUser(email) : storage.getUser();
  const userId = currentUser.id;

  if (type === 'tasks') {
    return NextResponse.json({ tasks: storage.getTasks(true, userId) });
  }
  if (type === 'expenses') {
    return NextResponse.json({ expenses: storage.getExpenses(userId) });
  }
  if (type === 'groceries') {
    return NextResponse.json({ groceries: storage.getGroceries(userId) });
  }
  if (type === 'notes') {
    return NextResponse.json({ notes: storage.getNotes(undefined, userId) });
  }
  if (type === 'bookmarks') {
    return NextResponse.json({ bookmarks: storage.getBookmarks(userId) });
  }
  if (type === 'reminders') {
    return NextResponse.json({ reminders: storage.getReminders(userId) });
  }

  // Return full dashboard state
  return NextResponse.json({
    tasks: storage.getTasks(true, userId),
    expenses: storage.getExpenses(userId),
    groceries: storage.getGroceries(userId),
    notes: storage.getNotes(undefined, userId),
    reminders: storage.getReminders(userId),
    user: currentUser,
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, id, updates } = body;

    if (!type || !id || !updates) {
      return NextResponse.json({ error: 'type, id, and updates required' }, { status: 400 });
    }

    let updatedItem = null;
    if (type === 'tasks') {
      updatedItem = storage.updateTask(id, updates);
    } else if (type === 'expenses') {
      updatedItem = storage.updateExpense(id, updates);
    } else if (type === 'groceries') {
      updatedItem = storage.updateGrocery(id, updates);
    } else if (type === 'notes') {
      updatedItem = storage.updateNote(id, updates);
    } else if (type === 'reminders') {
      updatedItem = storage.updateReminder(id, updates);
    }

    if (!updatedItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as 'tasks' | 'expenses' | 'groceries' | 'notes' | 'reminders';
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'type and id are required' }, { status: 400 });
    }

    const success = storage.archiveItem(type, id);
    if (!success) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item archived/removed successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
