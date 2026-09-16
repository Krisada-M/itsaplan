import { beforeEach, describe, expect, it } from 'bun:test';
import { apiKeyApi, authedApi, type Api } from '#tests/helpers/app';
import { signUpTestUser } from '#tests/helpers/auth';
import { resetDb } from '#tests/helpers/db';
import { createAgent } from '#tests/helpers/agents';

async function setup() {
  const owner = await signUpTestUser();
  const asOwner = authedApi(owner.cookie);
  await asOwner.projects.post({ key: 'MKT', name: 'Marketing' });
  const project = (await asOwner.projects({ projectKey: 'MKT' }).get()).data!;
  const completedColumnId = project.columns.find((column) => column.stateType === 'completed')!.id;
  return { asOwner, columnId: project.columns[0].id, completedColumnId };
}

async function externalAgentApi(asOwner: Api) {
  const created = await createAgent(asOwner, 'MKT', {
    name: 'Planner Bot',
    username: 'planner-bot',
    kind: 'external',
  });
  return apiKeyApi(created.data!.apiKey!);
}

async function createIssue(client: Api, columnId: number) {
  return (await client.projects({ projectKey: 'MKT' }).issues.post({ columnId, title: 'Task' }))
    .data!;
}

describe('human review gate', () => {
  beforeEach(async () => {
    await resetDb();
  });

  it('rejects an agent moving an issue to Done when review is required', async () => {
    const { asOwner, columnId, completedColumnId } = await setup();
    await asOwner.projects({ projectKey: 'MKT' }).settings['review-gate'].patch({
      requiresHumanReview: true,
    });
    const issue = await createIssue(asOwner, columnId);
    const asAgent = await externalAgentApi(asOwner);

    const result = await asAgent
      .issues({ issueId: issue.id })
      .patch({ columnId: completedColumnId });

    expect(result.status).toBe(403);
    expect(result.error?.value).toMatchObject({ code: 'human_review_required' });
  });

  it('allows a person to move an issue to Done when review is required', async () => {
    const { asOwner, columnId, completedColumnId } = await setup();
    await asOwner.projects({ projectKey: 'MKT' }).settings['review-gate'].patch({
      requiresHumanReview: true,
    });
    const issue = await createIssue(asOwner, columnId);

    const result = await asOwner
      .issues({ issueId: issue.id })
      .patch({ columnId: completedColumnId });

    expect(result.status).toBe(200);
    expect(result.data?.columnId).toBe(completedColumnId);
  });

  it('allows an agent to move an issue to Done by default', async () => {
    const { asOwner, columnId, completedColumnId } = await setup();
    const issue = await createIssue(asOwner, columnId);
    const asAgent = await externalAgentApi(asOwner);

    const result = await asAgent
      .issues({ issueId: issue.id })
      .patch({ columnId: completedColumnId });

    expect(result.status).toBe(200);
    expect(result.data?.columnId).toBe(completedColumnId);
  });
});
