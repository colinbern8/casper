import React from 'react';
import { X, Printer } from 'lucide-react';
import { Ticket } from '../types';
import { HELP_DESK } from '../data/schools';

const ROLE_TEXT: Record<Ticket['userRole'], string> = {
  teacher_active: 'Teacher, class in session',
  teacher_prep: 'Teacher, planning period',
  staff: 'Staff',
  student: 'Student',
};

interface DispatchSlipModalProps {
  districtName: string;
  ticket: Ticket | null;
  onClose: () => void;
}

export const DispatchSlipModal: React.FC<DispatchSlipModalProps> = ({ districtName, ticket, onClose }) => {
  if (!ticket) return null;

  const isStudent = ticket.userRole === 'student';
  const title = isStudent ? 'Student device loaner pass' : 'Field technician work order';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white text-gray-900 rounded-lg max-w-xl w-full p-6 print:w-full print:max-w-none print:rounded-none">
        {/* Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-4 print:hidden">
          <span className="text-sm text-gray-600">Ticket {ticket.ticketNumber}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium bg-blue-700 hover:bg-blue-800 text-white transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-800 p-1 rounded-full"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slip Document Content */}
        <div className="space-y-4 text-sm text-gray-800">
          <div>
            <p className="text-sm text-gray-600">{districtName}, Technology Services</p>
            <h2 className="text-2xl font-bold text-gray-900 mt-0.5">{title}</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {isStudent
                ? 'Bring this to the School Media Center Tech Desk for a replacement Chromebook.'
                : 'Give this to the technician who comes to your room.'}
            </p>
          </div>

          {isStudent && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600 block">Student name</span>
                <span className="text-lg font-semibold text-gray-900 break-words">{ticket.userName}</span>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600 block">Chromebook red tag</span>
                {ticket.assetTag ? (
                  <span className="font-mono text-lg font-semibold text-gray-900 tracking-wider">{ticket.assetTag}</span>
                ) : (
                  <span className="text-gray-700">Not recorded. Ask the student to read it from the Chromebook.</span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 block">Ticket number</span>
              <span className="font-mono font-semibold text-gray-900">{ticket.ticketNumber}</span>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 block">Priority</span>
              <span className="font-semibold text-gray-900">
                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}, {ticket.userRole === 'teacher_active' ? 'class in session' : 'standard queue'}
              </span>
            </div>
            {!isStudent && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600 block">Name and role</span>
                <span className="font-medium text-gray-900">{ticket.userName}, {ROLE_TEXT[ticket.userRole]}</span>
              </div>
            )}
            <div className={`p-3 bg-gray-50 rounded-lg ${isStudent ? 'col-span-2' : ''}`}>
              <span className="text-sm text-gray-600 block">Location</span>
              <span className="font-medium text-gray-900">{ticket.room}, {ticket.school}</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600 block">Reported problem</span>
            <p className="font-medium text-gray-900 mt-0.5">{ticket.title}</p>
            <p className="text-gray-700 mt-1 leading-relaxed">{ticket.description}</p>
          </div>

          {ticket.troubleshootStepsAttempted && ticket.troubleshootStepsAttempted.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600 block mb-1">Steps already tried</span>
              <ol className="list-decimal list-inside space-y-1 text-gray-800">
                {ticket.troubleshootStepsAttempted.map((step, idx) => (
                  <li key={idx} className="leading-snug">{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="pt-1 flex flex-wrap items-center justify-between gap-x-3 text-sm text-gray-600">
            <span>Created {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{districtName} IT Services, phone ext. {HELP_DESK.ext}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
