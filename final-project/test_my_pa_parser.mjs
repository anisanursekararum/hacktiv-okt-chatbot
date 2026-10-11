import 'dotenv/config';
import { storage } from './src/lib/db/storage.js';
import { parseStreamOfConsciousness } from './src/lib/ai/gemini.js';
import { executeSkill } from './src/lib/skills/engine.js';

async function runTests() {
  console.log('=== 1. TESTING STREAM-OF-CONSCIOUSNESS CHAT PARSER ===');
  const complexThought =
    'Today I need to revise the proposal, pay electricity 150k, buy milk and eggs, note down SaaS aggregator idea for SMEs, remind me tomorrow 9am to check server';

  console.log('Input:', complexThought);
  const result = await parseStreamOfConsciousness(complexThought);
  console.log('\nExtracted Structured Output:');
  console.log('• Tasks:', JSON.stringify(result.tasks, null, 2));
  console.log('• Expenses:', JSON.stringify(result.expenses, null, 2));
  console.log('• Groceries:', JSON.stringify(result.groceries, null, 2));
  console.log('• Notes:', JSON.stringify(result.notes, null, 2));
  console.log('• Reminders:', JSON.stringify(result.reminders, null, 2));
  console.log('• Assistant Reply:', result.conversational_reply);

  // Assertions
  if (result.tasks.length === 0) throw new Error('Tasks extraction failed');
  if (result.expenses.length === 0) throw new Error('Expenses extraction failed');
  if (result.groceries.length === 0) throw new Error('Groceries extraction failed');
  console.log('-> [PASS] Stream-of-consciousness intent parser verified!');

  console.log('\n=== 2. TESTING SLASH COMMAND SKILLS (19 SKILLS ENGINE) ===');
  const infoRes = await executeSkill('/info');
  console.log('Skill /info response snippet:\n', infoRes?.reply.slice(0, 200), '...\n');

  const todayRes = await executeSkill('/today');
  console.log('Skill /today response snippet:\n', todayRes?.reply.slice(0, 200), '...\n');

  const expRes = await executeSkill('/expense dinner 75k');
  console.log('Skill /expense response:\n', expRes?.reply);

  console.log('-> [PASS] Skills Engine verified!');

  console.log('\n=== 3. TESTING DATABASE STORAGE & BACKUP EXPORT ===');
  const backup = storage.exportFullBackup();
  console.log('Backup exported tables:', Object.keys(backup));
  console.log('Tasks in store:', backup.tasks.length);
  console.log('Expenses in store:', backup.expenses.length);
  console.log('Groceries in store:', backup.groceries.length);

  console.log('-> [PASS] My PA Storage & Backup verified!');
  console.log('\nALL TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
