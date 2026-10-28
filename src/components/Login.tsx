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
  /** No card of its own: sits on a surface the parent already draws. */
  bare?: boolean;
}

export const Login: React.FC<LoginProps> = ({ config, notice, onSignedIn, embedded, bare }) => {
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
      <div className={bare ? 'w-full space-y-3 text-base' : 'w-full max-w-lg bg-white border-2 border-neutral-900 p-6 space-y-4 text-sm'}>
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-neutral-900">Sign in</h2>
          <p className="text-gray-600 mt-1">Use your @{config.domain} school account.</p>
        </div>

        {notice && <p className="text-gray-700 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">{notice}</p>}

        {config.googleClientId ? (
          <div className="flex justify-center min-h-[44px]">
            <div ref={buttonRef} />
          </div>
        ) : !config.devLogin ? (
          <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            Sign-in is not set up yet. Ask IT to finish the setup.
          </p>
        ) : null}

        {config.devLogin && (
          <details open={!config.googleClientId}>
            <summary className="cursor-pointer text-xs text-gray-600 select-none">Testing only</summary>
            <div className="mt-2 border border-dashed border-amber-300 bg-amber-50/50 rounded-2xl p-3 space-y-3">
              <div className="grid grid-cols-2 min-[460px]:grid-cols-4 gap-2">
                {demoAccounts.map(([label, email]) => (
                  <button
                    key={email}
                    type="button"
                    disabled={busy}
                    onClick={() => dev(email)}
                    className="px-2 py-2 text-xs border border-gray-300 bg-white rounded-full hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 disabled:opacity-60 font-medium text-gray-900"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <form onSubmit={e => { e.preventDefault(); dev(devEmail.trim()); }} className="flex gap-2">
                <label htmlFor="dev-email" className="sr-only">Test email address</label>
                <input
                  id="dev-email" value={devEmail} onChange={e => setDevEmail(e.target.value)} placeholder={`anyone@${config.domain}`}
                  className="flex-1 min-w-0 border border-gray-300 rounded-full px-3 py-2 text-sm bg-white placeholder-gray-400 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700"
                />
                <button type="submit" disabled={busy || !devEmail} className="px-4 py-2 text-sm font-semibold bg-[#3b5a9d] hover:bg-[#2f4a85] text-white rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-700 disabled:opacity-50">Go</button>
              </form>
            </div>
          </details>
        )}

        {error && <p role="alert" className="text-red-800 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{error}</p>}
      </div>
    </div>
  );
};
