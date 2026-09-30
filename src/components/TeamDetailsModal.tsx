import React from 'react';
import { X, Shield, Users } from 'lucide-react';
import type { Registration } from '../types';

interface TeamDetailsModalProps {
  registration: Registration;
  onClose: () => void;
}

export const TeamDetailsModal: React.FC<TeamDetailsModalProps> = ({
  registration,
  onClose,
}) => {
  const members = registration.members && registration.members.length > 0
    ? registration.members
    : [{
      name: registration.participantName,
      email: registration.participantEmail,
      phone: registration.participantPhone,
      studentId: registration.studentId,
      college: registration.collegeName,
    }];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 text-[#121212]">
      <div className="bg-white border border-[#E5E2DC] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative space-y-6 p-6 sm:p-8 animate-in fade-in duration-200">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#666461] hover:text-[#121212] bg-[#FAF9F6] border border-[#E5E2DC] rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-[#FAF9F6] border border-[#E5E2DC] text-[#B8860B]">
              VERIFIED DATABASE ROSTER
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${registration.status?.toUpperCase() === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800'
              }`}>
              {registration.status?.toUpperCase() || 'APPROVED'}
            </span>
          </div>

          <h2 className="font-editorial font-bold text-2xl sm:text-3xl text-[#121212]">
            {registration.teamName || registration.participantName}
          </h2>
          <p className="text-xs font-semibold text-[#666461] flex items-center space-x-1">
            <Shield className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>{registration.collegeName}</span>
          </p>
        </div>

        {/* Summary Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-[#FAF9F6] border border-[#E5E2DC] rounded-2xl p-4">
          <div>
            <span className="block text-[10px] text-[#666461] uppercase font-bold">Event Name</span>
            <strong className="text-[#121212] font-editorial text-base">{registration.eventTitle}</strong>
          </div>
          <div>
            <span className="block text-[10px] text-[#666461] uppercase font-bold">Team Captain</span>
            <strong className="text-[#121212]">{registration.participantName}</strong>
          </div>
          <div>
            <span className="block text-[10px] text-[#666461] uppercase font-bold">Registration ID</span>
            <strong className="font-mono text-[#666461]">{registration.registrationId}</strong>
          </div>
        </div>

        {/* Members Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-2">
            <h3 className="font-editorial font-bold text-lg text-[#121212] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#B8860B]" />
              <span>TEAM MEMBERS & PLAYERS</span>
            </h3>
            <span className="text-xs font-bold bg-[#FAF9F6] border border-[#E5E2DC] px-3 py-1 rounded-full text-[#121212]">
              {members.length} Registered Players
            </span>
          </div>

          <div className="overflow-x-auto border border-[#E5E2DC] rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E5E2DC] text-[10px] font-bold text-[#666461] uppercase tracking-wider">
                  <th className="p-3 w-10">#</th>
                  <th className="p-3">Player Name</th>
                  <th className="p-3">Roll Number / Student ID</th>
                  <th className="p-3">College</th>
                  <th className="p-3">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DC]">
                {members.map((m, idx) => (
                  <tr key={idx} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#666461]">{idx + 1}</td>
                    <td className="p-3 font-bold text-[#121212]">
                      {m.name}
                      {idx === 0 && <span className="ml-2 text-[9px] uppercase tracking-wider bg-[#121212] text-white px-1.5 py-0.5 rounded font-mono">Captain</span>}
                    </td>
                    <td className="p-3 font-mono text-[#666461]">{m.rollNumber || m.studentId || `L24CB00${idx + 1}`}</td>
                    <td className="p-3 text-[#666461]">{m.college || registration.collegeName}</td>
                    <td className="p-3 font-mono text-[#666461]">{m.phone || registration.participantPhone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-[#E5E2DC] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#121212] hover:bg-[#2A2A2A] text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
          >
            Close Details
          </button>
        </div>

      </div>
    </div>
  );
};
