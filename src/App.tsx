import { useCallback, useEffect, useState } from 'react';
import { TeacherChatBot } from './components/TeacherChatBot';
import { TeacherTicketsDrawer } from './components/TeacherTicketsDrawer';
import { DispatchSlipModal } from './components/DispatchSlipModal';
import { TechnicianConsole } from './components/TechnicianConsole';
import { ProfileSetup } from './components/ProfileSetup';
import { AdminPage } from './components/AdminPage';
import { Landing } from './components/Landing';
import { DemoBadge } from './components/DemoBadge';
import { Logo } from './components/Logo';
import { StudentSupport } from './components/StudentSupport';
import { Phone, FileText, X } from 'lucide-react';
import type { PublicConfig, Role, SessionUser, Ticket, TicketUpdateInput, UserContext, UserRole } from './types';
import { HELP_DESK } from './data/schools';
import { ApiError, UNAUTHORIZED_EVENT, fetchAllTickets, fetchMyTickets, getConfig, getMe, logout, updateTicket } from './api';
import { loadProfile, saveProfile, type Profile } from './profile';

type Page = 'student' | 'teacher' | 'tech' | 'admin';

const PATHS: Record<Page, string> = { student: '/student', teacher: '/teacher', tech: '/tech', admin: '/admin' };
const LABELS: Record<Page, string> = { student: 'Student view', teacher: 'Teacher view', tech: 'Technician', admin: 'Admin' };
const ROLE_LABELS: Record<Role, string> = { student: 'Student', staff: 'Teacher / staff', tech: 'Technician', admin: 'Admin' };
/** Where each role lands, and every page it may open. The server enforces the same rules on the data. */
const HOME: Record<Role, Page> = { student: 'student', staff: 'teacher', tech: 'tech', admin: 'admin' };
const ALLOWED: Record<Role, Page[]> = {
  student: ['student'],
  staff: ['teacher'],
  tech: ['tech', 'teacher', 'student'],
  admin: ['admin', 'tech', 'teacher', 'student'],
};

const pageFromPath = (path: string): Page | null =>
  (Object.keys(PATHS) as Page[]).find(p => path === PATHS[p] || path.startsWith(`${PATHS[p]}/`)) ?? null;

