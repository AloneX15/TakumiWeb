import { fail } from '@sveltejs/kit';
import type { InstanceRole } from '$lib/server/db/schema';
import { requireInstance } from '$lib/server/instances/access';
import {
  addMember,
  changeMemberRole,
  createInvite,
  listInvites,
  listMembers,
  removeMember,
  revokeInvite,
} from '$lib/server/instances/service';
import type { Actions, PageServerLoad } from './$types';

const ROLES: InstanceRole[] = ['owner', 'manager', 'member'];
const role = (value: FormDataEntryValue | null): InstanceRole =>
  ROLES.includes(value as InstanceRole) ? (value as InstanceRole) : 'member';
const optionalInt = (value: FormDataEntryValue | null) => {
  const text = String(value ?? '').trim();
  return text === '' || text === '0' ? null : Number(text);
};

export const load: PageServerLoad = async (event) => {
  const { instance, user } = await requireInstance(event, 'manager');
  const [members, invites] = await Promise.all([listMembers(instance.id), listInvites(instance.id)]);
  return { members, invites, me: user.id };
};

export const actions: Actions = {
  add: async (event) => {
    const { instance, user, role: actorRole } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    const result = await addMember(instance.id, { id: user.id, role: actorRole }, String(form.get('login') ?? ''), role(form.get('role')));
    if (!result.ok) return fail(400, { action: 'add', error: result.error });
    return { action: 'add', success: 'Miembro añadido.' };
  },

  role: async (event) => {
    const { instance, user, role: actorRole } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    const result = await changeMemberRole(instance.id, { id: user.id, role: actorRole }, String(form.get('userId') ?? ''), role(form.get('role')));
    if (!result.ok) return fail(400, { action: 'members', error: result.error });
    return { action: 'members', success: 'Rol cambiado.' };
  },

  remove: async (event) => {
    const { instance, user, role: actorRole } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    const result = await removeMember(instance.id, { id: user.id, role: actorRole }, String(form.get('userId') ?? ''));
    if (!result.ok) return fail(400, { action: 'members', error: result.error });
    return { action: 'members', success: 'Miembro expulsado. Ya no podrá descargar ni entrar.' };
  },

  invite: async (event) => {
    const { instance, user, role: actorRole } = await requireInstance(event, 'manager');
    const form = await event.request.formData();
    const result = await createInvite(instance.id, { id: user.id, role: actorRole }, {
      role: role(form.get('role')),
      maxUses: optionalInt(form.get('maxUses')),
      expiresInDays: optionalInt(form.get('expiresInDays')),
    });
    if (!result.ok) return fail(400, { action: 'invite', error: result.error });
    // The token is shown once; only its hash is stored.
    return { action: 'invite', link: `${event.url.origin}/i/${result.token}` };
  },

  revoke: async (event) => {
    const { instance, user } = await requireInstance(event, 'manager');
    await revokeInvite(instance.id, user.id, String((await event.request.formData()).get('id') ?? ''));
    return { action: 'invites', success: 'Invitación revocada.' };
  },
};
