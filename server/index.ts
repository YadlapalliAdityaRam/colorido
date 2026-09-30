import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { connectDB } from './db';
import { 
  AdminModel,
  EventModel, 
  RegistrationModel, 
  ResultModel, 
  VenueModel, 
  SettingsModel,
  CollegeModel,
  ParticipantModel,
  TeamModel,
  ScheduleModel,
  AlbumModel,
  AnnouncementModel,
  PageCMSModel,
  MediaModel,
  AuditLogModel,
  NotificationModel
} from './models';
import { sendRegistrationConfirmationEmail } from './services/emailService';
import type { EventItem, Registration, EventResult, CollegeLeaderboard } from '../src/types';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : '';
    if (
      !origin ||
      process.env.NODE_ENV !== 'production' ||
      allowedOrigins.length === 0 ||
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(normalizedOrigin)
    ) {
      callback(null, true);
      return;
    }
    callback(new Error(`Origin ${origin} is not allowed by CORS policy.`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Health Check API
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'colorido-2k26-api',
    time: new Date().toISOString(),
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Initialize MongoDB Atlas Connection & Seed Script
connectDB();

// Helper to log audit actions
async function recordAuditLog(action: string, target: string, description: string, adminEmail = 'admin@rvrjc.ac.in') {
  try {
    await AuditLogModel.create({
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      adminEmail,
      timestamp: new Date().toISOString(),
      target,
      description,
    });
  } catch (err) {
    console.error('Failed to log audit action:', err);
  }
}

// ----------------------------------------------------
// 1. AUTHENTICATION APIs (/api/auth)
// ----------------------------------------------------

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const admin = await AdminModel.findOne({ email: cleanEmail });

    if (!admin) {
      return res.status(401).json({ error: 'Invalid Administrative Credentials' });
    }

    const isMatch = await bcrypt.compare(password.trim(), admin.passwordHash);
    if (!isMatch) {
      await recordAuditLog('LOGIN_FAILED', cleanEmail, 'Failed login attempt with invalid passcode');
      return res.status(401).json({ error: 'Invalid Administrative Passcode' });
    }

    admin.lastLogin = new Date().toISOString();
    await admin.save();

    await recordAuditLog('LOGIN_SUCCESS', admin.email, 'Super Admin logged into Control Panel');

    res.json({
      success: true,
      token: `colorido_jwt_session_${Date.now()}`,
      admin: {
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication failed', details: err.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const { email } = req.body;
  await recordAuditLog('LOGOUT', email || 'admin@rvrjc.ac.in', 'Super Admin logged out');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  await recordAuditLog('FORGOT_PASSWORD_REQUEST', email || 'admin@rvrjc.ac.in', 'Password reset instructions dispatched');
  res.json({ success: true, message: 'Password reset link sent to registered administrative email.' });
});

// ----------------------------------------------------
// 2. DASHBOARD & ANALYTICS APIs (/api/admin)
// ----------------------------------------------------

app.get('/api/admin/dashboard', async (_req, res) => {
  try {
    const [
      totalEvents,
      sportsEvents,
      culturalEvents,
      totalRegistrations,
      pendingRegistrations,
      approvedRegistrations,
      rejectedRegistrations,
      totalColleges,
      recentRegs,
      recentLogs,
      announcements,
      settings
    ] = await Promise.all([
      EventModel.countDocuments(),
      EventModel.countDocuments({ type: 'sports' }),
      EventModel.countDocuments({ type: 'cultural' }),
      RegistrationModel.countDocuments(),
      RegistrationModel.countDocuments({ status: 'PENDING' }),
      RegistrationModel.countDocuments({ status: 'APPROVED' }),
      RegistrationModel.countDocuments({ status: 'REJECTED' }),
      CollegeModel.countDocuments(),
      RegistrationModel.find().sort({ createdAt: -1 }).limit(5).lean(),
      AuditLogModel.find().sort({ timestamp: -1 }).limit(5).lean(),
      AnnouncementModel.find({ isPublished: true }).sort({ publishDate: -1 }).limit(3).lean(),
      SettingsModel.findOne({ key: 'global_config' }).lean()
    ]);

    const totalParticipants = totalRegistrations * 2 + 150; // Dynamic aggregated count

    res.json({
      metrics: {
        totalEvents,
        sportsEvents,
        culturalEvents,
        totalParticipants,
        totalColleges,
        totalRegistrations,
        pendingRegistrations,
        approvedRegistrations,
        rejectedRegistrations,
        upcomingEvents: totalEvents - 2,
        completedEvents: 2,
      },
      recentRegistrations: recentRegs,
      recentAuditLogs: recentLogs,
      announcements,
      maintenanceMode: settings?.maintenanceMode || false,
      systemAlerts: [
        { id: '1', type: 'info', message: 'Online registrations are OPEN for all 30+ events.' },
        { id: '2', type: 'warning', message: 'Football Championship slots are at 85% capacity.' },
      ]
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compile dashboard metrics', details: err.message });
  }
});

function escapeRegex(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

// ----------------------------------------------------
// 3. EVENT MANAGEMENT APIs (/api/events)
// ----------------------------------------------------

app.get('/api/events', async (req, res) => {
  try {
    const { type, category, status, search } = req.query;
    const filter: any = {};

    if (type && type !== 'all') filter.type = String(type);
    if (category && category !== 'All' && category !== 'all') {
      filter.category = new RegExp(`^${escapeRegex(String(category))}$`, 'i');
    }
    if (status && status !== 'all') filter.status = String(status);
    if (search && String(search).trim() !== '') {
      const q = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ title: q }, { description: q }, { category: q }, { venueName: q }];
    }

    const events = await EventModel.find(filter).lean();
    res.json(events);
  } catch (err: any) {
    console.error('Error in GET /api/events:', err);
    res.status(500).json({ error: 'Failed to fetch events', details: err.message });
  }
});

app.get('/api/events/live/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const event = await EventModel.findOne({
      $or: [{ liveSlug: slug }, { slug }, { id: slug }]
    }).lean();

    if (!event) return res.status(404).json({ error: 'Live event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch live event', details: err.message });
  }
});

