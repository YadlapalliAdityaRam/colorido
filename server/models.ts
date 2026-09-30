import mongoose, { Schema, Document } from 'mongoose';

// 1. Admin Model
export interface IAdmin extends Document {
  email: string;
  passwordHash: string;
  name: string;
  role: string;
  lastLogin?: string;
}

const AdminSchema = new Schema<IAdmin>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, default: 'Super Admin Secretariat' },
  role: { type: String, default: 'SUPER_ADMIN' },
  lastLogin: { type: String },
});

export const AdminModel = mongoose.model<IAdmin>('Admin', AdminSchema);

// 2. Event Model
export interface IEvent extends Document {
  id: string;
  title: string;
  slug: string;
  type: 'sports' | 'cultural';
  category: string;
  description: string;
  shortDescription?: string;
  oneLineSummary?: string;
  bannerImage: string;
  thumbnailImage?: string;
  rules: string[];
  eligibility?: string;
  maxParticipants?: number;
  seatsTotal: number;
  seatsLeft: number;
  registrationFee?: number;
  dateTime: string;
  eventDate?: string;
  regOpenDate?: string;
  regCloseDate?: string;
  startTime?: string;
  endTime?: string;
  startHour?: string;
  startMin?: string;
  startAmPm?: string;
  endHour?: string;
  endMin?: string;
  endAmPm?: string;
  venueName: string;
  playersPerTeam: number;
  maxTeams?: number;
  registrationType: string;
  maxRegistrations: number;
  teamLeaderPhone?: string;
  coordinatorName?: string;
  coordinatorPhone?: string;
  coordinatorEmail?: string;
  format: string;
  status: string;
  day?: number;
  isArchived?: boolean;
  liveEnabled?: boolean;
  liveSlug?: string;
  liveMatch?: {
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
    status: 'LIVE' | 'HALFTIME' | 'UPCOMING' | 'FINISHED';
    lastUpdated: string;
    winner?: string;
    remarks?: string;
  };
}

const EventSchema = new Schema<IEvent>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  slug: { type: String, required: true },
  type: { type: String, enum: ['sports', 'cultural'], required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  shortDescription: { type: String },
  oneLineSummary: { type: String },
  bannerImage: { type: String, required: true },
  thumbnailImage: { type: String },
  rules: [{ type: String }],
  eligibility: { type: String, default: 'Valid College Student ID mandatory' },
  maxParticipants: { type: Number, default: 100 },
  seatsTotal: { type: Number, default: 32 },
  seatsLeft: { type: Number, default: 32 },
  registrationFee: { type: Number, default: 0 },
  dateTime: { type: String, required: true },
  eventDate: { type: String, default: '2026-09-30' },
  regOpenDate: { type: String, default: '2026-09-15' },
  regCloseDate: { type: String, default: '2026-09-28' },
  startTime: { type: String, default: '10:30 AM' },
  endTime: { type: String, default: '01:30 PM' },
  startHour: { type: String, default: '10' },
  startMin: { type: String, default: '30' },
  startAmPm: { type: String, default: 'AM' },
  endHour: { type: String, default: '01' },
  endMin: { type: String, default: '30' },
  endAmPm: { type: String, default: 'PM' },
  venueName: { type: String, required: true },
  playersPerTeam: { type: Number, default: 1 },
  maxTeams: { type: Number, default: 32 },
  registrationType: { type: String, default: 'INDIVIDUAL' },
  maxRegistrations: { type: Number, default: 32 },
  teamLeaderPhone: { type: String, default: '+91 98765 43210' },
  coordinatorName: { type: String, default: 'Dr. Faculty Coordinator' },
  coordinatorPhone: { type: String, default: '+91 863 218 8201' },
  coordinatorEmail: { type: String, default: 'colorido@rvrjc.ac.in' },
  format: { type: String, default: 'team' },
  status: { type: String, default: 'open' },
  day: { type: Number, default: 1 },
  isArchived: { type: Boolean, default: false },
  liveEnabled: { type: Boolean, default: false },
  liveSlug: { type: String },
  liveMatch: { type: Schema.Types.Mixed },
});

export const EventModel = mongoose.model<IEvent>('Event', EventSchema);

// 3. Venue Model
export interface IVenue extends Document {
  id: string;
  name: string;
  capacity?: string;
  location?: string;
  description?: string;
  facilities?: string[];
  eventsCount?: number;
  iconName?: string;
  type?: string;
  image?: string;
  isDisabled?: boolean;
}

