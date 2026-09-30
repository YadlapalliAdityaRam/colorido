export type EventType = 'sports' | 'cultural';
export type EventFormat = 'solo' | 'team' | 'doubles';
export type EventStatus = 'open' | 'closing-soon' | 'full' | 'completed' | 'ongoing' | 'CANCELLED' | 'ARCHIVED' | 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export interface Coordinator {
  name: string;
  phone: string;
  email: string;
  role?: string;
}

export interface EventPrizes {
  first: string;
  second: string;
  third: string;
}

export interface LiveMatch {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  status: 'LIVE' | 'HALFTIME' | 'UPCOMING' | 'FINISHED' | 'COMPLETED' | 'FULL_TIME';
  startTime?: string;
  endTime?: string;
  lastUpdated: string;
  winner?: string;
  remarks?: string;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  type: EventType;
  category: string;
  subCategory?: string;
  description: string;
  oneLineSummary: string;
  rules: string[];
  eligibility: string;
  format: EventFormat;
  minTeamSize: number;
  maxTeamSize: number;
  isSubmissionBased: boolean;
  submissionInstructions?: string;
  stageInstructions?: string;
  venueId: string;
  venueName: string;
  dateTime: string;
  eventDate?: string;
  regOpenDate?: string;
  regCloseDate?: string;
  startTime?: string;
  endTime?: string;
  startHour?: string;
  startMin?: string;
  startAmPm?: 'AM' | 'PM';
  endHour?: string;
  endMin?: string;
  endAmPm?: 'AM' | 'PM';
  playersPerTeam?: number;
  maxTeams?: number;
  liveEnabled?: boolean;
  liveSlug?: string;
  liveMatch?: LiveMatch;
  day: 1 | 2 | 3;
  regDeadline: string;
  fee: number;
  seatsTotal: number;
  seatsLeft: number;
  bannerImage: string;
  status: EventStatus;
  prizes: EventPrizes;
  judgingCriteria?: string[];
  coordinators: Coordinator[];
  eventCoordinators?: any[];
  isFlagship?: boolean;
  teamLeaderPhone?: string;
  qrEnabled?: boolean;
  qrImage?: string;
}

export interface TeamMember {
  name: string;
  email?: string;
  phone?: string;
  studentId: string;
  rollNumber?: string;
  college?: string;
  role?: string;
}

export interface Registration {
  id: string;
  registrationId: string; // e.g. COL26-SPT-0453
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  eventDate: string;
  venueName: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  collegeName: string;
  studentId: string;
  format: EventFormat;
  teamName?: string;
  members: TeamMember[];
  status: 'confirmed' | 'pending' | 'cancelled';
  isCheckedIn: boolean;
  createdAt: string;
  emailSent?: boolean;
  emailError?: string;
  isDuplicate?: boolean;
  message?: string;
}

export interface Venue {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  capacity?: number | string;
  photo?: string;
  location?: string;
  facilities?: string[];
  eventsCount?: number;
  type?: string;
  isDisabled?: boolean;
  mapCoords?: { x: number; y: number };
}

export interface ResultPodium {
  position: 1 | 2 | 3 | number;
  positionLabel?: string;
  medal?: 'gold' | 'silver' | 'bronze' | 'trophy' | 'certificate' | 'none';
  studentName?: string;
  teamOrParticipant: string;
  college: string;
  points?: number;
  details?: string;
}

export interface EventResult {
  id: string;
  eventId: string;
  eventTitle: string;
  eventType: EventType;
  category: string;
  date: string;
  includePoints?: boolean;
  prizeCount?: number;
  winners?: ResultPodium[];
  podium: {
    first?: ResultPodium;
    second?: ResultPodium;
    third?: ResultPodium;
    fourth?: ResultPodium;
    fifth?: ResultPodium;
    [key: string]: ResultPodium | undefined;
  };
}

export interface CollegeLeaderboard {
  college: string;
  totalPoints: number;
  goldCount: number;
  silverCount: number;
  bronzeCount: number;
  rank: number;
}

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  college: string;
  studentId: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export type MediaCategory = 
  | 'ALL'
  | 'SPORTS'
  | 'CULTURAL'
  | 'PERFORMANCES'
  | 'CAMPUS'
  | 'CEREMONIES'
  | 'AWARDS'
  | 'CANDID'
  | 'STUDENTS'
  | 'OTHER';

export type MediaFilterType = 'ALL' | 'PHOTOS' | 'VIDEOS' | 'HIGHLIGHTS';

export interface MediaPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  order: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  focalPoint?: { x: number; y: number };
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  title: string;
  category: string;
  eventId?: string;
  eventTitle?: string;
  url: string;
  thumbnailUrl: string;
  coverPhoto?: string;
  photos?: MediaPhoto[]; // For multiple photos / collections!
  published?: boolean;    // true = visible in public gallery, false = hidden in admin only
  featured: boolean;     // Highlight ON/OFF
  highlightOrder?: number;
  description: string;
  width?: number;
  height?: number;
  videoWidth?: number;
  videoHeight?: number;
  duration?: string | number | null; // e.g. "02:42" or seconds
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '21:9' | string;
  coverSource?: 'uploaded' | 'video-frame';
  videoUrl?: string;
  coverImageUrl?: string;
  displayOrder?: number;
  uploadedAt?: string;
  focalPoint?: { x: number; y: number }; // percentage 0-100
  location?: string;
  author?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AboutStorySection {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  published: boolean;
  order: number;
}

export interface AboutStoryPerson {
  id: string;
  name: string;
  role: string;
  description: string;
  image: string;
  published: boolean;
  order: number;
}

export interface AboutStoryWorld {
  id: string;
  title: string;
  label: string;
  description: string;
  image: string;
  href: string;
  published: boolean;
  order: number;
}

export interface AboutJourneyMoment {
  id: string;
  phase: string;
  title: string;
  description: string;
  time?: string;
  published: boolean;
  order: number;
}

export interface AboutPageContent {
  sections: AboutStorySection[];
  worlds: AboutStoryWorld[];
  people: AboutStoryPerson[];
  journey: AboutJourneyMoment[];
  dna: string[];
  selectedSportsEventIds: string[];
  selectedCulturalEventIds: string[];
  selectedMemoryIds: string[];
  collegeWebsite: string;
  updatedAt?: string;
}
