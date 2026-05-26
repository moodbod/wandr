import type { MutationCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';

export type AdminAuditAction =
  | 'role.update'
  | 'content.create'
  | 'content.update'
  | 'content.status'
  | 'content.migrate'
  | 'request.status'
  | 'photo.status';

export type AdminAuditTargetKind =
  | 'user'
  | 'location'
  | 'experience'
  | 'stay'
  | 'booking'
  | 'reservation'
  | 'photo'
  | 'catalog';

export type AdminAuditActor = {
  name?: string | null;
  slug: string;
  userId: Id<'users'>;
};

export async function recordAdminAuditEvent(
  ctx: MutationCtx,
  args: {
    action: AdminAuditAction;
    actor: AdminAuditActor;
    summary: string;
    targetId: string;
    targetKind: AdminAuditTargetKind;
    targetLabel?: string | null;
  }
) {
  return await ctx.db.insert('adminAuditEvents', {
    actorName: args.actor.name ?? undefined,
    actorSlug: args.actor.slug,
    actorUserId: args.actor.userId,
    action: args.action,
    targetId: args.targetId,
    targetKind: args.targetKind,
    targetLabel: args.targetLabel ?? undefined,
    summary: args.summary,
    createdAt: Date.now(),
  });
}
