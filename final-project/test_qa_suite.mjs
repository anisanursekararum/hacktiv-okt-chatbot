import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

async function runQASuite() {
  console.log('======================================================================');
  console.log('🧪 MY PA SYSTEM-WIDE COMPREHENSIVE QA AUTOMATION TEST SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- TEST SUITE 1: AUTHENTICATION & SINGLE/MULTI-USER ISOLATION ---
  console.log('📌 Test Suite 1: Authentication & User Scoping Isolation');
  try {
    const userA_email = 'test.userA@example.com';
    const userB_email = 'test.userB@example.com';

    // Check user profiles via /api/auth
    const resA = await fetch(`${BASE_URL}/api/auth?email=${encodeURIComponent(userA_email)}`);
    const dataA = await resA.json();
    assert(resA.status === 200 && dataA.user.email === userA_email, `User A retrieved: ${dataA.user.email}`);

    const resB = await fetch(`${BASE_URL}/api/auth?email=${encodeURIComponent(userB_email)}`);
    const dataB = await resB.json();
    assert(resB.status === 200 && dataB.user.email === userB_email, `User B retrieved: ${dataB.user.email}`);
    assert(dataA.user.id !== dataB.user.id, `User A (ID: ${dataA.user.id}) and User B (ID: ${dataB.user.id}) have distinct IDs`);

    // Verify isolation in items
    const itemsA = await (await fetch(`${BASE_URL}/api/items?type=tasks&email=${encodeURIComponent(userA_email)}`)).json();
    const itemsB = await (await fetch(`${BASE_URL}/api/items?type=tasks&email=${encodeURIComponent(userB_email)}`)).json();
    assert(Array.isArray(itemsA.tasks) && Array.isArray(itemsB.tasks), 'User A and User B items fetch returns arrays');
  } catch (err) {
    assert(false, `Test Suite 1 failed: ${err.message}`);
  }

  // --- TEST SUITE 2: ITEMS CRUD API ---
  console.log('\n📌 Test Suite 2: Items CRUD (Tasks, Expenses, Groceries, Notes)');
  let createdTaskId = null;
  const qaUser = 'qa.tester@example.com';
  try {
    // 1. Create Task
    const createRes = await fetch(`${BASE_URL}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tasks',
        email: qaUser,
        item: {
          title: 'QA Automated Verification Task',
          category: 'work',
          status: 'PENDING',
          due_date: new Date().toISOString()
        }
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 200 && createData.item?.id, `Task created successfully with ID: ${createData.item?.id}`);
    createdTaskId = createData.item?.id;

    // 2. Query Item
    const getRes = await fetch(`${BASE_URL}/api/items?type=tasks&email=${encodeURIComponent(qaUser)}`);
    const getData = await getRes.json();
    const found = getData.tasks.find((t) => t.id === createdTaskId);
    assert(found && found.title === 'QA Automated Verification Task', 'Created task retrieved properly scoped to QA user');

    // 3. Update Item (mark complete)
    const patchRes = await fetch(`${BASE_URL}/api/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'tasks',
        id: createdTaskId,
        updates: { status: 'COMPLETED' }
      })
    });
    const patchData = await patchRes.json();
    assert(patchData.item?.status === 'COMPLETED', 'Task status updated to COMPLETED');

    // 4. Soft Archive Item
    const delRes = await fetch(`${BASE_URL}/api/items?type=tasks&id=${encodeURIComponent(createdTaskId)}`, {
      method: 'DELETE'
    });
    const delData = await delRes.json();
    assert(delData.success === true, 'Task soft-archived successfully');

    // 5. Verify it is no longer returned in active list
    const getAfterDel = await (await fetch(`${BASE_URL}/api/items?type=tasks&email=${encodeURIComponent(qaUser)}`)).json();
    const stillThere = getAfterDel.tasks.find((t) => t.id === createdTaskId);
    assert(!stillThere, 'Archived task excluded from active query');
  } catch (err) {
    assert(false, `Test Suite 2 failed: ${err.message}`);
  }

  // --- TEST SUITE 3: REMINDERS & AUTO-RUNNER DISPATCH ---
  console.log('\n📌 Test Suite 3: Reminders Storage & Dispatch API');
  try {
    const remRes = await fetch(`${BASE_URL}/api/reminders?email=${encodeURIComponent(qaUser)}`);
    const remData = await remRes.json();
    assert(remRes.status === 200 && Array.isArray(remData.reminders), 'Reminders query returned array');

    // Trigger dispatch endpoint
    const postRem = await fetch(`${BASE_URL}/api/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: qaUser })
    });
    const postRemData = await postRem.json();
    assert(postRem.status === 200 && typeof postRemData.processed === 'number', `Reminders dispatch executed (processed: ${postRemData.processed})`);
  } catch (err) {
    assert(false, `Test Suite 3 failed: ${err.message}`);
  }

  // --- TEST SUITE 4: BACKUP EXPORT & ENDPOINTS ---
  console.log('\n📌 Test Suite 4: Backup Export & Security');
  try {
    const backupRes = await fetch(`${BASE_URL}/api/backup?email=${encodeURIComponent(qaUser)}`);
    assert(backupRes.status === 200, 'Backup GET endpoint returns 200');
    const disposition = backupRes.headers.get('content-disposition');
    assert(disposition && disposition.includes('my_pa_backup_'), `Content-Disposition has My PA naming: ${disposition}`);

    const backupJson = await backupRes.json();
    assert(backupJson.users && backupJson.tasks && backupJson.expenses, 'Backup JSON contains full tables schema');
  } catch (err) {
    assert(false, `Test Suite 4 failed: ${err.message}`);
  }

  // --- TEST SUITE 5: SETTINGS & MODEL CONFIGURATION ---
  console.log('\n📌 Test Suite 5: Settings API');
  try {
    const setRes = await fetch(`${BASE_URL}/api/settings?email=${encodeURIComponent(qaUser)}`);
    const setData = await setRes.json();
    assert(setRes.status === 200 && setData.settings?.model_name, `Settings loaded for user (Model: ${setData.settings?.model_name})`);

    const updateSetRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature: 0.45
      })
    });
    const updateSetData = await updateSetRes.json();
    assert(updateSetData.settings?.temperature === 0.45, `Updated settings temperature to: ${updateSetData.settings?.temperature}`);
  } catch (err) {
    assert(false, `Test Suite 5 failed: ${err.message}`);
  }

  // --- TEST SUITE 6: CHAT & SKILLS ENGINE (/info, /today, etc.) ---
  console.log('\n📌 Test Suite 6: Chat & Skills Engine Execution');
  try {
    const chatInfoRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '/info',
        userEmail: qaUser
      })
    });
    const chatInfoData = await chatInfoRes.json();
    assert(chatInfoRes.status === 200, '/info returns HTTP 200');
    const replyText = chatInfoData.message?.content || '';
    assert(replyText && !replyText.includes('Omnia'), 'Skill /info contains NO obsolete "Omnia" branding');
    assert(replyText && replyText.includes('My PA'), 'Skill /info displays "My PA" branding');

    const chatTodayRes = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '/today',
        userEmail: qaUser
      })
    });
    const chatTodayData = await chatTodayRes.json();
    assert(chatTodayRes.status === 200 && chatTodayData.message?.content, '/today returns structured agenda');
  } catch (err) {
    assert(false, `Test Suite 6 failed: ${err.message}`);
  }

  console.log('\n======================================================================');
  console.log(`📊 QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runQASuite().catch((e) => {
  console.error('Fatal QA error:', e);
  process.exit(1);
});
