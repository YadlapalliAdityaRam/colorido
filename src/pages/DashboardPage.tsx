import React, { useState } from 'react';
import { Download, Calendar, Save } from 'lucide-react';
import type { Registration, UserProfile, EventItem } from '../types';
import { generateTicketPDF, generateCertificatePDF } from '../services/pdfGenerator';
import { downloadCalendarICS } from '../utils/calendar';

interface DashboardPageProps {
  user: UserProfile;
  myRegistrations: Registration[];
  events: EventItem[];
  onUpdateUser: (profile: Partial<UserProfile>) => void;
  onSelectEvent?: (slug: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  user,
  myRegistrations,
  events,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'passes' | 'certificates' | 'profile'>('passes');

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [college, setCollege] = useState(user.college);
  const [studentId, setStudentId] = useState(user.studentId);
  const [saved, setSaved] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ name, email, phone, college, studentId });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#121212] flex flex-col pb-20">

      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-6 w-full space-y-4">
        <div>
          <span className="text-xs font-mono text-[#666461] uppercase tracking-widest block mb-1">
            STUDENT PORTAL
          </span>
          <h1 className="font-editorial font-bold text-4xl sm:text-5xl text-[#121212]">
            {user.name}
          </h1>
          <p className="text-xs font-mono text-[#666461] mt-1">{user.college} · {user.studentId}</p>
        </div>

        <div className="flex overflow-x-auto gap-4 sm:gap-6 border-b border-[#E5E2DC] pb-3 text-xs font-mono uppercase tracking-widest">
          <button
            onClick={() => setActiveTab('passes')}
            className={`whitespace-nowrap py-1 transition-all ${activeTab === 'passes' ? 'text-[#121212] font-bold border-b-2 border-[#121212]' : 'text-[#666461] hover:text-[#121212]'}`}
          >
            ENTRY PASSES ({myRegistrations.length})
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`whitespace-nowrap py-1 transition-all ${activeTab === 'certificates' ? 'text-[#121212] font-bold border-b-2 border-[#121212]' : 'text-[#666461] hover:text-[#121212]'}`}
          >
            CERTIFICATES
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`whitespace-nowrap py-1 transition-all ${activeTab === 'profile' ? 'text-[#121212] font-bold border-b-2 border-[#121212]' : 'text-[#666461] hover:text-[#121212]'}`}
          >
            PROFILE
          </button>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 w-full space-y-6">
        {activeTab === 'passes' && (
          <div className="space-y-4">
            {myRegistrations.length === 0 ? (
              <div className="py-12 text-xs font-mono text-[#666461]">No registered event passes found.</div>
            ) : (
              myRegistrations.map((reg) => {
                const evt = events.find(e => e.id === reg.eventId);

                return (
                  <div key={reg.id} className="bg-white border border-[#E5E2DC] p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                    <div className="space-y-1">
                      <span className="font-mono text-xs text-[#B8860B] font-bold">{reg.registrationId}</span>
                      <h3 className="font-editorial font-bold text-lg text-[#121212]">{reg.eventTitle}</h3>
                      <p className="text-xs font-mono text-[#666461]">{reg.eventDate} · {reg.venueName}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => generateTicketPDF(reg)}
                        className="px-4 py-2 rounded-full bg-[#121212] hover:bg-[#2A2A2A] text-white text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Pass PDF</span>
                      </button>
                      {evt && (
                        <button
                          onClick={() => downloadCalendarICS(evt)}
                          className="px-3 py-2 rounded-full bg-white text-[#666461] border border-[#E5E2DC] hover:text-[#121212] text-xs font-semibold shadow-sm"
                          title="Add to iCal"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="space-y-4">
            {myRegistrations.map((reg) => (
              <div key={reg.id} className="bg-white border border-[#E5E2DC] p-6 rounded-2xl flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-[10px] font-mono text-[#666461] uppercase tracking-widest block">OFFICIAL CERTIFICATE</span>
                  <h3 className="font-editorial font-bold text-base text-[#121212] mt-1">{reg.eventTitle}</h3>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => generateCertificatePDF(reg.participantName, reg.eventTitle, reg.eventType, reg.collegeName, 'Participation')}
                    className="px-4 py-2 rounded-full bg-white border border-[#E5E2DC] hover:bg-[#FAF9F6] text-[#121212] text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Participation</span>
                  </button>
                  <button
                    onClick={() => generateCertificatePDF(reg.participantName, reg.eventTitle, reg.eventType, reg.collegeName, 'Winner', 'First Place')}
                    className="px-4 py-2 rounded-full bg-[#121212] hover:bg-[#2A2A2A] text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Winner</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white border border-[#E5E2DC] shadow-sm p-6 rounded-2xl space-y-4 text-xs font-semibold text-[#121212]">
            <div>
              <label className="block text-[#121212] font-bold mb-1">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212] outline-none" required />
            </div>

            <div>
              <label className="block text-[#121212] font-bold mb-1">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212] outline-none" required />
            </div>

            <div>
              <label className="block text-[#121212] font-bold mb-1">Phone Number</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212] outline-none" required />
            </div>

            <div>
              <label className="block text-[#121212] font-bold mb-1">College Name</label>
              <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212] outline-none" required />
            </div>

            <div>
              <label className="block text-[#121212] font-bold mb-1">Student Roll ID</label>
              <input type="text" value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full px-3 py-2 rounded-lg text-xs bg-[#FAF9F6] border border-[#E5E2DC] focus:border-[#121212] outline-none" required />
            </div>

            {saved && <div className="text-emerald-700 font-bold text-xs">Profile updated for future registrations!</div>}

            <button type="submit" className="w-full py-2.5 rounded-full bg-[#121212] hover:bg-[#2A2A2A] text-white font-bold text-xs uppercase tracking-wider flex justify-center items-center space-x-2 shadow-sm">
              <Save className="w-4 h-4" />
              <span>Save Preferences</span>
            </button>
          </form>
        )}
      </section>
    </div>
  );
};
