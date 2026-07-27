export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...extraHeaders
    }
  });
}

export function methodNotAllowed() { return json({ message: 'طريقة الطلب غير مسموحة.' }, 405, { Allow: 'POST' }); }

export async function safeJson(req) {
  const type = req.headers.get('content-type') || '';
  if (!type.includes('application/json')) throw new Error('INVALID_CONTENT_TYPE');
  return req.json();
}
