import React, { useState } from 'react';
import type { UserContext } from '../types';
import { SCHOOLS } from '../data/schools';
import { Dialog, BUTTON } from './Dialog';

const FIELD = 'w-full bg-white border border-gray-400 rounded-lg px-2.5 py-2 text-base text-gray-900';

/** Change the school, room and phone a ticket is sent from. */
export const LocationDialog: React.FC<{ context: UserContext; isStudent: boolean; onSave: (ctx: UserContext) => void; onClose: () => void }> = ({ context, isStudent, onSave, onClose }) => {
  const [draft, setDraft] = useState(context);
  return (
    <Dialog
      size="sm"
      title={isStudent ? 'Student profile' : 'Classroom location'}
      description="Technicians are sent to the room you give here."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BUTTON.secondary}>Cancel</button>
          <button type="button" onClick={() => { onSave(draft); onClose(); }} className={BUTTON.primary}>Save</button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block">
          <span className="block text-gray-800 font-medium mb-1">School</span>
          <select value={draft.school} onChange={e => setDraft({ ...draft, school: e.target.value })} className={FIELD}>
            {SCHOOLS.map(sc => <option key={sc.id} value={sc.name}>{sc.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-gray-800 font-medium mb-1">Room</span>
          <input type="text" value={draft.room} onChange={e => setDraft({ ...draft, room: e.target.value })} className={FIELD} />
        </label>
        <label className="block">
          <span className="block text-gray-800 font-medium mb-1">Phone or extension</span>
          <input type="text" value={draft.phoneOrExt} onChange={e => setDraft({ ...draft, phoneOrExt: e.target.value })} className={FIELD} />
        </label>
      </div>
    </Dialog>
  );
};
