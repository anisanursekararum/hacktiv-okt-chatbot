export function parseNaturalDateTime(input: string, baseDate = new Date()): { triggerTime: string; payload: string } {
  let target = new Date(baseDate.getTime());
  let clean = input;

  const lower = input.toLowerCase();

  // 1. Check Day offset
  let hasSpecificDay = false;
  if (lower.includes('besok') || lower.includes('tomorrow')) {
    target.setDate(target.getDate() + 1);
    hasSpecificDay = true;
    clean = clean.replace(/besok|tomorrow/gi, '');
  } else if (lower.includes('lusa')) {
    target.setDate(target.getDate() + 2);
    hasSpecificDay = true;
    clean = clean.replace(/lusa/gi, '');
  } else if (lower.includes('hari ini') || lower.includes('today')) {
    hasSpecificDay = true;
    clean = clean.replace(/hari ini|today/gi, '');
  }

  // 2. Check Specific Time (e.g. "jam 6 pagi", "jam 7 malam", "jam 14:00", "at 9am", "9:30 pm")
  let hasSpecificTime = false;

  // Pattern: jam (\d+)(?::(\d+))?\s*(pagi|siang|sore|malam)?
  const indoTimeMatch = clean.match(/jam\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?/i);
  if (indoTimeMatch) {
    hasSpecificTime = true;
    let hour = parseInt(indoTimeMatch[1], 10);
    const minute = indoTimeMatch[2] ? parseInt(indoTimeMatch[2], 10) : 0;
    const modifier = (indoTimeMatch[3] || '').toLowerCase();

    if (modifier === 'malam' && hour < 12) hour += 12;
    if (modifier === 'sore' && hour < 12 && hour !== 12) hour += 12;
    if (modifier === 'siang' && hour < 12 && hour < 11) hour += 12;
    if (modifier === 'pagi' && hour === 12) hour = 0;

    target.setHours(hour, minute, 0, 0);
    clean = clean.replace(indoTimeMatch[0], '');
  } else {
    // English time match: (\d{1,2})(?::(\d{2}))?\s*(am|pm)
    const engTimeMatch = clean.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (engTimeMatch) {
      hasSpecificTime = true;
      let hour = parseInt(engTimeMatch[1], 10);
      const minute = engTimeMatch[2] ? parseInt(engTimeMatch[2], 10) : 0;
      const ampm = engTimeMatch[3].toLowerCase();
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;

      target.setHours(hour, minute, 0, 0);
      clean = clean.replace(engTimeMatch[0], '');
    }
  }

  // If day was specified (e.g. "besok") but no time was specified, default to 08:00 morning
  if (hasSpecificDay && !hasSpecificTime) {
    target.setHours(8, 0, 0, 0);
  }

  // If time was specified but it's already in the past today, push to tomorrow
  if (!hasSpecificDay && hasSpecificTime && target.getTime() <= baseDate.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  // If neither day nor time found, default to +24 hours
  if (!hasSpecificDay && !hasSpecificTime) {
    target = new Date(baseDate.getTime() + 24 * 3600 * 1000);
  }

  // Clean payload text
  const payload = clean
    .replace(/^(?:ingetin|ingatkan|remind\s*me\s*to|remind\s*me|buat|untuk)\s+/gi, '')
    .replace(/\s+(?:ingetin|ingatkan|remind\s*me\s*to|remind\s*me|buat|untuk)\s+/gi, ' ')
    .trim() || input.trim();

  return {
    triggerTime: target.toISOString(),
    payload,
  };
}
