import { json, safeJson } from './_lib/http.mjs';
import { verifyPassword, issueToken } from './_lib/auth.mjs';

export default async req => {
  if (req.method !== 'POST') return json({ message: 'طريقة الطلب غير مسموحة.' }, 405);
  try {
    const { password } = await safeJson(req);
    if (!verifyPassword(password)) return json({ message: 'الرقم السري غير صحيح.' }, 401);
    return json({ token: issueToken() });
  } catch (error) {
    console.error('login error', error);
    if (error.message === 'ADMIN_PASSWORD_NOT_CONFIGURED') return json({ message: 'لم يتم ضبط الرقم السري في إعدادات Netlify.' }, 500);
    return json({ message: 'تعذر تسجيل الدخول.' }, 500);
  }
};
export const config = { path: '/api/admin/login' };
