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
}

export const Login: React.FC<LoginProps> = ({ config, notice, onSignedIn }) => {
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
        window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'signin_with', width: 280 });
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
    <div className="w-full h-full flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-sm bg-white border border-gray-300 rounded-md p-6 space-y-4 text-xs shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Sign in to the IT Help Desk</h2>
          <p className="text-gray-500 mt-1">Use your @{config.domain} school account.</p>
        </div>

        {notice && <p className="text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-1.5">{notice}</p>}

        {config.googleClientId ? (
          <div className="flex justify-center min-h-[44px]">
            <div ref={buttonRef} />
          </div>
        ) : !config.devLogin ? (
          <p className="text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">
            Sign-in is not set up on this server yet. Ask IT to set GOOGLE_CLIENT_ID.
          </p>
        ) : null}

        {config.devLogin && (
          <div className="border border-dashed border-amber-300 bg-amber-50/50 rounded p-3 space-y-2">
            <p className="font-semibold text-amber-900">Development sign-in (not for real use)</p>
            <div className="flex flex-wrap gap-1.5">
              {demoAccounts.map(([label, email]) => (
                <button key={email} type="button" disabled={busy} onClick={() => dev(email)} className="px-2.5 py-1 border border-gray-300 bg-white rounded hover:bg-gray-50 font-medium">
                  {label}
                </button>
              ))}
            </div>
            <form onSubmit={e => { e.preventDefault(); dev(devEmail.trim()); }} className="flex gap-1.5">
              <input
                aria-label="Email address" value={devEmail} onChange={e => setDevEmail(e.target.value)} placeholder={`anyone@${config.domain}`}
                className="flex-1 border border-gray-300 rounded px-2 py-1 bg-white"
              />
              <button type="submit" disabled={busy || !devEmail} className="px-2.5 py-1 bg-gray-800 text-white rounded disabled:opacity-50">Go</button>
            </form>
          </div>
        )}

        {error && <p role="alert" className="text-red-800 bg-red-50 border border-red-200 rounded px-3 py-1.5">{error}</p>}
      </div>
    </div>
  );
};
