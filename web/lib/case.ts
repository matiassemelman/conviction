import type { Relation } from './assessment.ts';
export type Source = {
  id: string;
  title: string;
  text: string;
  attribution: string;
};
export type Assumption = {
  id: string;
  title: string;
  claim: string;
  questions: Record<Relation, string>;
};
export const assumptions: Assumption[] = [
  {
    id: 'payments',
    title: 'Customers are paying',
    claim:
      'As of September 15, 2026, Northstar has received product payments from at least three customers.',
    questions: {
      supports:
        'Can we reconcile the reported payments with processor or bank records?',
      contradicts:
        'What needs to happen for a pilot to become a paying customer?',
      mixed:
        'What do payment records show as of September 15, 2026, and why do the sources disagree?',
      insufficient:
        'Has any customer actually paid, and what records show the payment?',
    },
  },
  {
    id: 'retention',
    title: 'Usage becomes a weekly habit',
    claim:
      'All three Northstar pilot teams used the product every week during the six weeks ending September 15, 2026.',
    questions: {
      supports:
        'What did those teams do each week, and can we inspect the underlying activity logs?',
      contradicts:
        'Which teams stopped using the product, and what got in their way?',
      mixed: 'Can we reconcile the different accounts of weekly pilot usage?',
      insufficient:
        'Did each pilot team use the product every week, beyond onboarding?',
    },
  },
  {
    id: 'acquisition',
    title: 'Acquisition extends beyond the founder',
    claim:
      'As of September 15, 2026, Northstar has acquired customers through a repeatable channel other than founder introductions.',
    questions: {
      supports:
        'Can the team repeat that channel with a new cohort and comparable effort?',
      contradicts:
        'Which non-founder channel will the team test next, and how will they judge it?',
      mixed:
        'Which acquisition sources are repeatable, and which still depend on the founder?',
      insufficient:
        'What evidence shows a repeatable acquisition channel beyond founder introductions?',
    },
  },
];
export const baseSources: Source[] = [
  {
    id: 'founder',
    title: 'Founder update',
    attribution: 'Fictional founder memo · September 15, 2026',
    text: 'As of September 15, 2026, Northstar has received product payments from three customers: Atlas, Beacon and Cobalt. All three are in our logistics workflow pilot.',
  },
  {
    id: 'finance',
    title: 'Finance note',
    attribution: 'Fictional finance memo · September 15, 2026',
    text: 'As of September 15, 2026, Atlas, Beacon and Cobalt are all on free pilots. Northstar has received no product payments from any customer. The payment claim in the founder update is incorrect.',
  },
  {
    id: 'interviews',
    title: 'Pilot debrief',
    attribution: 'Fictional interview notes · September 15, 2026',
    text: 'Atlas and Beacon asked for a shared dispatch dashboard. Weekly product usage has not been measured. All customers came through founder introductions; no other acquisition channel has produced a customer as of September 15, 2026.',
  },
];
export const sampleNote =
  'Activity-log review for the six weeks ending September 15, 2026: Atlas, Beacon and Cobalt each used Northstar every week during that period. Each team created and completed dispatch workflows every week. This is a fictional analyst summary; the raw logs are not attached.';
