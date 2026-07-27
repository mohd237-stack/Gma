import { json, safeJson } from './_lib/http.mjs';
import { requireAdmin } from './_lib/auth.mjs';
import { store, readPrefix } from './_lib/data.mjs';
import crypto from 'node:crypto';

function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

export default async req => {
  if (req.method !== 'POST') return json({ message: 'طريقة الطلب غير مسموحة.' }, 405);
  try {
    if (!requireAdmin(req)) return json({ message: 'غير مصرح.' }, 401);
    const data = await safeJson(req); const s = store();
    if (data.action === 'setOpen') {
      await s.setJSON('settings/main', { open: Boolean(data.open), updatedAt: new Date().toISOString() });
      return json({ ok: true });
    }
    if (data.action === 'resetWinners') {
      const { blobs } = await s.list({ prefix: 'winners/' });
      await Promise.all(blobs.map(({ key }) => s.delete(key)));
      return json({ ok: true });
    }
    if (data.action === 'deleteParticipant') {
      const id = String(data.id || '');
      if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ message: 'معرف المشاركة غير صحيح.' }, 400);
      const participant = await s.get(`submissions/${id}`, { type: 'json', consistency: 'strong' });
      if (!participant) return json({ message: 'المشاركة غير موجودة.' }, 404);
      await Promise.all([
        s.delete(`submissions/${id}`),
        s.delete(`duplicates/${hash(`${participant.fullName.toLowerCase()}|${participant.phone}`)}`)
      ]);
      const winners = await readPrefix('winners/');
      await Promise.all(winners.filter(w => w.participantId === id).map(w => s.delete(`winners/${w.id}`)));
      return json({ ok: true });
    }
    return json({ message: 'الإجراء غير معروف.' }, 400);
  } catch (error) {
    console.error('admin action error', error);
    return json({ message: 'تعذر تنفيذ الإجراء.' }, 500);
  }
};
export const config = { path: '/api/admin/action' };