const VenueSchema = new Schema<IVenue>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  capacity: { type: String, default: '500 Spectators' },
  location: { type: String, default: 'R.V.R. & J.C. Campus Grounds' },
  description: { type: String },
  facilities: [{ type: String }],
  eventsCount: { type: Number, default: 0 },
  iconName: { type: String, default: 'Building' },
  type: { type: String, default: 'Main Complex' },
  image: { type: String, default: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=85' },
  isDisabled: { type: Boolean, default: false },
});

export const VenueModel = mongoose.model<IVenue>('Venue', VenueSchema);

// 4. Schedule Model
export interface ISchedule extends Document {
  id: string;
  eventId: string;
  eventTitle: string;
  venueName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

const ScheduleSchema = new Schema<ISchedule>({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  eventTitle: { type: String, required: true },
  venueName: { type: String, required: true },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  status: { type: String, default: 'SCHEDULED' },
});

export const ScheduleModel = mongoose.model<ISchedule>('Schedule', ScheduleSchema);

// 5. Registration Model
export interface IRegistrationMember {
  name: string;
  rollNumber?: string;
  studentId?: string;
  college?: string;
  phone?: string;
  email?: string;
}

export interface IRegistration extends Document {
  id: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  eventType: 'sports' | 'cultural';
  eventDate: string;
  venueName: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  collegeName: string;
  studentId: string;
  department?: string;
  year?: string;
  format: string;
  teamName?: string;
  members: IRegistrationMember[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  isCheckedIn: boolean;
  checkInTime?: string;
  qrCodeData?: string;
  createdAt: string;
}

const RegistrationSchema = new Schema<IRegistration>({
  id: { type: String, required: true, unique: true },
  registrationId: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  eventTitle: { type: String, required: true },
  eventType: { type: String, enum: ['sports', 'cultural'], required: true },
  eventDate: { type: String, required: true },
  venueName: { type: String, required: true },
  participantName: { type: String, required: true },
  participantEmail: { type: String, required: true },
  participantPhone: { type: String, required: true },
  collegeName: { type: String, required: true },
  studentId: { type: String, required: true },
  department: { type: String, default: 'CSE' },
  year: { type: String, default: '3rd Year' },
  format: { type: String, default: 'team' },
  teamName: { type: String },
  members: [
    {
      name: String,
      rollNumber: String,
      studentId: String,
      college: String,
      email: String,
      phone: String,
    },
  ],
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'], default: 'APPROVED' },
  isCheckedIn: { type: Boolean, default: false },
  checkInTime: { type: String },
  qrCodeData: { type: String },
  createdAt: { type: String, required: true },
});

export const RegistrationModel = mongoose.model<IRegistration>('Registration', RegistrationSchema);

// 6. Participant Model
export interface IParticipant extends Document {
  id: string;
  name: string;
  email: string;
  phone: string;
  collegeName: string;
  studentId: string;
  department: string;
  year: string;
  registeredEvents: string[];
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

const ParticipantSchema = new Schema<IParticipant>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  collegeName: { type: String, required: true },
  studentId: { type: String, required: true },
  department: { type: String, default: 'Engineering' },
  year: { type: String, default: '3rd Year' },
  registeredEvents: [{ type: String }],
  status: { type: String, enum: ['APPROVED', 'PENDING', 'REJECTED'], default: 'APPROVED' },
});

export const ParticipantModel = mongoose.model<IParticipant>('Participant', ParticipantSchema);

// 7. College Model
export interface ICollege extends Document {
  id: string;
  collegeName: string;
  collegeCode: string;
  city: string;
  state: string;
  coordinatorName: string;
  phone: string;
  email: string;
  logo?: string;
  participantsCount: number;
  isApproved: boolean;
  isDisabled: boolean;
}

const CollegeSchema = new Schema<ICollege>({
  id: { type: String, required: true, unique: true },
  collegeName: { type: String, required: true },
  collegeCode: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  coordinatorName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  logo: { type: String },
  participantsCount: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: true },
  isDisabled: { type: Boolean, default: false },
});

export const CollegeModel = mongoose.model<ICollege>('College', CollegeSchema);

