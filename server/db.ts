import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { 
  AdminModel, 
  EventModel, 
  RegistrationModel, 
  ResultModel, 
  VenueModel, 
  SettingsModel,
  CollegeModel,
  ParticipantModel,
  AnnouncementModel,
  AlbumModel,
  ScheduleModel,
  AuditLogModel,
  NotificationModel,
  MediaModel
} from './models';
import { INITIAL_EVENTS, MOCK_VENUES, INITIAL_REGISTRATIONS, INITIAL_RESULTS, INITIAL_MEDIA_ITEMS } from '../src/data/mockData';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI?.trim();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rvrjc.ac.in';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();

let isConnecting = false;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.error('Database startup skipped: set MONGODB_URI in the server environment.');
    throw new Error('MONGODB_URI is not set in environment variables. Please add MONGODB_URI in Vercel project settings.');
  }

  if (isConnecting) {
    while (mongoose.connection.readyState === 2) {
      await new Promise(r => setTimeout(r, 100));
    }
    if (mongoose.connection.readyState === 1) return;
  }

  isConnecting = true;

  try {
    console.log('🔌 Connecting to MongoDB Atlas (mongobb database)...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected successfully to MongoDB Atlas: mongobb');

    // Auto seed database if collections are empty
    await seedDatabaseIfEmpty();
  } catch (err: any) {
    console.error('❌ MongoDB Atlas connection error:', err.message);
    throw err;
  } finally {
    isConnecting = false;
  }
}

