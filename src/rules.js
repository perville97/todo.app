export const MAX_TITLE_LENGTH = 120;

export function validateTitle(value) {
  if (typeof value !== 'string') throw new TypeError('Le titre doit être une chaîne.');
  const title = value.trim();
  if (!title) throw new RangeError('Le titre est obligatoire.');
  if (title.length > MAX_TITLE_LENGTH) throw new RangeError(`Le titre ne peut pas dépasser ${MAX_TITLE_LENGTH} caractères.`);
  return title;
}

export function validateDeadline(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RangeError('L’échéance doit être une date valide au format AAAA-MM-JJ.');
  }
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
    throw new RangeError('L’échéance doit être une date réelle du calendrier grégorien.');
  }
  return value;
}

export function summarize(tasks) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.done).length;
  const remaining = total - completed;
  return { remaining, total, completed, percent: total ? Math.round((completed / total) * 100) : 0 };
}
