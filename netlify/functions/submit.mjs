import crypto from 'node:crypto';
import { json, safeJson } from './_lib/http.mjs';
import { store, getSettings } from './_lib/data.mjs';

const answerKey = [2, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0];
const categories = new Set(['men', 'women', 'children']);

function cleanName(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100); }
function cleanPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('966')) digits = `0${digits.slice(3)}`;
  if (digits.startsWith('5') && digits.length === 9) digits = `0${digits}`;
  return digits;
}
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }

export default async req => {
  if (req.method !== 'POST') return json({ message: 'طريقة الطلب غير مسموحة.' }, 405);
  try {
    const settings = await getSettings();
    if (!settings.open) return json({ message: 'تم إغلاق استقبال المشاركات حاليًا.' }, 403);

    const data = await safeJson(req);
    if (data.website) return json({ ok: true });
    const fullName = cleanName(data.fullName);
    const phone = cleanPhone(data.phone);
    const category = String(data.category || '');
    const answers = Array.isArray(data.answers) ? data.answers.map(Number) : [];

    if (fullName.split(' ').filter(Boolean).length < 4) return json({ message: 'الاسم الرباعي غير مكتمل.' }, 400);
    if (!categories.has(category)) return json({ message: 'فئة المشارك غير صحيحة.' }, 400);
    if (!/^05\d{8}$/.test(phone)) return json({ message: 'رقم الجوال غير صحيح.' }, 400);
    if (answers.length !== answerKey.length || answers.some(a => ![0,1,2].includes(a))) return json({ message: 'يلزم الإجابة عن جميع الأسئلة.' }, 400);

    const s = store();
    const duplicateKey = `duplicates/${hash(`${fullName.toLowerCase()}|${phone}`)}`;
    const duplicate = await s.setJSON(duplicateKey, { createdAt: new Date().toISOString() }, { onlyIfNew: true });
    if (!duplicate.modified) return json({ message: 'سبق تسجيل مشاركة بهذا الاسم ورقم الجوال.' }, 409);

    const score = answers.reduce((sum, answer, i) => sum + (answer === answerKey[i] ? 1 : 0), 0);
    const id = crypto.randomUUID();
    const submission = {
      id, fullName, phone, category, answers, score,
      totalQuestions: answerKey.length,
      createdAt: new Date().toISOString()
    };
    try {
      await s.setJSON(`submissions/${id}`, submission, { onlyIfNew: true });
    } catch (error) {
      await s.delete(duplicateKey).catch(() => {});
      throw error;
    }
    return json({ ok: true }, 201);
  } catch (error) {
    console.error('submit error', error);
    if (error.message === 'INVALID_CONTENT_TYPE') return json({ message: 'صيغة الطلب غير صحيحة.' }, 400);
    return json({ message: 'تعذر حفظ المشاركة الآن. حاول مرة أخرى بعد قليل.' }, 500);
  }
};

export const config = { path: '/api/submit' };
