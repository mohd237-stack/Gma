import crypto from 'node:crypto';
import { json, safeJson } from './_lib/http.mjs';
import { requireAdmin } from './_lib/auth.mjs';
import { readPrefix, store } from './_lib/data.mjs';

export default async req => {
  if (req.method !== 'POST') return json({ message: 'طريقة الطلب غير مسموحة.' }, 405);
  try {
    if (!requireAdmin(req)) return json({ message: 'غير مصرح.' }, 401);
    const { pool = 'perfect', category = 'all' } = await safeJson(req);
    const [participants, winners] = await Promise.all([readPrefix('submissions/'), readPrefix('winners/')]);
    const wonIds = new Set(winners.map(w => w.participantId));
    const eligible = participants.filter(p => !wonIds.has(p.id) && (pool === 'all' || p.score === p.totalQuestions) && (category === 'all' || p.category === category));
    if (!eligible.length) return json({ message: 'لا يوجد مشاركون مؤهلون متبقون وفق خيارات السحب.' }, 404);

    const winner = eligible[crypto.randomInt(eligible.length)];
    const record = {
      id: crypto.randomUUID(), participantId: winner.id, fullName: winner.fullName,
      phone: winner.phone, category: winner.category, score: winner.score,
      totalQuestions: winner.totalQuestions, pool, drawnAt: new Date().toISOString()
    };
    await store().setJSON(`winners/${record.id}`, record, { onlyIfNew: true });
    return json({ winner: record });
  } catch (error) {
    console.error('draw error', error);
    if (error.message === 'INVALID_CONTENT_TYPE') return json({ message: 'صيغة الطلب غير صحيحة.' }, 400);
    return json({ message: 'تعذر تنفيذ السحب.' }, 500);
  }
};
export const config = { path: '/api/admin/draw' };
