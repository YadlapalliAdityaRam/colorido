import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Calendar, Users, Shield, UserCheck, Clock,
  Radio, Image as ImageIcon, Trophy, Megaphone, Settings, Plus,
  Search, ArrowLeft, Edit3, Trash2, Check, X, ExternalLink,
  Copy, RefreshCw, AlertCircle, AlertTriangle, LogOut, Download,
  MapPin, Menu, ScrollText
} from 'lucide-react';
import type { EventItem, Registration, Venue, EventResult } from '../types';
import { apiService, apiUrl } from '../services/apiService';
import { TeamDetailsModal } from '../components/TeamDetailsModal';
import { DecideWinnerModal } from '../components/DecideWinnerModal';
import { AdminGalleryManager } from '../components/AdminGalleryManager';
import { AboutPageManager } from '../components/aboutExperience/AboutPageManager';
import { FestivalPassAdminPreview } from '../components/festivalPass/FestivalPass';
import { getRequiredPlayerCount, isTeamRegistration } from '../utils/eventRegistration';

interface AdminPageProps {
  events: EventItem[];
  registrations: Registration[];
  venues: Venue[];
  onRefreshData: () => void;
  onNavigate?: (view: string, param?: string) => void;
}

type AdminSection =
  | 'dashboard'
  | 'events'
  | 'registrations'
  | 'teams'
  | 'players'
  | 'schedule'
  | 'live'
  | 'gallery'
  | 'about'
  | 'results'
  | 'announcements'
  | 'settings';

interface AnnouncementItem {
  id: string;
  title: string;
  category: 'URGENT' | 'SCHEDULE' | 'GENERAL';
  message: string;
  timestamp: string;
  isActive: boolean;
}

