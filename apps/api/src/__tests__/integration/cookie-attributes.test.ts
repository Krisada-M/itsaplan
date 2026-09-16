import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '#tests/helpers/app';
import { resetDb } from '#tests/helpers/db';

const crossSite = process.env.COOKIE_SAME_SITE === 'none';
const isChild = process.env.COOKIE_ATTRIBUTES_CHILD === 'true';
const sameSite = crossSite ? 'None' : 'Lax';

describe('auth cookie attributes', () => {
  beforeEach(resetDb);

  it(`sets SameSite=${sameSite} on the session cookie`, async () => {
    if (!isChild) {
      const child = Bun.spawn({
        cmd: ['bun', 'test', '--env-file=../../.env.test', import.meta.path],
        env: {
          ...process.env,
          COOKIE_SAME_SITE: 'none',
          COOKIE_ATTRIBUTES_CHILD: 'true',
        },
      });
      expect(await child.exited).toBe(0);
    }

    const response = await app.handle(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: `cookie-${crypto.randomUUID()}@example.com`,
          password: 'test-password-123',
          name: 'Cookie Test User',
        }),
      }),
    );

    expect(response.status).toBe(200);

    const sessionCookie = response.headers
      .getSetCookie()
      .find((cookie) => /^(?:__Secure-)?better-auth\.session_token=/.test(cookie));
    if (!sessionCookie) throw new Error('sign-up response did not set a session cookie');

    expect(sessionCookie).toContain(`SameSite=${sameSite}`);
    if (crossSite) {
      expect(sessionCookie).toMatch(/(?:^|;)\s*Secure(?:;|$)/i);
      expect(sessionCookie).not.toMatch(/(?:^|;)\s*Domain=/i);
    }
  });
});
