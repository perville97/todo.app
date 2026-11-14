import { describe, expect, it } from 'vitest';
import { validateDeadline, validateTitle, summarize } from '../src/rules.js';
import { generatePairwise, assertPairwiseComplete } from './support/pairwise.js';

const MAX_TITLE = 120;
const factors = {
  titleClass: ['empty', 'spaces', 'one', 'max', 'over'],
  deadlineClass: ['absent', 'valid', 'leap', 'nonLeapLeapDay', 'impossibleDay', 'badFormat'],
};
const cases = generatePairwise(factors);
assertPairwiseComplete(cases, factors);
const titles = {
  empty: '', spaces: '   ', one: 'x', max: 't'.repeat(MAX_TITLE), over: 't'.repeat(MAX_TITLE + 1),
};
const deadlines = {
  absent: ['', null], valid: ['2032-01-15', '2032-01-15'], leap: ['2024-02-29', '2024-02-29'],
  nonLeapLeapDay: ['2023-02-29', '2032-02-29'], impossibleDay: ['2024-04-31', '2032-04-31'],
  badFormat: ['15/01/2032', '2032-01-15'],
};

const titleIsValid = (value) => value.trim().length >= 1 && value.trim().length <= MAX_TITLE;
const dateIsValid = (value) => value === '' || value === null || /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

describe('oracles de référence générés par pairwise', () => {
  it.each(cases)('titre $titleClass × échéance $deadlineClass', ({ titleClass, deadlineClass }) => {
    const title = titles[titleClass];
    const [deadline] = deadlines[deadlineClass];
    if (titleIsValid(title)) expect(validateTitle(title)).toBe(title.trim());
    else expect(() => validateTitle(title)).toThrow();
    if (dateIsValid(deadline)) {
      const [, normalized] = deadlines[deadlineClass];
      expect(validateDeadline(deadline)).toBe(normalized || null);
    } else expect(() => validateDeadline(deadline)).toThrow();
  });

  it('calcule les compteurs et la progression selon la spécification', () => {
    const summary = summarize([
      { done: false }, { done: true }, { done: false }, { done: true },
    ]);
    expect(summary).toEqual({ remaining: 2, total: 4, completed: 2, percent: 50 });
    expect(summarize([])).toEqual({ remaining: 0, total: 0, completed: 0, percent: 0 });
  });
});
