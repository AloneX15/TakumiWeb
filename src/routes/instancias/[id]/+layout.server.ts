import { atLeast, requireInstance } from '$lib/server/instances/access';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
  const { instance, role, memberRole } = await requireInstance(event, 'member');
  return {
    instance: {
      id: instance.id,
      name: instance.name,
      description: instance.description,
      minecraftVersion: instance.minecraftVersion,
      loader: instance.loader,
      loaderVersion: instance.loaderVersion,
      serverAddress: instance.serverAddress,
      lockedDirs: instance.lockedDirs,
      currentVersion: instance.currentVersion,
      dirty: instance.dirty,
      quotaBytes: instance.quotaBytes,
      createdAt: instance.createdAt,
    },
    role,
    memberRole,
    canManage: atLeast(role, 'manager'),
    isOwner: role === 'owner',
  };
};