// 8. Team Model
export interface ITeam extends Document {
  id: string;
  teamName: string;
  collegeName: string;
  captainName: string;
  members: string[];
  eventId: string;
  eventTitle: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

const TeamSchema = new Schema<ITeam>({
  id: { type: String, required: true, unique: true },
  teamName: { type: String, required: true },
  collegeName: { type: String, required: true },
  captainName: { type: String, required: true },
  members: [{ type: String }],
  eventId: { type: String, required: true },
  eventTitle: { type: String, required: true },
  status: { type: String, enum: ['APPROVED', 'PENDING', 'REJECTED'], default: 'APPROVED' },
});

export const TeamModel = mongoose.model<ITeam>('Team', TeamSchema);

// 9. Result Model
export interface IResult extends Document {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: 'sports' | 'cultural';
  category: string;
  round?: string;
  date: string;
  podium: {
    first: { position: number; teamOrParticipant: string; college: string; points: number };
    second: { position: number; teamOrParticipant: string; college: string; points: number };
    third: { position: number; teamOrParticipant: string; college: string; points: number };
    specialMention?: { teamOrParticipant: string; college: string; remark: string };
  };
  status: 'DRAFT' | 'VERIFIED' | 'PUBLISHED';
}

const ResultSchema = new Schema<IResult>({
  id: { type: String, required: true, unique: true },
  eventId: { type: String, required: true },
  eventTitle: { type: String, required: true },
  eventType: { type: String, enum: ['sports', 'cultural'], required: true },
  category: { type: String, required: true },
  round: { type: String, default: 'Final Round' },
  date: { type: String, required: true },
  podium: {
    first: {
      position: { type: Number, default: 1 },
      teamOrParticipant: { type: String, required: true },
      college: { type: String, required: true },
      points: { type: Number, default: 100 },
    },
    second: {
      position: { type: Number, default: 2 },
      teamOrParticipant: { type: String, required: true },
      college: { type: String, required: true },
      points: { type: Number, default: 60 },
    },
    third: {
      position: { type: Number, default: 3 },
      teamOrParticipant: { type: String, required: true },
      college: { type: String, required: true },
      points: { type: Number, default: 30 },
    },
    specialMention: {
      teamOrParticipant: String,
      college: String,
      remark: String,
    }
  },
  status: { type: String, enum: ['DRAFT', 'VERIFIED', 'PUBLISHED'], default: 'PUBLISHED' },
}, { strict: false });

export const ResultModel = mongoose.model<IResult>('Result', ResultSchema);

// 10. Album / Gallery Model
export interface IAlbum extends Document {
  id: string;
  title: string;
  category: 'Sports' | 'Cultural' | 'Campus' | 'Opening Ceremony' | 'Closing Ceremony' | 'Awards' | 'Students';
  coverImage: string;
  images: string[];
  isPublished: boolean;
}

const AlbumSchema = new Schema<IAlbum>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['Sports', 'Cultural', 'Campus', 'Opening Ceremony', 'Closing Ceremony', 'Awards', 'Students'], 
    default: 'Campus' 
  },
  coverImage: { type: String, required: true },
  images: [{ type: String }],
  isPublished: { type: Boolean, default: true },
});

export const AlbumModel = mongoose.model<IAlbum>('Album', AlbumSchema);

// 11. Announcement Model
export interface IAnnouncement extends Document {
  id: string;
  title: string;
  description: string;
  image?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  type: 'General' | 'Event' | 'Urgent' | 'Registration' | 'Schedule' | 'Results';
  publishDate: string;
  expiryDate?: string;
  isPublished: boolean;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
  type: { type: String, enum: ['General', 'Event', 'Urgent', 'Registration', 'Schedule', 'Results'], default: 'General' },
  publishDate: { type: String, default: () => new Date().toISOString().split('T')[0] },
  expiryDate: { type: String },
  isPublished: { type: Boolean, default: true },
});

export const AnnouncementModel = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);

// 12. Page CMS Model
export interface IPageCMS extends Document {
  pageKey: string;
  title: string;
  heroHeading: string;
  heroSubtitle: string;
  heroImage: string;
  content: any;
}

const PageCMSSchema = new Schema<IPageCMS>({
  pageKey: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  heroHeading: { type: String },
  heroSubtitle: { type: String },
  heroImage: { type: String },
  content: { type: Schema.Types.Mixed },
});

export const PageCMSModel = mongoose.model<IPageCMS>('PageCMS', PageCMSSchema);

// 13. Unified Media Library Model (COLORIDO 2K26 Memory Gallery & Collections)
export interface IMediaPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
}

