import React from 'react';
import { X, Printer } from 'lucide-react';
import { Ticket } from '../types';
import { HELP_DESK } from '../data/schools';

interface DispatchSlipModalProps {
  districtName: string;
  ticket: Ticket | null;
  onClose: () => void;
}

export const DispatchSlipModal: React.FC<DispatchSlipModalProps> = ({ districtName, ticket, onClose }) => {
  if (!ticket) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white text-gray-900 border border-gray-200 rounded-lg max-w-xl w-full p-6 shadow-md print:shadow-none print:w-full print:max-w-none print:rounded-none print:border-none">
        {/* Controls (Hidden in Print) */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">
              {ticket.userRole === 'student' ? 'Student Loaner Pass' : 'Field Technician Work Order'}
            </span>
            <span className="text-xs font-mono text-gray-400">#{ticket.ticketNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-700 hover:bg-blue-800 text-white transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Slip Document Content */}
        <div className="space-y-4 text-xs text-gray-800">
          <div className="border-b border-gray-300 pb-3">
            <p className="text-xs font-medium text-gray-500">
              {districtName} • Technology Services
            </p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">
              {ticket.userRole === 'student' ? 'STUDENT DEVICE LOANER PASS' : 'FIELD TECHNICIAN WORK ORDER'}
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {ticket.userRole === 'student'
                ? 'Present at the School Media Center Tech Desk for a replacement Chromebook.'
                : 'Classroom Physical Tech Dispatch Slip'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-medium text-gray-500 block">Ticket Number</span>
              <span className="font-mono text-sm font-semibold text-gray-900">{ticket.ticketNumber}</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-medium text-gray-500 block">Priority Level</span>
              <span className="text-xs font-semibold text-gray-900 capitalize">
                {ticket.priority} - {ticket.userRole === 'teacher_active' ? 'Class in session' : 'Standard queue'}
              </span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-medium text-gray-500 block">Name & Role</span>
              <span className="font-medium text-gray-900">{ticket.userName} ({ticket.userRole})</span>
            </div>
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-medium text-gray-500 block">Location</span>
              <span className="font-medium text-gray-900">{ticket.room} • {ticket.school}</span>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <span className="text-xs font-medium text-gray-500 block">Reported Problem</span>
            <p className="font-medium text-gray-900 mt-0.5">{ticket.title}</p>
            <p className="text-gray-600 mt-1 leading-relaxed">{ticket.description}</p>
          </div>

          {ticket.troubleshootStepsAttempted && ticket.troubleshootStepsAttempted.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-xs font-medium text-gray-500 block mb-1">
                Steps Attempted Prior to Escalation
              </span>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                {ticket.troubleshootStepsAttempted.map((step, idx) => (
                  <li key={idx} className="leading-snug">{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
            <span>Created: {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span>{districtName} IT Services • Phone ext. {HELP_DESK.ext}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
