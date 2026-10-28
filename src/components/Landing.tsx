import React from 'react';
import type { PublicConfig, SessionUser } from '../types';
import { Login } from './Login';
import { DemoBadge } from './DemoBadge';
import { Logo } from './Logo';

interface LandingProps {
  config: PublicConfig;
  notice?: string | null;
  onSignedIn: (user: SessionUser) => void;
}

const STEPS = [
  'Tell us what’s wrong.',
  'Try a few quick fixes with Casper.',
  'If they don’t work, a technician takes your request.',
];

export const Landing: React.FC<LandingProps> = ({ config, notice, onSignedIn }) => (
  <div className="min-h-[100dvh] bg-[#f1f2f4] text-neutral-900 font-sans antialiased">
    <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-10 lg:py-16 min-h-[100dvh] grid grid-cols-1 [&>*]:min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-20 lg:items-center">
      <section>
        <div className="enter" style={{ ['--i' as string]: 0 }}>
          <Logo className="h-20 sm:h-24 lg:h-28 -ml-2" />
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-neutral-700">
            IT Help Desk, {config.districtName}
            {config.demoMode && <DemoBadge />}
          </p>
        </div>

        <h1 className="enter mt-10 font-display font-black tracking-tight leading-[0.95] text-[clamp(2.75rem,7vw,5.5rem)]" style={{ ['--i' as string]: 1 }}>
          What’s not working?
        </h1>

        <ol className="enter mt-8 max-w-[28rem] list-decimal pl-6 space-y-2 text-lg leading-relaxed marker:font-semibold marker:text-[#3b5a9d]" style={{ ['--i' as string]: 2 }}>
          {STEPS.map(s => <li key={s}>{s}</li>)}
        </ol>
        <p className="enter mt-5 max-w-[28rem] text-base text-neutral-700 leading-relaxed" style={{ ['--i' as string]: 3 }}>
          Teaching right now? Say so, and your request goes first.
        </p>
      </section>

      <section aria-label="Sign in" className="enter" style={{ ['--i' as string]: 3 }}>
        <div className="bg-white rounded-3xl p-6 sm:p-8">
          <Login config={config} notice={notice} onSignedIn={onSignedIn} embedded bare />
        </div>
        <p className="mt-5 text-sm text-neutral-600 max-w-[26rem]">
          Prototype. Not yet deployed or reviewed for student-data privacy.
          {config.demoMode && ' Demo accounts and data are fictional.'}
        </p>
      </section>
    </div>
  </div>
);
