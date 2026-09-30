import type { EventItem } from '../types';

export function downloadCalendarICS(event: EventItem): void {
  const startDate = '20260930T043000Z'; // Sep 30 10:00 AM IST
  const endDate = '20260930T123000Z';

  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//COLORIDO 2K26//Fest Events Calendar//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `SUMMARY:COLORIDO 2K26: ${event.title}`,
    `DESCRIPTION:${event.oneLineSummary.replace(/,/g, '\\,')} \\nVenue: ${event.venueName}\\nCategory: ${event.category}`,
    `LOCATION:${event.venueName}, Apex Campus`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${event.slug}-colorido2k26.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
