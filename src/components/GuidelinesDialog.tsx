import React from 'react';
import { BRAND_NAME } from '../brand';
import { LIMITS_TEXT } from '../data/limits';
import { Dialog, BUTTON } from './Dialog';

export const GuidelinesDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <Dialog title="IT help desk guidelines" onClose={onClose} footer={<button type="button" onClick={onClose} className={BUTTON.secondary}>Close</button>}>
    <div className="space-y-2.5 leading-relaxed">
      <p><strong>What it covers:</strong> {BRAND_NAME} helps with school technology only: Chromebooks, classroom displays, Wi-Fi and district accounts.</p>
      <p><strong>Message limit:</strong> {LIMITS_TEXT.chat}</p>
      <p><strong>Student requests:</strong> students can have a limited number of open requests at once. At the limit, they contact the main office or a technician.</p>
      <p><strong>Privacy:</strong> do not enter passwords or confidential student records. Answers come from built-in help text on the help desk server. Nothing you type is sent to an outside service.</p>
    </div>
  </Dialog>
);