export default function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [path, setPath] = useState(window.location.pathname);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [situation, setSituation] = useState<Extract<UserRole, 'teacher_active' | 'teacher_prep' | 'staff'>>('teacher_prep');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [techError, setTechError] = useState<string | null>(null);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTicketForSlip, setSelectedTicketForSlip] = useState<Ticket | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);

  // ---- Boot --------------------------------------------------------------
  const boot = useCallback(async () => {
    setConfigError(false);
    setBooting(true);
    try {
      const [c, me] = await Promise.all([getConfig(), getMe()]);
      setConfig(c);
      setUser(me);
    } catch {
      setConfigError(true);
    } finally {
      setBooting(false);
    }
  }, []);
  useEffect(() => {
    boot();
  }, [boot]);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    const onUnauthorized = () => {
      setUser(null);
      setNotice('Your session ended. Please sign in again.');
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  const navigate = useCallback((to: string, replace = false) => {
    if (replace) window.history.replaceState(null, '', to);
    else window.history.pushState(null, '', to);
    setPath(to);
  }, []);

  // ---- Which page: the URL if allowed, otherwise this role's home -----------
  const requested = pageFromPath(path);
  const page: Page | null = user ? (requested && ALLOWED[user.role].includes(requested) ? requested : HOME[user.role]) : null;
  useEffect(() => {
    if (user && page && path !== PATHS[page] && !path.startsWith(`${PATHS[page]}/`)) navigate(PATHS[page], true);
  }, [user, page, path, navigate]);

  const email = user?.email;
  useEffect(() => {
    setProfile(email ? loadProfile(email) : null);
    setEditingProfile(false);
  }, [email]);

  // ---- My requests (tied to the account, so it works on any device) ----------
  const refreshMine = useCallback(async () => {
    if (!email) return setMyTickets([]);
    try {
      setMyTickets(await fetchMyTickets());
    } catch {
      /* keep what we have; the next poll retries */
    }
  }, [email]);
  useEffect(() => {
    refreshMine();
    const t = setInterval(refreshMine, 30_000);
    return () => clearInterval(t);
  }, [refreshMine]);

  // ---- Technician queue --------------------------------------------------
  const refreshAll = useCallback(async () => {
    try {
      setTickets(await fetchAllTickets());
      setTechError(null);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setTechError('Could not refresh the queue. Retrying automatically.');
    }
  }, []);
  useEffect(() => {
    if (page !== 'tech') return;
    refreshAll();
    const t = setInterval(refreshAll, 20_000);
    return () => clearInterval(t);
  }, [page, refreshAll]);

  const handleUpdateTicket = async (id: string, updates: TicketUpdateInput) => {
    try {
      const updated = await updateTicket(id, updates);
      setTickets(prev => prev.map(t => (t.id === id ? updated : t)));
      setTechError(null);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setTechError(err instanceof ApiError ? err.message : 'Could not save the change.');
    }
  };

  const handleTicketCreated = (ticket: Ticket) => setMyTickets(prev => [ticket, ...prev.filter(t => t.id !== ticket.id)]);

  const handleSignOut = async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setTickets([]);
      setMyTickets([]);
      setNotice(null);
      navigate('/', true);
    }
  };

  // ---- Render gates ------------------------------------------------------
  if (configError) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 bg-gray-100 text-sm text-gray-700">
        <p>The help desk could not be reached.</p>
        <button type="button" onClick={boot} className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold">Try again</button>
      </div>
    );
  }
  if (booting || !config) {
    return <div className="h-[100dvh] flex items-center justify-center bg-gray-100 text-xs text-gray-500">Loading...</div>;
  }

  // Signed-out visitors get the landing page, which carries the sign-in panel.
  if (!user) {
    return <Landing config={config} notice={notice} onSignedIn={u => { setUser(u); setNotice(null); }} />;
  }

  const isChatPage = page === 'student' || page === 'teacher';
  // Prototype: in demo mode the student page is the bilingual support flow. Teacher/staff pages are unchanged.
  const supportDemo = config.demoMode && page === 'student';
  const needsProfile = isChatPage && !supportDemo && user && (!profile || editingProfile);

  const userContext: UserContext | null =
    user && profile && isChatPage
      ? {
          role: page === 'student' ? 'student' : situation,
          userName: user.name,
          userEmail: user.email,
          school: profile.school,
          room: profile.room,
          phoneOrExt: profile.phoneOrExt,
        }
      : null;

  const handleSaveProfile = (p: Profile) => {
    setProfile(p);
    if (user) saveProfile(user.email, p);
  };

  const handleUpdateUserContext = (ctx: UserContext) => {
    if (ctx.role !== 'student') setSituation(ctx.role as typeof situation);
    handleSaveProfile({ school: ctx.school, room: ctx.room, phoneOrExt: ctx.phoneOrExt });
  };

  return (
    <div className="h-[100dvh] bg-gray-100 text-gray-900 flex flex-col font-sans antialiased overflow-hidden">
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <h1 className="text-gray-900 leading-none"><Logo /></h1>
              <span className="text-xs text-gray-500 font-medium">IT Help Desk</span>
              {config.demoMode && (
                <DemoBadge />
              )}
            </div>
            <p className="text-xs text-gray-500">{config.districtName}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {user && page && ALLOWED[user.role].length > 1 &&
              ALLOWED[user.role].map(p => (
                <button
                  key={p} type="button" onClick={() => navigate(PATHS[p])} aria-current={p === page ? 'page' : undefined}
                  className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg border ${
                    p === page ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {LABELS[p]}
                </button>
              ))}

            {user && isChatPage && !needsProfile && !supportDemo && (
              <button type="button" onClick={() => setEditingProfile(true)} className="hidden sm:inline-flex px-2.5 py-1 text-xs border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
                {profile?.room}
              </button>
            )}

            {user && isChatPage && myTickets.length > 0 && (
              <button type="button" onClick={() => setIsDrawerOpen(true)} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg font-medium">
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>Requests ({myTickets.length})</span>
              </button>
            )}

            <button type="button" onClick={() => setShowContactModal(true)} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
              <Phone className="w-3 h-3 text-gray-500" />
              <span className="hidden sm:inline">Contact IT</span>
            </button>

            {user && (
              <>
                <span className="hidden md:inline text-xs text-gray-500">
                  {user.name} · {ROLE_LABELS[user.role]}
                </span>
                <button type="button" onClick={handleSignOut} className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className={`flex-1 w-full mx-auto p-2 sm:p-4 flex flex-col min-h-0 overflow-hidden ${page === 'tech' || page === 'admin' ? 'max-w-5xl' : 'max-w-3xl'}`}>
        {needsProfile ? (
          <ProfileSetup user={user} initial={profile} onSave={p => { handleSaveProfile(p); setEditingProfile(false); }} onCancel={profile ? () => setEditingProfile(false) : undefined} />
        ) : supportDemo ? (
          <StudentSupport onTicketCreated={handleTicketCreated} />
        ) : page === 'admin' ? (
          <AdminPage user={user} domain={config.domain} />
        ) : page === 'tech' ? (
          <>
            {techError && <div role="alert" className="mb-2 text-xs text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg shrink-0">{techError}</div>}
            <TechnicianConsole districtName={config.districtName} tickets={tickets} onRefresh={refreshAll} onUpdateTicket={handleUpdateTicket} onViewDispatchSlip={setSelectedTicketForSlip} />
          </>
        ) : userContext ? (
          <TeacherChatBot
            userContext={userContext}
            onUpdateUserContext={handleUpdateUserContext}
            onTicketCreated={handleTicketCreated}
            onViewDispatchSlip={setSelectedTicketForSlip}
            onContactIT={() => setShowContactModal(true)}
          />
        ) : null}
      </main>

      <TeacherTicketsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        tickets={myTickets}
        userName={user?.name || ''}
        onViewDispatchSlip={ticket => {
          setIsDrawerOpen(false);
          setSelectedTicketForSlip(ticket);
        }}
      />

      {selectedTicketForSlip && <DispatchSlipModal districtName={config.districtName} ticket={selectedTicketForSlip} onClose={() => setSelectedTicketForSlip(null)} />}

      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white border border-gray-200 rounded-lg max-w-md w-full p-5 text-gray-900 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">District IT Help Desk</h3>
                <p className="text-xs text-gray-500">Technology Services & Field Support</p>
              </div>
              <button type="button" onClick={() => setShowContactModal(false)} className="text-gray-400 hover:text-gray-700 p-1" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs text-gray-700">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-semibold block text-gray-900">Phone</span>
                <p className="text-gray-600 mt-0.5">Call <strong>{HELP_DESK.ext}</strong> from any classroom or office phone.</p>
                <p className="text-gray-500 text-xs mt-1">Available {HELP_DESK.hours}.</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-semibold block text-gray-900">Media Center Tech Desk (students)</span>
                <p className="text-gray-600 mt-0.5">Walk in to the school library for Chromebook loaners and charger replacements.</p>
              </div>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="font-semibold block text-gray-900">Email</span>
                <p className="text-gray-600 mt-0.5">{HELP_DESK.email}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setShowContactModal(false)} className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
