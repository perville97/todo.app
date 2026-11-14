import { describe, expect, it } from 'vitest';
import { validateDeadline, validateTitle, summarize } from '../src/rules.js';
import { generatePairwise, assertPairwiseComplete } from './support/pairwise.js';

const MAX_TITLE = 120;
const factors = {
  titleClass: ['empty', 'spaces', 'one', 'max', 'over', 'notString'],
  deadlineClass: ['absent', 'valid', 'firstOfMonth', 'lastMonth', 'yearOne', 'leap', 'nonLeapLeapDay', 'impossibleDay', 'badFormat', 'badSuffix', 'dayZero', 'monthThirteen', 'yearZero', 'centuryLeap', 'centuryNonLeap', 'notString'],
  oracle: ['validation', 'summary'],
  taskClass: ['oneDone', 'mostlyDone', 'allDone'],
};
const cases = generatePairwise(factors);
assertPairwiseComplete(cases, factors);
const titles = {
  empty: '', spaces: '   ', one: 'x', max: 't'.repeat(MAX_TITLE), over: 't'.repeat(MAX_TITLE + 1),
  notString: { trim: () => 'objet accepté à tort' },
};
const deadlines = {
  absent: ['', null], valid: ['2032-01-15', '2032-01-15'], firstOfMonth: ['2032-01-01', '2032-01-01'],
  lastMonth: ['2032-12-15', '2032-12-15'], yearOne: ['0001-01-01', '0001-01-01'], leap: ['2024-02-29', '2024-02-29'],
  nonLeapLeapDay: ['2023-02-29', '2032-02-29'], impossibleDay: ['2024-04-31', '2032-04-31'],
  badFormat: ['15/01/2032', '2032-01-15'], badSuffix: ['2032-01-15suffix', '2032-01-15'],
  dayZero: ['2032-01-00', '2032-01-01'],
  monthThirteen: ['2032-13-01', '2032-01-01'], yearZero: ['0000-01-01', '2000-01-01'],
  centuryLeap: ['2000-02-29', '2000-02-29'], centuryNonLeap: ['1900-02-29', '2000-02-28'],
  notString: [{ toString: () => '2032-01-15', split: (separator) => '2032-01-15'.split(separator) }, '2032-01-15'],
};
const validDeadlineClasses = new Set(['absent', 'valid', 'firstOfMonth', 'lastMonth', 'yearOne', 'leap', 'centuryLeap']);
const taskShapes = { oneDone: [true, false], mostlyDone: [true, false, false, false], allDone: [true, true] };

const titleIsValid = (value) => typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= MAX_TITLE;

describe('oracles de référence générés par pairwise', () => {
  it.each(cases)('$oracle: titre $titleClass × échéance $deadlineClass × forme $taskClass', ({ titleClass, deadlineClass, oracle, taskClass }) => {
    if (oracle === 'validation') {
      const title = titles[titleClass];
      const [deadline, normalizedDeadline] = deadlines[deadlineClass];
      if (titleIsValid(title)) expect(validateTitle(title)).toBe(title.trim());
      else if (titleClass === 'notString') expect(() => validateTitle(title)).toThrow(/chaîne/i);
      else expect(() => validateTitle(title)).toThrow();
      if (titleClass === 'over') expect(() => validateTitle(title)).toThrow(/120/);
      if (validDeadlineClasses.has(deadlineClass)) {
        expect(validateDeadline(deadline)).toBe(normalizedDeadline || null);
      } else expect(() => validateDeadline(deadline)).toThrow();
      return;
    }
    const tasks = taskShapes[taskClass].map((done) => ({ done }));
    const completed = tasks.filter((task) => task.done).length;
    const total = tasks.length;
    expect(summarize(tasks)).toEqual({
      remaining: total - completed,
      total,
      completed,
      percent: Math.round(completed / total * 100),
    });
  });
});