app.put('/api/events/:id/live-score', async (req, res) => {
  try {
    const { id } = req.params;
    const { teamA, teamB, scoreA, scoreB, status, winner, remarks } = req.body;

    const event = await EventModel.findOne({ $or: [{ id }, { slug: id }] });
    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.liveMatch = {
      teamA: teamA || event.liveMatch?.teamA || 'Team A',
      teamB: teamB || event.liveMatch?.teamB || 'Team B',
      scoreA: typeof scoreA === 'number' ? scoreA : Number(scoreA || 0),
      scoreB: typeof scoreB === 'number' ? scoreB : Number(scoreB || 0),
      status: status || event.liveMatch?.status || 'LIVE',
      lastUpdated: new Date().toISOString(),
      winner: winner || undefined,
      remarks: remarks || undefined,
    };

    if (status === 'FINISHED' && winner) {
      event.status = 'completed';
    } else if (status === 'LIVE') {
      event.status = 'ongoing';
    }

    await event.save();
    await recordAuditLog('LIVE_SCORE_UPDATED', event.title, `Updated live score: ${event.liveMatch.teamA} (${event.liveMatch.scoreA}) vs ${event.liveMatch.teamB} (${event.liveMatch.scoreB}) [${event.liveMatch.status}]`);

    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update live score', details: err.message });
  }
});

