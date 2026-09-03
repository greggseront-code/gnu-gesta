import { academicYearForDate, currentAcademicYear, isValidAcademicYear } from './academic-year';

test.each([
  ['2026-2027', true],
  ['2026-2028', false],
  ['2026/2027', false],
  ['26-27', false],
])('valide le format et les années consécutives de %s', (value, expected) => {
  expect(isValidAcademicYear(value)).toBe(expected);
});

test('academic year switches on September 15', () => {
  expect(academicYearForDate('2026-09-14')).toBe('2025-2026');
  expect(academicYearForDate('2026-09-15')).toBe('2026-2027');
  expect(currentAcademicYear(new Date(2026, 8, 15))).toBe('2026-2027');
});

test('refuse une date civile impossible', () => {
  expect(() => academicYearForDate('2026-02-30')).toThrow('Date invalide');
});
