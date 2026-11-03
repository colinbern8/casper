import React from 'react';
import { HELP_DESK } from '../data/schools';
import { Dialog, BUTTON } from './Dialog';

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <div className="text-gray-700 mt-0.5">{children}</div>
  </div>
);

export const ContactDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Dialog title="District IT help desk" description="Technology services and field support" onClose={onClose} footer={<button type="button" onClick={onClose} className={BUTTON.secondary}>Close</button>}>
    <div className="space-y-3">
      <Card title="Phone">
        <p>Call <strong>{HELP_DESK.ext}</strong> from any classroom or office phone.</p>
        <p className="text-gray-600 text-xs mt-1">Available {HELP_DESK.hours}.</p>
      </Card>
      <Card title="Media Center Tech Desk (students)">
        <p>Walk in to the school library for Chromebook loaners and charger replacements.</p>
      </Card>
      <Card title="Email">
        <p>{HELP_DESK.email}</p>
      </Card>
    </div>
  </Dialog>
);