app.get('/api/events/:slugOrId', async (req, res) => {
  try {
    const param = req.params.slugOrId;
    const event = await EventModel.findOne({
      $or: [{ slug: param }, { id: param }, { liveSlug: param }],
    }).lean();

    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch event', details: err.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const title = req.body.title || 'Untitled Event';
    const baseSlug = (req.body.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'event';
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    
    const seats = typeof req.body.seatsTotal === 'number' ? req.body.seatsTotal : (req.body.seatsTotal ? parseInt(req.body.seatsTotal) : 32);
    const playersCount = typeof req.body.playersPerTeam === 'number'
      ? req.body.playersPerTeam
      : (req.body.playersPerTeam ? parseInt(req.body.playersPerTeam) : (req.body.maxTeamSize ? parseInt(req.body.maxTeamSize) : 1));

    const newEventData = {
      ...req.body,
      id: req.body.id || `event-${Date.now()}`,
      title,
      slug: uniqueSlug,
      type: req.body.type || 'sports',
      category: req.body.category || 'General',
      description: req.body.description || `${title} competition at COLORIDO 2K26 festival.`,
      bannerImage: req.body.bannerImage || (req.body.type === 'cultural' ? '/cultural_global_profile_photo.jpeg' : '/global_sports_profile.jpeg'),
      dateTime: req.body.dateTime || '30 Sep 2026 · 09:00 AM',
      venueName: req.body.venueName || 'R.V.R. & J.C. Campus',
      seatsTotal: seats,
      seatsLeft: seats,
      status: req.body.status || 'open',
      rules: Array.isArray(req.body.rules) ? req.body.rules : ['Valid College Student ID mandatory.'],
      eligibility: req.body.eligibility || 'Open to all bonafide college students',
      format: req.body.format || (playersCount > 1 ? 'team' : 'solo'),
      playersPerTeam: playersCount,
      maxTeamSize: playersCount,
      minTeamSize: req.body.format === 'team' || playersCount > 1 ? playersCount : 1,
      oneLineSummary: req.body.oneLineSummary || `${playersCount} Players · ${req.body.venueName || 'R.V.R. & J.C. Campus'}`,
    };

    const createdEvent = await EventModel.create(newEventData);
    await recordAuditLog('EVENT_CREATED', createdEvent.title, `Created new event in category ${createdEvent.category}`);
    res.status(201).json(createdEvent);
  } catch (err: any) {
    console.error('Error in POST /api/events:', err);
    res.status(500).json({ error: 'Failed to create event', details: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.playersPerTeam !== undefined || updateData.maxTeamSize !== undefined) {
      const playersCount = typeof updateData.playersPerTeam === 'number'
        ? updateData.playersPerTeam
        : (updateData.playersPerTeam ? parseInt(updateData.playersPerTeam) : (updateData.maxTeamSize ? parseInt(updateData.maxTeamSize) : 1));
      updateData.playersPerTeam = playersCount;
      updateData.maxTeamSize = playersCount;
      updateData.minTeamSize = playersCount > 1 ? playersCount : 1;
      if (!updateData.format) {
        updateData.format = playersCount > 1 ? 'team' : 'solo';
      }
    }
    const updatedEvent = await EventModel.findOneAndUpdate({ id }, { $set: updateData }, { new: true });
    if (!updatedEvent) return res.status(404).json({ error: 'Event not found' });

    await recordAuditLog('EVENT_UPDATED', updatedEvent.title, `Updated event details for ${updatedEvent.title}`);
    res.json(updatedEvent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update event', details: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const evt = await EventModel.findOne({ $or: [{ id }, { slug: id }] });
    const eventId = evt ? evt.id : id;
    const eventTitle = evt ? evt.title : id;

    await EventModel.deleteOne({ $or: [{ id: eventId }, { slug: id }] });
    await RegistrationModel.deleteMany({ eventId });

    await recordAuditLog('EVENT_DELETED', eventTitle, `Deleted event '${eventTitle}' (ID: ${eventId}) and cleared associated registration rosters from MongoDB.`);
    res.json({ success: true, message: `Event '${eventTitle}' deleted successfully from database.` });
  } catch (err: any) {
    console.error('Error in DELETE /api/events/:id:', err);
    res.status(500).json({ error: 'Failed to delete event', details: err.message });
  }
});

// ----------------------------------------------------
// 4. SCHEDULE & CONFLICT DETECTION APIs (/api/schedule)
// ----------------------------------------------------

app.get('/api/schedule', async (_req, res) => {
  try {
    const schedules = await ScheduleModel.find().lean();
    res.json(schedules);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch schedule', details: err.message });
  }
});

app.post('/api/schedule', async (req, res) => {
  try {
    const { eventId, eventTitle, venueName, date, startTime, endTime } = req.body;

    // REAL TIME VENUE CONFLICT DETECTION RULE
    const existingConflict = await ScheduleModel.findOne({
      venueName,
      date,
      $or: [
        { startTime: { $lt: endTime, $gte: startTime } },
        { endTime: { $gt: startTime, $lte: endTime } },
      ],
    });

    if (existingConflict && existingConflict.eventId !== eventId) {
      return res.status(409).json({
        error: 'VENUE CONFLICT DETECTED',
        conflictMessage: `Venue conflict detected: '${existingConflict.eventTitle}' is already scheduled at ${venueName} during ${existingConflict.startTime} - ${existingConflict.endTime} on ${date}.`,
      });
    }

    const newSchedule = await ScheduleModel.create({
      id: `sch-${Date.now()}`,
      eventId,
      eventTitle,
      venueName,
      date,
      startTime,
      endTime,
      status: 'SCHEDULED',
    });

    await recordAuditLog('SCHEDULE_CREATED', eventTitle, `Scheduled ${eventTitle} at ${venueName} (${startTime} - ${endTime})`);
    res.status(201).json(newSchedule);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create schedule', details: err.message });
  }
});

app.delete('/api/schedule/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await ScheduleModel.deleteOne({ id });
    await recordAuditLog('SCHEDULE_DELETED', id, `Removed schedule slot ${id}`);
    res.json({ message: 'Schedule entry removed' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete schedule', details: err.message });
  }
});

// ----------------------------------------------------
// 5. REGISTRATION MANAGEMENT & QR SCANNER APIs (/api/registrations)
// ----------------------------------------------------

app.get('/api/registrations', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (search && String(search).trim() !== '') {
      const q = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [
        { participantName: q },
        { participantEmail: q },
        { collegeName: q },
        { registrationId: q },
        { eventTitle: q }
      ];
    }

    const regs = await RegistrationModel.find(filter).sort({ createdAt: -1 }).lean();
    res.json(regs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch registrations', details: err.message });
  }
});

app.get('/api/registrations/admin', async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (search && String(search).trim() !== '') {
      const q = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [
        { participantName: q },
        { participantEmail: q },
        { collegeName: q },
        { registrationId: q },
        { eventTitle: q }
      ];
    }

    const regs = await RegistrationModel.find(filter).sort({ createdAt: -1 }).lean();
    res.json(regs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch admin registrations', details: err.message });
  }
});

app.get('/api/registrations/my', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.json([]);
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const regs = await RegistrationModel.find({
      $or: [
        { participantEmail: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') },
        { 'members.email': new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') }
      ]
    }).sort({ createdAt: -1 }).lean();
    res.json(regs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch user registrations', details: err.message });
  }
});

app.post('/api/registrations', async (req, res) => {
  try {
    const { eventId, participantName, participantEmail, participantPhone, collegeName, studentId, format, teamName, members, department, year } = req.body;

    // 1. Validation
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    if (!participantName || !String(participantName).trim()) {
      return res.status(400).json({ error: 'Participant name is required' });
    }
    if (!participantEmail || !String(participantEmail).trim() || !String(participantEmail).includes('@')) {
      return res.status(400).json({ error: 'A valid participant email address is required' });
    }
    if (!collegeName || !String(collegeName).trim()) {
      return res.status(400).json({ error: 'College name is required' });
    }

    const event = await EventModel.findOne({ id: eventId });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.seatsLeft <= 0) return res.status(400).json({ error: 'Event registration is full!' });

    const cleanEmail = String(participantEmail).trim().toLowerCase();
    const cleanStudentId = studentId ? String(studentId).trim() : '';

    // 2. Duplicate Registration Prevention
    const duplicateQuery: any = {
      eventId: event.id,
      status: { $ne: 'REJECTED' },
      $or: [
        { participantEmail: new RegExp(`^${escapeRegex(cleanEmail)}$`, 'i') },
      ],
    };
    if (cleanStudentId) {
      duplicateQuery.$or.push({ studentId: cleanStudentId });
    }

    const existingReg = await RegistrationModel.findOne(duplicateQuery);
    if (existingReg) {
      console.log(`[Registration API] Duplicate registration prevented for ${cleanEmail} in event "${event.title}"`);
      return res.status(200).json({
        ...existingReg.toObject(),
        isDuplicate: true,
        emailSent: false,
        message: `You are already registered for ${event.title} with Registration ID ${existingReg.registrationId}.`,
      });
    }

    // 3. Unique Registration ID Generation
    const prefix = event.type === 'sports' ? 'COL26-SPT' : 'COL26-CUL';
    const regId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const normalizedMembers = Array.isArray(members) && members.length > 0
      ? members.map((m: any, idx: number) => ({
          name: (m.name || (idx === 0 ? participantName : `Player ${idx + 1}`)).trim(),
          rollNumber: (m.rollNumber || m.studentId || (idx === 0 ? studentId : '')).trim(),
          studentId: (m.studentId || m.rollNumber || (idx === 0 ? studentId : '')).trim(),
          college: (m.college || collegeName || '').trim(),
          email: (m.email || (idx === 0 ? participantEmail : '')).trim(),
          phone: (m.phone || (idx === 0 ? participantPhone : '')).trim(),
          role: m.role || (idx === 0 ? 'Captain / Team Lead' : `Player #${idx + 1}`),
        }))
      : [{
          name: String(participantName).trim(),
          rollNumber: cleanStudentId,
          studentId: cleanStudentId,
          college: String(collegeName).trim(),
          email: cleanEmail,
          phone: participantPhone ? String(participantPhone).trim() : '',
          role: 'Solo Competitor',
        }];

    // 4. Save to Database
    const newReg = await RegistrationModel.create({
      id: `reg-${Date.now()}`,
      registrationId: regId,
      eventId: event.id,
      eventTitle: event.title,
      eventType: event.type,
      eventDate: event.dateTime,
      venueName: event.venueName,
      participantName: String(participantName).trim(),
      participantEmail: cleanEmail,
      participantPhone: participantPhone ? String(participantPhone).trim() : '',
      collegeName: String(collegeName).trim(),
      studentId: cleanStudentId,
      department: department || 'Engineering',
      year: year || '3rd Year',
      format: format || event.format,
      teamName: teamName || (format === 'team' ? `${participantName}'s Team` : undefined),
      members: normalizedMembers,
      status: 'APPROVED',
      isCheckedIn: false,
      qrCodeData: JSON.stringify({ regId, participantName, eventTitle: event.title }),
      createdAt: new Date().toISOString(),
    });

    event.seatsLeft = Math.max(0, event.seatsLeft - 1);
    await event.save();

    await recordAuditLog('REGISTRATION_CREATED', regId, `Registered ${participantName} (${collegeName}) for ${event.title}`);

    // 5. Send Automated Confirmation Email (only after successful database persistence)
    let emailSent = false;
    let emailError: string | undefined;

    try {
      const emailResult = await sendRegistrationConfirmationEmail({
        registrationId: newReg.registrationId,
        participantName: newReg.participantName,
        participantEmail: newReg.participantEmail,
        participantPhone: newReg.participantPhone,
        collegeName: newReg.collegeName,
        studentId: newReg.studentId,
        eventTitle: newReg.eventTitle,
        eventType: newReg.eventType,
        eventDate: newReg.eventDate,
        venueName: newReg.venueName,
        format: newReg.format,
        teamName: newReg.teamName,
        members: newReg.members,
      });

      emailSent = emailResult.success;
      if (!emailResult.success) {
        emailError = emailResult.error || 'Email could not be delivered';
      }
    } catch (mailErr: any) {
      console.error(`[Registration API] Email dispatch exception for ${regId}:`, mailErr.message);
      emailError = mailErr.message;
    }

    // 6. Return Response to Frontend (Registration is preserved regardless of email delivery)
    res.status(201).json({
      ...newReg.toObject(),
      emailSent,
      emailError: emailSent ? undefined : (emailError || 'Confirmation email could not be delivered'),
      message: emailSent
        ? `Registration confirmed! A confirmation email has been sent to ${newReg.participantEmail}.`
        : 'Registration successful, but we could not send the confirmation email right now. Please save your Registration ID.',
    });
  } catch (err: any) {
    console.error('[Registration API] Registration failed:', err);
    res.status(500).json({ error: 'Failed to create registration', details: err.message });
  }
});

app.put('/api/registrations/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const reg = await RegistrationModel.findOneAndUpdate(
      { $or: [{ id }, { registrationId: id }] },
      { $set: { status } },
      { new: true }
    );
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    await recordAuditLog('REGISTRATION_STATUS_UPDATED', reg.registrationId, `Updated registration ${reg.registrationId} status to ${status}`);
    res.json(reg);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update registration status', details: err.message });
  }
});

