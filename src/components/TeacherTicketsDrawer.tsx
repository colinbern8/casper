import React from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { Ticket, TicketStatus } from '../types';

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Waiting for a technician',
  assigned: 'Assigned to a technician',
  dispatched: 'Technician on the way',
  in_progress: 'Technician working on it',
  hardware_swap: 'Replacement in progress',
  resolved: 'Resolved',
};

interface TeacherTicketsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  userName: string;
  onViewDispatchSlip: (ticket: Ticket) => void;
}

export const TeacherTicketsDrawer: React.FC<TeacherTicketsDrawerProps> = ({
  isOpen,
  onClose,
  tickets,
  userName,
  onViewDispatchSlip
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-8 sm:pl-16">
        <div className="w-screen max-w-md bg-white border-l border-gray-300 shadow-md flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 text-sm">Service Requests</h2>
              <p className="text-xs text-gray-500">Tickets logged for {userName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-700 rounded"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Ticket List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-gray-500 space-y-1">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="font-medium text-gray-700 text-xs">No requests yet</p>
                <p className="text-xs text-gray-400">Requests you submit from this device show up here.</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className="p-3.5 rounded border border-gray-200 bg-white text-xs space-y-2 hover:border-gray-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                      {ticket.ticketNumber}
                    </span>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                        ticket.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : ticket.status === 'open'
                          ? 'bg-gray-100 text-gray-700 border-gray-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 text-xs leading-snug">{ticket.title}</h3>
                    <p className="text-gray-500 mt-1 line-clamp-2 leading-relaxed">{ticket.description}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-gray-500">
                    <span>{ticket.room}</span>
                    <button
                      type="button"
                      onClick={() => onViewDispatchSlip(ticket)}
                      className="text-blue-700 hover:text-blue-900 font-medium inline-flex items-center gap-1"
                    >
                      <Printer className="w-3 h-3" />
                      <span>{ticket.userRole === 'student' ? 'Print Loaner Pass' : 'Print Slip'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
