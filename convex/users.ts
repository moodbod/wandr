import { v } from 'convex/values';

import { internalMutation } from './_generated/server';

const userRoleValidator = v.union(v.literal('traveler'), v.literal('serviceProvider'), v.literal('admin'));

export const setRole = internalMutation({
  args: {
    role: userRoleValidator,
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error('User not found.');
    }

    await ctx.db.patch(args.userId, { role: args.role });

    return {
      email: user.email ?? null,
      name: user.name ?? null,
      role: args.role,
      slug: user.slug ?? null,
      userId: args.userId,
    };
  },
});
