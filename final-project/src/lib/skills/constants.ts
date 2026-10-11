export interface SkillMeta {
  name: string;
  aliases?: string[];
  description: string;
  example: string;
}

export const SKILL_LIST: SkillMeta[] = [
  {
    name: '/info',
    aliases: ['/config'],
    description: 'Displays the cheat sheet of all available skills, active AI model, and parameters.',
    example: '/info or /info expense',
  },
  {
    name: '/send-email',
    description: 'Summarize data and email it to the registered user address.',
    example: '/send-email summarize what I did on 9 October 2026',
  },
  {
    name: '/email-reminder',
    description: 'Schedule an email reminder sent to your registered Gmail address.',
    example: '/email-reminder besok jam 6 pagi ingetin buat release patch167',
  },
  {
    name: '/today',
    description: "Today's summary: active todos, deadlines, and today's expenses.",
    example: '/today',
  },
  {
    name: '/deadline',
    description: 'Shows nearest deadlines within the specified days (default 7 days).',
    example: '/deadline 7 days',
  },
  {
    name: '/recap',
    description: 'Generates a recap of a past period (e.g. yesterday, last week).',
    example: '/recap yesterday',
  },
  {
    name: '/daily-briefing',
    description: "Delivers today's briefing with agenda, priority todos, and pending bills.",
    example: '/daily-briefing',
  },
  {
    name: '/todo',
    description: 'Explicitly add or manage a task.',
    example: '/todo finish proposal revision',
  },
  {
    name: '/grocery',
    description: 'Manage shopping list items (add or view).',
    example: '/grocery add eggs, milk',
  },
  {
    name: '/expense',
    description: 'Log an expense and view totals.',
    example: '/expense lunch 45k',
  },
  {
    name: '/export-expenses',
    description: 'Compile expenses into CSV format for spreadsheets.',
    example: '/export-expenses this month',
  },
  {
    name: '/note',
    description: 'Save a free-form knowledge note with tags.',
    example: '/note SaaS idea: invoice aggregator for SMEs',
  },
  {
    name: '/web-clipper',
    aliases: ['/link'],
    description: 'Save a web link with title and summary.',
    example: '/link https://news.ycombinator.com',
  },
  {
    name: '/plan',
    description: 'Break a long-term goal into milestone steps and target dates.',
    example: '/plan year-end savings target',
  },
  {
    name: '/remind',
    description: 'Set an in-app reminder (no email).',
    example: '/remind check milk stock',
  },
  {
    name: '/review',
    aliases: ['/weekly-report'],
    description: "Weekly report: tasks done vs pending, total spending, and next week's focus.",
    example: '/review this week',
  },
  {
    name: '/search',
    description: 'Hybrid search across all notes using semantic vector search and keywords.',
    example: '/search property tax',
  },
  {
    name: '/undo',
    description: 'Undo the last action taken in the database.',
    example: '/undo',
  },
  {
    name: '/backup',
    description: 'Email full JSON backup file to your registered Google email address now.',
    example: '/backup',
  },
];