export interface IMedia extends Document {
  id: string;
  type: 'photo' | 'video';
  title: string;
  category: string;
  eventId?: string;
  eventTitle?: string;
  url: string;
  thumbnailUrl: string;
  coverPhoto?: string;
  photos?: IMediaPhoto[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
  featured: boolean;
  highlightOrder?: number;
  description: string;
  width?: number;
  height?: number;
  videoWidth?: number;
  videoHeight?: number;
  videoUrl?: string;
  coverImageUrl?: string;
  duration?: string | number | null;
  aspectRatio?: string;
  coverSource?: string;
  displayOrder?: number;
  uploadedAt?: string;
  focalPoint?: { x: number; y: number };
  location?: string;
  fileType?: string;
  size?: string;
}

const MediaSchema = new Schema<IMedia>({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['photo', 'video'], default: 'photo' },
  title: { type: String, required: true },
  category: { type: String, default: 'CEREMONIES' },
  eventId: { type: String, default: '' },
  eventTitle: { type: String, default: '' },
  url: { type: String, required: true },
  thumbnailUrl: { type: String, required: true },
  coverPhoto: { type: String, default: '' },
  coverSource: { type: String, enum: ['uploaded', 'video-frame', 'default'], default: 'default' },
  videoUrl: { type: String },
  coverImageUrl: { type: String },
  photos: [
    {
      id: { type: String },
      url: { type: String },
      thumbnailUrl: { type: String },
      caption: { type: String, default: '' },
      order: { type: Number, default: 0 },
    },
  ],
  published: { type: Boolean, default: true },
  createdAt: { type: String, default: () => new Date().toISOString() },
  updatedAt: { type: String, default: () => new Date().toISOString() },
  uploadedAt: { type: String, default: () => new Date().toISOString() },
  featured: { type: Boolean, default: false },
  highlightOrder: { type: Number, default: 0 },
  displayOrder: { type: Number, default: 0 },
  description: { type: String, default: '' },
  width: { type: Number, default: 1920 },
  height: { type: Number, default: 1080 },
  videoWidth: { type: Number },
  videoHeight: { type: Number },
  duration: { type: Schema.Types.Mixed, default: null },
  aspectRatio: { type: String, default: '16:9' },
  focalPoint: {
    x: { type: Number, default: 50 },
    y: { type: Number, default: 50 },
  },
  location: { type: String, default: 'R.V.R. & J.C. Campus' },
  fileType: { type: String, default: 'image/jpeg' },
  size: { type: String, default: '2.4 MB' },
});

export const MediaModel = mongoose.model<IMedia>('Media', MediaSchema);

// 14. Audit Log Model
export interface IAuditLog extends Document {
  id: string;
  action: string;
  adminEmail: string;
  timestamp: string;
  target: string;
  description: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  id: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  adminEmail: { type: String, required: true },
  timestamp: { type: String, required: true },
  target: { type: String, required: true },
  description: { type: String, required: true },
});

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

// 15. System Notifications Model
export interface INotification extends Document {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationSchema = new Schema<INotification>({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'info' },
  isRead: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
});

export const NotificationModel = mongoose.model<INotification>('Notification', NotificationSchema);

// 16. System Settings & Maintenance Mode Model
export interface ISettings extends Document {
  key: string;
  collegeName: string;
  sponsoringSociety: string;
  eapcetCode: string;
  naacGrade: string;
  festName: string;
  startDate: string;
  endDate: string;
  isRegistrationOpen: boolean;
  maxTeamLimit: number;
  convenerName: string;
  contactEmail: string;
  contactPhone: string;
  maintenanceMode: boolean;
  socialInstagram: string;
  socialYoutube: string;
  socialLinkedin: string;
  seoTitle: string;
  seoDescription: string;
}

const SettingsSchema = new Schema<ISettings>({
  key: { type: String, default: 'global_config', unique: true },
  collegeName: { type: String, default: 'R.V.R. & J.C. College of Engineering (Autonomous)' },
  sponsoringSociety: { type: String, default: 'Nagarjuna Education Society (NES)' },
  eapcetCode: { type: String, default: 'RVJC' },
  naacGrade: { type: String, default: 'A+ Grade' },
  festName: { type: String, default: 'COLORIDO 2K26' },
  startDate: { type: String, default: '2026-09-30' },
  endDate: { type: String, default: '2026-10-02' },
  isRegistrationOpen: { type: Boolean, default: true },
  maxTeamLimit: { type: Number, default: 100 },
  convenerName: { type: String, default: 'Dr. K. Ravindra (Principal & Fest Patron)' },
  contactEmail: { type: String, default: 'colorido@rvrjc.ac.in' },
  contactPhone: { type: String, default: '+91 863 218 8201' },
  maintenanceMode: { type: Boolean, default: false },
  socialInstagram: { type: String, default: 'https://instagram.com' },
  socialYoutube: { type: String, default: 'https://youtube.com' },
  socialLinkedin: { type: String, default: 'https://linkedin.com' },
  seoTitle: { type: String, default: 'COLORIDO 2K26 — National Cultural & Sports Festival' },
  seoDescription: { type: String, default: 'National level inter-college festival hosted by R.V.R. & J.C. College of Engineering, Guntur.' },
});

export const SettingsModel = mongoose.model<ISettings>('Settings', SettingsSchema);
