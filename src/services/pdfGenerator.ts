import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import type { Registration } from '../types';

export async function generateTicketPDF(registration: Registration): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [100, 160],
  });

  // Deep charcoal ticket header
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 100, 160, 'F');

  // Hairline top border
  doc.setFillColor(200, 155, 60); // Muted gold
  doc.rect(0, 0, 100, 3, 'F');

  doc.setTextColor(245, 243, 239);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('COLORIDO 2K26', 50, 14, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('OFFICIAL ENTRY PASS', 50, 19, { align: 'center' });

  // ID Badge Box
  doc.setFillColor(24, 24, 24);
  doc.roundedRect(10, 25, 80, 12, 1, 1, 'F');
  doc.setDrawColor(200, 155, 60);
  doc.setLineWidth(0.3);
  doc.roundedRect(10, 25, 80, 12, 1, 1, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  doc.text(`ID: ${registration.registrationId}`, 50, 32, { align: 'center' });

  // Details
  doc.setTextColor(166, 166, 166);
  doc.setFontSize(7);
  doc.text('EVENT NAME', 10, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  const titleLines = doc.splitTextToSize(registration.eventTitle, 80);
  doc.text(titleLines, 10, 50);

  let yPos = 50 + titleLines.length * 5;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('DATE & VENUE:', 10, yPos);
  doc.setTextColor(245, 243, 239);
  doc.setFont('helvetica', 'bold');
  doc.text(`${registration.eventDate} · ${registration.venueName}`, 30, yPos);

  yPos += 7;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('PARTICIPANT:', 10, yPos);
  doc.setTextColor(245, 243, 239);
  doc.setFont('helvetica', 'bold');
  doc.text(registration.teamName ? `${registration.teamName} (${registration.participantName})` : registration.participantName, 30, yPos);

  yPos += 7;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('COLLEGE:', 10, yPos);
  doc.setTextColor(245, 243, 239);
  doc.text(registration.collegeName, 30, yPos);

  // Generate QR Code
  const qrDataUrl = await QRCode.toDataURL(registration.registrationId, {
    width: 200,
    margin: 1,
    color: { dark: '#111111', light: '#F5F3EF' }
  });

  yPos += 10;
  doc.setFillColor(245, 243, 239);
  doc.roundedRect(30, yPos, 40, 40, 1, 1, 'F');
  doc.addImage(qrDataUrl, 'PNG', 32, yPos + 2, 36, 36);

  yPos += 43;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('Present QR pass at venue desk for entry verification.', 50, yPos, { align: 'center' });
  doc.text('30 September 2026 · Apex Campus', 50, yPos + 4, { align: 'center' });

  doc.save(`COLORIDO_Pass_${registration.registrationId}.pdf`);
}

export async function generateCertificatePDF(
  participantName: string,
  eventTitle: string,
  category: string,
  collegeName: string,
  awardType: 'Winner' | 'Runner Up' | 'Participation' = 'Participation',
  positionText: string = 'First Place'
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Background
  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 297, 210, 'F');

  // Gold border
  doc.setDrawColor(200, 155, 60);
  doc.setLineWidth(1.5);
  doc.rect(10, 10, 277, 190);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(200, 155, 60);
  doc.text('COLORIDO 2K26', 148.5, 35, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(166, 166, 166);
  doc.setFont('helvetica', 'normal');
  doc.text('NATIONAL CULTURAL & SPORTS FESTIVAL', 148.5, 43, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  doc.text(
    awardType === 'Participation' ? 'CERTIFICATE OF PARTICIPATION' : `CERTIFICATE OF EXCELLENCE — ${positionText.toUpperCase()}`,
    148.5,
    60,
    { align: 'center' }
  );

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('This is presented to', 148.5, 78, { align: 'center' });

  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  doc.text(participantName.toUpperCase(), 148.5, 93, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text(`of ${collegeName}`, 148.5, 103, { align: 'center' });

  const phrase = awardType === 'Participation' 
    ? 'for active participation in the event' 
    : `for securing ${positionText} in the event`;

  doc.text(`${phrase} "${eventTitle}" (${category})`, 148.5, 118, { align: 'center' });
  doc.text('held during COLORIDO 2K26 on September 30, 2026.', 148.5, 126, { align: 'center' });

  const sigY = 168;
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.4);

  doc.line(40, sigY, 100, sigY);
  doc.line(197, sigY, 257, sigY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  doc.text('Dr. S. K. Rastogi', 70, sigY + 5, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('Dean of Student Affairs', 70, sigY + 10, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(245, 243, 239);
  doc.text('Prof. Ananya Sen', 227, sigY + 5, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(166, 166, 166);
  doc.text('Convenor, COLORIDO 2K26', 227, sigY + 10, { align: 'center' });

  doc.save(`COLORIDO_Certificate_${participantName.replace(/\s+/g, '_')}.pdf`);
}
