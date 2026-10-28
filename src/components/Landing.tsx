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

// Real examples of what people report. They show the page's job better than a slogan.
const PROBLEMS = [
  'The projector says “No signal.”',
  'My Chromebook won’t charge.',
  'The copier wants a badge I don’t have.',
  'I can’t get into my school account.',
];

export const Landing: React.FC<LandingProps> = ({ config, notice, onSignedIn }) => (
  <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] font-sans antialiased text-neutral-900 bg-neutral-50">
    {/* Cobalt field: logo, headline and examples share one left edge. */}
    <section className="bg-[#1b3bd6] text-white px-6 sm:px-12 lg:px-16 pt-10 pb-12 lg:py-14 flex flex-col">
      <Logo className="h-20 sm:h-28 lg:h-32 self-start -ml-2" />
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-blue-100">
        IT Help Desk, {config.districtName}
        {config.demoMode && <DemoBadge />}
      </p>

      <div className="mt-12 lg:mt-auto">
        <h1 className="font-display font-black tracking-tight leading-[0.92] text-[clamp(3.25rem,9vw,7rem)]">
          What’s not working?
        </h1>

        <ul className="mt-8 space-y-2 font-display italic text-xl sm:text-2xl leading-snug">
          {PROBLEMS.map((p, i) => (
            <li key={p} className="problem-in" style={{ ['--i' as string]: i }}>{p}</li>
          ))}
        </ul>

        <p className="mt-8 max-w-[34rem] text-lg leading-relaxed text-blue-50">
          Tell us what’s wrong. We’ll try a few fixes with you first. If they don’t work, a technician takes your request.
        </p>
      </div>
    </section>

    {/* Paper side: card top lines up with the cobalt side's padding. */}
    <section className="px-6 sm:px-12 lg:px-16 py-10 lg:py-14 flex flex-col [&>*]:min-w-0">
      <div className="max-w-lg w-full lg:pt-6">
        <p className="mb-5 inline-block bg-[#ffc83d] text-neutral-900 font-semibold px-3 py-2 rounded-md leading-snug">
          Teaching right now? Say so, and your request goes to the front of the line.
        </p>
        <Login config={config} notice={notice} onSignedIn={onSignedIn} embedded />
      </div>

      <p className="mt-10 lg:mt-auto pt-6 text-xs text-neutral-600 max-w-lg">
        Prototype. Not yet deployed or reviewed for student-data privacy.
        {config.demoMode && ' Demo accounts and data are fictional.'}
      </p>
    </section>
  </div>
);
