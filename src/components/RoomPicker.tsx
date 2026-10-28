import React, { useId, useState } from 'react';
import { filterRooms } from '../data/schools';

interface RoomPickerProps {
  id: string;
  rooms: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  invalid?: boolean;
  describedBy?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

/** ARIA combobox with list autocomplete. Typing a location that is not in the list is allowed. */
export const RoomPicker: React.FC<RoomPickerProps> = ({ id, rooms, value, onChange, className, invalid, describedBy, inputRef }) => {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = filterRooms(rooms, value);
  const showList = open && matches.length > 0;
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const pick = (room: string) => {
    onChange(room);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showList) { setOpen(true); setActive(0); return; }
      setActive(a => (a + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showList) { setOpen(true); setActive(matches.length - 1); return; }
      setActive(a => (a <= 0 ? matches.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      if (showList && active >= 0) {
        e.preventDefault();
        pick(matches[active]);
      }
    } else if (e.key === 'Escape') {
      if (showList) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      }
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        className={className}
        value={value}
        maxLength={80}
        placeholder="Pick one or type your own"
        onChange={e => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onKeyDown={onKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => { setOpen(false); setActive(-1); }}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching rooms"
        hidden={!showList}
        className="absolute z-10 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-md"
      >
        {matches.map((r, i) => (
          <li
            key={r}
            id={optionId(i)}
            role="option"
            aria-selected={i === active}
            onMouseDown={e => { e.preventDefault(); pick(r); }}
            onMouseEnter={() => setActive(i)}
            className={`px-2.5 py-2 cursor-pointer ${i === active ? 'bg-blue-700 text-white' : 'text-gray-900 hover:bg-gray-50'}`}
          >
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
};
