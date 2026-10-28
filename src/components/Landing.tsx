import React, { useState } from 'react';
import type { PublicConfig, SessionUser } from '../types';
import { Login } from './Login';
import { DemoBadge } from './DemoBadge';
import { Logo } from './Logo';
import { HeroArt } from './HeroArt';

interface LandingProps {
  config: PublicConfig;
  notice?: string | null;
  onSignedIn: (user: SessionUser) => void;
}

type Example = {
  chip: string;
  steps: string[];
  urgent: boolean;
  note: string;
};

// What people really report, with the first fixes Casper would suggest.
const EXAMPLES: Example[] = [
  {
    chip: 'The projector says “No signal.”',
    steps: ['Check the cable is plugged in at both ends.', 'Switch the input to HDMI 2.', 'Turn the projector off and on.'],
    urgent: true,
    note: 'Teaching right now? Say so, and I’ll put your request at the front of the line.',
  },
  {
    chip: 'My Chromebook won’t charge.',
    steps: ['Try a different outlet.', 'Look for a light on the charger.', 'Hold the power button for 10 seconds.'],
    urgent: false,
    note: 'If it still won’t turn on, I can set up a loaner for you.',
  },
  {
    chip: 'The copier wants a badge I don’t have.',
    steps: ['Sign in on the copier screen with your school account.', 'Cancel the print job and send it again.'],
    urgent: false,
    note: 'On a planning period? That goes ahead of the standard queue.',
  },
  {
    chip: 'I can’t get into my school account.',
    steps: ['Check caps lock and try again.', 'Open a private window and sign in there.', 'Reset your password if it still fails.'],
    urgent: false,
    note: 'Still locked out? A technician can unlock it.',
  },
];

const Bubble: React.FC<{ from: 'casper' | 'user'; urgent?: boolean; children: React.ReactNode }> = ({ from, urgent, children }) => (
  <div className={`flex ${from === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[88%] px-4 py-2.5 text-base leading-relaxed ${
        from === 'user'
          ? 'bg-neutral-900 text-white rounded-2xl rounded-br-md'
          : `${urgent ? 'bg-[#ffc83d] font-medium' : 'bg-neutral-100'} text-neutral-900 rounded-2xl rounded-bl-md`
      }`}
    >
      {children}
    </div>
  </div>
);

export const Landing: React.FC<LandingProps> = ({ config, notice, onSignedIn }) => {
  const [pick, setPick] = useState(0);
  const ex = EXAMPLES[pick];

  return (
    <div className="min-h-[100dvh] bg-[#1b3bd6] text-white font-sans antialiased">
      <div className="max-w-[88rem] mx-auto px-5 sm:px-8 lg:px-12 py-8 lg:py-12 grid grid-cols-1 [&>*]:min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_27rem] lg:gap-16 xl:grid-cols-[minmax(0,1fr)_29rem]">
        <section className="flex flex-col lg:sticky lg:top-12 lg:self-start">
          <div className="enter" style={{ ['--i' as string]: 0 }}>
            <Logo className="h-20 sm:h-28 lg:h-32 -ml-2" />
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-blue-100">
              IT Help Desk, {config.districtName}
            </p>
          </div>

          <h1 className="enter mt-12 lg:mt-14 font-display font-black tracking-tight leading-[0.92] text-[clamp(3.25rem,8.6vw,7.5rem)]" style={{ ['--i' as string]: 1 }}>
            What’s not working?
          </h1>

          <p className="mt-8 max-w-[34rem] text-lg leading-relaxed">
            Tell us what’s wrong. We’ll try a few fixes with you first. If they don’t work, a technician takes your request.
          </p>

          <HeroArt className="enter hidden lg:block mt-4 w-full max-w-[27rem] h-auto" />
        </section>

        {/* The chat window: the page's object. Quick replies fill the conversation; the composer is the sign-in. */}
        <section aria-label="Example chat and sign-in" className="slip-in lg:pt-4">
          <div className="bg-white text-neutral-900 overflow-hidden rounded-3xl">
            <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between gap-3">
              <p className="font-display font-black text-2xl leading-none">Casper</p>
              <p className="flex items-center gap-2 text-sm text-neutral-300">
                IT Help Desk
                {config.demoMode && <DemoBadge />}
              </p>
            </div>

            <div className="px-4 sm:px-5 pt-5 pb-4 space-y-3">
              <Bubble from="casper">Hi, I’m Casper. Pick what’s wrong, or sign in and describe it.</Bubble>

              <div role="group" aria-label="Pick a problem" className="flex flex-wrap gap-2 py-1">
                {EXAMPLES.map((e, i) => (
                  <button
                    key={e.chip}
                    type="button"
                    aria-pressed={pick === i}
                    onClick={() => setPick(i)}
                    className={`px-4 py-2 rounded-full text-base font-semibold text-left leading-snug transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b3bd6] focus-visible:ring-offset-2 ${
                      pick === i ? 'bg-[#1b3bd6] text-white' : 'bg-[#e6ebff] text-[#1b3bd6] hover:bg-[#d3dcff]'
                    }`}
                  >
                    {e.chip}
                  </button>
                ))}
              </div>

              <div key={pick} className="swap space-y-3">
                <Bubble from="user">{ex.chip}</Bubble>
                <Bubble from="casper">
                  Try these first:
                  <ol className="mt-1 list-decimal pl-5 space-y-0.5">
                    {ex.steps.map(t => <li key={t}>{t}</li>)}
                  </ol>
                </Bubble>
                <Bubble from="casper" urgent={ex.urgent}>
                  {ex.note} Sign in below and I’ll send it to a technician.
                </Bubble>
              </div>
            </div>

            {/* Composer: signing in is how you send the message. */}
            <div className="bg-neutral-100 px-4 sm:px-5 py-5">
              <Login config={config} notice={notice} onSignedIn={onSignedIn} embedded bare />
            </div>
          </div>

          <p className="mt-5 text-sm text-blue-100 max-w-[27rem]">
            Example conversation. Prototype, not yet deployed or reviewed for student-data privacy.
            {config.demoMode && ' Demo accounts and data are fictional.'}
          </p>
        </section>
      </div>
    </div>
  );
};
