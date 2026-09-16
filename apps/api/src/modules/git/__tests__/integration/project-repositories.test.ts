import { db, gitManagedRepository, gitProviderConnection } from '@repo/db';
import { beforeEach, describe, expect, it } from 'bun:test';
import { app } from '../../../../app';
import { authedApi } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';

describe('Project repositories', () => {
  beforeEach(resetDb);

  it('lists only non-secret repository fields for project members', async () => {
    const owner = await signUpTestUser({ name: 'Owner' });
    const asOwner = authedApi(owner.cookie);
    await asOwner.projects.post({ key: 'MKT', name: 'Marketing' });
    const project = await asOwner.projects({ projectKey: 'MKT' }).get();
    const [connection] = await db
      .insert(gitProviderConnection)
      .values({
        projectId: project.data!.project.id,
        provider: 'github',
        baseUrl: 'https://github.com',
        accountLogin: 'owner',
        ciphertext: 'ciphertext',
        iv: 'iv',
        authTag: 'auth-tag',
      })
      .returning();
    const [repository] = await db
      .insert(gitManagedRepository)
      .values({
        connectionId: connection!.id,
        externalId: '123',
        fullName: 'owner/repository',
        webUrl: 'https://github.com/owner/repository',
        webhookExternalId: '456',
      })
      .returning();

    const response = await app.handle(
      new Request('http://localhost/projects/MKT/repositories', {
        headers: { cookie: owner.cookie },
      }),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as Array<{
      id: number;
      provider: string;
      fullName: string;
      webUrl: string;
      status: string;
    }>;
    expect(body).toEqual([
      {
        id: repository!.id,
        provider: 'github',
        fullName: 'owner/repository',
        webUrl: 'https://github.com/owner/repository',
        status: 'connected',
      },
    ]);
    expect(Object.keys(body[0]!).sort()).toEqual([
      'fullName',
      'id',
      'provider',
      'status',
      'webUrl',
    ]);
  });

  it('refuses users outside the project', async () => {
    const owner = await signUpTestUser({ name: 'Owner' });
    const outsider = await signUpTestUser({ name: 'Outsider' });
    await app.handle(
      new Request('http://localhost/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json', cookie: owner.cookie },
        body: JSON.stringify({ key: 'MKT', name: 'Marketing' }),
      }),
    );

    const response = await app.handle(
      new Request('http://localhost/projects/MKT/repositories', {
        headers: { cookie: outsider.cookie },
      }),
    );

    expect(response.status).toBe(403);
  });
});
