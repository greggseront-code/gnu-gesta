const ACADEMIC_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidAcademicYear(value: string): boolean {
  const match = ACADEMIC_YEAR_PATTERN.exec(value);
  return match !== null && Number(match[2]) === Number(match[1]) + 1;
}

function calendarParts(value: Date | string): { year: number; month: number; day: number } {
  if (typeof value !== 'string') {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Date invalide');
    }
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() };
  }

  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) {
    throw new Error('Date invalide');
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    normalized.getUTCFullYear() !== year
    || normalized.getUTCMonth() + 1 !== month
    || normalized.getUTCDate() !== day
  ) {
    throw new Error('Date invalide');
  }

  return { year, month, day };
}

export function academicYearForDate(value: Date | string): string {
  const { year, month, day } = calendarParts(value);
  const firstYear = month > 9 || (month === 9 && day >= 15) ? year : year - 1;
  return `${firstYear}-${firstYear + 1}`;
}

export function currentAcademicYear(now = new Date()): string {
  return academicYearForDate(now);
}