async function seedDatabaseIfEmpty() {
  try {
    // 1. Seed Admin Account with salted bcrypt password hash
    const adminCount = await AdminModel.countDocuments();
    if (adminCount === 0) {
      if (!ADMIN_PASSWORD) throw new Error('Set ADMIN_PASSWORD before starting a database with no administrator account.');
      console.log('🔑 Seeding Super Admin Account with salted bcrypt hash...');
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await AdminModel.create({
        email: ADMIN_EMAIL.toLowerCase().trim(),
        passwordHash,
        name: 'Dr. K. Ravindra (Principal & Fest Patron)',
        role: 'SUPER_ADMIN',
        lastLogin: new Date().toISOString(),
      });
      console.log(`✅ Seeded Super Admin: ${ADMIN_EMAIL}`);
    }

    // 2. Seed Events
    const eventCount = await EventModel.countDocuments();
    if (eventCount === 0) {
      console.log('🌱 Seeding initial COLORIDO 2K26 Events to MongoDB...');
      await EventModel.insertMany(INITIAL_EVENTS.map(e => ({
        ...e,
        bannerImage: e.type === 'cultural' ? '/cultural_global_profile_photo.jpeg' : '/global_sports_profile.jpeg'
      })));
      console.log(`✅ Seeded ${INITIAL_EVENTS.length} events into mongobb.events`);
    } else {
      const culturalCount = await EventModel.countDocuments({ type: 'cultural' });
      if (culturalCount === 0) {
        console.log('🌱 Seeding cultural events with global profile photos into MongoDB...');
        const culturalEvents = INITIAL_EVENTS.filter(e => e.type === 'cultural').map(e => ({
          ...e,
          bannerImage: '/cultural_global_profile_photo.jpeg'
        }));
        if (culturalEvents.length > 0) {
          await EventModel.insertMany(culturalEvents);
          console.log(`✅ Seeded ${culturalEvents.length} cultural events into mongobb.events`);
        }
      }
    }

    // 3. Seed Venues
    const venueCount = await VenueModel.countDocuments();
    if (venueCount === 0) {
      console.log('🌱 Seeding initial Venues to MongoDB...');
      await VenueModel.insertMany(MOCK_VENUES);
      console.log(`✅ Seeded ${MOCK_VENUES.length} venues into mongobb.venues`);
    }

    // 4. Seed Registrations
    const regCount = await RegistrationModel.countDocuments();
    if (regCount === 0) {
      console.log('🌱 Seeding initial Registrations to MongoDB...');
      await RegistrationModel.insertMany(INITIAL_REGISTRATIONS);
      console.log(`✅ Seeded ${INITIAL_REGISTRATIONS.length} registrations into mongobb.registrations`);
    }

    // 5. Seed Results
    const resCount = await ResultModel.countDocuments();
    if (resCount === 0) {
      console.log('🌱 Seeding initial Results to MongoDB...');
      await ResultModel.insertMany(INITIAL_RESULTS);
      console.log(`✅ Seeded ${INITIAL_RESULTS.length} results into mongobb.results`);
    }

    // 6. Seed Colleges
    const collegeCount = await CollegeModel.countDocuments();
    if (collegeCount === 0) {
      console.log('🌱 Seeding Participating Colleges to MongoDB...');
      await CollegeModel.insertMany([
        {
          id: 'clg-1',
          collegeName: 'R.V.R. & J.C. College of Engineering (Host)',
          collegeCode: 'RVJC',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          coordinatorName: 'Dr. K. Ravindra',
          phone: '+91 863 218 8201',
          email: 'colorido@rvrjc.ac.in',
          participantsCount: 420,
          isApproved: true,
          isDisabled: false,
        },
        {
          id: 'clg-2',
          collegeName: 'Acharya Nagarjuna University (ANU)',
          collegeCode: 'ANU',
          city: 'Guntur',
          state: 'Andhra Pradesh',
          coordinatorName: 'Prof. M. V. Ramana',
          phone: '+91 863 229 3300',
          email: 'sports@anu.ac.in',
          participantsCount: 185,
          isApproved: true,
          isDisabled: false,
        },
        {
          id: 'clg-3',
          collegeName: 'Vignan Foundation for Science, Tech & Research',
          collegeCode: 'VIGNAN',
          city: 'Vadlamudi',
          state: 'Andhra Pradesh',
          coordinatorName: 'Dr. S. K. Sharma',
          phone: '+91 863 234 4700',
          email: 'fest@vignan.ac.in',
          participantsCount: 140,
          isApproved: true,
          isDisabled: false,
        },
        {
          id: 'clg-4',
          collegeName: 'SRM University AP',
          collegeCode: 'SRMAP',
          city: 'Amaravati',
          state: 'Andhra Pradesh',
          coordinatorName: 'Dr. P. Venkatesh',
          phone: '+91 863 234 3000',
          email: 'cultural@srmap.edu.in',
          participantsCount: 95,
          isApproved: true,
          isDisabled: false,
        },
      ]);
      console.log('✅ Seeded participating colleges into mongobb.colleges');
    }

    // 7. Seed Announcements
    const annCount = await AnnouncementModel.countDocuments();
    if (annCount === 0) {
      console.log('🌱 Seeding Announcements to MongoDB...');
      await AnnouncementModel.insertMany([
        {
          id: 'ann-1',
          title: 'COLORIDO 2K26 Registration Desk Now Open!',
          description: 'Students across India can register online for over 30+ Sports & Cultural competitions.',
          priority: 'HIGH',
          type: 'Registration',
          publishDate: '2026-09-25',
          isPublished: true,
        },
        {
          id: 'ann-2',
          title: '4K Aerial Drone Coverage & Live Stream Active',
          description: 'Experience continuous drone flyovers and live score updates from central grounds.',
          priority: 'MEDIUM',
          type: 'General',
          publishDate: '2026-09-25',
          isPublished: true,
        }
      ]);
      console.log('✅ Seeded announcements into mongobb.announcements');
    }

    // 8. Seed Albums / Gallery
    const albumCount = await AlbumModel.countDocuments();
    if (albumCount === 0) {
      console.log('🌱 Seeding Gallery Albums to MongoDB...');
      await AlbumModel.insertMany([
        {
          id: 'album-1',
          title: 'Sports Championship Moments',
          category: 'Sports',
          coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=85',
          images: [
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=85',
            'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=85',
          ],
          isPublished: true,
        },
        {
          id: 'album-2',
          title: 'Cultural Stage Performances',
          category: 'Cultural',
          coverImage: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=85',
          images: [
            'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=85',
            'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=85',
          ],
          isPublished: true,
        },
      ]);
      console.log('✅ Seeded gallery albums into mongobb.albums');
    }

    // 9. Seed Schedule
    const schedCount = await ScheduleModel.countDocuments();
    if (schedCount === 0) {
      console.log('🌱 Seeding Schedule to MongoDB...');
      await ScheduleModel.insertMany([
        {
          id: 'sch-1',
          eventId: 's-1',
          eventTitle: '11v11 Football Championship',
          venueName: 'Apex Central Stadium',
          date: '2026-09-30',
          startTime: '09:00 AM',
          endTime: '11:00 AM',
          status: 'SCHEDULED',
        },
        {
          id: 'sch-2',
          eventId: 'c-1',
          eventTitle: 'Pulse: Battle of the Bands',
          venueName: 'Symphony Open Air Theatre',
          date: '2026-09-30',
          startTime: '06:00 PM',
          endTime: '09:00 PM',
          status: 'SCHEDULED',
        },
      ]);
      console.log('✅ Seeded festival schedule into mongobb.schedules');
    }

    // 10. Seed System Settings & Maintenance Mode
    const settingsCount = await SettingsModel.countDocuments();
    if (settingsCount === 0) {
      console.log('🌱 Seeding Settings to MongoDB...');
      await SettingsModel.create({
        key: 'global_config',
        maintenanceMode: false,
      });
      console.log('✅ Seeded default settings into mongobb.settings');
    }

    // 11. Seed Audit Logs
    const auditCount = await AuditLogModel.countDocuments();
    if (auditCount === 0) {
      console.log('🌱 Seeding Initial Audit Log...');
      await AuditLogModel.create({
        id: `log-${Date.now()}`,
        action: 'SYSTEM_INITIALIZED',
        adminEmail: ADMIN_EMAIL,
        timestamp: new Date().toISOString(),
        target: 'MongoDB Atlas (mongobb)',
        description: 'Super Admin Control Panel pipeline initialized with encrypted bcrypt authentication.',
      });
      console.log('✅ Seeded initial audit log into mongobb.auditlogs');
    }

    // 12. Seed COLORIDO 2K26 Gallery Media Items
    const mediaCount = await MediaModel.countDocuments();
    if (mediaCount === 0) {
      console.log('🌱 Seeding initial COLORIDO 2K26 Gallery Media to MongoDB...');
      await MediaModel.insertMany(INITIAL_MEDIA_ITEMS);
      console.log(`✅ Seeded ${INITIAL_MEDIA_ITEMS.length} gallery media items into mongobb.media`);
    }

  } catch (error) {
    console.error('⚠️ Database seeding warning:', error);
  }
}
