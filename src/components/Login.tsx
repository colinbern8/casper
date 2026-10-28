import React, { useEffect, useRef, useState } from 'react';
import type { PublicConfig, SessionUser } from '../types';
import { ApiError, loginDev, loginGoogle } from '../api';

declare global {
  interface Window {
    google?: any;
  }
}

let gsiPromise: Promise<void> | null = null;
function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gsiPromise = null;
        reject(new Error('Could not load Google sign-in.'));
      };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

interface LoginProps {
  config: PublicConfig;
  notice?: string | null;
  onSignedIn: (user: SessionUser) => void;
  /** Rendered inside another page: no full-height wrapper. */
  embedded?: boolean;
}

export const Login: React.FC<LoginProps> = ({ config, notice, onSignedIn, embedded }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devEmail, setDevEmail] = useState('');

  useEffect(() => {
    if (!config.googleClientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async (resp: { credential: string }) => {
            setBusy(true);
            setError(null);
            try {
              onSignedIn(await loginGoogle(resp.credential));
            } catch (err) {
              setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.');
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'continue_with', width: 320 });
      })
      .catch(() => setError('Google sign-in could not load. Check your connection, or ask IT to allow accounts.google.com.'));
    return () => {
      cancelled = true;
    };
  }, [config.googleClientId, onSignedIn]);

  const dev = async (email: string) => {
    setBusy(true);
    setError(null);
    try {
      onSignedIn(await loginDev(email));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const demoAccounts = [
    ['Student', `demo.student@${config.domain}`],
    ['Teacher', `demo.teacher@${config.domain}`],
    ['Technician', `demo.tech@${config.domain}`],
    ['Admin', `demo.admin@${config.domain}`],
  ];

  return (
    <div className={embedded ? 'w-full' : 'w-full h-full flex items-center justify-center overflow-y-auto py-6'}>
      <div className="w-full max-w-lg bg-white border border-gray-300 rounded-lg p-6 sm:p-8 space-y-6 text-base shadow-xs">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">{embedded ? 'Sign in' : 'Sign in to the IT Help Desk'}</h2>
          <p className="text-gray-600 mt-2">Use your @{config.domain} school account.</p>
        </div>

        {notice && <p className="text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">{notice}</p>}

        {config.googleClientId ? (
          <div className="flex justify-center min-h-[48px]">
            <div ref={buttonRef} />
          </div>
        ) : !config.devLogin ? (
          <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            Sign-in is not set up on this server yet. Ask IT to set GOOGLE_CLIENT_ID.
          </p>
        ) : null}

        {config.devLogin && (
          <details open={!config.googleClientId} className="group">
            <summary className="cursor-pointer text-sm font-medium text-amber-900 select-none">Demo accounts (testing only)</summary>
          <div className="mt-3 border border-dashed border-amber-300 bg-amber-50/50 rounded-lg p-4 sm:p-5 space-y-4">
            <div>
              <p className="text-lg font-semibold text-amber-900">Demo sign-in</p>
              <p className="text-sm text-amber-900/80 mt-0.5">Fictional accounts for testing. Not for real use.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {demoAccounts.map(([label, email]) => (
                <button
                  key={email}
                  type="button"
                  disabled={busy}
                  onClick={() => dev(email)}
                  className="px-4 py-3 text-base border border-gray-300 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-60 font-semibold text-gray-900"
                >
                  {label}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); dev(devEmail.trim()); }} className="space-y-1.5">
              <label htmlFor="dev-email" className="block text-sm font-medium text-gray-700">Or type any address in the domain</label>
              <div className="flex gap-2">
                <input
                  id="dev-email" value={devEmail} onChange={e => setDevEmail(e.target.value)} placeholder={`anyone@${config.domain}`}
                  className="flex-1 min-w-0 border border-gray-300 rounded-lg px-4 py-2.5 text-base bg-white placeholder-gray-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                <button type="submit" disabled={busy || !devEmail} className="px-5 py-2.5 text-base font-semibold bg-gray-800 text-white rounded-lg disabled:opacity-50">Go</button>
              </div>
            </form>
          </div>
          </details>
        )}

        {error && <p role="alert" className="text-red-800 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      </div>
    </div>
  );
};
