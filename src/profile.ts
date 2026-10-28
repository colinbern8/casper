/** Where someone usually works. Saved per account on this device; name and email come from sign-in. */
export interface Profile {
  school: string;
  room: string;
  phoneOrExt: string;
}

const key = (email: string) => `greg.profile.v2.${email.toLowerCase()}`;

export function loadProfile(email: string): Profile | null {
  try {
    const raw = localStorage.getItem(key(email));
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

export type RequiredField = 'school' | 'room';

/** Required fields that are empty or only whitespace, in form order. */
export function missingFields(values: { school: string; room: string }): RequiredField[] {
  const missing: RequiredField[] = [];
  if (!values.school.trim()) missing.push('school');
  if (!values.room.trim()) missing.push('room');
  return missing;
}