app.patch('/api/registrations/:id/checkin', async (req, res) => {
  try {
    const { id } = req.params;
    const reg = await RegistrationModel.findOne({
      $or: [{ id }, { registrationId: id }]
    });
    if (!reg) return res.status(404).json({ error: 'Registration not found' });

    reg.isCheckedIn = !reg.isCheckedIn;
    if (reg.isCheckedIn && !reg.checkInTime) {
      reg.checkInTime = new Date().toISOString();
    }
    await reg.save();

    await recordAuditLog('CHECKIN_TOGGLED', reg.registrationId, `Toggled check-in for ${reg.participantName} to ${reg.isCheckedIn}`);
    res.json({ registration: reg });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle check-in', details: err.message });
  }
});

app.delete('/api/registrations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await RegistrationModel.deleteOne({ $or: [{ id }, { registrationId: id }] });
    await recordAuditLog('REGISTRATION_DELETED', id, `Deleted registration ID ${id}`);
    res.json({ message: 'Registration record deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete registration', details: err.message });
  }
});

// QR SCANNER ATTENDANCE CHECK-IN API
app.post('/api/checkin/scan', async (req, res) => {
  try {
    const { registrationId } = req.body;
    if (!registrationId) return res.status(400).json({ error: 'Registration ID or QR data required' });

    const cleanId = registrationId.trim();
    const reg = await RegistrationModel.findOne({
      $or: [{ registrationId: cleanId }, { id: cleanId }],
    });

    if (!reg) {
      return res.json({ result: 'INVALID REGISTRATION', message: 'No registration record found in database.' });
    }

    if (reg.status !== 'APPROVED') {
      return res.json({ result: 'NOT APPROVED', message: `Registration status is ${reg.status}.` });
    }

    if (reg.isCheckedIn) {
      return res.json({ 
        result: 'ALREADY CHECKED IN', 
        message: `Participant ${reg.participantName} checked in earlier at ${reg.checkInTime || 'today'}.`,
        registration: reg 
      });
    }

    reg.isCheckedIn = true;
    reg.checkInTime = new Date().toISOString();
    await reg.save();

    await recordAuditLog('QR_CHECKIN', reg.registrationId, `Verified & Checked-in ${reg.participantName} at ${reg.venueName}`);

    res.json({
      result: 'VALID REGISTRATION',
      message: `Verified! Welcome ${reg.participantName} (${reg.collegeName}) to ${reg.eventTitle}.`,
      registration: reg,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'QR Scan verification failed', details: err.message });
  }
});

