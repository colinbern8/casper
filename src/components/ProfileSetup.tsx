import React, { useState } from 'react';
import type { SessionUser } from '../types';
import type { Profile } from '../profile';
import { SCHOOLS, findSchool } from '../data/schools';

interface ProfileSetupProps {
  user: SessionUser;
  initial?: Profile | null;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
}

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, initial, onSave, onCancel }) => {
  const [school, setSchool] = useState(initial?.school || SCHOOLS[0].name);
  const [room, setRoom] = useState(initial?.room || '');
  const [phoneOrExt, setPhoneOrExt] = useState(initial?.phoneOrExt || '');
  const [error, setError] = useState<string | null>(null);

  const rooms = findSchool(school)?.rooms || [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room.trim()) return setError('Enter your room or location.');
    onSave({ school, room: room.trim(), phoneOrExt: phoneOrExt.trim() });
  };

  const field = 'w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700';

  return (
    <div className="w-full h-full flex items-center justify-center overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-5 space-y-3.5 text-xs shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{initial ? 'Where are you working?' : 'Where are you working today?'}</h2>
          <p className="text-gray-500 mt-0.5">Signed in as {user.name} ({user.email}). Technicians use your location to find you. It is saved on this device only.</p>
        </div>

        <div>
          <label htmlFor="pf-school" className="block text-gray-700 font-medium mb-1">School</label>
          <select id="pf-school" className={field} value={school} onChange={e => setSchool(e.target.value)}>
            {SCHOOLS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-room" className="block text-gray-700 font-medium mb-1">Room or location</label>
          <input id="pf-room" className={field} value={room} onChange={e => setRoom(e.target.value)} list="pf-rooms" maxLength={80} placeholder="Pick one or type your own" />
          <datalist id="pf-rooms">{rooms.map(r => <option key={r} value={r} />)}</datalist>
        </div>
        <div>
          <label htmlFor="pf-phone" className="block text-gray-700 font-medium mb-1">Phone or extension (optional)</label>
          <input id="pf-phone" className={field} value={phoneOrExt} onChange={e => setPhoneOrExt(e.target.value)} maxLength={40} />
        </div>

        {error && <p role="alert" className="text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          {onCancel && <button type="button" onClick={onCancel} className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>}
          <button type="submit" className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold">Continue</button>
        </div>
      </form>
    </div>
  );
};
