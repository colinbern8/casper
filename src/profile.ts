/** Where someone usually works. Saved per account on this device; name and email come from sign-in. */
export interface Profile {
  school: string;
  room: string;
  phoneOrExt: string;
}

import { legacyProfileKey } from './legacyProfileKey';

const key = (email: string) => `casper.profile.v2.${email.toLowerCase()}`;

export function loadProfile(email: string): Profile | null {
  try {
    let raw = localStorage.getItem(key(email));
    if (!raw) {
      // One-time migration from the previous name's key; see legacyProfileKey.ts.
      raw = localStorage.getItem(legacyProfileKey(email));
      if (raw) localStorage.setItem(key(email), raw);
    }
    const p = raw ? (JSON.parse(raw) as Profile) : null;
    return p && p.school && p.room ? p : null;
  } catch {
    return null;
  }
}

export function saveProfile(email: string, profile: Profile) {
  try {
    localStorage.setItem(key(email), JSON.stringify(profile));
  } catch {
    // Private browsing or full storage: the app still works for this session.
  }
}
