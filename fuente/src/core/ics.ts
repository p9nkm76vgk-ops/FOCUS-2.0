import type { Block, Work } from './types.ts';

/** Archivo de calendario (.ics) con tus sesiones futuras, exámenes con hora y entregas. Funciones PURAS; las horas son «flotantes» (hora local del dispositivo).
 *  El UID de cada evento es estable (`<id>@focusos`): volver a importar el archivo actualiza los mismos eventos en lugar de duplicarlos. */
const p2 = (n: number) => String(n).padStart(2, '0');
const ymd = (d: string) => d.replace(/-/g, '');
const stamp = (d: string, m: number) => `${ymd(d)}T${p2(Math.floor(m / 60))}${p2(m % 60)}00`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const nextDay = (d: string) => { const t = new Date(d + 'T00:00:00Z'); t.setUTCDate(t.getUTCDate() + 1); return t.toISOString().slice(0, 10).replace(/-/g, ''); };
const fold = (l: string) => { const out: string[] = []; let s = l; while (s.length > 72) { out.push(s.slice(0, 72)); s = ' ' + s.slice(72); } out.push(s); return out.join('\r\n'); };

export function buildIcs(a: { blocks: Block[]; works: Work[]; subjects: { id: string; name: string }[]; today: string; stampUtc: string; alarmMin?: number }): { text: string; count: number } {
  const sn = (id: string) => a.subjects.find(s => s.id === id)?.name ?? 'Estudio', wk = (id: string) => a.works.find(w => w.id === id);
  const alarm = a.alarmMin ?? 10, ev: string[][] = [];
  const base = (uid: string) => ['BEGIN:VEVENT', `UID:${uid}@focusos`, `DTSTAMP:${a.stampUtc}`];
  for (const b of a.blocks.filter(x => x.status === 'planned' && x.date >= a.today).sort((x, y) => x.date.localeCompare(y.date) || x.start - y.start || x.id.localeCompare(y.id))) {
    const w = wk(b.workId); if (!w) continue;
    ev.push([...base(b.id), `DTSTART:${stamp(b.date, b.start)}`, `DTEND:${stamp(b.date, b.end)}`, `SUMMARY:${esc(`Estudio · ${sn(w.subjectId)} · ${w.title}`)}`, `DESCRIPTION:${esc(`${b.end - b.start} min${b.part === 'review' ? ' · repaso final' : ''} · Focus OS`)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Empieza: ${sn(w.subjectId)}`)}`, `TRIGGER:-PT${alarm}M`, 'END:VALARM', 'END:VEVENT']);
  }
  for (const w of a.works.filter(x => (x.status === 'pending' || x.status === 'in_progress') && !x.noDate && x.dueDate >= a.today && x.dueDate < '9999' && x.auto !== 'review').sort((x, y) => x.dueDate.localeCompare(y.dueDate) || x.id.localeCompare(y.id))) {
    const ex = w.kind === 'exam', title = `${ex ? 'EXAMEN' : 'Entrega'} · ${sn(w.subjectId)} · ${w.title}`;
    if (ex && w.dueMinute != null) ev.push([...base(w.id), `DTSTART:${stamp(w.dueDate, w.dueMinute)}`, `DTEND:${stamp(w.dueDate, Math.min(1439, w.dueMinute + 60))}`, `SUMMARY:${esc(title)}`, 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Examen mañana')}`, 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT']);
    else ev.push([...base(w.id), `DTSTART;VALUE=DATE:${ymd(w.dueDate)}`, `DTEND;VALUE=DATE:${nextDay(w.dueDate)}`, `SUMMARY:${esc(title)}`, ...(ex ? ['BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc('Examen mañana')}`, 'TRIGGER:-PT15H', 'END:VALARM'] : []), 'END:VEVENT']);
  }
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Focus OS//ES', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Focus OS', ...ev.flat(), 'END:VCALENDAR'];
  return { text: lines.map(fold).join('\r\n') + '\r\n', count: ev.length };
}
