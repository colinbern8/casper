import React from 'react';
import type { PublicConfig, SessionUser } from '../types';
import { Login } from './Login';
import { DemoBadge } from './DemoBadge';
import { Logo } from './Logo';
import { SEAL_DISTRICT } from '../brand';
import seal from '../assets/hamilton-township-seal.png';

interface LandingProps {
  config: PublicConfig;
  notice?: string | null;
  onSignedIn: (user: SessionUser) => void;
}

export const Landing: React.FC<LandingProps> = ({ config, notice, onSignedIn }) => (
  <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 bg-[#1f2023] font-sans antialiased">
    {/* Brand side: one headline, one sentence. Swap the background for a photo when there is one. */}
    <section className="text-white px-6 sm:px-12 lg:px-16 pt-8 pb-16 lg:py-12 flex flex-col">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-neutral-300">
        IT Help Desk, {config.districtName}
        {config.demoMode && <DemoBadge neutral />}
      </p>

      <div className="my-14 lg:my-auto max-w-[32rem]">
        <h1 className="enter font-display font-black tracking-tight leading-[0.95] text-[clamp(3rem,6.5vw,5.5rem)]" style={{ ['--i' as string]: 0 }}>
          What’s not working?
        </h1>
        <p className="enter mt-6 text-lg leading-relaxed text-neutral-300" style={{ ['--i' as string]: 1 }}>
          Tell us what’s wrong. We’ll try a few quick fixes, and a technician steps in if they don’t work.
        </p>
      </div>

      {config.districtName === SEAL_DISTRICT && (
        <img src={seal} alt={`${config.districtName} seal`} width={88} height={88} className="hidden lg:block h-22 w-22 rounded-full" />
      )}
    </section>

    {/* Sign-in side: a white panel that overlaps the brand side. */}
    <section aria-label="Sign in" className="bg-white text-neutral-900 -mt-8 rounded-t-[2rem] lg:mt-0 lg:rounded-t-none lg:rounded-l-[2.75rem] px-6 sm:px-12 lg:px-16 py-8 lg:py-12 flex flex-col">
      <Logo className="h-14 sm:h-16 -ml-1.5 self-start" />

      <div className="enter my-12 lg:my-auto w-full max-w-md" style={{ ['--i' as string]: 2 }}>
        <Login config={config} notice={notice} onSignedIn={onSignedIn} embedded bare />
      </div>

      <p className="text-sm text-neutral-600 max-w-md">
        Prototype. Not yet deployed or reviewed for student-data privacy.
        {config.demoMode && ' Demo accounts and data are fictional.'}
      </p>
    </section>
  </div>
);
