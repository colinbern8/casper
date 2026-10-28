/**
 * One-time migration only: the browser storage key the saved profile used under the
 * product's previous name. profile.ts copies a profile found here to the current key
 * the first time it is loaded, so nobody has to set theirs up again. The old entry is
 * left in place. This is the only file allowed to hold the old name (see tests/units.test.ts).
 * Delete this file and the call in profile.ts once every device has signed in again.
 */
export const legacyProfileKey = (email: string) => `greg.profile.v2.${email.toLowerCase()}`;
