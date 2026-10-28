import React, { useRef, useState } from 'react';
import type { SessionUser } from '../types';
import { missingFields, type Profile, type RequiredField } from '../profile';
import { RoomPicker } from './RoomPicker';
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
  const [errors, setErrors] = useState<RequiredField[]>([]);
  const schoolRef = useRef<HTMLSelectElement>(null);
  const roomRef = useRef<HTMLInputElement>(null);

  const rooms = findSchool(school)?.rooms || [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const missing = missingFields({ school, room });
    setErrors(missing);
    if (missing.length) {
      (missing[0] === 'school' ? schoolRef : roomRef).current?.focus();
      return;
    }
    onSave({ school, room: room.trim(), phoneOrExt: phoneOrExt.trim() });
  };

  const clearError = (f: RequiredField) => setErrors(prev => prev.filter(x => x !== f));
  const invalidClass = 'border-red-700 ring-1 ring-red-700 focus:border-red-700 focus:ring-red-700';
  const required = (f: RequiredField, id: string) => errors.includes(f) && (
    <span id={`${id}-req`} className="text-red-700 font-semibold ml-2">*Required</span>
  );

  const field = 'w-full bg-white border border-gray-300 rounded-lg px-2.5 py-2 text-sm sm:text-base text-gray-900 focus:outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-700';

  return (
    <div className="w-full h-full flex items-center justify-center overflow-y-auto">
      <form onSubmit={submit} className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-5 space-y-3.5 text-sm sm:text-base shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">{initial ? 'Where are you working?' : 'Where are you working today?'}</h2>
          <p className="text-gray-500 mt-0.5">Signed in as {user.name} ({user.email}). Technicians use your location to find you. It is saved on this device only.</p>
        </div>

        <div>
          <label htmlFor="pf-school" className="block text-gray-700 font-medium mb-1">School{required('school', 'pf-school')}</label>
          <select id="pf-school" ref={schoolRef} className={`${field} ${errors.includes('school') ? invalidClass : ''}`} aria-invalid={errors.includes('school') || undefined} aria-describedby={errors.includes('school') ? 'pf-school-req' : undefined} value={school} onChange={e => { setSchool(e.target.value); clearError('school'); }}>
            {SCHOOLS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pf-room" className="block text-gray-700 font-medium mb-1">Room or location{required('room', 'pf-room')}</label>
          <RoomPicker
            id="pf-room"
            rooms={rooms}
            value={room}
            onChange={v => { setRoom(v); clearError('room'); }}
            className={`${field} ${errors.includes('room') ? invalidClass : ''}`}
            invalid={errors.includes('room')}
            describedBy={errors.includes('room') ? 'pf-room-req' : undefined}
            inputRef={roomRef}
          />
        </div>
        <div>
          <label htmlFor="pf-phone" className="block text-gray-700 font-medium mb-1">Phone or extension (optional)</label>
          <input id="pf-phone" className={field} value={phoneOrExt} onChange={e => setPhoneOrExt(e.target.value)} maxLength={40} />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          {onCancel && <button type="button" onClick={onCancel} className="px-3.5 py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>}
          <button type="submit" className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold">Continue</button>
        </div>
      </form>
    </div>
  );
};
