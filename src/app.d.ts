import type { PublicUser } from '$lib/server/auth';

declare global {
  namespace App {
    interface Locals {
      user: PublicUser | null;
      /** Id of the current web session, to mark it in the session list. */
      sessionId: string | null;
    }
    interface Error {
      message: string;
    }
  }
}

export {};