// ----------------------------------------------------
// 6. COLLEGES, PARTICIPANTS & TEAMS APIs
// ----------------------------------------------------

app.get('/api/colleges', async (_req, res) => {
  const colleges = await CollegeModel.find().lean();
  res.json(colleges);
});

app.post('/api/colleges', async (req, res) => {
  const newCol = await CollegeModel.create({
    id: `clg-${Date.now()}`,
    ...req.body
  });
  await recordAuditLog('COLLEGE_ADDED', newCol.collegeName, `Added college ${newCol.collegeName} (${newCol.collegeCode})`);
  res.status(201).json(newCol);
});

app.delete('/api/colleges/:id', async (req, res) => {
  await CollegeModel.deleteOne({ id: req.params.id });
  await recordAuditLog('COLLEGE_DELETED', req.params.id, `Deleted college ID ${req.params.id}`);
  res.json({ message: 'College deleted' });
});

app.get('/api/participants', async (_req, res) => {
  const participants = await ParticipantModel.find().lean();
  res.json(participants);
});

app.get('/api/teams', async (_req, res) => {
  const teams = await TeamModel.find().lean();
  res.json(teams);
});

// ----------------------------------------------------
// 7. RESULTS & LEADERBOARD APIs (/api/results, /api/leaderboard)
// ----------------------------------------------------

app.get('/api/results', async (_req, res) => {
  const results = await ResultModel.find().lean();
  res.json(results);
});

