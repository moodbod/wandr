import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import schema from '../../convex/schema';

const modules = (import.meta as ImportMeta & {
  glob: (pattern: string) => Record<string, () => Promise<unknown>>;
}).glob('../../convex/**/*.*s');

function createTest() {
  return convexTest({ schema, modules });
}

type TestBackend = ReturnType<typeof createTest>;

async function seedUser(t: TestBackend, slug: string, role: 'traveler' | 'admin' = 'traveler') {
  const userId = await t.run(async (ctx) =>
    ctx.db.insert('users', {
      slug,
      name: slug,
      email: `${slug}@example.com`,
      role,
      countryCode: 'NA',
      countryLabel: 'Namibia',
      onboardingCompletedAt: Date.now(),
    })
  );

  return {
    userId,
    client: t.withIdentity({
      subject: `${userId}|session-${slug}`,
      tokenIdentifier: `test|${slug}`,
    }),
  };
}

describe('support chat APIs', () => {
  it('lets a traveler message support and any admin reply', async () => {
    const t = createTest();
    const traveler = await seedUser(t, 'traveler');
    const adminA = await seedUser(t, 'admin-a', 'admin');
    const adminB = await seedUser(t, 'admin-b', 'admin');

    const sent = await traveler.client.mutation(api.support.sendSupportMessage, {
      travelerSlug: 'traveler',
      body: 'I need help with my booking.',
    });
    expect(sent?.threadId).toBeTruthy();

    const adminList = await adminA.client.query(api.support.getSupportChatList, {
      travelerSlug: 'admin-a',
    });
    expect(adminList.isAdmin).toBe(true);
    expect(adminList.adminThreads.map((thread: any) => thread.threadId)).toContain(sent?.threadId);

    await adminB.client.mutation(api.support.sendSupportMessage, {
      travelerSlug: 'admin-b',
      threadId: sent?.threadId as Id<'supportThreads'>,
      body: 'We can help with that.',
    });

    const travelerChat = await traveler.client.query(api.support.getSupportChat, {
      travelerSlug: 'traveler',
    });
    expect(travelerChat?.threadId).toBe(sent?.threadId);
    expect(travelerChat?.messages.map((message) => message.body)).toEqual([
      'I need help with my booking.',
      'We can help with that.',
    ]);
    expect(travelerChat?.messages[1]).toMatchObject({
      senderRole: 'admin',
      senderSlug: 'admin-b',
    });
  });

  it('blocks another traveler from reading or writing a support thread', async () => {
    const t = createTest();
    const owner = await seedUser(t, 'owner');
    const other = await seedUser(t, 'other');

    const sent = await owner.client.mutation(api.support.sendSupportMessage, {
      travelerSlug: 'owner',
      body: 'Private support question.',
    });
    expect(sent?.threadId).toBeTruthy();

    const otherRead = await other.client.query(api.support.getSupportChat, {
      travelerSlug: 'other',
      threadId: sent?.threadId as Id<'supportThreads'>,
    });
    expect(otherRead).toBeNull();

    const otherWrite = await other.client.mutation(api.support.sendSupportMessage, {
      travelerSlug: 'other',
      threadId: sent?.threadId as Id<'supportThreads'>,
      body: 'Trying to join this thread.',
    });
    expect(otherWrite).toBeNull();
  });
});
