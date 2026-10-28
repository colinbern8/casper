import React from 'react';
import { GraduationCap, Backpack, Wrench } from 'lucide-react';
import type { PublicConfig, SessionUser } from '../types';
import { Login } from './Login';
import { Wordmark } from './Wordmark';

interface LandingProps {
  config: PublicConfig;
  notice?: string | null;
  onSignedIn: (user: SessionUser) => void;
}

const ROLES = [
  { icon: GraduationCap, name: 'Teachers and staff', text: 'Report a classroom problem. A class in session gets top priority.' },
  { icon: Backpack, name: 'Students', text: 'Get help with your Chromebook, in English or Spanish, or ask for a loaner.' },
  { icon: Wrench, name: 'Technicians', text: 'Work the ticket queue and print dispatch slips.' },
];

export const Landing: React.FC<LandingProps> = ({ config, notice, onSignedIn }) => (
  <div className="min-h-[100dvh] flex flex-col bg-gray-50 text-gray-900 font-sans antialiased">
    <header className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center gap-2">
      <div className="text-gray-900 leading-none"><Wordmark className="h-8" /></div>
      <span className="text-sm text-gray-600">IT Help Desk</span>
      {config.demoMode && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-0.5">Demo</span>
      )}
    </header>

    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 grid grid-cols-1 [&>*]:min-w-0 gap-10 lg:grid-cols-2 lg:gap-16 items-center">
      <div>
        <p className="text-sm text-gray-600">{config.districtName}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900 leading-tight">Report a school technology problem</h1>
        <p className="mt-4 text-lg text-gray-700 leading-relaxed">
          Try a few fixes first. If they don’t work, your request goes to a technician.
        </p>
        <ul className="mt-8 space-y-4">
          {ROLES.map(({ icon: Icon, name, text }) => (
            <li key={name} className="flex gap-4 items-start">
              <span className="shrink-0 w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </span>
              <p className="text-gray-700 leading-relaxed">
                <span className="font-semibold text-gray-900">{name}.</span> {text}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <Login config={config} notice={notice} onSignedIn={onSignedIn} embedded />
    </main>

    <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 text-xs text-gray-600">
      Prototype. Not yet deployed or reviewed for student-data privacy.
      {config.demoMode && ' Demo accounts and data are fictional.'}
    </footer>
  </div>
);