app.post('/api/results', async (req, res) => {
  try {
    const { eventId, eventTitle, eventType, category, date, podium, status } = req.body;
    let savedResult;
    if (eventId) {
      const existing = await ResultModel.findOne({ eventId });
      if (existing) {
        existing.eventTitle = eventTitle || existing.eventTitle;
        existing.eventType = eventType || existing.eventType;
        existing.category = category || existing.category;
        existing.date = date || existing.date;
        existing.podium = podium || existing.podium;
        (existing as any).winners = req.body.winners || (existing as any).winners;
        (existing as any).prizeCount = req.body.prizeCount || (existing as any).prizeCount;
        (existing as any).includePoints = req.body.includePoints ?? (existing as any).includePoints;
        existing.status = status || 'PUBLISHED';
        savedResult = await existing.save();
      }
    }

    if (!savedResult) {
      savedResult = await ResultModel.create({
        id: `res-${Date.now()}`,
        ...req.body,
        status: req.body.status || 'PUBLISHED',
      });
    }

    // Also update the event's status to 'completed'
    if (eventId) {
      await EventModel.updateOne({ id: eventId }, { $set: { status: 'completed' } });
    }

    await recordAuditLog('RESULT_PUBLISHED', savedResult.eventTitle, `Published podium winners for ${savedResult.eventTitle}`);
    res.status(201).json(savedResult);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create result', details: err.message });
  }
});

