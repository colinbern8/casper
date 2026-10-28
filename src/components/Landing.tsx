import React from 'react';
import { BookOpen, Languages, LifeBuoy, ListChecks, ShieldCheck, Ticket, Wrench } from 'lucide-react';
import type { PublicConfig } from '../types';

interface LandingProps {
  config: PublicConfig;
  onSignIn: () => void;
}

const FLOWS = [
  {
    icon: BookOpen,
    title: 'Teachers and staff',
    body: 'Pick your school and room, describe the problem, and follow guided steps for power, Wi-Fi, classroom displays, audio, copier badges and account sign-in. If it is still broken, send a ticket.',
    note: 'A class in session gets Priority 1. A planning period gets Priority 2.',
  },
  {
    icon: LifeBuoy,
    title: 'Students',
    body: 'Tell Greg Bot what is wrong with your Chromebook. Try a few quick fixes, and if they do not work, ask for a technician or a loaner device.',
    note: 'Available in English and Spanish.',
  },
  {
    icon: Wrench,
    title: 'Technicians',
    body: 'A live queue with search and filters. Change status, reassign, add timestamped notes, and print a dispatch slip or loaner pass.',
    note: 'Admins also manage who is a technician and import staff lists.',
  },
];

const STEPS = [
  { icon: ShieldCheck, title: 'Sign in', body: 'Use your school Google account. Your role decides which page you see.' },
  { icon: ListChecks, title: 'Try the guided steps', body: 'Fixed, human-written steps walk you through the common fixes first.' },
  { icon: Ticket, title: 'Send a ticket if needed', body: 'Still stuck? Your request goes to the technician queue with everything you already tried.' },
];

export const Landing: React.FC<LandingProps> = ({ config, onSignIn }) => {
  const cta = 'inline-flex items-center justify-center rounded-lg px-5 py-3 text-base font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-700';

  return (
    <div className="h-[100dvh] overflow-y-auto bg-stone-50 text-slate-900 font-sans antialiased">
      <header className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight">Greg Bot</span>
          <span className="text-sm text-slate-600">IT Help Desk</span>
          {config.demoMode && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">Demo</span>
          )}
        </div>
        <button type="button" onClick={onSignIn} className="px-3.5 py-2 text-sm font-semibold text-blue-800 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">
          Sign in
        </button>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-20">
          <p className="text-sm font-medium text-blue-800">{config.districtName}</p>
          <h1 className="mt-3 max-w-2xl text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.1]">
            Tech trouble? Get unstuck, fast.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-700 leading-relaxed">
            Greg Bot is the school IT help desk. Describe the problem, follow a few guided steps, and if that does not fix it, your request goes straight to a technician.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onSignIn} className={`${cta} bg-blue-700 text-white hover:bg-blue-800`}>
              Sign in with your school account
            </button>
            <span className="text-sm text-slate-600">Use your @{config.domain} account.</span>
          </div>
        </section>

        <section aria-labelledby="who" className="bg-white border-y border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
            <h2 id="who" className="text-2xl font-semibold tracking-tight">Built for everyone who uses a school device</h2>
            <p className="mt-2 text-slate-600">Everyone signs in the same way. What you see depends on your role.</p>
            <ul className="mt-8 grid gap-5 md:grid-cols-3">
              {FLOWS.map(({ icon: Icon, title, body, note }) => (
                <li key={title} className="rounded-xl border border-slate-200 bg-stone-50 p-5">
                  <Icon className="w-6 h-6 text-blue-700" aria-hidden="true" />
                  <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-slate-700 leading-relaxed">{body}</p>
                  <p className="mt-3 text-sm text-slate-600">{note}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="how" className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <h2 id="how" className="text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <li key={title} className="flex gap-4">
                <span className="shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center" aria-hidden="true">
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{i + 1}. {title}</h3>
                  <p className="mt-1 text-slate-700 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="promise" className="bg-white border-y border-slate-200">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 grid gap-8 md:grid-cols-2">
            <div>
              <h2 id="promise" className="text-2xl font-semibold tracking-tight">Predictable by design</h2>
              <p className="mt-3 text-slate-700 leading-relaxed">
                Greg Bot contains no AI. Every troubleshooting step and every answer is fixed text written by people, so replies are predictable and reviewable. What you type is never sent to a language model, and nothing leaves the app except an optional alert for urgent staff tickets.
              </p>
            </div>
            <div className="flex gap-4">
              <Languages className="shrink-0 w-6 h-6 text-blue-700 mt-1" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold">English and Spanish for students</h3>
                <p className="mt-2 text-slate-700 leading-relaxed">
                  Students choose a language at the start. The Spanish text is still awaiting human review.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950 leading-relaxed">
            <strong>Working prototype.</strong> This is not a production system. It has not been deployed on managed Chromebooks or reviewed for student-data privacy.
            {config.demoMode && ' Demo mode is on, so the accounts and data you see are fictional.'}
          </div>
          <div className="mt-10 text-center">
            <button type="button" onClick={onSignIn} className={`${cta} bg-blue-700 text-white hover:bg-blue-800`}>
              Sign in to the help desk
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-600">
        Greg Bot IT Help Desk · {config.districtName}
      </footer>
    </div>
  );
};
