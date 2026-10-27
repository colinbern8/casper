import { OAuth2Client } from 'google-auth-library';

export interface GoogleProfile {
  email: string;
  emailVerified: boolean;
  /** Hosted domain: present only for Google Workspace accounts. */
  hostedDomain?: string;
  name: string;
}

export type GoogleVerifier = (credential: string) => Promise<GoogleProfile>;

/** Verifies the ID token Google's sign-in button hands the browser. */
export function createGoogleVerifier(clientId: string): GoogleVerifier {
  const client = new OAuth2Client(clientId);
  return async credential => {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const p = ticket.getPayload();
    if (!p?.email) throw new Error('Token has no email.');
    return {
      email: p.email.toLowerCase(),
      emailVerified: p.email_verified === true,
      hostedDomain: p.hd?.toLowerCase(),
      name: p.name || p.email.split('@')[0],
    };
  };
}