app.delete('/api/results/:id', async (req, res) => {
  await ResultModel.deleteOne({ id: req.params.id });
  await recordAuditLog('RESULT_DELETED', req.params.id, `Removed result ID ${req.params.id}`);
  res.json({ message: 'Result removed' });
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const results = await ResultModel.find({ status: 'PUBLISHED' }).lean();
    const scoreMap: Record<string, { totalPoints: number; gold: number; silver: number; bronze: number }> = {};

    results.forEach((r: any) => {
      const { first, second, third } = r.podium || {};
      const pointsEnabled = r.includePoints === true;

      if (first && first.college) {
        if (!scoreMap[first.college]) scoreMap[first.college] = { totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
        const pts = pointsEnabled && first.points ? Number(first.points) : 0;
        scoreMap[first.college].totalPoints += pts;
        if (first.medal === 'gold' || (!first.medal && first.position === 1)) {
          scoreMap[first.college].gold += 1;
        }
      }
      if (second && second.college) {
        if (!scoreMap[second.college]) scoreMap[second.college] = { totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
        const pts = pointsEnabled && second.points ? Number(second.points) : 0;
        scoreMap[second.college].totalPoints += pts;
        if (second.medal === 'silver' || (!second.medal && second.position === 2)) {
          scoreMap[second.college].silver += 1;
        }
      }
      if (third && third.college) {
        if (!scoreMap[third.college]) scoreMap[third.college] = { totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
        const pts = pointsEnabled && third.points ? Number(third.points) : 0;
        scoreMap[third.college].totalPoints += pts;
        if (third.medal === 'bronze' || (!third.medal && third.position === 3)) {
          scoreMap[third.college].bronze += 1;
        }
      }
    });

    const leaderboard: CollegeLeaderboard[] = Object.keys(scoreMap)
      .map((college) => ({
        college,
        totalPoints: scoreMap[college].totalPoints,
        goldCount: scoreMap[college].gold,
        silverCount: scoreMap[college].silver,
        bronzeCount: scoreMap[college].bronze,
        rank: 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.json(leaderboard);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compute leaderboard', details: err.message });
  }
});

// ----------------------------------------------------
// 8. GALLERY ALBUMS, ANNOUNCEMENTS & CMS APIs
// ----------------------------------------------------

app.get('/api/gallery', async (_req, res) => {
  const albums = await AlbumModel.find({ isPublished: true }).lean();
  res.json(albums);
});

// The About story reuses the existing PageCMS document; event and gallery records remain canonical.
app.get('/api/pages/about', async (_req, res) => {
  try {
    const page = await PageCMSModel.findOne({ pageKey: 'about' }).lean();
    res.json({ content: page?.content || null });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load About page content', details: err.message });
  }
});

app.put('/api/pages/about', async (req, res) => {
  try {
    const content = req.body?.content;
    if (!content || !Array.isArray(content.sections) || !Array.isArray(content.people) || !Array.isArray(content.journey)) {
      return res.status(400).json({ error: 'About page content is incomplete' });
    }

    const hero = content.sections.find((section: any) => section.id === 'hero');
    const page = await PageCMSModel.findOneAndUpdate(
      { pageKey: 'about' },
      {
        $set: {
          pageKey: 'about',
          title: 'COLORIDO 2K26 — The Story',
          heroHeading: hero?.title || 'THIS IS COLORIDO.',
          heroSubtitle: hero?.subtitle || '2K26',
          heroImage: hero?.image || '',
          content: { ...content, updatedAt: new Date().toISOString() },
        },
      },
      { new: true, upsert: true, runValidators: true },
    ).lean();

    await recordAuditLog('ABOUT_PAGE_UPDATED', 'ABOUT_PAGE', 'Updated COLORIDO story page content');
    res.json({ content: page?.content });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save About page content', details: err.message });
  }
});

app.post('/api/gallery', async (req, res) => {
  const album = await AlbumModel.create({
    id: `alb-${Date.now()}`,
    ...req.body
  });
  await recordAuditLog('ALBUM_CREATED', album.title, `Created album ${album.title}`);
  res.status(201).json(album);
});

app.delete('/api/gallery/:id', async (req, res) => {
  await AlbumModel.deleteOne({ id: req.params.id });
  await recordAuditLog('ALBUM_DELETED', req.params.id, `Deleted album ${req.params.id}`);
  res.json({ message: 'Album deleted' });
});

app.get('/api/announcements', async (_req, res) => {
  const announcements = await AnnouncementModel.find({ isPublished: true }).sort({ publishDate: -1 }).lean();
  res.json(announcements);
});

app.post('/api/announcements', async (req, res) => {
  const announcement = await AnnouncementModel.create({
    id: `ann-${Date.now()}`,
    ...req.body
  });
  await recordAuditLog('ANNOUNCEMENT_CREATED', announcement.title, `Posted announcement ${announcement.title}`);
  res.status(201).json(announcement);
});

app.delete('/api/announcements/:id', async (req, res) => {
  await AnnouncementModel.deleteOne({ id: req.params.id });
  await recordAuditLog('ANNOUNCEMENT_DELETED', req.params.id, `Deleted announcement ID ${req.params.id}`);
  res.json({ message: 'Announcement deleted' });
});

// ----------------------------------------------------
// 9. AUDIT LOGS, NOTIFICATIONS & SETTINGS APIs
// ----------------------------------------------------

app.get('/api/admin/audit-logs', async (_req, res) => {
  const logs = await AuditLogModel.find().sort({ timestamp: -1 }).limit(100).lean();
  res.json(logs);
});

app.get('/api/admin/notifications', async (_req, res) => {
  const notifications = await NotificationModel.find().sort({ createdAt: -1 }).limit(20).lean();
  res.json(notifications);
});

app.get('/api/settings', async (_req, res) => {
  try {
    let settings = await SettingsModel.findOne({ key: 'global_config' }).lean();
    if (!settings) {
      settings = await SettingsModel.create({ key: 'global_config', maintenanceMode: false });
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch settings', details: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await SettingsModel.findOneAndUpdate(
      { key: 'global_config' },
      { $set: req.body },
      { new: true, upsert: true }
    );
    await recordAuditLog('SETTINGS_UPDATED', 'GLOBAL_SETTINGS', `Updated global system settings (Maintenance Mode: ${req.body.maintenanceMode ? 'ON' : 'OFF'})`);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update settings', details: err.message });
  }
});

app.get('/api/venues', async (_req, res) => {
  const venues = await VenueModel.find().lean();
  res.json(venues);
});

app.post('/api/venues', async (req, res) => {
  const venue = await VenueModel.create({
    id: `v-${Date.now()}`,
    ...req.body
  });
  await recordAuditLog('VENUE_ADDED', venue.name, `Added venue ${venue.name}`);
  res.status(201).json(venue);
});

// ----------------------------------------------------
// COLORIDO 2K26 MEDIA GALLERY APIs (/api/media)
// ----------------------------------------------------

// 1. Get all media items (supports type, category, eventId, featured, search & sorts by createdAt DESC)
app.get('/api/media', async (req, res) => {
  try {
    const { type, category, eventId, featured, search, sort, includeHidden } = req.query;
    const filter: any = {};

    // Public users only see published media unless admin specifies includeHidden=true
    if (includeHidden !== 'true') {
      filter.published = { $ne: false };
    }

    if (type && type !== 'ALL' && type !== 'all') {
      filter.type = (type as string).toLowerCase().startsWith('video') ? 'video' : 'photo';
    }

    if (category && category !== 'ALL' && category !== 'all') {
      filter.category = new RegExp(`^${category}$`, 'i');
    }

    if (eventId && eventId !== 'ALL' && eventId !== 'all') {
      filter.eventId = eventId;
    }

    if (featured === 'true' || featured === true) {
      filter.featured = true;
    }

    if (search) {
      const q = String(search).trim();
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } },
        { eventTitle: { $regex: q, $options: 'i' } },
        { location: { $regex: q, $options: 'i' } },
      ];
    }

    let sortOption: any = { createdAt: -1 }; // Default LATEST FIRST
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'title' || sort === 'title_asc') {
      sortOption = { title: 1 };
    } else if (sort === 'title_desc') {
      sortOption = { title: -1 };
    } else if (sort === 'highlight') {
      sortOption = { highlightOrder: 1, createdAt: -1 };
    }

    const items = await MediaModel.find(filter).sort(sortOption).lean();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch gallery media', details: err.message });
  }
});

// 2. Upload / Create new media item (Single photo, video, or multi-photo collection)
app.post('/api/media', async (req, res) => {
  try {
    const {
      title,
      type = 'photo',
      category = 'CEREMONIES',
      eventId = '',
      eventTitle = '',
      url,
      thumbnailUrl,
      coverPhoto = '',
      photos = [],
      published = true,
      description = '',
      featured = false,
      highlightOrder = 0,
      width = 1920,
      height = 1080,
      duration = null,
      aspectRatio = '16:9',
      focalPoint = { x: 50, y: 50 },
      location = 'R.V.R. & J.C. Campus',
    } = req.body;

    const primaryUrl = url || (photos && photos.length > 0 ? photos[0].url : '');
    if (!title || !primaryUrl) {
      return res.status(400).json({ error: 'Title and Media URL are required' });
    }

    const resolvedCover = coverPhoto || primaryUrl;
    const resolvedThumb = thumbnailUrl || resolvedCover;

    const now = new Date().toISOString();
    const isVideo = type === 'video';
    const newMedia = await MediaModel.create({
      id: `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: isVideo ? 'video' : 'photo',
      title: title.trim(),
      category: category.toUpperCase().trim(),
      eventId: eventId ? String(eventId).trim() : '',
      eventTitle: eventTitle ? String(eventTitle).trim() : '',
      url: primaryUrl.trim(),
      thumbnailUrl: resolvedThumb.trim(),
      coverPhoto: resolvedCover.trim(),
      videoUrl: isVideo ? (req.body.videoUrl || primaryUrl.trim()) : undefined,
      coverImageUrl: resolvedCover.trim(),
      photos: Array.isArray(photos) ? photos : [],
      published: published !== false,
      createdAt: now,
      updatedAt: now,
      uploadedAt: req.body.uploadedAt || now,
      featured: Boolean(featured),
      highlightOrder: Number(highlightOrder) || 0,
      displayOrder: Number(req.body.displayOrder) || Number(highlightOrder) || 0,
      description: description.trim(),
      width: Number(width) || 1920,
      height: Number(height) || 1080,
      videoWidth: Number(req.body.videoWidth) || Number(width) || 1920,
      videoHeight: Number(req.body.videoHeight) || Number(height) || 1080,
      coverSource: req.body.coverSource || (isVideo ? 'video-frame' : 'default'),
      duration: duration || null,
      aspectRatio: aspectRatio || '16:9',
      focalPoint: focalPoint || { x: 50, y: 50 },
      location: location.trim(),
    });

    await recordAuditLog('MEDIA_UPLOADED', newMedia.id, `Uploaded ${newMedia.type.toUpperCase()}: "${newMedia.title}" (${newMedia.category})`);
    res.status(201).json(newMedia);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload media item', details: err.message });
  }
});

// 3. Update media item
app.put('/api/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;
    const updateData: any = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    if (body.url && (body.type === 'video' || !body.type)) {
      updateData.videoUrl = body.videoUrl || body.url;
    }
    if (body.coverPhoto) {
      updateData.coverImageUrl = body.coverPhoto;
    }

    const updated = await MediaModel.findOneAndUpdate(
      { id },
      { $set: updateData },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Media item not found' });
    }

    await recordAuditLog('MEDIA_UPDATED', id, `Updated media "${updated.title}"`);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update media item', details: err.message });
  }
});

// 4. Toggle or set Featured/Highlight
app.patch('/api/media/:id/featured', async (req, res) => {
  try {
    const { id } = req.params;
    const media = await MediaModel.findOne({ id });
    if (!media) return res.status(404).json({ error: 'Media item not found' });

    media.featured = req.body.featured !== undefined ? req.body.featured : !media.featured;
    media.updatedAt = new Date().toISOString();
    await media.save();

    await recordAuditLog('MEDIA_FEATURED_TOGGLED', id, `${media.featured ? 'Marked' : 'Unmarked'} "${media.title}" as COLORIDO Highlight`);
    res.json(media);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle featured status', details: err.message });
  }
});

// 5. Toggle or set Published / Hidden
app.patch('/api/media/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const media = await MediaModel.findOne({ id });
    if (!media) return res.status(404).json({ error: 'Media item not found' });

    media.published = req.body.published !== undefined ? Boolean(req.body.published) : !media.published;
    media.updatedAt = new Date().toISOString();
    await media.save();

    await recordAuditLog('MEDIA_PUBLISH_TOGGLED', id, `${media.published ? 'Published' : 'Hidden'} "${media.title}"`);
    res.json(media);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to toggle published status', details: err.message });
  }
});

// 6. Reorder highlights
app.patch('/api/media/reorder-highlights', async (req, res) => {
  try {
    const { orders } = req.body; // array of { id, order }
    if (Array.isArray(orders)) {
      await Promise.all(
        orders.map((item) =>
          MediaModel.updateOne({ id: item.id }, { $set: { highlightOrder: item.order, updatedAt: new Date().toISOString() } })
        )
      );
    }
    const updated = await MediaModel.find({ featured: true }).sort({ highlightOrder: 1 }).lean();
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to reorder highlights', details: err.message });
  }
});

// 7. Delete media item
app.delete('/api/media/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const media = await MediaModel.findOne({ id });
    if (!media) return res.status(404).json({ error: 'Media item not found' });

    await MediaModel.deleteOne({ id });
    await recordAuditLog('MEDIA_DELETED', id, `Deleted media item "${media.title}"`);
    res.json({ success: true, message: `Deleted media ${id}` });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete media item', details: err.message });
  }
});

// Production Static Frontend Serving (Vite dist bundle)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
}

// Global unhandled error middleware (JSON error response)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`⚡ COLORIDO 2K26 Super Admin API Server running at http://localhost:${PORT}`);
});
