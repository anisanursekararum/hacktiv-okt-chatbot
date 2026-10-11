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

  // 2. Check Specific Time
  // Supports:
  // - "jam 7.30 PM", "jam 7:30 AM", "jam 7 PM", "jam 7 malam", "jam 19:30", "jam 19.30", "jam 6 pagi"
  // - "7.30 PM", "7:30 PM", "7pm", "7am", "19:30", "19.30"
  let hasSpecificTime = false;
  const timeRegex = /(?:jam\s*)?(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|pagi|siang|sore|malam)?\b/i;
  const timeMatch = clean.match(timeRegex);

  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const modifier = (timeMatch[3] || '').toLowerCase();

    // Check if valid time
    if (hour >= 0 && hour <= 24 && minute >= 0 && minute < 60) {
      hasSpecificTime = true;

      if ((modifier === 'pm' || modifier === 'malam' || modifier === 'sore') && hour < 12) {
        hour += 12;
      } else if ((modifier === 'am' || modifier === 'pagi') && hour === 12) {
        hour = 0;
      } else if (modifier === 'siang' && hour < 12 && hour < 11) {
        hour += 12;
      }

      target.setHours(hour, minute, 0, 0);
      clean = clean.replace(timeMatch[0], '');
    }
  }

  // If day was specified (e.g. "besok") but no time was specified, default to 08:00 morning
  if (hasSpecificDay && !hasSpecificTime) {
    target.setHours(8, 0, 0, 0);
  }

  // If time was specified without a specific day, and it has already passed today, push to tomorrow
  if (!hasSpecificDay && hasSpecificTime && target.getTime() <= baseDate.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  // If neither day nor time found, default to +24 hours
  if (!hasSpecificDay && !hasSpecificTime) {
    target = new Date(baseDate.getTime() + 24 * 3600 * 1000);
  }

  // Clean payload text
  let payload = clean
    .replace(/\b(?:hari ini|today|besok|tomorrow|lusa)\b/gi, '')
    .trim();

  // Strip leading prefixes like "ingetin buat", "ingatkan untuk", "remind me to", etc.
  let prev = '';
  while (prev !== payload) {
    prev = payload;
    payload = payload
      .replace(/^(?:ingetin|ingatkan|remind\s*me\s*to|remind\s*me|buat|untuk|to|pm|am|pagi|siang|sore|malam)\s+/gi, '')
      .trim();
  }

  return {
    triggerTime: target.toISOString(),
    payload: payload || input.trim(),
  };
}
