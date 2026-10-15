import { NextResponse } from 'next/server';
import { checkCredentials, createSessionToken, getAuthConfig, SESSION_COOKIE, SESSION_MAX_AGE } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'local';
}

function isHttps(request: Request) {
  return new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
}

export async function POST(request: Request) {
  const config = getAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'Login belum dikonfigurasi di server. Isi CINEBOX_USERNAME, CINEBOX_PASSWORD, dan CINEBOX_AUTH_SECRET.' },
      { status: 503 }
    );
  }

  const key = clientKey(request);
  const now = Date.now();
  const entry = failures.get(key);
  if (entry && entry.resetAt <= now) failures.delete(key);
  const current = failures.get(key);
  if (current && current.count >= MAX_FAILURES) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retryAfter / 60)} menit.` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  let username = '';
  let password = '';
  try {
    const body = await request.json();
    username = typeof body?.username === 'string' ? body.username.trim().slice(0, 200) : '';
    password = typeof body?.password === 'string' ? body.password.slice(0, 500) : '';
  } catch {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  if (!(await checkCredentials(config, username, password))) {
    const next = failures.get(key) || { count: 0, resetAt: now + WINDOW_MS };
    next.count += 1;
    failures.set(key, next);
    await new Promise(resolve => setTimeout(resolve, 400));
    return NextResponse.json({ error: 'Nama pengguna atau kata sandi salah.' }, { status: 401 });
  }

  failures.delete(key);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(config), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttps(request),
    path: '/',
    maxAge: SESSION_MAX_AGE
  });
  return response;
}
