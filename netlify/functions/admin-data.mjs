import { json } from './_lib/http.mjs';
import { requireAdmin } from './_lib/auth.mjs';
import { readPrefix, getSettings } from './_lib/data.mjs';

export default async req => {
  if (req.method !== 'GET') return json({ message: 'طريقة الطلب غير مسموحة.' }, 405);
  try {
    if (!requireAdmin(req)) return json({ message: 'غير مصرح.' }, 401);
    const [participants, winners, settings] = await Promise.all([readPrefix('submissions/'), readPrefix('winners/'), getSettings()]);
    participants.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    winners.sort((a,b) => new Date(b.drawnAt) - new Date(a.drawnAt));
    return json({ participants, winners, settings });
  } catch (error) {
    console.error('admin data error', error);
    return json({ message: 'تعذر تحميل بيانات الإدارة.' }, 500);
  }
};
export const config = { path: '/api/admin/data' };
