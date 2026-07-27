import { getStore } from '@netlify/blobs';

export const STORE_NAME = 'qama-cultural-competition';
export const store = () => getStore({ name: STORE_NAME, consistency: 'strong' });

export async function readPrefix(prefix) {
  const s = store();
  const { blobs } = await s.list({ prefix });
  const values = await Promise.all(blobs.map(async ({ key }) => {
    try { return await s.get(key, { type: 'json', consistency: 'strong' }); }
    catch { return null; }
  }));
  return values.filter(Boolean);
}

export async function getSettings() {
  const value = await store().get('settings/main', { type: 'json', consistency: 'strong' });
  return value || { open: true };
}
