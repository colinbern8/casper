import React, { useState } from 'react';
import {
  Search,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  Check,
  Send,
  X
} from 'lucide-react';
import { Ticket, TicketPriority, TicketStatus, TicketUpdateInput } from '../types';
import { allTechs } from '../data/schools';
import { CaseDetailPanel } from './CaseDetailPanel';

interface TechnicianConsoleProps {
  districtName: string;
  tickets: Ticket[];
  onRefresh: () => void;
  onUpdateTicket: (id: string, updates: TicketUpdateInput) => Promise<void>;
  onViewDispatchSlip: (ticket: Ticket) => void;
}

export const TechnicianConsole: React.FC<TechnicianConsoleProps> = ({
  districtName,
  tickets,
  onRefresh,
  onUpdateTicket,
  onViewDispatchSlip,
}) => {
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterSchool, setFilterSchool] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState<{ [ticketId: string]: string }>({});
  const [isSubmittingNote, setIsSubmittingNote] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 300);
  };

  // Metrics
  const activeTickets = tickets.filter(t => t.status !== 'resolved');
  const criticalP1Count = tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved').length;
  const studentLoanerCount = tickets.filter(t => t.userRole === 'student' && t.status !== 'resolved').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  // Filtered tickets
  const filteredTickets = tickets.filter(t => {
    // Priority filter
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;

    // Status filter
    if (filterStatus === 'active' && t.status === 'resolved') return false;
    if (filterStatus === 'resolved' && t.status !== 'resolved') return false;
    if (filterStatus === 'dispatched' && t.status !== 'dispatched') return false;
    if (filterStatus === 'in_progress' && t.status !== 'in_progress') return false;

    if (filterSchool !== 'all' && t.school !== filterSchool) return false;

    // Role filter
    if (filterRole === 'teacher' && !t.userRole.startsWith('teacher')) return false;
    if (filterRole === 'student' && t.userRole !== 'student') return false;
    if (filterRole === 'staff' && t.userRole !== 'staff') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.ticketNumber.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.room.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.school.toLowerCase().includes(q) ||
        (t.assetTag && t.assetTag.toLowerCase().includes(q)) ||
        (t.assignedTech && t.assignedTech.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
    await onUpdateTicket(ticketId, { status: newStatus });
  };

  const handleAssignTech = async (ticketId: string, assignedTech: string) => {
    const ticket = tickets.find(t => t.id === ticketId);
    const bump = assignedTech && ticket?.status === 'open' ? { status: 'assigned' as TicketStatus } : {};
    await onUpdateTicket(ticketId, { assignedTech, ...bump });
  };

  const handleAddNote = async (ticketId: string) => {
    const text = newNoteText[ticketId]?.trim();
    if (!text) return;

    setIsSubmittingNote(ticketId);
    // The server appends the note with a timestamp, so two technicians can't overwrite each other.
    await onUpdateTicket(ticketId, { addNote: text });
    setNewNoteText(prev => ({ ...prev, [ticketId]: '' }));
    setIsSubmittingNote(null);
  };

  const getPriorityBadge = (priority: TicketPriority, role: string) => {
    if (priority === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800 border border-red-300">
          <AlertTriangle className="w-3 h-3 text-red-700" />
          P1 Critical (Class in Session)
        </span>
      );
    }
    if (priority === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-700" />
          P2 High (Teacher Prep)
        </span>
      );
    }
    if (role === 'student') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-100 text-blue-800 border border-blue-300">
          Student Loaner Depot
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300">
        Medium Priority
      </span>
    );
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'dispatched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
            Dispatched (Field Tech En Route)
          </span>
        );
      case 'assigned':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Assigned
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
            In Progress / Diagnostic
          </span>
        );
      case 'hardware_swap':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Hardware Swap / Loaner Issued
          </span>
        );
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-3 h-3 text-emerald-600" />
            Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
            Open
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-gray-200 rounded-lg shadow-xs overflow-hidden">
      {/* Top Bar: Title & Controls */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              Field Technician & IT Admin Queue
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {districtName} • Technology Support & Operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition disabled:opacity-60"
            title="Refresh ticket queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 border-b border-gray-200 shrink-0 text-xs">
        <div className="bg-white border border-gray-200 rounded p-2.5">
          <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider">
            Active Requests
          </span>
          <div className="text-lg font-bold text-gray-900 mt-0.5">
            {activeTickets.length}
          </div>
        </div>

        <div className={`rounded p-2.5 border ${
          criticalP1Count > 0 ? 'bg-red-50 border-red-200 text-red-900' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`block text-[11px] font-medium uppercase tracking-wider ${
              criticalP1Count > 0 ? 'text-red-700' : 'text-gray-500'
            }`}>
              P1 Classroom Emergency
            </span>
            {criticalP1Count > 0 && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />}
          </div>
          <div className="text-lg font-bold mt-0.5">
            {criticalP1Count}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-2.5">
          <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider">
            Student Loaner Depot
          </span>
          <div className="text-lg font-bold text-gray-900 mt-0.5">
            {studentLoanerCount}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded p-2.5">
          <span className="text-gray-500 block text-[11px] font-medium uppercase tracking-wider">
            Resolved Today
          </span>
          <div className="text-lg font-bold text-gray-900 mt-0.5">
            {resolvedCount}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 border-b border-gray-200 bg-white shrink-0 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticket #, teacher, student, room, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded bg-white text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-gray-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-700"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical (P1 Active Class)</option>
          <option value="high">High (P2 Prep Period)</option>
          <option value="medium">Medium Priority</option>
        </select>

        {/* School Filter */}
        <select
          value={filterSchool}
          onChange={(e) => setFilterSchool(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-700"
        >
          <option value="all">All Schools</option>
          {Array.from(new Set(tickets.map(t => t.school))).sort().map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        {/* Role Filter */}
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-700"
        >
          <option value="all">All Roles</option>
          <option value="teacher">Teachers Only</option>
          <option value="student">Students Only</option>
          <option value="staff">Staff Only</option>
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-700"
        >
          <option value="active">Active Only</option>
          <option value="all">All Statuses</option>
          <option value="dispatched">Dispatched</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {/* Ticket List Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-200">
        {filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500">
            No support tickets match the selected filters.
          </div>
        ) : (
          filteredTickets.map(ticket => {
            const isExpanded = expandedTicketId === ticket.id;
            const isCritical = ticket.priority === 'critical' && ticket.status !== 'resolved';

            return (
              <div
                key={ticket.id}
                className={`transition-colors ${
                  isCritical ? 'bg-red-50/20' : 'bg-white'
                } hover:bg-gray-50/60`}
              >
                {/* Collapsed / Header Row */}
                <div className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        {ticket.ticketNumber}
                      </span>
                      {getPriorityBadge(ticket.priority, ticket.userRole)}
                      {getStatusBadge(ticket.status)}
                      <span className="text-[11px] text-gray-400">
                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-gray-900 truncate">
                      {ticket.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-gray-600">
                      <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                        <User className="w-3 h-3 text-gray-400" />
                        {ticket.userName} ({ticket.userRole.startsWith('teacher') ? 'Teacher' : ticket.userRole === 'student' ? 'Student' : 'Staff'})
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {ticket.school} • {ticket.room}
                      </span>
                      {ticket.assetTag && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                          <Tag className="w-2.5 h-2.5 text-gray-400" />
                          {ticket.assetTag}
                        </span>
                      )}
                      {ticket.assignedTech && (
                        <span className="text-gray-500">
                          Tech: <strong>{ticket.assignedTech}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Controls */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Print Dispatch Slip */}
                    <button
                      type="button"
                      onClick={() => onViewDispatchSlip(ticket)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
                      title="View printable field dispatch slip or student loaner pass"
                    >
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <span className="hidden sm:inline">Slip / Pass</span>
                    </button>

                    {/* Status Changer */}
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white font-medium text-gray-700"
                    >
                      <option value="open">Open</option>
                      <option value="assigned">Assigned</option>
                      <option value="dispatched">Dispatched</option>
                      <option value="in_progress">In Progress</option>
                      <option value="hardware_swap">Hardware Swap</option>
                      <option value="resolved">Resolved</option>
                    </select>

                    {/* Expand/Collapse */}
                    <button
                      type="button"
                      onClick={() => setExpandedTicketId(isExpanded ? null : ticket.id)}
                      className="p-1 text-gray-500 hover:text-gray-900 border border-gray-200 rounded hover:bg-gray-100"
                      aria-label="Toggle details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs space-y-3">
                    {/* Issue Description */}
                    <div>
                      <span className="font-semibold text-gray-700 block mb-0.5">Issue Description:</span>
                      <p className="text-gray-800 bg-white p-2.5 rounded border border-gray-200 leading-relaxed">
                        {ticket.description}
                      </p>
                    </div>

                    {/* Diagnostic Steps Attempted */}
                    {ticket.troubleshootStepsAttempted && ticket.troubleshootStepsAttempted.length > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700 block mb-1">
                          Automated Troubleshooting Steps Tried Before Escalation:
                        </span>
                        <ul className="bg-white p-2.5 rounded border border-gray-200 space-y-1 text-gray-700 list-disc list-inside">
                          {ticket.troubleshootStepsAttempted.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Requester Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2.5 rounded border border-gray-200">
                      <div>
                        <span className="text-gray-500 text-[11px] block">Contact / Ext</span>
                        <span className="font-medium text-gray-800">{ticket.phoneOrExt || ticket.userEmail}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block">Hardware Model</span>
                        <span className="font-medium text-gray-800">{ticket.deviceModel || 'General District Asset'}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-[11px] block">Teacher Availability</span>
                        <span className="font-medium text-gray-800">{ticket.teacherAvailability || 'Standard School Hours'}</span>
                      </div>
                    </div>

                    {/* Tech Notes Thread */}
                    <div>
                      <span className="font-semibold text-gray-700 block mb-1">Internal Technician Notes:</span>
                      {ticket.techNotes ? (
                        <div className="bg-white p-2.5 rounded border border-gray-200 font-mono text-[11px] text-gray-800 whitespace-pre-wrap mb-2">
                          {ticket.techNotes}
                        </div>
                      ) : (
                        <p className="text-gray-400 italic text-[11px] mb-2">No notes recorded yet.</p>
                      )}

                      {/* Add Tech Note Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add diagnostic update or dispatch status..."
                          value={newNoteText[ticket.id] || ''}
                          onChange={(e) => setNewNoteText({ ...newNoteText, [ticket.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddNote(ticket.id);
                            }
                          }}
                          className="flex-1 text-xs border border-gray-300 rounded px-2.5 py-1.5 bg-white text-gray-900 focus:outline-hidden focus:border-gray-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddNote(ticket.id)}
                          disabled={!newNoteText[ticket.id]?.trim() || isSubmittingNote === ticket.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 rounded disabled:opacity-40"
                        >
                          <Send className="w-3 h-3" />
                          <span>Save Note</span>
                        </button>
                      </div>
                    </div>

                    {/* Student-support demo case (only on tickets escalated from one) */}
                    {ticket.caseId && <CaseDetailPanel caseId={ticket.caseId} />}

                    {/* Student request limit: only on a student's request that is still open */}
                    {ticket.userRole === 'student' && ticket.status !== 'resolved' && (
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2.5 rounded border border-gray-200">
                        <div>
                          <span className="font-semibold text-gray-700 block">Student request limit</span>
                          <span className="text-gray-600">
                            {ticket.allowsAnother
                              ? 'This student may send another request while this one is open.'
                              : 'This student cannot send another request until this one is resolved.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdateTicket(ticket.id, { allowAnother: !ticket.allowsAnother })}
                          className="px-3 py-1 text-xs font-medium text-gray-800 bg-white border border-gray-400 hover:bg-gray-50 rounded"
                        >
                          {ticket.allowsAnother ? 'Withdraw permission' : 'Allow another request'}
                        </button>
                      </div>
                    )}

                    {/* Quick Reassign Technician */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-medium">Assign To:</span>
                        <select
                          value={ticket.assignedTech || ''}
                          onChange={(e) => handleAssignTech(ticket.id, e.target.value)}
                          className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-800"
                        >
                          <option value="">Unassigned</option>
                          {allTechs().map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Mark Resolved Shortcut */}
                      {ticket.status !== 'resolved' ? (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(ticket.id, 'resolved')}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Mark Resolved</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(ticket.id, 'open')}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded"
                        >
                          <span>Reopen Ticket</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500 shrink-0">
        <span>
          Showing {filteredTickets.length} of {tickets.length} total district requests
        </span>
        <span>Refreshes automatically every 20 seconds</span>
      </div>
    </div>
  );
};