const slugify = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const AdminPage: React.FC<AdminPageProps> = ({
  events: initialEvents,
  registrations: initialRegistrations,
  venues,
  onRefreshData,
  onNavigate,
}) => {
  // 1. Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('admin@rvrjc.ac.in');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 2. Navigation & Layout State
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventDetailTab, setEventDetailTab] = useState<'overview' | 'registrations' | 'teams' | 'live' | 'results'>('overview');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 3. Data State
  const [eventsList, setEventsList] = useState<EventItem[]>(initialEvents);
  const [registrationsList, setRegistrationsList] = useState<Registration[]>(initialRegistrations);
  const [resultsList, setResultsList] = useState<EventResult[]>([]);
  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; action: string; target: string; description: string; timestamp: string; adminEmail: string }>>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(() => {
    const saved = localStorage.getItem('colorido_announcements');
    if (saved) {
      try { return JSON.parse(saved); } catch { }
    }
    return [
      {
        id: 'ann-1',
        title: 'Football Championship Draw Finalized',
        category: 'SCHEDULE',
        message: 'The match fixtures for Day 1 inter-college football have been drawn. Reporting time 08:30 AM at Main Turf Ground.',
        timestamp: '2026-09-27T09:00:00Z',
        isActive: true,
      },
      {
        id: 'ann-2',
        title: 'Mandatory Student ID Verification',
        category: 'URGENT',
        message: 'All participants must present original bonafide College ID cards at the Registration Desk prior to match commencement.',
        timestamp: '2026-09-26T14:30:00Z',
        isActive: true,
      }
    ];
  });

  // 4. Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRegDetail, setSelectedRegDetail] = useState<Registration | null>(null);
  const [selectedTeamRoster, setSelectedTeamRoster] = useState<Registration | null>(null);

  // Decide Winner Modal
  const [showDecideWinnerModal, setShowDecideWinnerModal] = useState(false);
  const [winnerEventToDecide, setWinnerEventToDecide] = useState<EventItem | null>(null);
  const [existingEventResult, setExistingEventResult] = useState<EventResult | null>(null);

  // 5. Filters State
  // Events filter
  const [eventSearch, setEventSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState<'ALL' | 'SPORTS' | 'CULTURAL'>('ALL');
  const [eventStatusFilter, setEventStatusFilter] = useState<'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'>('ALL');
  const [eventSortBy] = useState<'date_asc' | 'date_desc' | 'title' | 'registrations'>('date_asc');

  // Registrations filter
  const [regSearch, setRegSearch] = useState('');
  const [regCollegeFilter, setRegCollegeFilter] = useState('ALL');
  const [regStatusFilter, setRegStatusFilter] = useState('ALL');
  const [regEventFilter] = useState('ALL');

  // Teams filter
  const [teamSearch, setTeamSearch] = useState('');
  const [teamEventFilter, setTeamEventFilter] = useState('ALL');
  const [teamCollegeFilter, setTeamCollegeFilter] = useState('ALL');

  // Players filter
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerEventFilter, setPlayerEventFilter] = useState('ALL');
  const [playerCollegeFilter, setPlayerCollegeFilter] = useState('ALL');

  // Schedule filter
  const [scheduleVenueFilter, setScheduleVenueFilter] = useState('ALL');

  // 6. Form State for Create/Edit Event
  const [evtType, setEvtType] = useState<'sports' | 'cultural'>('sports');
  const [evtTitle, setEvtTitle] = useState('');
  const [evtCategory, setEvtCategory] = useState('Football');
  const [evtDate, setEvtDate] = useState('2026-09-30');
  const [evtRegOpenDate, setEvtRegOpenDate] = useState('2026-09-01');
  const [evtRegCloseDate, setEvtRegCloseDate] = useState('2026-09-28');
  const [evtStartHour, setEvtStartHour] = useState('10');
  const [evtStartMin, setEvtStartMin] = useState('30');
  const [evtStartAmPm, setEvtStartAmPm] = useState<'AM' | 'PM'>('AM');
  const [evtEndHour, setEvtEndHour] = useState('01');
  const [evtEndMin, setEvtEndMin] = useState('30');
  const [evtEndAmPm, setEvtEndAmPm] = useState<'AM' | 'PM'>('PM');
  const [evtVenue, setEvtVenue] = useState(venues[0]?.name || 'Main Turf Ground');
  const [evtPlayersPerTeam, setEvtPlayersPerTeam] = useState<number>(11);
  const [evtRegType, setEvtRegType] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  const [evtMaxRegs, setEvtMaxRegs] = useState<number>(32);
  const [evtTeamLeaderPhone, setEvtTeamLeaderPhone] = useState('+91 98765 43210');
  const [evtBannerImage, setEvtBannerImage] = useState('/global_sports_profile.jpeg');
  const [evtDescription, setEvtDescription] = useState('National level championship organized at R.V.R. & J.C. Campus.');
  const [evtRules, setEvtRules] = useState('1. AIFF standard rules apply.\n2. Valid College Student ID is mandatory for all players.');
  const [evtLiveEnabled, setEvtLiveEnabled] = useState(false);
  const [evtLiveSlug, setEvtLiveSlug] = useState('');
  const [evtQrEnabled, setEvtQrEnabled] = useState(false);
  const [evtQrImage, setEvtQrImage] = useState('');
  const [evtCoordinators, setEvtCoordinators] = useState<Array<{ name: string; phone: string; role: string }>>([]);
  const [validationError, setValidationError] = useState('');

  // 7. Live Scorer State
  const [activeScorerEventId, setActiveScorerEventId] = useState<string>('');
  const [scorerTeamA, setScorerTeamA] = useState('');
  const [scorerTeamB, setScorerTeamB] = useState('');
  const [scorerScoreA, setScorerScoreA] = useState(0);
  const [scorerScoreB, setScorerScoreB] = useState(0);
  const [scorerStatus, setScorerStatus] = useState<'UPCOMING' | 'LIVE' | 'HALFTIME' | 'FULL_TIME' | 'COMPLETED'>('LIVE');
  const [scorerStartTime, setScorerStartTime] = useState('10:30 AM');
  const [scorerEndTime, setScorerEndTime] = useState('');
  const [scorerWinner, setScorerWinner] = useState('');
  const [scorerRemarks, setScorerRemarks] = useState('');
  const [isSavingScore, setIsSavingScore] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 8. New Announcement Form State
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnCategory, setNewAnnCategory] = useState<'URGENT' | 'SCHEDULE' | 'GENERAL'>('GENERAL');
  const [newAnnMessage, setNewAnnMessage] = useState('');

  // Fetch data on mount
  const fetchBackendData = async () => {
    setIsRefreshing(true);
    try {
      const [evts, regs, results] = await Promise.all([
        apiService.getEvents(),
        fetch(apiUrl('/registrations')).then(r => r.ok ? r.json() : []).catch(() => []),
        apiService.getResults(),
      ]);
      if (evts && evts.length > 0) setEventsList(evts);
      if (regs && Array.isArray(regs)) setRegistrationsList(regs);
      if (results && Array.isArray(results)) setResultsList(results);
      onRefreshData();
    } catch {
      // Fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(apiUrl('/audit-logs'));
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch { }
  };

  useEffect(() => {
    fetchBackendData();
    fetchAuditLogs();
  }, []);

  // Update active scorer state when activeScorerEventId changes
  useEffect(() => {
    const evt = eventsList.find(e => e.id === activeScorerEventId);
    if (evt) {
      const m = evt.liveMatch;
      setScorerTeamA(m?.teamA || 'Team A');
      setScorerTeamB(m?.teamB || 'Team B');
      setScorerScoreA(m?.scoreA ?? 0);
      setScorerScoreB(m?.scoreB ?? 0);
      setScorerStatus((m?.status as any) || 'LIVE');
      setScorerStartTime(m?.startTime || evt.startTime || '10:30 AM');
      setScorerEndTime(m?.endTime || '');
      setScorerWinner(m?.winner || '');
      setScorerRemarks(m?.remarks || '');
    }
  }, [activeScorerEventId, eventsList]);

  // Default scorer event to the first live or upcoming event if none selected
  useEffect(() => {
    if (!activeScorerEventId && eventsList.length > 0) {
      const liveEvt = eventsList.find(e => e.liveEnabled) || eventsList[0];
      setActiveScorerEventId(liveEvt.id);
    }
  }, [eventsList, activeScorerEventId]);

  // Derived Statistics
  const activeEvent = eventsList.find(e => e.id === selectedEventId) || null;
  const activeEventRegs = selectedEventId ? registrationsList.filter(r => r.eventId === selectedEventId) : [];

  const getEventStatusTag = (evt: EventItem): 'UPCOMING' | 'ONGOING' | 'COMPLETED' => {
    if (resultsList.some(r => r.eventId === evt.id)) return 'COMPLETED';
    if (evt.status === 'completed') return 'COMPLETED';
    if (evt.liveEnabled && evt.liveMatch?.status === 'LIVE') return 'ONGOING';
    const now = new Date();
    const evtDateObj = new Date(evt.eventDate || evt.dateTime.split('·')[0]);
    if (!isNaN(evtDateObj.getTime())) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const evtDay = new Date(evtDateObj.getFullYear(), evtDateObj.getMonth(), evtDateObj.getDate());
      if (evtDay < today) return 'COMPLETED';
      if (evtDay.getTime() === today.getTime()) return 'ONGOING';
      return 'UPCOMING';
    }
    return 'UPCOMING';
  };

  const getEventStats = (eventId: string) => {
    const evtRegs = registrationsList.filter(r => r.eventId === eventId);
    const confirmedRegs = evtRegs.filter(r => r.status !== 'cancelled');
    const totalPlayers = evtRegs.reduce((sum, r) => sum + (r.members?.length || 1), 0);
    return {
      totalRegs: evtRegs.length,
      confirmedRegs: confirmedRegs.length,
      totalTeams: evtRegs.filter(r => r.format === 'team').length,
      totalPlayers,
    };
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim(), password: adminPassword }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.token) {
        throw new Error(result?.error || 'Invalid administrator credentials. Access restricted to Secretariat.');
      }
      // Keep authentication in memory; never trust a client-controlled localStorage flag.
      setIsAuthenticated(true);
      setAdminPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Form Reset
  const resetForm = (evt?: EventItem) => {
    setValidationError('');
    if (evt) {
      setEvtType(evt.type || 'sports');
      setEvtTitle(evt.title || '');
      setEvtCategory(evt.category || 'Football');
      setEvtDate(evt.eventDate || '2026-09-30');
      setEvtRegOpenDate(evt.regOpenDate || '2026-09-01');
      setEvtRegCloseDate(evt.regCloseDate || '2026-09-28');
      setEvtStartHour(evt.startHour || '10');
      setEvtStartMin(evt.startMin || '30');
      setEvtStartAmPm(evt.startAmPm || 'AM');
      setEvtEndHour(evt.endHour || '01');
      setEvtEndMin(evt.endMin || '30');
      setEvtEndAmPm(evt.endAmPm || 'PM');
      setEvtVenue(evt.venueName || venues[0]?.name || 'Main Turf Ground');
      setEvtPlayersPerTeam(getRequiredPlayerCount(evt));
      setEvtRegType(isTeamRegistration(evt) ? 'TEAM' : 'INDIVIDUAL');
      setEvtMaxRegs(evt.seatsTotal || 32);
      setEvtTeamLeaderPhone(evt.teamLeaderPhone || '+91 98765 43210');
      setEvtBannerImage(evt.bannerImage || '/global_sports_profile.jpeg');
      setEvtDescription(evt.description || '');
      setEvtRules(evt.rules ? evt.rules.join('\n') : '1. Standard rules apply.\n2. Valid College ID is mandatory.');
      setEvtLiveEnabled(!!evt.liveEnabled);
      setEvtLiveSlug(evt.liveSlug || slugify(evt.title || ''));
      setEvtQrEnabled(!!(evt as any).qrEnabled);
      setEvtQrImage((evt as any).qrImage || '');
      setEvtCoordinators((evt as any).eventCoordinators || []);
    } else {
      setEvtType('sports');
      setEvtTitle('');
      setEvtCategory('Football');
      setEvtDate('2026-09-30');
      setEvtRegOpenDate('2026-09-01');
      setEvtRegCloseDate('2026-09-28');
      setEvtStartHour('10');
      setEvtStartMin('30');
      setEvtStartAmPm('AM');
      setEvtEndHour('01');
      setEvtEndMin('30');
      setEvtEndAmPm('PM');
      setEvtVenue(venues[0]?.name || 'Main Turf Ground');
      setEvtPlayersPerTeam(11);
      setEvtRegType('TEAM');
      setEvtMaxRegs(32);
      setEvtTeamLeaderPhone('+91 98765 43210');
      setEvtBannerImage(evtType === 'cultural' ? '/cultural_global_profile_photo.jpeg' : '/global_sports_profile.jpeg');
      setEvtDescription('');
      setEvtRules('1. Standard tournament regulations apply.\n2. Bonafide College ID is mandatory for all team players.');
      setEvtLiveEnabled(false);
      setEvtLiveSlug('');
      setEvtQrEnabled(false);
      setEvtQrImage('');
      setEvtCoordinators([]);
    }
  };

  // Event Save
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!evtTitle.trim()) {
      setValidationError('Event Name is required.');
      return;
    }
    if (!evtCategory.trim()) {
      setValidationError('Sport/Category is required.');
      return;
    }
    if (!evtDate) {
      setValidationError('Event Date is required.');
      return;
    }
    if (!evtVenue.trim()) {
      setValidationError('Venue is required.');
      return;
    }

    if (evtRegCloseDate && evtDate && new Date(evtRegCloseDate) > new Date(evtDate)) {
      setValidationError('Registration closing date cannot be after the Event date.');
      return;
    }

    const formattedStartTime = `${evtStartHour}:${evtStartMin} ${evtStartAmPm}`;
    const formattedEndTime = `${evtEndHour}:${evtEndMin} ${evtEndAmPm}`;
    const finalSlug = evtLiveSlug.trim() ? slugify(evtLiveSlug) : slugify(evtTitle);

    const evtPayload: Partial<EventItem> = {
      title: evtTitle.trim(),
      type: evtType,
      category: evtCategory.trim(),
      eventDate: evtDate,
      regOpenDate: evtRegOpenDate,
      regCloseDate: evtRegCloseDate,
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      startHour: evtStartHour,
      startMin: evtStartMin,
      startAmPm: evtStartAmPm,
      endHour: evtEndHour,
      endMin: evtEndMin,
      endAmPm: evtEndAmPm,
      dateTime: `${evtDate} · ${formattedStartTime} - ${formattedEndTime}`,
      venueName: evtVenue,
      seatsTotal: evtMaxRegs,
      seatsLeft: evtMaxRegs,
      bannerImage: evtBannerImage.trim() || (evtType === 'cultural' ? '/cultural_global_profile_photo.jpeg' : '/global_sports_profile.jpeg'),
      description: evtDescription.trim(),
      oneLineSummary: `${evtRegType === 'TEAM' ? `${evtPlayersPerTeam} Players` : 'Individual Entry'} · ${evtVenue}`,
      rules: evtRules.split('\n').filter(r => r.trim()),
      eligibility: 'Open to all bonafide college students',
      format: evtRegType === 'TEAM' ? 'team' : 'solo',
      playersPerTeam: evtPlayersPerTeam,
      maxTeamSize: evtPlayersPerTeam,
      minTeamSize: evtRegType === 'TEAM' ? evtPlayersPerTeam : 1,
      teamLeaderPhone: evtTeamLeaderPhone,
      liveEnabled: evtLiveEnabled,
      liveSlug: finalSlug,
      qrEnabled: evtQrEnabled,
      qrImage: evtQrEnabled ? evtQrImage : '',
      eventCoordinators: evtCoordinators.filter(c => c.name.trim() && c.phone.trim()),
      status: 'open',
    };

    try {
      if (showEditModal && activeEvent) {
        const updated = await apiService.updateEvent(activeEvent.id, evtPayload);
        setEventsList(prev => prev.map(item => item.id === activeEvent.id ? { ...item, ...updated } : item));
        setShowEditModal(false);
      } else {
        const created = await apiService.createEvent(evtPayload);
        setEventsList([created, ...eventsList]);
        setShowCreateModal(false);
      }
      resetForm();
      onRefreshData();
    } catch {
      alert('Failed to save event to database. Please verify backend connection.');
    }
  };

  // Delete Event
  const handleDeleteEventDirect = async (eventId: string, eventTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${eventTitle}"? All linked records will be archived.`)) return;
    try {
      await apiService.deleteEvent(eventId);
      setEventsList(prev => prev.filter(item => item.id !== eventId));
      if (selectedEventId === eventId) setSelectedEventId(null);
      onRefreshData();
    } catch {
      alert('Failed to delete event from database.');
    }
  };

  // Live Score Save
  const handleSaveLiveScore = async (targetEventId?: string) => {
    const evtId = targetEventId || activeScorerEventId;
    if (!evtId) return;
    setIsSavingScore(true);
    try {
      const matchPayload: any = {
        teamA: scorerTeamA || 'Team A',
        teamB: scorerTeamB || 'Team B',
        scoreA: Number(scorerScoreA),
        scoreB: Number(scorerScoreB),
        status: scorerStatus,
        startTime: scorerStartTime,
        endTime: scorerEndTime,
        winner: scorerWinner,
        remarks: scorerRemarks,
        lastUpdated: 'Just now',
      };
      await apiService.updateLiveScore(evtId, matchPayload);
      setEventsList(prev => prev.map(e => e.id === evtId ? { ...e, liveMatch: matchPayload, liveEnabled: true } : e));
    } catch {
      alert('Failed to update live match scores.');
    } finally {
      setIsSavingScore(false);
    }
  };

  // Winner Decision
  const handleOpenDecideWinner = (eventItem: EventItem) => {
    setWinnerEventToDecide(eventItem);
    const existing = resultsList.find(r => r.eventId === eventItem.id || r.eventTitle.toLowerCase() === eventItem.title.toLowerCase());
    setExistingEventResult(existing || null);
    setShowDecideWinnerModal(true);
  };

  const handlePublishEventResult = async (result: Partial<EventResult>) => {
    const savedResult = await apiService.createResult(result);
    const updatedResults = resultsList.filter(r => r.eventId !== savedResult.eventId);
    updatedResults.push(savedResult);
    setResultsList(updatedResults);
    onRefreshData();
  };

  // Registration Actions
  const handleUpdateRegStatus = async (regId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch(apiUrl(`/registrations/${regId}/status`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setRegistrationsList(prev => prev.map(r => r.id === regId || r.registrationId === regId ? { ...r, status: status.toLowerCase() as any } : r));
      if (selectedRegDetail) setSelectedRegDetail({ ...selectedRegDetail, status: status.toLowerCase() as any });
    } catch { }
  };

  const handleDeleteRegistration = async (regId: string) => {
    if (!confirm('Are you sure you want to permanently delete this registration record?')) return;
    try {
      await fetch(apiUrl(`/registrations/${regId}`), { method: 'DELETE' });
      setRegistrationsList(prev => prev.filter(r => r.id !== regId && r.registrationId !== regId));
      setSelectedRegDetail(null);
    } catch { }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Registration ID', 'Event Title', 'Event Type', 'Team / Participant', 'College', 'Captain Name', 'Captain Email', 'Captain Phone', 'Squad Size', 'Players & Roll Numbers', 'Status', 'Date Registered'];
    const rows = registrationsList.map(r => {
      const playersList = r.members && r.members.length > 0
        ? r.members.map(m => `${m.name} (${(m as any).rollNumber || m.studentId || 'N/A'})`).join('; ')
        : `${r.participantName} (${r.studentId})`;
      return [
        r.registrationId,
        `"${r.eventTitle.replace(/"/g, '""')}"`,
        r.eventType,
        `"${(r.teamName || r.participantName).replace(/"/g, '""')}"`,
        `"${r.collegeName.replace(/"/g, '""')}"`,
        `"${r.participantName.replace(/"/g, '""')}"`,
        r.participantEmail,
        r.participantPhone,
        r.members?.length || 1,
        `"${playersList.replace(/"/g, '""')}"`,
        r.status,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '',
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `COLORIDO_2K26_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Announcements publisher
  const handleAddAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnMessage.trim()) return;
    const item: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle.trim(),
      category: newAnnCategory,
      message: newAnnMessage.trim(),
      timestamp: new Date().toISOString(),
      isActive: true,
    };
    const updated = [item, ...announcements];
    setAnnouncements(updated);
    localStorage.setItem('colorido_announcements', JSON.stringify(updated));
    setNewAnnTitle('');
    setNewAnnMessage('');
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    localStorage.setItem('colorido_announcements', JSON.stringify(updated));
  };

  // Flattened Players List
  const allPlayers = registrationsList.flatMap(r => {
    if (r.members && r.members.length > 0) {
      return r.members.map((m, idx) => ({
        id: `${r.id}-${idx}`,
        name: m.name,
        rollNumber: (m as any).rollNumber || m.studentId || `L24CB00${idx + 1}`,
        college: m.college || r.collegeName,
        eventId: r.eventId,
        eventTitle: r.eventTitle,
        eventType: r.eventType,
        teamName: r.teamName || 'Solo Entry',
        role: idx === 0 ? 'Captain / Lead' : 'Team Member',
        regId: r.registrationId,
      }));
    }
    return [{
      id: `${r.id}-0`,
      name: r.participantName,
      rollNumber: r.studentId || 'N/A',
      college: r.collegeName,
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      eventType: r.eventType,
      teamName: 'Solo Participant',
      role: 'Participant',
      regId: r.registrationId,
    }];
  });

  // Filtered Lists
  const filteredEvents = eventsList.filter(evt => {
    const status = getEventStatusTag(evt);
    if (eventStatusFilter !== 'ALL' && status !== eventStatusFilter) return false;
    if (eventTypeFilter !== 'ALL' && evt.type.toUpperCase() !== eventTypeFilter) return false;
    if (eventSearch.trim()) {
      const q = eventSearch.toLowerCase();
      const matchTitle = evt.title.toLowerCase().includes(q);
      const matchCat = evt.category.toLowerCase().includes(q);
      const matchVenue = evt.venueName.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchVenue) return false;
    }
    return true;
  }).sort((a, b) => {
    if (eventSortBy === 'date_asc') return (a.eventDate || '').localeCompare(b.eventDate || '');
    if (eventSortBy === 'date_desc') return (b.eventDate || '').localeCompare(a.eventDate || '');
    if (eventSortBy === 'title') return a.title.localeCompare(b.title);
    if (eventSortBy === 'registrations') {
      const countA = registrationsList.filter(r => r.eventId === a.id).length;
      const countB = registrationsList.filter(r => r.eventId === b.id).length;
      return countB - countA;
    }
    return 0;
  });

  const uniqueColleges = Array.from(new Set(registrationsList.map(r => r.collegeName).filter(Boolean)));

  const filteredRegistrations = registrationsList.filter(r => {
    if (regEventFilter !== 'ALL' && r.eventId !== regEventFilter) return false;
    if (regCollegeFilter !== 'ALL' && r.collegeName !== regCollegeFilter) return false;
    if (regStatusFilter !== 'ALL' && r.status.toUpperCase() !== regStatusFilter) return false;
    if (regSearch.trim()) {
      const q = regSearch.toLowerCase();
      const matchTeam = r.teamName?.toLowerCase().includes(q);
      const matchCollege = r.collegeName.toLowerCase().includes(q);
      const matchLead = r.participantName.toLowerCase().includes(q);
      const matchId = r.registrationId.toLowerCase().includes(q);
      const matchMember = r.members?.some(m => m.name.toLowerCase().includes(q) || (m as any).rollNumber?.toLowerCase().includes(q));
      if (!matchTeam && !matchCollege && !matchLead && !matchId && !matchMember) return false;
    }
    return true;
  });

  const filteredPlayers = allPlayers.filter(p => {
    if (playerCollegeFilter !== 'ALL' && p.college !== playerCollegeFilter) return false;
    if (playerSearch.trim()) {
      const q = playerSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.rollNumber.toLowerCase().includes(q) || p.eventTitle.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q);
    }
    return true;
  });

  // Filtered Teams
  const teamsList = registrationsList.filter(r => r.format === 'team' || !!r.teamName);

  // UNAUTHENTICATED STATE
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-stone-300 rounded-md p-6 shadow-sm space-y-5">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded bg-white border border-stone-200 p-1 flex items-center justify-center mx-auto">
              <img src="/rvrjc_logo.png" alt="RVR & JC Crest" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-stone-500">R.V.R. & J.C. College of Engineering</p>
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">Festival Secretariat Admin</h1>
              <p className="text-xs text-stone-500">Enter authorized credentials to continue</p>
            </div>
          </div>

          {loginError && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-medium text-stone-700 mb-1">Administrative Email</label>
              <input
                type="email"
                autoComplete="username"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@rvrjc.ac.in"
                className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-[#800020] transition-colors"
                required
              />
            </div>

            <div>
              <label className="block font-medium text-stone-700 mb-1">Passcode</label>
              <input
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-[#800020] transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-9 rounded bg-[#800020] hover:bg-[#6b001a] text-white font-medium text-xs tracking-wide transition-colors flex items-center justify-center gap-1.5"
            >
              {isLoggingIn ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Sign In to Secretariat</span>}
            </button>
          </form>

          <div className="pt-3 border-t border-stone-200 text-center">
            <span className="text-[11px] text-stone-500">COLORIDO 2K26 · Authorized Personnel Only</span>
          </div>
        </div>
      </div>
    );
  }

  // NAVIGATION ITEMS LIST
  const navItems: Array<{ id: AdminSection; label: string; icon: React.FC<{ className?: string }>; count?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Events', icon: Calendar, count: eventsList.length },
    { id: 'registrations', label: 'Registrations', icon: Users, count: registrationsList.length },
    { id: 'teams', label: 'Teams', icon: Shield, count: teamsList.length },
    { id: 'players', label: 'Players', icon: UserCheck, count: allPlayers.length },
    { id: 'schedule', label: 'Schedule', icon: Clock },
    { id: 'live', label: 'Live Events', icon: Radio, count: eventsList.filter(e => e.liveEnabled).length },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'about', label: 'About Page', icon: ScrollText },
    { id: 'results', label: 'Results', icon: Trophy, count: resultsList.length },
    { id: 'announcements', label: 'Announcements', icon: Megaphone, count: announcements.filter(a => a.isActive).length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-stone-100 text-stone-900 font-sans antialiased">
      {/* 1. LEFT SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-stone-900 text-stone-200 flex flex-col justify-between border-r border-stone-800 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex flex-col">
          <div className="h-16 px-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white p-1 flex items-center justify-center flex-shrink-0">
                <img src="/rvrjc_logo.png" alt="RVR & JC" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">COLORIDO 2K26</span>
                <span className="text-[10px] tracking-wider uppercase text-stone-400 block">Secretariat Admin</span>
              </div>
            </div>

            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded hover:bg-stone-800 text-stone-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id && !selectedEventId;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSelectedEventId(null);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-stone-800 text-white border-l-2 border-[#800020]'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-stone-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.count === 'number' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        isActive ? 'bg-stone-700 text-stone-200' : 'bg-stone-800 text-stone-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-stone-800 space-y-2">
          <div className="flex items-center justify-between px-2 text-[11px] text-stone-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online</span>
            </span>
            <span className="font-mono text-[10px] text-stone-500">v2.6.0</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            {onNavigate && (
              <button
                onClick={() => onNavigate('home')}
                className="flex-1 h-8 px-2.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                title="Open Public Site"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Public Site</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="h-8 px-2.5 rounded bg-stone-800 hover:bg-red-950/60 text-stone-400 hover:text-red-400 text-xs font-medium flex items-center justify-center transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-150"
          onClick={() => setIsMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 2. MAIN APPLICATION CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* TOP BAR */}
        <header className="h-14 bg-white border-b border-stone-200 px-3 sm:px-6 flex items-center justify-between flex-shrink-0 z-30">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded hover:bg-stone-100 text-stone-600 shrink-0"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {selectedEventId && activeEvent ? (
              <div className="flex items-center gap-2 text-xs truncate">
                <button
                  onClick={() => setSelectedEventId(null)}
                  className="text-stone-500 hover:text-stone-900 font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Events</span>
                </button>
                <span className="text-stone-300">/</span>
                <span className="font-semibold text-stone-900 truncate">{activeEvent.title}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-stone-900 uppercase tracking-wide truncate">
                  {activeSection === 'dashboard' && 'Operations Dashboard'}
                  {activeSection === 'events' && 'Events Master Directory'}
                  {activeSection === 'registrations' && 'Registration Records'}
                  {activeSection === 'teams' && 'Teams & Squads'}
                  {activeSection === 'players' && 'Student Players Roster'}
                  {activeSection === 'schedule' && 'Festival Schedule'}
                  {activeSection === 'live' && 'Live Match Operations'}
                  {activeSection === 'gallery' && 'Festival Media Manager'}
                  {activeSection === 'about' && 'About Page Story Editor'}
                  {activeSection === 'results' && 'Official Podium Results'}
                  {activeSection === 'announcements' && 'Public Announcements'}
                  {activeSection === 'settings' && 'System Configuration & Audits'}
                </h1>
              </div>
            )}
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={fetchBackendData}
              disabled={isRefreshing}
              className="h-8 px-2 sm:px-2.5 rounded bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Refresh Data from Server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#800020]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="h-8 px-2.5 sm:px-3 rounded bg-[#800020] hover:bg-[#6b001a] text-white text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">Event</span>
            </button>

            <div className="hidden md:flex items-center gap-2 pl-2 border-l border-stone-200 text-xs">
              <span className="w-6 h-6 rounded bg-stone-200 text-stone-700 font-bold flex items-center justify-center text-[10px]">
                SA
              </span>
              <span className="font-medium text-stone-700">{adminEmail}</span>
            </div>
          </div>
        </header>

        {/* VIEW CONTAINER */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-stone-100">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* A. EVENT DETAIL TABBED VIEW (When an event is selected) */}
            {selectedEventId && activeEvent ? (
              <div className="space-y-4">
                {/* Event Details Header Card */}
                <div className="bg-white border border-stone-200 rounded-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                        activeEvent.type === 'sports' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-[#800020]'
                      }`}>
                        {activeEvent.type} · {activeEvent.category}
                      </span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                        {isTeamRegistration(activeEvent) ? `${getRequiredPlayerCount(activeEvent)} Players / Team` : 'Individual Solo'}
                      </span>
                      {activeEvent.liveEnabled && (
                        <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-700 flex items-center gap-1">
                          <Radio className="w-3 h-3 text-rose-600" />
                          <span>Live Broadcast Active</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-stone-900 tracking-tight">{activeEvent.title}</h2>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-stone-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        <span>{activeEvent.eventDate || activeEvent.dateTime.split('·')[0]}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        <span>{activeEvent.startTime || '10:30 AM'} - {activeEvent.endTime || '01:30 PM'}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>{activeEvent.venueName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <FestivalPassAdminPreview previewEvent={activeEvent} triggerLabel="Preview Festival Pass" triggerClassName="inline-flex h-8 items-center gap-1.5 rounded border border-[#C5A059] bg-[#101a34] px-3 text-xs font-medium text-white hover:bg-[#800020]" />
                    <button
                      onClick={() => handleOpenDecideWinner(activeEvent)}
                      className="h-8 px-3 rounded bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-600" />
                      <span>{resultsList.some(r => r.eventId === activeEvent.id) ? 'Edit Podium' : 'Decide Winner'}</span>
                    </button>

                    <button
                      onClick={() => {
                        resetForm(activeEvent);
                        setShowEditModal(true);
                      }}
                      className="h-8 px-3 rounded bg-white border border-stone-300 text-stone-800 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-500" />
                      <span>Edit Event</span>
                    </button>

                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-8 px-2.5 rounded bg-white border border-stone-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                      title="Archive or Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Event Tabs Navigation */}
                <div className="border-b border-stone-200 flex gap-4 text-xs font-medium">
                  {(['overview', 'registrations', 'teams', 'live', 'results'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setEventDetailTab(tab)}
                      className={`py-2 px-1 border-b-2 capitalize transition-colors ${
                        eventDetailTab === tab
                          ? 'border-[#800020] text-[#800020] font-semibold'
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      {tab === 'live' ? 'Live Scorer' : tab}
                    </button>
                  ))}
                </div>

                {/* Tab: Overview */}
                {eventDetailTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="md:col-span-2 space-y-4">
                      <div className="bg-white border border-stone-200 rounded-md p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Event Overview</h3>
                        <p className="text-xs text-stone-700 leading-relaxed whitespace-pre-line">
                          {activeEvent.description || 'No description provided for this event.'}
                        </p>
                      </div>

                      <div className="bg-white border border-stone-200 rounded-md p-5 space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Rules & Regulations</h3>
                        <ul className="text-xs text-stone-700 space-y-1.5 list-disc pl-4">
                          {activeEvent.rules && activeEvent.rules.length > 0 ? (
                            activeEvent.rules.map((rule, idx) => <li key={idx}>{rule}</li>)
                          ) : (
                            <li>Standard AIFF / Inter-University regulations apply.</li>
                          )}
                        </ul>
                      </div>

                      {activeEvent.eventCoordinators && activeEvent.eventCoordinators.length > 0 && (
                        <div className="bg-white border border-stone-200 rounded-md p-5 space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Designated Event Coordinators</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            {activeEvent.eventCoordinators.map((c: any, i: number) => (
                              <div key={i} className="p-2.5 rounded border border-stone-200 bg-stone-50">
                                <span className="font-semibold text-stone-900 block">{c.name}</span>
                                <span className="text-stone-500 text-[11px] block">{c.role || 'Coordinator'} · {c.phone}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="bg-white border border-stone-200 rounded-md p-4 space-y-3 text-xs">
                        <h3 className="font-bold uppercase tracking-wider text-stone-500 text-[11px]">Capacity & Roster Status</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between py-1 border-b border-stone-100">
                            <span className="text-stone-500">Registrations Count:</span>
                            <span className="font-semibold text-stone-900">{activeEventRegs.length} Teams</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-stone-100">
                            <span className="text-stone-500">Max Capacity:</span>
                            <span className="font-semibold text-stone-900">{activeEvent.seatsTotal || 'Unlimited'}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-stone-100">
                            <span className="text-stone-500">Total Players:</span>
                            <span className="font-semibold text-stone-900">
                              {activeEventRegs.reduce((sum, r) => sum + (r.members?.length || 1), 0)} Players
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-stone-500">Registration Closes:</span>
                            <span className="font-semibold text-stone-900">{activeEvent.regCloseDate || '28 Sep 2026'}</span>
                          </div>
                        </div>
                      </div>

                      {activeEvent.liveEnabled && (
                        <div className="bg-white border border-stone-200 rounded-md p-4 space-y-2 text-xs">
                          <h3 className="font-bold uppercase tracking-wider text-stone-500 text-[11px]">Public Live Broadcast Link</h3>
                          <p className="text-[11px] text-stone-500">Public users can watch live scoreboard updates at:</p>
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              type="text"
                              readOnly
                              value={`${window.location.origin}/live/${activeEvent.liveSlug || slugify(activeEvent.title)}`}
                              className="flex-1 h-8 px-2 bg-stone-50 border border-stone-200 rounded font-mono text-[10px] text-stone-700 select-all"
                            />
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/live/${activeEvent.liveSlug || slugify(activeEvent.title)}`;
                                navigator.clipboard.writeText(url);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2000);
                              }}
                              className="h-8 px-2.5 rounded bg-stone-800 hover:bg-stone-700 text-white font-medium text-xs flex items-center gap-1"
                            >
                              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Registrations */}
                {eventDetailTab === 'registrations' && (
                  <div className="bg-white border border-stone-200 rounded-md overflow-hidden space-y-0">
                    <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <h3 className="font-bold text-stone-900">Event Registrations</h3>
                        <p className="text-stone-500 text-[11px]">Showing all teams and participants registered for this event.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-500 font-medium">Total: {activeEventRegs.length} entries</span>
                        <button
                          onClick={handleExportCSV}
                          className="h-7 px-2.5 rounded bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-1 text-[11px]"
                        >
                          <Download className="w-3 h-3" />
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {activeEventRegs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No teams have registered for this event yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                              <th className="py-2.5 px-3">Reg ID</th>
                              <th className="py-2.5 px-3">Team / Participant</th>
                              <th className="py-2.5 px-3">College</th>
                              <th className="py-2.5 px-3">Captain Contact</th>
                              <th className="py-2.5 px-3">Players</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {activeEventRegs.map(reg => (
                              <tr key={reg.id || reg.registrationId} className="hover:bg-stone-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-stone-600">{reg.registrationId}</td>
                                <td className="py-2.5 px-3 font-medium text-stone-900">{reg.teamName || reg.participantName}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.collegeName}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.participantName} ({reg.participantPhone})</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.members?.length || 1} players</td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                    reg.status?.toUpperCase() === 'APPROVED' || reg.status === 'confirmed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {reg.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedTeamRoster(reg)}
                                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[11px] font-medium"
                                    >
                                      Roster
                                    </button>
                                    <button
                                      onClick={() => setSelectedRegDetail(reg)}
                                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-medium"
                                    >
                                      Review
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Teams & Squads */}
                {eventDetailTab === 'teams' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {activeEventRegs.map(reg => (
                      <div key={reg.id || reg.registrationId} className="bg-white border border-stone-200 rounded-md p-4 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-stone-500">{reg.registrationId}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 font-medium">
                            {reg.members?.length || 1} Players
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-stone-900 text-sm">{reg.teamName || reg.participantName}</h4>
                          <p className="text-stone-500 text-[11px] truncate">{reg.collegeName}</p>
                        </div>
                        <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-stone-500 text-[11px]">Capt: {reg.participantName}</span>
                          <button
                            onClick={() => setSelectedTeamRoster(reg)}
                            className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                          >
                            View Squad
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab: Live Scorer for this event */}
                {eventDetailTab === 'live' && (
                  <div className="bg-white border border-stone-200 rounded-md p-6 space-y-5 text-xs max-w-3xl">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h3 className="text-sm font-bold text-stone-900 uppercase tracking-wide">Live Match Scorekeeper</h3>
                        <p className="text-stone-500 text-[11px]">Update team scores in real-time. Changes broadcast immediately to public visitors.</p>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-semibold text-[11px]">
                        Status: {scorerStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 border border-stone-200 p-4 rounded">
                      {/* Team A */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-stone-600 uppercase">Team A Name</label>
                        <input
                          type="text"
                          value={scorerTeamA}
                          onChange={(e) => setScorerTeamA(e.target.value)}
                          placeholder="Team A"
                          className="w-full h-9 px-3 rounded bg-white border border-stone-300 font-semibold text-stone-900 text-xs"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setScorerScoreA(Math.max(0, scorerScoreA - 1))}
                            className="w-9 h-9 rounded bg-white border border-stone-300 font-bold hover:bg-stone-100 text-stone-800"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={scorerScoreA}
                            onChange={(e) => setScorerScoreA(Math.max(0, Number(e.target.value)))}
                            className="w-16 h-9 rounded bg-white border border-stone-300 font-bold text-center text-lg text-stone-900"
                          />
                          <button
                            onClick={() => setScorerScoreA(scorerScoreA + 1)}
                            className="w-9 h-9 rounded bg-stone-900 text-white font-bold hover:bg-stone-800"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Team B */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-semibold text-stone-600 uppercase">Team B Name</label>
                        <input
                          type="text"
                          value={scorerTeamB}
                          onChange={(e) => setScorerTeamB(e.target.value)}
                          placeholder="Team B"
                          className="w-full h-9 px-3 rounded bg-white border border-stone-300 font-semibold text-stone-900 text-xs"
                        />
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setScorerScoreB(Math.max(0, scorerScoreB - 1))}
                            className="w-9 h-9 rounded bg-white border border-stone-300 font-bold hover:bg-stone-100 text-stone-800"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            value={scorerScoreB}
                            onChange={(e) => setScorerScoreB(Math.max(0, Number(e.target.value)))}
                            className="w-16 h-9 rounded bg-white border border-stone-300 font-bold text-center text-lg text-stone-900"
                          />
                          <button
                            onClick={() => setScorerScoreB(scorerScoreB + 1)}
                            className="w-9 h-9 rounded bg-stone-900 text-white font-bold hover:bg-stone-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-medium text-stone-700 mb-1">Match Status</label>
                        <select
                          value={scorerStatus}
                          onChange={(e) => setScorerStatus(e.target.value as any)}
                          className="w-full h-9 px-2 rounded bg-white border border-stone-300 font-medium text-xs"
                        >
                          <option value="UPCOMING">Upcoming</option>
                          <option value="LIVE">Live (In Progress)</option>
                          <option value="HALFTIME">Halftime / Interval</option>
                          <option value="FULL_TIME">Full Time</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block font-medium text-stone-700 mb-1">Official Remarks / Score Commentary</label>
                        <input
                          type="text"
                          value={scorerRemarks}
                          onChange={(e) => setScorerRemarks(e.target.value)}
                          placeholder="e.g. 2nd Half · 10 min remaining · Foul conceded by XYZ"
                          className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-xs"
                        />
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                      <button
                        onClick={() => {
                          setScorerStatus('COMPLETED');
                          handleSaveLiveScore(activeEvent.id);
                          handleOpenDecideWinner(activeEvent);
                        }}
                        className="h-9 px-3 rounded bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-medium text-xs transition-colors"
                      >
                        End Match & Finalize Result
                      </button>

                      <button
                        onClick={() => handleSaveLiveScore(activeEvent.id)}
                        disabled={isSavingScore}
                        className="h-9 px-4 rounded bg-[#800020] hover:bg-[#6b001a] text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                      >
                        {isSavingScore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Update Score Now</span>}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab: Results */}
                {eventDetailTab === 'results' && (
                  <div className="bg-white border border-stone-200 rounded-md p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">Podium Winners</h3>
                        <p className="text-stone-500 text-[11px]">Official declared winners and institutional points.</p>
                      </div>
                      <button
                        onClick={() => handleOpenDecideWinner(activeEvent)}
                        className="h-8 px-3 rounded bg-[#800020] hover:bg-[#6b001a] text-white font-medium text-xs flex items-center gap-1"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-300" />
                        <span>{resultsList.some(r => r.eventId === activeEvent.id) ? 'Edit Podium' : 'Decide Winner'}</span>
                      </button>
                    </div>

                    {(() => {
                      const res = resultsList.find(r => r.eventId === activeEvent.id || r.eventTitle.toLowerCase() === activeEvent.title.toLowerCase());
                      if (!res?.podium?.first) {
                        return (
                          <div className="p-8 text-center text-stone-500 text-xs bg-stone-50 rounded border border-dashed border-stone-200">
                            Podium winners have not been declared for this event yet.
                          </div>
                        );
                      }
                      const p1 = res.podium.first;
                      const p2 = res.podium.second;
                      const p3 = res.podium.third;
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3.5 rounded border border-amber-300 bg-amber-50/60 space-y-1">
                            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">🥇 1st Place (Gold)</span>
                            <span className="font-bold text-stone-900 text-sm block">{p1.studentName || p1.teamOrParticipant}</span>
                            <span className="text-stone-600 text-xs block">{p1.college}</span>
                            {p1.points ? <span className="text-amber-800 text-[11px] font-mono block font-semibold">{p1.points} PTS</span> : null}
                          </div>

                          {p2 && (
                            <div className="p-3.5 rounded border border-stone-300 bg-stone-50 space-y-1">
                              <span className="text-[10px] font-bold text-stone-600 uppercase tracking-wider block">🥈 2nd Place (Silver)</span>
                              <span className="font-bold text-stone-900 text-sm block">{p2.studentName || p2.teamOrParticipant}</span>
                              <span className="text-stone-600 text-xs block">{p2.college}</span>
                              {p2.points ? <span className="text-stone-700 text-[11px] font-mono block font-semibold">{p2.points} PTS</span> : null}
                            </div>
                          )}

                          {p3 && (
                            <div className="p-3.5 rounded border border-amber-200 bg-amber-50/30 space-y-1">
                              <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">🥉 3rd Place (Bronze)</span>
                              <span className="font-bold text-stone-900 text-sm block">{p3.studentName || p3.teamOrParticipant}</span>
                              <span className="text-stone-600 text-xs block">{p3.college}</span>
                              {p3.points ? <span className="text-amber-900 text-[11px] font-mono block font-semibold">{p3.points} PTS</span> : null}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (

              /* B. MAIN SECTIONS SWITCHER */
              <>
                {/* 1. DASHBOARD VIEW */}
                {activeSection === 'dashboard' && (
                  <div className="space-y-6">
                    {/* Operational Overview Strip (3 metrics) */}
                    <div>
                      <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Today's Overview</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white border border-stone-200 rounded-md p-4">
                          <span className="text-xs text-stone-500 font-medium block">Active Festival Events</span>
                          <span className="text-2xl font-bold text-stone-900 block mt-1">{eventsList.length}</span>
                          <span className="text-[11px] text-stone-400 block mt-0.5">Sports & Cultural Competitions</span>
                        </div>

                        <div className="bg-white border border-stone-200 rounded-md p-4">
                          <span className="text-xs text-stone-500 font-medium block">Total Registrations</span>
                          <span className="text-2xl font-bold text-[#800020] block mt-1">{registrationsList.length}</span>
                          <span className="text-[11px] text-stone-400 block mt-0.5">
                            {allPlayers.length} verified student players
                          </span>
                        </div>

                        <div className="bg-white border border-stone-200 rounded-md p-4">
                          <span className="text-xs text-stone-500 font-medium block">Live Broadcast Matches</span>
                          <span className="text-2xl font-bold text-stone-900 block mt-1">
                            {eventsList.filter(e => e.liveEnabled).length}
                          </span>
                          <span className="text-[11px] text-stone-400 block mt-0.5">Real-time public streaming</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions Strip */}
                    <div className="bg-white border border-stone-200 rounded-md p-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-stone-500 mr-2">Quick Actions:</span>
                      <button
                        onClick={() => {
                          resetForm();
                          setShowCreateModal(true);
                        }}
                        className="h-8 px-3 rounded bg-[#800020] hover:bg-[#6b001a] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Event</span>
                      </button>
                      <button
                        onClick={() => setActiveSection('registrations')}
                        className="h-8 px-3 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors"
                      >
                        View Registrations ({registrationsList.length})
                      </button>
                      <button
                        onClick={() => setActiveSection('teams')}
                        className="h-8 px-3 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors"
                      >
                        Manage Teams ({teamsList.length})
                      </button>
                      <button
                        onClick={() => setActiveSection('live')}
                        className="h-8 px-3 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors"
                      >
                        Open Live Scorer
                      </button>
                      <button
                        onClick={() => setActiveSection('gallery')}
                        className="h-8 px-3 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-colors"
                      >
                        Media Gallery
                      </button>
                    </div>

                    {/* Upcoming Events Operational Table */}
                    <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
                      <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm">Upcoming Festival Events</h3>
                          <p className="text-stone-500 text-[11px]">Primary competition schedule and match operational status.</p>
                        </div>
                        <button
                          onClick={() => setActiveSection('events')}
                          className="text-xs text-[#800020] hover:underline font-medium"
                        >
                          View All Events →
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                              <th className="py-2.5 px-3">Event Name</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Time</th>
                              <th className="py-2.5 px-3">Venue</th>
                              <th className="py-2.5 px-3">Teams</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {eventsList.slice(0, 5).map(evt => {
                              const stats = getEventStats(evt.id);
                              const status = getEventStatusTag(evt);
                              return (
                                <tr key={evt.id} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <span className="font-medium text-stone-900 block">{evt.title}</span>
                                    <span className="text-[11px] text-stone-500">{evt.category}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-600">{evt.eventDate || evt.dateTime.split('·')[0]}</td>
                                  <td className="py-2.5 px-3 text-stone-600">{evt.startTime || '10:30 AM'}</td>
                                  <td className="py-2.5 px-3 text-stone-600">{evt.venueName}</td>
                                  <td className="py-2.5 px-3 text-stone-600">
                                    {stats.totalRegs} / {evt.seatsTotal || '∞'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                      status === 'UPCOMING'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : status === 'ONGOING'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                                    }`}>
                                      {status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      onClick={() => setSelectedEventId(evt.id)}
                                      className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium transition-colors"
                                    >
                                      Manage
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Recent Registrations Table */}
                    <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
                      <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm">Recent Registrations</h3>
                          <p className="text-stone-500 text-[11px]">Latest team entries submitted by participant colleges.</p>
                        </div>
                        <button
                          onClick={() => setActiveSection('registrations')}
                          className="text-xs text-[#800020] hover:underline font-medium"
                        >
                          View All ({registrationsList.length}) →
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                              <th className="py-2.5 px-3">Reg ID</th>
                              <th className="py-2.5 px-3">Team / Participant</th>
                              <th className="py-2.5 px-3">Event</th>
                              <th className="py-2.5 px-3">College</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {registrationsList.slice(0, 5).map(reg => (
                              <tr key={reg.id || reg.registrationId} className="hover:bg-stone-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-stone-600">{reg.registrationId}</td>
                                <td className="py-2.5 px-3 font-medium text-stone-900">{reg.teamName || reg.participantName}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.eventTitle}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.collegeName}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                    reg.status?.toUpperCase() === 'APPROVED' || reg.status === 'confirmed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {reg.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedRegDetail(reg)}
                                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. EVENTS MASTER DIRECTORY TABLE */}
                {activeSection === 'events' && (
                  <div className="bg-white border border-stone-200 rounded-md overflow-hidden space-y-0">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-stone-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Festival Competitions Directory</h2>
                          <p className="text-stone-500 text-xs">Search, filter, or update event configurations and match rules.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              resetForm();
                              setShowCreateModal(true);
                            }}
                            className="h-8 px-3 rounded bg-[#800020] hover:bg-[#6b001a] text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Event</span>
                          </button>
                        </div>
                      </div>

                      {/* Filters Strip */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div className="relative sm:col-span-2">
                          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={eventSearch}
                            onChange={(e) => setEventSearch(e.target.value)}
                            placeholder="Search by event title, sport, or venue..."
                            className="w-full h-8 pl-8 pr-3 rounded bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-[#800020]"
                          />
                        </div>

                        <div>
                          <select
                            value={eventTypeFilter}
                            onChange={(e) => setEventTypeFilter(e.target.value as any)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-700"
                          >
                            <option value="ALL">All Categories</option>
                            <option value="SPORTS">Sports Competitions</option>
                            <option value="CULTURAL">Cultural Competitions</option>
                          </select>
                        </div>

                        <div>
                          <select
                            value={eventStatusFilter}
                            onChange={(e) => setEventStatusFilter(e.target.value as any)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-700"
                          >
                            <option value="ALL">All Statuses</option>
                            <option value="UPCOMING">Upcoming</option>
                            <option value="ONGOING">Live / Ongoing</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Events Table */}
                    {filteredEvents.length === 0 ? (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No events match the selected criteria.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                              <th className="py-2.5 px-3">Event</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Time</th>
                              <th className="py-2.5 px-3">Venue</th>
                              <th className="py-2.5 px-3">Format</th>
                              <th className="py-2.5 px-3">Teams</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {filteredEvents.map(evt => {
                              const stats = getEventStats(evt.id);
                              const status = getEventStatusTag(evt);
                              return (
                                <tr key={evt.id} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2.5 px-3">
                                    <span className="font-semibold text-stone-900 block">{evt.title}</span>
                                    <span className="text-[11px] text-stone-500">{evt.category}</span>
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-600">{evt.eventDate || evt.dateTime.split('·')[0]}</td>
                                  <td className="py-2.5 px-3 text-stone-600">{evt.startTime || '10:30 AM'}</td>
                                  <td className="py-2.5 px-3 text-stone-600">{evt.venueName}</td>
                                  <td className="py-2.5 px-3 text-stone-600">
                                    {isTeamRegistration(evt) ? `${getRequiredPlayerCount(evt)} P` : 'Solo'}
                                  </td>
                                  <td className="py-2.5 px-3 text-stone-600">
                                    {stats.totalRegs} / {evt.seatsTotal || '∞'}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                      status === 'UPCOMING'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : status === 'ONGOING'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-stone-100 text-stone-600 border border-stone-200'
                                    }`}>
                                      {status}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        onClick={() => setSelectedEventId(evt.id)}
                                        className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                                      >
                                        Manage
                                      </button>
                                      <button
                                        onClick={() => {
                                          resetForm(evt);
                                          setShowEditModal(true);
                                        }}
                                        className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={(e) => handleDeleteEventDirect(evt.id, evt.title, e)}
                                        className="px-2 py-1 rounded hover:bg-red-50 text-red-600 text-[11px] font-medium"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. REGISTRATIONS TABLE */}
                {activeSection === 'registrations' && (
                  <div className="bg-white border border-stone-200 rounded-md overflow-hidden space-y-0">
                    <div className="p-4 border-b border-stone-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Festival Registrations</h2>
                          <p className="text-stone-500 text-xs">Verify participant college affiliations, approved rosters, and contact phone numbers.</p>
                        </div>
                        <button
                          onClick={handleExportCSV}
                          className="h-8 px-3 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Export CSV</span>
                        </button>
                      </div>

                      {/* Filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                        <div className="relative sm:col-span-2">
                          <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                          <input
                            type="text"
                            value={regSearch}
                            onChange={(e) => setRegSearch(e.target.value)}
                            placeholder="Search team, college, captain, or roll number..."
                            className="w-full h-8 pl-8 pr-3 rounded bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-[#800020]"
                          />
                        </div>

                        <div>
                          <select
                            value={regCollegeFilter}
                            onChange={(e) => setRegCollegeFilter(e.target.value)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-700"
                          >
                            <option value="ALL">All Colleges ({uniqueColleges.length})</option>
                            {uniqueColleges.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <select
                            value={regStatusFilter}
                            onChange={(e) => setRegStatusFilter(e.target.value)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-700"
                          >
                            <option value="ALL">All Statuses</option>
                            <option value="APPROVED">Approved</option>
                            <option value="PENDING">Pending</option>
                            <option value="REJECTED">Rejected</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {filteredRegistrations.length === 0 ? (
                      <div className="p-8 text-center text-xs text-stone-500">
                        No registrations match the selected filters.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                              <th className="py-2.5 px-3">Reg ID</th>
                              <th className="py-2.5 px-3">Team / Participant</th>
                              <th className="py-2.5 px-3">Event</th>
                              <th className="py-2.5 px-3">College</th>
                              <th className="py-2.5 px-3">Captain Contact</th>
                              <th className="py-2.5 px-3">Players</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100">
                            {filteredRegistrations.map(reg => (
                              <tr key={reg.id || reg.registrationId} className="hover:bg-stone-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-stone-600">{reg.registrationId}</td>
                                <td className="py-2.5 px-3 font-medium text-stone-900">{reg.teamName || reg.participantName}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.eventTitle}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.collegeName}</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.participantName} ({reg.participantPhone})</td>
                                <td className="py-2.5 px-3 text-stone-600">{reg.members?.length || 1} P</td>
                                <td className="py-2.5 px-3">
                                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                    reg.status?.toUpperCase() === 'APPROVED' || reg.status === 'confirmed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}>
                                    {reg.status || 'Pending'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedTeamRoster(reg)}
                                      className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                                    >
                                      Roster
                                    </button>
                                    <button
                                      onClick={() => setSelectedRegDetail(reg)}
                                      className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-medium"
                                    >
                                      Review
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. EVENT-WISE TEAMS TABLE */}
                {activeSection === 'teams' && (
                  <div className="space-y-4">
                    {/* Header and Filter Toolbar */}
                    <div className="bg-white border border-stone-200 rounded-md p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Event-Wise Teams Directory</h2>
                          <p className="text-stone-500 text-xs">Participating team squads organized strictly event-by-event.</p>
                        </div>
                        <span className="text-xs font-medium text-stone-500">
                          {teamsList.length} Teams across {eventsList.length} Events
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Filter by Event:</label>
                          <select
                            value={teamEventFilter}
                            onChange={(e) => setTeamEventFilter(e.target.value)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-800 font-medium"
                          >
                            <option value="ALL">All Events (Grouped Event-Wise)</option>
                            {eventsList.map(evt => {
                              const count = registrationsList.filter(r => r.eventId === evt.id || r.eventTitle === evt.title).length;
                              return (
                                <option key={evt.id} value={evt.id}>
                                  {evt.title} ({count} Teams)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Search Team / Captain:</label>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              value={teamSearch}
                              onChange={(e) => setTeamSearch(e.target.value)}
                              placeholder="Search team or captain..."
                              className="w-full h-8 pl-8 pr-3 rounded bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-[#800020]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Filter by College:</label>
                          <select
                            value={teamCollegeFilter}
                            onChange={(e) => setTeamCollegeFilter(e.target.value)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-800 font-medium"
                          >
                            <option value="ALL">All Colleges ({uniqueColleges.length})</option>
                            {uniqueColleges.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* EVENT-WISE GROUPED CONTAINERS */}
                    {(() => {
                      const displayedEvents = eventsList.filter(evt => {
                        if (teamEventFilter !== 'ALL' && evt.id !== teamEventFilter) return false;
                        return true;
                      });

                      if (displayedEvents.length === 0) {
                        return (
                          <div className="bg-white border border-stone-200 rounded-md p-8 text-center text-xs text-stone-500">
                            No events found matching your selection.
                          </div>
                        );
                      }

                      return displayedEvents.map(evt => {
                        const eventTeams = registrationsList.filter(r => {
                          if (r.eventId !== evt.id && r.eventTitle !== evt.title) return false;
                          if (teamCollegeFilter !== 'ALL' && r.collegeName !== teamCollegeFilter) return false;
                          if (teamSearch.trim()) {
                            const q = teamSearch.toLowerCase();
                            const matchTeam = (r.teamName || r.participantName).toLowerCase().includes(q);
                            const matchCollege = r.collegeName.toLowerCase().includes(q);
                            const matchLead = r.participantName.toLowerCase().includes(q);
                            const matchMember = r.members?.some(m => m.name.toLowerCase().includes(q) || (m as any).rollNumber?.toLowerCase().includes(q));
                            if (!matchTeam && !matchCollege && !matchLead && !matchMember) return false;
                          }
                          return true;
                        });

                        return (
                          <div key={evt.id} className="bg-white border border-stone-200 rounded-md overflow-hidden">
                            {/* Event Header Banner */}
                            <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  evt.type === 'sports' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-red-100 text-[#800020] border border-red-200'
                                }`}>
                                  {evt.type.toUpperCase()} · {evt.category}
                                </span>
                                <h3 className="font-bold text-stone-900 text-sm tracking-tight">{evt.title}</h3>
                                <span className="text-[11px] text-stone-500 hidden md:inline">({evt.venueName})</span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 font-semibold">
                                  {eventTeams.length} Teams Registered
                                </span>
                                <span className="text-stone-400 text-xs">•</span>
                                <span className="text-stone-600 text-[11px]">
                                  {isTeamRegistration(evt) ? `${getRequiredPlayerCount(evt)} Players/Team` : 'Solo Format'}
                                </span>
                                <button
                                  onClick={() => setSelectedEventId(evt.id)}
                                  className="ml-1 px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-medium"
                                >
                                  Manage Event →
                                </button>
                              </div>
                            </div>

                            {/* Event Teams Table */}
                            {eventTeams.length === 0 ? (
                              <div className="p-6 text-center text-xs text-stone-400 bg-white">
                                No teams registered for <span className="font-medium text-stone-600">{evt.title}</span> yet.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50/50 text-stone-500 font-semibold text-[11px]">
                                      <th className="py-2 px-3">Team Name</th>
                                      <th className="py-2 px-3">College / Institution</th>
                                      <th className="py-2 px-3">Captain Name</th>
                                      <th className="py-2 px-3">Captain Contact</th>
                                      <th className="py-2 px-3">Squad Size</th>
                                      <th className="py-2 px-3">Status</th>
                                      <th className="py-2 px-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100">
                                    {eventTeams.map((team, idx) => (
                                      <tr key={team.id || team.registrationId || idx} className="hover:bg-stone-50/70 transition-colors">
                                        <td className="py-2 px-3 font-semibold text-stone-900">
                                          {team.teamName || team.participantName}
                                          <span className="block font-mono text-[10px] text-stone-400 font-normal">
                                            #{team.registrationId}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-stone-600">{team.collegeName}</td>
                                        <td className="py-2 px-3 text-stone-600">{team.participantName}</td>
                                        <td className="py-2 px-3 font-mono text-stone-600">{team.participantPhone}</td>
                                        <td className="py-2 px-3 text-stone-600 font-medium">
                                          {team.members?.length || getRequiredPlayerCount(evt)} Players
                                        </td>
                                        <td className="py-2 px-3">
                                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                            team.status?.toUpperCase() === 'APPROVED' || team.status === 'confirmed'
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                                          }`}>
                                            {team.status || 'Pending'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <div className="flex items-center justify-end gap-1.5">
                                            <button
                                              onClick={() => setSelectedTeamRoster(team)}
                                              className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                                            >
                                              View Squad
                                            </button>
                                            <button
                                              onClick={() => setSelectedRegDetail(team)}
                                              className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-white text-[11px] font-medium"
                                            >
                                              Review
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* 5. EVENT-WISE PLAYERS ROSTER DIRECTORY */}
                {activeSection === 'players' && (
                  <div className="space-y-4">
                    {/* Header and Filter Toolbar */}
                    <div className="bg-white border border-stone-200 rounded-md p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Event-Wise Student Players Roster</h2>
                          <p className="text-stone-500 text-xs">Student participant rosters organized event-by-event for on-ground verification.</p>
                        </div>
                        <span className="text-xs font-medium text-stone-500">
                          {allPlayers.length} Student Players across {eventsList.length} Events
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Filter by Event:</label>
                          <select
                            value={playerEventFilter}
                            onChange={(e) => setPlayerEventFilter(e.target.value)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-800 font-medium"
                          >
                            <option value="ALL">All Events (Grouped Event-Wise)</option>
                            {eventsList.map(evt => {
                              const count = allPlayers.filter(p => p.eventId === evt.id || p.eventTitle === evt.title).length;
                              return (
                                <option key={evt.id} value={evt.id}>
                                  {evt.title} ({count} Players)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Search Player / Roll No:</label>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
                            <input
                              type="text"
                              value={playerSearch}
                              onChange={(e) => setPlayerSearch(e.target.value)}
                              placeholder="Search student name, roll number, or team..."
                              className="w-full h-8 pl-8 pr-3 rounded bg-stone-50 border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-[#800020]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-stone-600 mb-1">Filter by College:</label>
                          <select
                            value={playerCollegeFilter}
                            onChange={(e) => setPlayerCollegeFilter(e.target.value)}
                            className="w-full h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-800 font-medium"
                          >
                            <option value="ALL">All Colleges ({uniqueColleges.length})</option>
                            {uniqueColleges.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* EVENT-WISE GROUPED CONTAINERS */}
                    {(() => {
                      const displayedEvents = eventsList.filter(evt => {
                        if (playerEventFilter !== 'ALL' && evt.id !== playerEventFilter) return false;
                        return true;
                      });

                      if (displayedEvents.length === 0) {
                        return (
                          <div className="bg-white border border-stone-200 rounded-md p-8 text-center text-xs text-stone-500">
                            No events found matching your selection.
                          </div>
                        );
                      }

                      return displayedEvents.map(evt => {
                        const eventPlayers = filteredPlayers.filter(p => p.eventId === evt.id || p.eventTitle === evt.title);

                        return (
                          <div key={evt.id} className="bg-white border border-stone-200 rounded-md overflow-hidden">
                            {/* Event Header Banner */}
                            <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  evt.type === 'sports' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-red-100 text-[#800020] border border-red-200'
                                }`}>
                                  {evt.type.toUpperCase()} · {evt.category}
                                </span>
                                <h3 className="font-bold text-stone-900 text-sm tracking-tight">{evt.title}</h3>
                                <span className="text-[11px] text-stone-500 hidden md:inline">({evt.venueName})</span>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-white border border-stone-200 text-stone-700 font-semibold">
                                  {eventPlayers.length} Student Players
                                </span>
                                <button
                                  onClick={() => setSelectedEventId(evt.id)}
                                  className="ml-1 px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-white text-[10px] font-medium"
                                >
                                  Manage Event →
                                </button>
                              </div>
                            </div>

                            {/* Event Players Table */}
                            {eventPlayers.length === 0 ? (
                              <div className="p-6 text-center text-xs text-stone-400 bg-white">
                                No student players registered for <span className="font-medium text-stone-600">{evt.title}</span> yet.
                              </div>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50/50 text-stone-500 font-semibold text-[11px]">
                                      <th className="py-2 px-3">Player Name</th>
                                      <th className="py-2 px-3">Roll / Student ID</th>
                                      <th className="py-2 px-3">College</th>
                                      <th className="py-2 px-3">Team</th>
                                      <th className="py-2 px-3">Role</th>
                                      <th className="py-2 px-3 text-right">Reg ID</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-stone-100">
                                    {eventPlayers.map((p, idx) => (
                                      <tr key={p.id || idx} className="hover:bg-stone-50/70 transition-colors">
                                        <td className="py-2 px-3 font-semibold text-stone-900">{p.name}</td>
                                        <td className="py-2 px-3 font-mono text-stone-600 font-medium">{p.rollNumber}</td>
                                        <td className="py-2 px-3 text-stone-600">{p.college}</td>
                                        <td className="py-2 px-3 text-stone-600">{p.teamName}</td>
                                        <td className="py-2 px-3">
                                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                            p.role.includes('Captain') ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-stone-100 text-stone-600'
                                          }`}>
                                            {p.role}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 font-mono text-[11px] text-stone-500 text-right">
                                          {p.regId}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}

                {/* 6. FESTIVAL SCHEDULE TIMETABLE */}
                {activeSection === 'schedule' && (
                  <div className="bg-white border border-stone-200 rounded-md overflow-hidden space-y-0">
                    <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Festival Timetable Matrix</h2>
                        <p className="text-stone-500 text-xs">Chronological order of competitions across campus venues.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={scheduleVenueFilter}
                          onChange={(e) => setScheduleVenueFilter(e.target.value)}
                          className="h-8 px-2 rounded bg-stone-50 border border-stone-200 text-xs text-stone-700"
                        >
                          <option value="ALL">All Venues</option>
                          {venues.map(v => (
                            <option key={v.id} value={v.name}>{v.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Time Window</th>
                            <th className="py-2.5 px-3">Competition Event</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Campus Venue</th>
                            <th className="py-2.5 px-3">Capacity</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {eventsList
                            .filter(e => scheduleVenueFilter === 'ALL' || e.venueName === scheduleVenueFilter)
                            .map(evt => (
                              <tr key={evt.id} className="hover:bg-stone-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-medium text-stone-900">{evt.eventDate || evt.dateTime.split('·')[0]}</td>
                                <td className="py-2.5 px-3 text-stone-600">{evt.startTime || '10:30 AM'} - {evt.endTime || '01:30 PM'}</td>
                                <td className="py-2.5 px-3 font-semibold text-stone-900">{evt.title}</td>
                                <td className="py-2.5 px-3 text-stone-600">{evt.category}</td>
                                <td className="py-2.5 px-3 text-stone-600">{evt.venueName}</td>
                                <td className="py-2.5 px-3 text-stone-600">{evt.seatsTotal || 'Unlimited'}</td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => setSelectedEventId(evt.id)}
                                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-medium"
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. LIVE EVENTS SCORING OPERATIONS */}
                {activeSection === 'live' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-stone-200 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Live Match Operations</h2>
                        <p className="text-stone-500 text-xs">Select any competition to update live scores, change match period, and broadcast public streams.</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="font-semibold text-stone-600">Select Event:</label>
                        <select
                          value={activeScorerEventId}
                          onChange={(e) => setActiveScorerEventId(e.target.value)}
                          className="h-8 px-2 rounded bg-stone-50 border border-stone-300 font-semibold text-xs text-stone-900"
                        >
                          {eventsList.map(e => (
                            <option key={e.id} value={e.id}>
                              {e.title} ({e.category}) {e.liveEnabled ? '· [LIVE ENABLED]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scorer Box */}
                    {activeScorerEventId && (
                      <div className="bg-white border border-stone-200 rounded-md p-6 space-y-5 text-xs max-w-3xl mx-auto">
                        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                          <div>
                            <span className="text-[10px] font-bold text-[#800020] uppercase tracking-wider block">OFFICIAL SCOREBOARD CONTROLLER</span>
                            <h3 className="text-base font-bold text-stone-900">
                              {eventsList.find(e => e.id === activeScorerEventId)?.title}
                            </h3>
                          </div>
                          <span className="px-2.5 py-1 rounded bg-red-50 text-red-700 border border-red-200 font-semibold text-[11px]">
                            Period: {scorerStatus}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 border border-stone-200 p-4 rounded">
                          {/* Team A */}
                          <div className="space-y-2">
                            <label className="block text-[11px] font-semibold text-stone-600 uppercase">Team A</label>
                            <input
                              type="text"
                              value={scorerTeamA}
                              onChange={(e) => setScorerTeamA(e.target.value)}
                              placeholder="e.g. ABC College"
                              className="w-full h-9 px-3 rounded bg-white border border-stone-300 font-semibold text-stone-900 text-xs"
                            />
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => setScorerScoreA(Math.max(0, scorerScoreA - 1))}
                                className="w-9 h-9 rounded bg-white border border-stone-300 font-bold hover:bg-stone-100 text-stone-800 text-base"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={scorerScoreA}
                                onChange={(e) => setScorerScoreA(Math.max(0, Number(e.target.value)))}
                                className="w-16 h-9 rounded bg-white border border-stone-300 font-bold text-center text-lg text-stone-900"
                              />
                              <button
                                onClick={() => setScorerScoreA(scorerScoreA + 1)}
                                className="w-9 h-9 rounded bg-stone-900 text-white font-bold hover:bg-stone-800 text-base"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Team B */}
                          <div className="space-y-2">
                            <label className="block text-[11px] font-semibold text-stone-600 uppercase">Team B</label>
                            <input
                              type="text"
                              value={scorerTeamB}
                              onChange={(e) => setScorerTeamB(e.target.value)}
                              placeholder="e.g. XYZ College"
                              className="w-full h-9 px-3 rounded bg-white border border-stone-300 font-semibold text-stone-900 text-xs"
                            />
                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => setScorerScoreB(Math.max(0, scorerScoreB - 1))}
                                className="w-9 h-9 rounded bg-white border border-stone-300 font-bold hover:bg-stone-100 text-stone-800 text-base"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={scorerScoreB}
                                onChange={(e) => setScorerScoreB(Math.max(0, Number(e.target.value)))}
                                className="w-16 h-9 rounded bg-white border border-stone-300 font-bold text-center text-lg text-stone-900"
                              />
                              <button
                                onClick={() => setScorerScoreB(scorerScoreB + 1)}
                                className="w-9 h-9 rounded bg-stone-900 text-white font-bold hover:bg-stone-800 text-base"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block font-medium text-stone-700 mb-1">Match Period</label>
                            <select
                              value={scorerStatus}
                              onChange={(e) => setScorerStatus(e.target.value as any)}
                              className="w-full h-9 px-2 rounded bg-white border border-stone-300 font-medium text-xs"
                            >
                              <option value="UPCOMING">Upcoming</option>
                              <option value="LIVE">Live (In Progress)</option>
                              <option value="HALFTIME">Halftime</option>
                              <option value="FULL_TIME">Full Time</option>
                              <option value="COMPLETED">Completed</option>
                            </select>
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block font-medium text-stone-700 mb-1">Scorer Remarks / Commentary</label>
                            <input
                              type="text"
                              value={scorerRemarks}
                              onChange={(e) => setScorerRemarks(e.target.value)}
                              placeholder="e.g. 2nd Half · Injury Time +2 min"
                              className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-xs"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between border-t border-stone-200">
                          {(() => {
                            const curEvt = eventsList.find(e => e.id === activeScorerEventId);
                            const slug = curEvt?.liveSlug || slugify(curEvt?.title || '');
                            return (
                              <a
                                href={`/live/${slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-[#800020] hover:underline flex items-center gap-1 font-medium"
                              >
                                <span>Open Public Live Page</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            );
                          })()}

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                const curEvt = eventsList.find(e => e.id === activeScorerEventId);
                                if (curEvt) {
                                  setScorerStatus('COMPLETED');
                                  handleSaveLiveScore(curEvt.id);
                                  handleOpenDecideWinner(curEvt);
                                }
                              }}
                              className="h-9 px-3 rounded bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 font-medium text-xs transition-colors"
                            >
                              End & Decide Winner
                            </button>

                            <button
                              onClick={() => handleSaveLiveScore(activeScorerEventId)}
                              disabled={isSavingScore}
                              className="h-9 px-4 rounded bg-[#800020] hover:bg-[#6b001a] text-white font-medium text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                            >
                              {isSavingScore ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <span>Update Score</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 8. GALLERY VIEW */}
                {activeSection === 'gallery' && (
                  <div className="bg-white border border-stone-200 rounded-md p-4">
                    <AdminGalleryManager />
                  </div>
                )}

                {activeSection === 'about' && (
                  <div className="rounded-md border border-stone-200 bg-white p-4">
                    <AboutPageManager events={eventsList} />
                  </div>
                )}

                {/* 9. RESULTS & PODIUMS */}
                {activeSection === 'results' && (
                  <div className="bg-white border border-stone-200 rounded-md overflow-hidden space-y-0">
                    <div className="p-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Festival Official Results & Podiums</h2>
                        <p className="text-stone-500 text-xs">Declared winners, medal tally distribution, and institutional points.</p>
                      </div>
                      <span className="text-xs font-medium text-stone-500">{resultsList.length} Events Finalized</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-semibold text-[11px]">
                            <th className="py-2.5 px-3">Event Name</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">🥇 1st Place</th>
                            <th className="py-2.5 px-3">🥈 2nd Place</th>
                            <th className="py-2.5 px-3">🥉 3rd Place</th>
                            <th className="py-2.5 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {eventsList.map(evt => {
                            const res = resultsList.find(r => r.eventId === evt.id || r.eventTitle.toLowerCase() === evt.title.toLowerCase());
                            const p1 = res?.podium?.first;
                            const p2 = res?.podium?.second;
                            const p3 = res?.podium?.third;
                            return (
                              <tr key={evt.id} className="hover:bg-stone-50/70 transition-colors">
                                <td className="py-2.5 px-3 font-semibold text-stone-900">{evt.title}</td>
                                <td className="py-2.5 px-3 text-stone-600">{evt.category}</td>
                                <td className="py-2.5 px-3">
                                  {p1 ? (
                                    <div>
                                      <span className="font-semibold text-amber-900 block">{p1.studentName || p1.teamOrParticipant}</span>
                                      <span className="text-[11px] text-stone-500">{p1.college}</span>
                                    </div>
                                  ) : (
                                    <span className="text-stone-400 italic">Not finalized</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {p2 ? (
                                    <div>
                                      <span className="font-semibold text-stone-800 block">{p2.studentName || p2.teamOrParticipant}</span>
                                      <span className="text-[11px] text-stone-500">{p2.college}</span>
                                    </div>
                                  ) : (
                                    <span className="text-stone-400 italic">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {p3 ? (
                                    <div>
                                      <span className="font-semibold text-stone-800 block">{p3.studentName || p3.teamOrParticipant}</span>
                                      <span className="text-[11px] text-stone-500">{p3.college}</span>
                                    </div>
                                  ) : (
                                    <span className="text-stone-400 italic">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleOpenDecideWinner(evt)}
                                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                                      res ? 'bg-stone-100 hover:bg-stone-200 text-stone-800' : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                                    }`}
                                  >
                                    {res ? 'Edit Podium' : 'Decide Winner'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 10. ANNOUNCEMENTS VIEW */}
                {activeSection === 'announcements' && (
                  <div className="space-y-5">
                    {/* Announcement Publisher */}
                    <div className="bg-white border border-stone-200 rounded-md p-5 space-y-4 text-xs">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Publish Public Announcement</h2>
                        <p className="text-stone-500 text-xs">Send live alerts to student participants and visitors.</p>
                      </div>

                      <form onSubmit={handleAddAnnouncement} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block font-medium text-stone-700 mb-1">Headline / Title *</label>
                            <input
                              type="text"
                              value={newAnnTitle}
                              onChange={(e) => setNewAnnTitle(e.target.value)}
                              placeholder="e.g. Day 2 Basketball Schedule Update"
                              className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-xs text-stone-900"
                              required
                            />
                          </div>

                          <div>
                            <label className="block font-medium text-stone-700 mb-1">Priority Category</label>
                            <select
                              value={newAnnCategory}
                              onChange={(e) => setNewAnnCategory(e.target.value as any)}
                              className="w-full h-9 px-2 rounded bg-white border border-stone-300 text-xs text-stone-900 font-medium"
                            >
                              <option value="GENERAL">General Notice</option>
                              <option value="SCHEDULE">Schedule Change</option>
                              <option value="URGENT">Urgent Alert</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block font-medium text-stone-700 mb-1">Message Content *</label>
                          <textarea
                            value={newAnnMessage}
                            onChange={(e) => setNewAnnMessage(e.target.value)}
                            rows={2}
                            placeholder="Type concise official notice..."
                            className="w-full p-2.5 rounded bg-white border border-stone-300 text-xs text-stone-900"
                            required
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            className="h-8 px-4 rounded bg-[#800020] hover:bg-[#6b001a] text-white text-xs font-medium"
                          >
                            Post Announcement
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Active Announcements List */}
                    <div className="bg-white border border-stone-200 rounded-md overflow-hidden">
                      <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                        <h3 className="font-bold text-stone-900 text-sm">Active Festival Notices</h3>
                        <span className="text-xs text-stone-500">{announcements.length} Notices</span>
                      </div>

                      <div className="divide-y divide-stone-100 text-xs">
                        {announcements.map(ann => (
                          <div key={ann.id} className="p-4 flex items-start justify-between gap-3 hover:bg-stone-50/60 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                                  ann.category === 'URGENT'
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : ann.category === 'SCHEDULE'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-stone-100 text-stone-700 border border-stone-200'
                                }`}>
                                  {ann.category}
                                </span>
                                <span className="text-[11px] text-stone-400">
                                  {new Date(ann.timestamp).toLocaleDateString()} at {new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <h4 className="font-bold text-stone-900 text-sm">{ann.title}</h4>
                              <p className="text-stone-600 text-xs leading-relaxed">{ann.message}</p>
                            </div>

                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="p-1 rounded text-stone-400 hover:text-red-600 transition-colors"
                              title="Delete notice"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 11. SETTINGS & AUDIT VIEW */}
                {activeSection === 'settings' && (
                  <div className="space-y-5">
                    {/* Secretariat Administration Card */}
                    <div className="bg-white border border-stone-200 rounded-md p-5 space-y-3 text-xs">
                      <h2 className="text-sm font-bold text-stone-900">Secretariat Administration</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="p-3 bg-stone-50 rounded border border-stone-200 space-y-1">
                          <span className="text-stone-500 text-[11px] block">Authorized Administrator:</span>
                          <span className="font-semibold text-stone-900 block">{adminEmail}</span>
                          <span className="text-[11px] text-stone-500 block">R.V.R. & J.C. College of Engineering (Autonomous)</span>
                        </div>
                        <div className="p-3 bg-stone-50 rounded border border-stone-200 space-y-1">
                          <span className="text-stone-500 text-[11px] block">Secretariat Emergency Helpline:</span>
                          <span className="font-semibold text-stone-900 block">+91 98765 43210</span>
                          <span className="text-[11px] text-stone-500 block">Active 24/7 during festival dates</span>
                        </div>
                      </div>
                    </div>

                    {/* Audit Trail */}
                    <div className="bg-white border border-stone-200 rounded-md overflow-hidden text-xs">
                      <div className="p-4 border-b border-stone-200 flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-stone-900 text-sm">System Audit Trail</h3>
                          <p className="text-stone-500 text-[11px]">Logged administrative actions and status updates.</p>
                        </div>
                        <button
                          onClick={fetchAuditLogs}
                          className="h-7 px-2 rounded bg-stone-50 border border-stone-200 hover:bg-stone-100 text-stone-700 text-[11px] flex items-center gap-1 font-medium"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Refresh Logs</span>
                        </button>
                      </div>

                      {auditLogs.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">
                          No audit entries recorded yet. Actions will populate here as events are modified.
                        </div>
                      ) : (
                        <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                          {auditLogs.map((log, idx) => (
                            <div key={log.id || idx} className="p-3 flex items-start justify-between gap-3 hover:bg-stone-50/60">
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-bold text-stone-700 uppercase">{log.action}</span>
                                  <span className="text-stone-400 text-[10px]">
                                    {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                  </span>
                                </div>
                                <p className="text-stone-700 text-xs truncate">{log.description}</p>
                                <span className="text-[10px] text-stone-500">Target: {log.target}</span>
                              </div>
                              <span className="text-[10px] font-mono text-stone-400 flex-shrink-0">{log.adminEmail || 'admin'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>

      {/* 3. MODAL: CREATE / EDIT EVENT FORM */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-300 rounded-md w-full max-w-2xl overflow-hidden shadow-lg p-6 relative text-stone-900 max-h-[92vh] overflow-y-auto space-y-4">
            <button
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
              }}
              className="absolute top-4 right-4 p-1 rounded hover:bg-stone-100 text-stone-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#800020]">Event Management</span>
              <h3 className="text-lg font-bold text-stone-900">
                {showEditModal ? 'Edit Festival Event' : 'Create New Festival Event'}
              </h3>
            </div>

            {validationError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs">
              {/* 1. Event Type Switcher */}
              <div>
                <label className="block font-medium text-stone-700 mb-1.5 uppercase tracking-wide text-[11px]">
                  1. Event Category Type *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEvtType('sports');
                      setEvtRegType('TEAM');
                      setEvtPlayersPerTeam(11);
                    }}
                    className={`h-9 rounded font-medium text-xs border transition-colors ${
                      evtType === 'sports'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    Sports Competition
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEvtType('cultural');
                      setEvtRegType('INDIVIDUAL');
                      setEvtPlayersPerTeam(1);
                    }}
                    className={`h-9 rounded font-medium text-xs border transition-colors ${
                      evtType === 'cultural'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    Cultural Competition
                  </button>
                </div>
              </div>

              {/* Event Name & Sport Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={evtTitle}
                    onChange={(e) => {
                      setEvtTitle(e.target.value);
                      if (!evtLiveSlug) setEvtLiveSlug(slugify(e.target.value));
                    }}
                    placeholder={evtType === 'sports' ? 'e.g. Football Championship' : 'e.g. Solo Singing Contest'}
                    className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-[#800020]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Sport / Category *</label>
                  <input
                    type="text"
                    value={evtCategory}
                    onChange={(e) => setEvtCategory(e.target.value)}
                    placeholder="e.g. Football, Kabaddi, Music, Dance"
                    className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-[#800020]"
                    required
                  />
                </div>
              </div>

              {/* 2. Schedule */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded space-y-2.5">
                <span className="font-semibold text-stone-800 text-[11px] uppercase tracking-wide block">2. Schedule</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Event Date *</label>
                    <input
                      type="date"
                      value={evtDate}
                      onChange={(e) => setEvtDate(e.target.value)}
                      className="w-full h-8 px-2 rounded bg-white border border-stone-300 text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Reg Opening</label>
                    <input
                      type="date"
                      value={evtRegOpenDate}
                      onChange={(e) => setEvtRegOpenDate(e.target.value)}
                      className="w-full h-8 px-2 rounded bg-white border border-stone-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Reg Closing</label>
                    <input
                      type="date"
                      value={evtRegCloseDate}
                      onChange={(e) => setEvtRegCloseDate(e.target.value)}
                      className="w-full h-8 px-2 rounded bg-white border border-stone-300 text-xs"
                    />
                  </div>
                </div>

                {/* Time selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Start Time (12h AM/PM) *</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={evtStartHour}
                        onChange={(e) => setEvtStartHour(e.target.value)}
                        className="h-8 px-2 rounded bg-white border border-stone-300 text-xs font-medium"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span>:</span>
                      <select
                        value={evtStartMin}
                        onChange={(e) => setEvtStartMin(e.target.value)}
                        className="h-8 px-2 rounded bg-white border border-stone-300 text-xs font-medium"
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={evtStartAmPm}
                        onChange={(e) => setEvtStartAmPm(e.target.value as any)}
                        className="h-8 px-2 rounded bg-stone-900 text-white text-xs font-medium"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">End Time</label>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={evtEndHour}
                        onChange={(e) => setEvtEndHour(e.target.value)}
                        className="h-8 px-2 rounded bg-white border border-stone-300 text-xs font-medium"
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span>:</span>
                      <select
                        value={evtEndMin}
                        onChange={(e) => setEvtEndMin(e.target.value)}
                        className="h-8 px-2 rounded bg-white border border-stone-300 text-xs font-medium"
                      >
                        {['00', '15', '30', '45'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={evtEndAmPm}
                        onChange={(e) => setEvtEndAmPm(e.target.value as any)}
                        className="h-8 px-2 rounded bg-stone-900 text-white text-xs font-medium"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Venue & Capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Campus Venue *</label>
                  <input
                    type="text"
                    value={evtVenue}
                    onChange={(e) => setEvtVenue(e.target.value)}
                    placeholder="e.g. Main Turf Ground"
                    className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Max Teams Capacity</label>
                  <input
                    type="number"
                    value={evtMaxRegs || ''}
                    onChange={(e) => setEvtMaxRegs(e.target.value ? Number(e.target.value) : 0)}
                    placeholder="e.g. 32 (or 0 for Unlimited)"
                    className="w-full h-9 px-3 rounded bg-white border border-stone-300 text-xs"
                  />
                </div>
              </div>

              {/* 4. Registration & Squad Rules */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded space-y-2.5">
                <span className="font-semibold text-stone-800 text-[11px] uppercase tracking-wide block">
                  4. Registration Rules & Squad Size
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEvtRegType('TEAM');
                      if (evtPlayersPerTeam <= 1) setEvtPlayersPerTeam(5);
                    }}
                    className={`h-8 rounded text-xs font-medium border ${
                      evtRegType === 'TEAM' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    Team Registration
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEvtRegType('INDIVIDUAL');
                      setEvtPlayersPerTeam(1);
                    }}
                    className={`h-8 rounded text-xs font-medium border ${
                      evtRegType === 'INDIVIDUAL' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-300'
                    }`}
                  >
                    Solo Registration
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block font-medium text-stone-700 mb-1">
                      {evtRegType === 'TEAM' ? 'Required Players per Team *' : 'Participants'}
                    </label>
                    <input
                      type="number"
                      value={evtPlayersPerTeam}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value));
                        setEvtPlayersPerTeam(val);
                        if (val > 1) setEvtRegType('TEAM');
                        else if (val === 1) setEvtRegType('INDIVIDUAL');
                      }}
                      min={1}
                      disabled={evtRegType === 'INDIVIDUAL'}
                      className="w-full h-8 px-3 rounded bg-white border border-stone-300 text-xs font-semibold"
                    />
                    <p className="text-[10px] text-stone-500 mt-1">
                      {evtRegType === 'TEAM'
                        ? `Participant form will collect Name, Roll No, and College for all ${evtPlayersPerTeam} players.`
                        : 'Solo entry: 1 participant record.'}
                    </p>
                  </div>

                  <div>
                    <label className="block font-medium text-stone-700 mb-1">Coordinator Helpline Phone *</label>
                    <input
                      type="text"
                      value={evtTeamLeaderPhone}
                      onChange={(e) => setEvtTeamLeaderPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-8 px-3 rounded bg-white border border-stone-300 text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 5. Live Stream Link */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={evtLiveEnabled}
                    onChange={(e) => {
                      setEvtLiveEnabled(e.target.checked);
                      if (e.target.checked && !evtLiveSlug) {
                        setEvtLiveSlug(slugify(evtTitle || 'event'));
                      }
                    }}
                    className="w-4 h-4 rounded text-[#800020]"
                  />
                  <span className="font-semibold text-stone-800 text-[11px] uppercase tracking-wide">
                    5. Enable Public Live Match Broadcast
                  </span>
                </label>

                {evtLiveEnabled && (
                  <div className="pt-1.5 flex items-center gap-2">
                    <span className="font-mono text-stone-500 text-[11px]">{window.location.origin}/live/</span>
                    <input
                      type="text"
                      value={evtLiveSlug}
                      onChange={(e) => setEvtLiveSlug(slugify(e.target.value))}
                      placeholder="colorido-2k26-football"
                      className="flex-1 h-8 px-2 rounded bg-white border border-stone-300 font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Banner Image URL */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">Banner Image URL</label>
                <input
                  type="text"
                  value={evtBannerImage}
                  onChange={(e) => setEvtBannerImage(e.target.value)}
                  className="w-full h-8 px-3 rounded bg-white border border-stone-300 text-xs"
                />
              </div>

              {/* Description & Rules */}
              <div>
                <label className="block font-medium text-stone-700 mb-1">Event Description</label>
                <textarea
                  value={evtDescription}
                  onChange={(e) => setEvtDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2 rounded bg-white border border-stone-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Competition Rules (one rule per line)</label>
                <textarea
                  value={evtRules}
                  onChange={(e) => setEvtRules(e.target.value)}
                  rows={3}
                  className="w-full p-2 rounded bg-white border border-stone-300 text-xs"
                />
              </div>

              {/* Bottom buttons */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="h-8 px-3 rounded bg-white border border-stone-300 text-stone-700 font-medium text-xs hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded bg-[#800020] hover:bg-[#6b001a] text-white font-medium text-xs shadow-xs"
                >
                  {showEditModal ? 'Save Event Changes' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: REGISTRATION RECORD DETAIL */}
      {selectedRegDetail && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-300 rounded-md w-full max-w-lg overflow-hidden shadow-lg p-6 relative space-y-4 text-stone-900 text-xs">
            <button
              onClick={() => setSelectedRegDetail(null)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-stone-100 text-stone-500"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                Registration Record #{selectedRegDetail.registrationId}
              </span>
              <h3 className="text-base font-bold text-stone-900">
                {selectedRegDetail.teamName || selectedRegDetail.participantName}
              </h3>
              <p className="text-stone-500 text-xs">{selectedRegDetail.collegeName}</p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded p-3 space-y-2">
              <div className="flex justify-between py-0.5 border-b border-stone-200">
                <span className="text-stone-500">Event:</span>
                <span className="font-semibold text-stone-900">{selectedRegDetail.eventTitle}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-stone-200">
                <span className="text-stone-500">Captain Phone:</span>
                <span className="font-semibold text-stone-900">{selectedRegDetail.participantPhone}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-stone-200">
                <span className="text-stone-500">Captain Email:</span>
                <span className="font-semibold text-stone-900">{selectedRegDetail.participantEmail}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-stone-500">Current Status:</span>
                <span className="font-bold uppercase text-emerald-700">{selectedRegDetail.status}</span>
              </div>
            </div>

            {/* Players list */}
            <div className="space-y-2">
              <h4 className="font-semibold text-stone-800 uppercase tracking-wide text-[11px]">
                Registered Roster ({selectedRegDetail.members?.length || 1} Players)
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(selectedRegDetail.members || [{ name: selectedRegDetail.participantName, studentId: selectedRegDetail.studentId }]).map((m, i) => (
                  <div key={i} className="p-2 rounded bg-stone-50 border border-stone-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-stone-900 block">{i + 1}. {m.name}</span>
                      <span className="text-[10px] text-stone-500">Roll No: {(m as any).rollNumber || m.studentId || 'N/A'}</span>
                    </div>
                    <span className="text-[11px] text-stone-500">{m.college || selectedRegDetail.collegeName}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
              <button
                onClick={() => handleDeleteRegistration(selectedRegDetail.id)}
                className="px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 font-medium text-xs transition-colors"
              >
                Delete Record
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateRegStatus(selectedRegDetail.id, 'REJECTED')}
                  className="px-3 py-1.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleUpdateRegStatus(selectedRegDetail.id, 'APPROVED')}
                  className="px-4 py-1.5 rounded bg-[#800020] hover:bg-[#6b001a] text-white font-medium text-xs transition-colors"
                >
                  Approve Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: TEAM ROSTER VIEW */}
      {selectedTeamRoster && (
        <TeamDetailsModal
          registration={selectedTeamRoster}
          onClose={() => setSelectedTeamRoster(null)}
        />
      )}

      {/* 6. MODAL: DELETE CONFIRMATION */}
      {showDeleteConfirm && activeEvent && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 flex items-center justify-center p-4">
          <div className="bg-white border border-stone-300 rounded-md p-6 max-w-sm w-full space-y-4 text-stone-900 text-xs">
            <div className="w-10 h-10 rounded bg-red-50 text-red-700 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="font-bold text-sm text-stone-900">Delete Festival Event?</h3>
              <p className="text-stone-500 text-xs mt-1">
                Are you sure you want to delete <strong>{activeEvent.title}</strong>? This action cannot be undone.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-8 px-3 rounded bg-white border border-stone-300 text-stone-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await apiService.deleteEvent(activeEvent.id);
                    setEventsList(prev => prev.filter(e => e.id !== activeEvent.id));
                    setSelectedEventId(null);
                    setShowDeleteConfirm(false);
                    onRefreshData();
                  } catch {
                    alert('Failed to delete event');
                  }
                }}
                className="h-8 px-3 rounded bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: DECIDE PODIUM WINNER */}
      <DecideWinnerModal
        isOpen={showDecideWinnerModal}
        event={winnerEventToDecide}
        registrations={registrationsList}
        existingResult={existingEventResult}
        onClose={() => {
          setShowDecideWinnerModal(false);
          setWinnerEventToDecide(null);
          setExistingEventResult(null);
        }}
        onPublishResult={handlePublishEventResult}
        onViewResults={onNavigate ? () => onNavigate('results') : undefined}
      />
    </div>
  );
};
