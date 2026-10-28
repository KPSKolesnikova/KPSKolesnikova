import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// Only the public profile calendar is read. No credentials or private repositories.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const username = process.env.PROFILE_USERNAME || 'KPSKolesnikova';
if (!/^[a-z\d-]+$/i.test(username)) throw new Error('Invalid GitHub username');
const response = await fetch(`https://github.com/users/${username}/contributions`, {
  headers: { 'User-Agent': 'profile-analytics', 'Accept-Language': 'en-US' },
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Calendar request failed: ${response.status}`);
const html = await response.text();
const tips = new Map();
for (const m of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
  const id = m[1].match(/\bfor="([^"]+)"/)?.[1];
  const count = m[2].replace(/<[^>]*>/g, '').trim().match(/^(No|[\d,]+) contributions?\b/);
  if (id && count) tips.set(id, count[1] === 'No' ? 0 : Number(count[1].replaceAll(',', '')));
}
const days = [];
for (const m of html.matchAll(/<td\b([^>]*)>/g)) {
  const date = m[1].match(/\bdata-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
  const id = m[1].match(/\bid="([^"]+)"/)?.[1];
  if (date) {
    if (!tips.has(id)) throw new Error(`Missing contribution count for ${date}`);
    days.push({ date, count: tips.get(id) });
  }
}
days.sort((a, b) => a.date.localeCompare(b.date));
if (days.length < 350 || new Set(days.map(d => d.date)).size !== days.length) throw new Error('Unexpected calendar structure; preserving existing card');
const utcDay = s => new Date(`${s}T00:00:00Z`);
for (let i = 1; i < days.length; i++) {
  if (utcDay(days[i].date) - utcDay(days[i - 1].date) !== 86400000) throw new Error('Non-contiguous calendar');
}
const total = days.reduce((n, d) => n + d.count, 0);
let current = 0, longest = 0, run = 0;
for (const day of days) { run = day.count ? run + 1 : 0; longest = Math.max(longest, run); }
current = run; // Exact streak ending on the final date returned by GitHub.
const recent = days.slice(-84);
const weekly = Array.from({ length: 12 }, (_, i) => recent.slice(i * 7, i * 7 + 7).reduce((n, d) => n + d.count, 0));
const weekdays = Array(7).fill(0);
for (const day of days) weekdays[(utcDay(day.date).getUTCDay() + 6) % 7] += day.count;
const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const best = Math.max(...weekdays);
const busiest = best ? names.filter((_, i) => weekdays[i] === best).join(' / ') : 'No activity';
const first = days[0].date, last = days.at(-1).date;
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
const text = (x, y, value, size = 14, color = '#A4B0CD', extra = '') => `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(value)}</text>`;
const metric = (x, value, label, foot, color) => `${text(x + 22, 119, label, 12)}${text(x + 22, 158, value, 32, color, 'font-weight="700"')}${text(x + 22, 181, foot, 11)}`;
const bars = (values, x, y, width, height, labels, color) => {
  const max = Math.max(1, ...values), step = width / values.length;
  return `<path d="M${x} ${y - height}V${y}H${x + width}" stroke="#293B64" fill="none"/>` + values.map((v, i) => {
    const h = v / max * (height - 18), bx = x + i * step + step * .2, bw = step * .6;
    return `<rect x="${bx}" y="${y - h}" width="${bw}" height="${h}" rx="3" fill="${color}"/>${text(bx + bw / 2, y - h - 7, v, 10, '#F0F2FF', 'text-anchor="middle"')}${text(bx + bw / 2, y + 18, labels[i], 10, '#A4B0CD', 'text-anchor="middle"')}`;
  }).join('');
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="493" viewBox="0 0 1000 493" role="img" aria-labelledby="title desc">
<title id="title">${escape(username)} — GitHub activity</title><desc id="desc">${total} profile-visible contributions. Streak ending ${last}: ${current} days. Longest streak in this calendar: ${longest} days. Charts show weekly totals for the last 84 days and weekday totals for the displayed calendar.</desc>

<g font-family="Segoe UI,Arial,sans-serif">${text(28, 35, '05 / ACTIVITY', 12, '#39D5ED', 'letter-spacing="3"')}${text(28, 70, 'In motion.', 32, '#F0F2FF', 'font-weight="700"')}${text(972, 62, `Calendar through ${last}`, 12, '#A4B0CD', 'text-anchor="end"')}
${metric(28, total, 'PROFILE CONTRIBUTIONS', `${first} — ${last}`, '#39D5ED')}${metric(350, current, 'STREAK AT PERIOD END', `Consecutive active days ending ${last}`, '#9A76F8')}${metric(672, longest, 'LONGEST STREAK', 'Consecutive active days in this calendar', '#4774FF')}
${text(28, 238, 'Weekly contributions', 16, '#F0F2FF')}${text(28, 260, 'Contributions per 7-day interval · last 84 days', 11)}
${bars(weekly, 40, 396, 440, 106, Array.from({ length: 12 }, (_, i) => `W${i + 1}`), '#39D5ED')}
${text(520, 238, 'Activity by weekday', 16, '#F0F2FF')}${text(520, 260, 'Total contributions by weekday · full calendar', 11)}
${bars(weekdays, 534, 396, 430, 106, names, '#9A76F8')}
${text(40, 438, `${recent[0].date} → ${last} · oldest to newest`, 11)}${text(534, 438, `Busiest weekday(s): ${busiest}`, 11)}
<path d="M28 457H972" stroke="#293B64"/>${text(28, 480, 'GitHub contribution calendar', 11)}${text(972, 480, 'Daily refresh', 11, '#4774FF', 'text-anchor="end"')}
</g></svg>\n`;
const notes = `<!-- analytics:start -->
<details>
<summary><strong>Activity &amp; contributions</strong></summary>

<a href="https://github.com/${username}?tab=overview"><img src="./assets/aurora/activity.svg" alt="GitHub contribution calendar through ${last}" width="100%" /></a>

</details>
<!-- analytics:end -->`;
let readme = await readFile(resolve(root, 'README.md'), 'utf8');
if (/<!-- analytics:start -->[\s\S]*?<!-- analytics:end -->/.test(readme)) readme = readme.replace(/<!-- analytics:start -->[\s\S]*?<!-- analytics:end -->/, notes);
else readme += `\n\n---\n\n${notes}\n`;
await mkdir(resolve(root, 'assets/aurora'), { recursive: true });
await writeFile(resolve(root, 'assets/aurora/activity.svg'), svg);
await writeFile(resolve(root, 'README.md'), readme);
console.log(JSON.stringify({ first, last, total, current, longest, weekdays, weekly }));