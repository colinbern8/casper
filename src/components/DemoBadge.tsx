import React from 'react';

/** The amber pill that marks demo mode and fictional data. */
export const DemoBadge: React.FC<{ children?: React.ReactNode }> = ({ children = 'Demo' }) => (
  <span className="text-xs font-semibold uppercase tracking-wide text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-1.5 py-0.5">{children}</span>
);
