import { createMockDb } from '../mockDb.js';

describe('mockDb queue mechanism', () => {
  it('returns queued values in order for .first()', async () => {
    const mockDb = createMockDb();

    mockDb._queueFirstResult(null);
    mockDb._queueFirstResult({ id: 'test' });

    const result1 = await mockDb().where('id', '1').first();
    const result2 = await mockDb().where('id', '2').first();

    expect(result1).toBe(null);
    expect(result2).toEqual({ id: 'test' });
  });

  it('falls back to global value when queue is empty', async () => {
    const mockDb = createMockDb();

    mockDb._setFirstResult({ id: 'global' });
    mockDb._queueFirstResult({ id: 'queued' });

    const result1 = await mockDb().where('id', '1').first();
    const result2 = await mockDb().where('id', '2').first();

    expect(result1).toEqual({ id: 'queued' });
    expect(result2).toEqual({ id: 'global' }); // Falls back after queue empty
  });
});
