import { importStudents } from './students.api';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('envoie le contrat annuel réel à POST /api/students/import', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ imported: 1, academic_year: '2026-2027' }), { status: 200 }),
  );
  const input = {
    academic_year: '2026-2027',
    students: [{ first_name: 'Alice', last_name: 'Dupont', email: 'alice@student.vinci.be' }],
  };

  await expect(importStudents(input)).resolves.toEqual({ imported: 1, academic_year: '2026-2027' });
  expect(fetch).toHaveBeenCalledWith('/api/students/import', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify(input),
  }));
});
