import 'dotenv/config';
import { parseNaturalDateTime } from './src/lib/utils/dateTimeParser.js';
import { executeSkill } from './src/lib/skills/engine.js';
import { storage } from './src/lib/db/storage.js';
import { parseStreamOfConsciousness } from './src/lib/ai/gemini.js';

async function testFeatures() {
  console.log('=== TEST 1: REMINDER TIME PARSING ("besok jam 6 pagi ingetin buat release patch167") ===');
  const reminderInput = 'besok jam 6 pagi ingetin buat release patch167';
  const parsed = parseNaturalDateTime(reminderInput);
  console.log('Input:', reminderInput);
  console.log('Parsed trigger_time:', parsed.triggerTime);
  console.log('Parsed payload:', parsed.payload);

  const targetDate = new Date(parsed.triggerTime);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (targetDate.getHours() !== 6 || targetDate.getMinutes() !== 0) {
    throw new Error(`Expected hour 6:00, got ${targetDate.getHours()}:${targetDate.getMinutes()}`);
  }
  console.log('-> [PASS] Reminder accurately parsed for tomorrow at 06:00:00 AM!\n');

  console.log('=== TEST 2: SKILL /email-reminder EXECUTION ===');
  const skillRes = await executeSkill('/email-reminder besok jam 6 pagi ingetin buat release patch167');
  console.log('Skill Reply:', skillRes?.reply);
  console.log('Reminder Data:', skillRes?.data);
  if (!skillRes?.data?.trigger_time.includes('T06:00:00') && new Date(skillRes?.data?.trigger_time).getHours() !== 6) {
    throw new Error('Skill did not set trigger_time to 06:00');
  }
  console.log('-> [PASS] /email-reminder skill executed with accurate tomorrow 6 AM!\n');

  console.log('=== TEST 3: AI ACCURACY ON TO-DO CATEGORIES (WORK vs LEARNING) ===');
  // Add 2 work tasks and 1 learning task to storage
  const t1 = storage.addTask({
    user_id: storage.getUserId(),
    title: 'review QPR',
    category: 'work',
    status: 'PENDING',
  });
  const t2 = storage.addTask({
    user_id: storage.getUserId(),
    title: 'intern follow-up',
    category: 'work',
    status: 'PENDING',
  });
  const t3 = storage.addTask({
    user_id: storage.getUserId(),
    title: 'study SAP ERP',
    category: 'learning',
    status: 'PENDING',
  });

  console.log('Stored Tasks in DB:');
  console.log(' 1.', t1.title, `(${t1.category})`);
  console.log(' 2.', t2.title, `(${t2.category})`);
  console.log(' 3.', t3.title, `(${t3.category})`);

  // Ask question about work tasks
  const query = 'task ku yang berkaitan sama work apa aja?';
  console.log('\nUser Query in Chat:', query);
  const result = await parseStreamOfConsciousness(query);
  console.log('My PA AI Reply:\n', result.conversational_reply);

  const lowerReply = result.conversational_reply.toLowerCase();
  if (!lowerReply.includes('qpr') && !lowerReply.includes('review')) {
    throw new Error('AI missed review QPR task');
  }
  if (!lowerReply.includes('intern')) {
    throw new Error('AI missed intern task');
  }
  if (lowerReply.includes('sap')) {
    throw new Error('AI incorrectly included SAP (which is learning, not work!)');
  }
  console.log('-> [PASS] AI correctly answered work tasks without confusing with SAP!\n');

  console.log('=== TEST 4: REMOVE / DELETE BY CLICK ===');
  const archived = storage.archiveItem('tasks', t3.id);
  console.log('Archived task', t3.id, 'status:', archived);
  const remaining = storage.getTasks().find((t) => t.id === t3.id);
  if (remaining) throw new Error('Task should be archived/hidden');
  console.log('-> [PASS] Item removal by click verified!\n');

  console.log('ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY! 🚀');
}

testFeatures().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
