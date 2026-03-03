#!/usr/bin/env node
// timezone-converter — zero external deps, Node 18+, ES modules
// Uses Intl.DateTimeFormat + Intl.supportedValuesOf for all TZ ops

import process from 'process';

// ── ANSI colours ─────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  magenta:'\x1b[35m',
  red:    '\x1b[31m',
  white:  '\x1b[37m',
  gray:   '\x1b[90m',
};

let useColor = process.stdout.isTTY;

function clr(color, str) {
  return useColor ? `${C[color]}${str}${C.reset}` : str;
}

// ── Timezone aliases ──────────────────────────────────────────────────────────
const TZ_ALIASES = {
  // North America
  'EST':  'America/New_York',
  'EDT':  'America/New_York',
  'CST':  'America/Chicago',
  'CDT':  'America/Chicago',
  'MST':  'America/Denver',
  'MDT':  'America/Denver',
  'PST':  'America/Los_Angeles',
  'PDT':  'America/Los_Angeles',
  'AST':  'America/Halifax',
  'ADT':  'America/Halifax',
  'HST':  'Pacific/Honolulu',
  'AKST': 'America/Anchorage',
  'AKDT': 'America/Anchorage',
  // Europe
  'GMT':  'Europe/London',
  'UTC':  'UTC',
  'WET':  'Europe/Lisbon',
  'CET':  'Europe/Paris',
  'CEST': 'Europe/Paris',
  'EET':  'Europe/Helsinki',
  'EEST': 'Europe/Helsinki',
  // Asia / Pacific
  'IST':  'Asia/Kolkata',
  'GST':  'Asia/Dubai',
  'PKT':  'Asia/Karachi',
  'BST':  'Asia/Dhaka',
  'ICT':  'Asia/Bangkok',
  'CST8': 'Asia/Shanghai',
  'HKT':  'Asia/Hong_Kong',
  'JST':  'Asia/Tokyo',
  'KST':  'Asia/Seoul',
  'AEST': 'Australia/Sydney',
  'AEDT': 'Australia/Sydney',
  'NZST': 'Pacific/Auckland',
  'NZDT': 'Pacific/Auckland',
  // Africa / Middle East
  'CAT':  'Africa/Harare',
  'EAT':  'Africa/Nairobi',
  'WAT':  'Africa/Lagos',
  'SAST': 'Africa/Johannesburg',
};

function resolveTimezone(tz) {
  if (!tz) return 'UTC';
  const upper = tz.toUpperCase();
  if (TZ_ALIASES[upper]) return TZ_ALIASES[upper];
  // Try direct IANA match (case-insensitive search)
  const all = Intl.supportedValuesOf('timeZone');
  const match = all.find(z => z.toLowerCase() === tz.toLowerCase());
  if (match) return match;
  throw new Error(`Unknown timezone: "${tz}". Run 'tzc list' to see all zones.`);
}

function validateTimezone(tz) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// ── Time parsing ──────────────────────────────────────────────────────────────
function parseTimeString(timeStr, refDate = new Date()) {
  // Handle Unix timestamps
  if (/^\d{10}$/.test(timeStr.trim())) {
    return new Date(parseInt(timeStr, 10) * 1000);
  }
  if (/^\d{13}$/.test(timeStr.trim())) {
    return new Date(parseInt(timeStr, 10));
  }

  // Parse natural time strings: "2pm", "14:30", "2:30pm", "now"
  if (timeStr.toLowerCase() === 'now') return new Date();

  const clean = timeStr.trim().toLowerCase().replace(/\s+/g, '');
  let hours, minutes = 0;

  // HH:MM am/pm
  const hmApm = clean.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (hmApm) {
    hours = parseInt(hmApm[1], 10);
    minutes = parseInt(hmApm[2], 10);
    if (hmApm[3] === 'pm' && hours !== 12) hours += 12;
    if (hmApm[3] === 'am' && hours === 12) hours = 0;
  } else {
    // Hpm / H:MMpm
    const simpleApm = clean.match(/^(\d{1,2})(am|pm)$/);
    if (simpleApm) {
      hours = parseInt(simpleApm[1], 10);
      if (simpleApm[2] === 'pm' && hours !== 12) hours += 12;
      if (simpleApm[2] === 'am' && hours === 12) hours = 0;
    } else {
      // 24h bare: "14" or "1430"
      const bare = clean.match(/^(\d{1,4})$/);
      if (bare) {
        const n = parseInt(bare[1], 10);
        if (n <= 24) { hours = n; }
        else { hours = Math.floor(n / 100); minutes = n % 100; }
      } else {
        throw new Error(`Cannot parse time: "${timeStr}". Try formats like "2pm", "14:30", "2:30pm".`);
      }
    }
  }

  const d = new Date(refDate);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ── Intl helpers ──────────────────────────────────────────────────────────────
function getDateParts(date, tz) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = {};
  for (const { type, value } of fmt.formatToParts(date)) {
    parts[type] = value;
  }
  return parts;
}

function formatTime(date, tz, opts = {}) {
  const { seconds = false, date: showDate = false } = opts;
  const fmtOpts = {
    timeZone: tz,
    hour: '2-digit', minute: '2-digit',
    hour12: true,
  };
  if (seconds) fmtOpts.second = '2-digit';
  if (showDate) {
    fmtOpts.weekday = 'short';
    fmtOpts.month = 'short';
    fmtOpts.day = 'numeric';
  }
  return new Intl.DateTimeFormat('en-US', fmtOpts).format(date);
}

function getUTCOffset(tz, date = new Date()) {
  // Use Intl to compute offset
  const utcParts = getDateParts(date, 'UTC');
  const tzParts  = getDateParts(date, tz);
  const utcMs = Date.UTC(
    +utcParts.year, +utcParts.month - 1, +utcParts.day,
    +utcParts.hour, +utcParts.minute, +utcParts.second
  );
  const tzMs = Date.UTC(
    +tzParts.year, +tzParts.month - 1, +tzParts.day,
    +tzParts.hour, +tzParts.minute, +tzParts.second
  );
  const diffMin = Math.round((tzMs - utcMs) / 60000);
  const sign = diffMin >= 0 ? '+' : '-';
  const abs  = Math.abs(diffMin);
  const h = String(Math.floor(abs / 60)).padStart(2, '0');
  const m = String(abs % 60).padStart(2, '0');
  return { offsetStr: `UTC${sign}${h}:${m}`, offsetMin: diffMin };
}

function isDST(tz, date = new Date()) {
  // Compare offset at Jan 1 vs Jul 1 — larger offset = summer = DST in effect
  const jan = new Date(date.getFullYear(), 0, 1);
  const jul = new Date(date.getFullYear(), 6, 1);
  const { offsetMin: offJan } = getUTCOffset(tz, jan);
  const { offsetMin: offJul } = getUTCOffset(tz, jul);
  const { offsetMin: offNow } = getUTCOffset(tz, date);
  const maxOff = Math.max(offJan, offJul);
  return offNow === maxOff && offJan !== offJul;
}

// ── Commands ──────────────────────────────────────────────────────────────────

// tzc convert "2pm" --from EST --to Asia/Dubai
function cmdConvert(args, flags) {
  const timeStr = args[0] || 'now';
  const fromTZ  = resolveTimezone(flags.from || flags.f || 'UTC');
  const toTZ    = resolveTimezone(flags.to   || flags.t || 'UTC');

  // Parse the time as if it's in fromTZ: build a UTC instant from the local time
  const refDate = new Date();
  const localDate = parseTimeString(timeStr, refDate);

  // Re-interpret localDate hours/minutes as being in fromTZ
  // Strategy: get today's date in fromTZ, apply parsed H:M, then compute UTC equivalent
  const tzParts = getDateParts(refDate, fromTZ);
  const baseInFromTZ = new Date(Date.UTC(
    +tzParts.year, +tzParts.month - 1, +tzParts.day,
    localDate.getHours(), localDate.getMinutes(), 0
  ));
  // Adjust for offset
  const { offsetMin: fromOffset } = getUTCOffset(fromTZ, baseInFromTZ);
  const utcMs = baseInFromTZ.getTime() - fromOffset * 60000;
  const instant = new Date(utcMs);

  const { offsetStr: fromOff } = getUTCOffset(fromTZ, instant);
  const { offsetStr: toOff }   = getUTCOffset(toTZ,   instant);
  const fromDST = isDST(fromTZ, instant);
  const toDST   = isDST(toTZ,   instant);

  const fromFmt = formatTime(instant, fromTZ, { showDate: true });
  const toFmt   = formatTime(instant, toTZ,   { showDate: true });

  if (flags.json) {
    console.log(JSON.stringify({
      input: timeStr,
      from: { timezone: fromTZ, time: fromFmt, offset: fromOff, dst: fromDST },
      to:   { timezone: toTZ,   time: toFmt,   offset: toOff,   dst: toDST   },
      unix: Math.floor(instant.getTime() / 1000),
    }, null, 2));
    return;
  }

  console.log('');
  console.log(clr('bold', '  Time Conversion'));
  console.log(clr('gray', '  ' + '─'.repeat(42)));
  console.log(`  ${clr('cyan', fromTZ.padEnd(28))} ${clr('bold', fromFmt)}`);
  console.log(`  ${clr('gray', fromOff.padEnd(28))} ${fromDST ? clr('yellow', 'DST active') : clr('gray', 'Standard time')}`);
  console.log('');
  console.log(`  ${clr('gray', '↓ converted to')}`);
  console.log('');
  console.log(`  ${clr('green', toTZ.padEnd(28))} ${clr('bold', toFmt)}`);
  console.log(`  ${clr('gray', toOff.padEnd(28))} ${toDST ? clr('yellow', 'DST active') : clr('gray', 'Standard time')}`);
  console.log('');
}

// tzc world --zones "America/New_York,Europe/London,Asia/Dubai"
function cmdWorld(args, flags) {
  const zonesRaw = (flags.zones || flags.z || 'UTC,America/New_York,Europe/London,Asia/Dubai,Asia/Tokyo').split(',');
  const zones = zonesRaw.map(z => resolveTimezone(z.trim()));
  const now = new Date();

  if (flags.json) {
    const result = zones.map(tz => {
      const { offsetStr, offsetMin } = getUTCOffset(tz, now);
      return {
        timezone: tz,
        time: formatTime(now, tz, { showDate: true }),
        offset: offsetStr,
        offsetMinutes: offsetMin,
        dst: isDST(tz, now),
      };
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log('');
  console.log(clr('bold', '  World Clock  ') + clr('gray', `  (as of ${now.toISOString()})`));
  console.log(clr('gray', '  ' + '─'.repeat(60)));

  for (const tz of zones) {
    const time = formatTime(now, tz, { showDate: true, seconds: true });
    const { offsetStr } = getUTCOffset(tz, now);
    const dst = isDST(tz, now);
    const dstTag = dst ? clr('yellow', ' ⟳DST') : '';
    console.log(`  ${clr('cyan', tz.padEnd(30))} ${clr('bold', time.padEnd(24))} ${clr('gray', offsetStr)}${dstTag}`);
  }
  console.log('');
}

// tzc list [search]
function cmdList(args, flags) {
  const search = (args[0] || '').toLowerCase();
  const all = Intl.supportedValuesOf('timeZone');
  const filtered = search ? all.filter(z => z.toLowerCase().includes(search)) : all;

  if (flags.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  console.log('');
  if (search) {
    console.log(clr('bold', `  Timezones matching "${search}" (${filtered.length} found)`));
  } else {
    console.log(clr('bold', `  All IANA timezones (${filtered.length} total)`));
  }
  console.log(clr('gray', '  ' + '─'.repeat(50)));

  const cols = 3;
  const colW = 28;
  for (let i = 0; i < filtered.length; i += cols) {
    const row = filtered.slice(i, i + cols).map(z => z.padEnd(colW)).join('');
    console.log('  ' + clr('gray', row));
  }
  console.log('');
  console.log(`  ${clr('dim', 'Aliases: EST PST GMT CET IST GST JST AEST and more')}`);
  console.log('');
}

// tzc meeting --zones "America/New_York,Europe/London,Asia/Dubai"
function cmdMeeting(args, flags) {
  const zonesRaw = (flags.zones || flags.z || 'UTC,America/New_York,Europe/London').split(',');
  const zones = zonesRaw.map(z => resolveTimezone(z.trim()));
  const workStart = parseInt(flags['work-start'] || '9',  10);
  const workEnd   = parseInt(flags['work-end']   || '18', 10);

  // Check every 30-min slot in UTC over a full day
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

  const slots = [];
  for (let slot = 0; slot < 48; slot++) {
    const utcTime = new Date(dayStart.getTime() + slot * 30 * 60000);
    const allInHours = zones.map(tz => {
      const parts = getDateParts(utcTime, tz);
      return parseFloat(parts.hour) + parseFloat(parts.minute) / 60;
    });
    const inBusiness = allInHours.every(h => h >= workStart && h < workEnd);
    slots.push({ utcTime, allInHours, inBusiness });
  }

  const goodSlots = slots.filter(s => s.inBusiness);

  if (flags.json) {
    console.log(JSON.stringify({
      zones,
      workHours: `${workStart}:00 - ${workEnd}:00 local`,
      goodSlots: goodSlots.map(s => ({
        utc: s.utcTime.toISOString(),
        byZone: zones.reduce((acc, tz, i) => {
          acc[tz] = formatTime(s.utcTime, tz, { showDate: false });
          return acc;
        }, {}),
      })),
    }, null, 2));
    return;
  }

  console.log('');
  console.log(clr('bold', '  Meeting Time Finder'));
  console.log(clr('gray', `  Business hours: ${workStart}:00 – ${workEnd}:00 local in each zone`));
  console.log(clr('gray', '  ' + '─'.repeat(70)));

  // Header
  const header = '  ' + clr('bold', 'UTC Time'.padEnd(12)) + zones.map(z => clr('cyan', z.padEnd(26))).join('');
  console.log(header);
  console.log(clr('gray', '  ' + '─'.repeat(70)));

  if (goodSlots.length === 0) {
    console.log(clr('red', '  No overlapping business hours found across these timezones.'));
    console.log(clr('gray', `  Try adjusting --work-start and --work-end (currently ${workStart}–${workEnd})`));
  } else {
    for (const { utcTime, allInHours } of goodSlots) {
      const utcStr = formatTime(utcTime, 'UTC');
      const cols = zones.map((tz, i) => {
        const t = formatTime(utcTime, tz);
        const h = allInHours[i];
        const quality = h >= 10 && h < 16 ? 'green' : 'yellow';
        return clr(quality, t.padEnd(26));
      });
      console.log('  ' + utcStr.padEnd(12) + cols.join(''));
    }
    console.log('');
    console.log(`  ${clr('green', '■')} ${clr('gray', 'Core hours (10-16)    ')} ${clr('yellow', '■')} ${clr('gray', 'Edge business hours')}`);
  }
  console.log('');
}

// tzc offset --zone America/New_York
function cmdOffset(args, flags) {
  const tz = resolveTimezone(args[0] || flags.zone || flags.z || 'UTC');
  const now = new Date();
  const { offsetStr, offsetMin } = getUTCOffset(tz, now);
  const dst = isDST(tz, now);

  if (flags.json) {
    console.log(JSON.stringify({ timezone: tz, offset: offsetStr, offsetMinutes: offsetMin, dst }));
    return;
  }

  console.log('');
  console.log(`  ${clr('cyan', tz)}`);
  console.log(`  Offset : ${clr('bold', offsetStr)}`);
  console.log(`  DST    : ${dst ? clr('yellow', 'Active') : clr('gray', 'Not active')}`);
  console.log('');
}

// tzc unix 1700000000 --zone Asia/Dubai
function cmdUnix(args, flags) {
  const ts = args[0];
  if (!ts) { console.error('Provide a Unix timestamp. e.g. tzc unix 1700000000'); process.exit(1); }
  const tz = resolveTimezone(flags.zone || flags.z || 'UTC');
  const date = new Date(parseInt(ts, 10) * 1000);
  const formatted = formatTime(date, tz, { showDate: true, seconds: true });
  const { offsetStr } = getUTCOffset(tz, date);
  const dst = isDST(tz, date);

  if (flags.json) {
    console.log(JSON.stringify({ unix: parseInt(ts, 10), timezone: tz, time: formatted, offset: offsetStr, dst }));
    return;
  }

  console.log('');
  console.log(`  Unix: ${clr('bold', ts)}`);
  console.log(`  Zone: ${clr('cyan', tz)}`);
  console.log(`  Time: ${clr('green', formatted)}  ${clr('gray', offsetStr)}${dst ? clr('yellow', ' (DST)') : ''}`);
  console.log(`  ISO:  ${clr('gray', date.toISOString())}`);
  console.log('');
}

// ── Help ──────────────────────────────────────────────────────────────────────
function printHelp() {
  const b = s => clr('bold', s);
  const c = s => clr('cyan', s);
  const g = s => clr('gray', s);
  const y = s => clr('yellow', s);

  console.log(`
${b('timezone-converter')} ${g('v1.0.0')} — ${g('Zero-dep timezone CLI for Node 18+')}

${b('USAGE')}
  ${c('tzc')} ${y('[command]')} ${g('[args]')} ${g('[flags]')}
  ${c('timezone-converter')} ${y('[command]')} ${g('[args]')} ${g('[flags]')}

${b('COMMANDS')}
  ${y('(default)')}  Convert a time between two timezones
  ${y('world')}      Show current time in multiple timezones
  ${y('meeting')}    Find overlapping business hours across timezones
  ${y('list')}       List all IANA timezone names (filterable)
  ${y('offset')}     Show UTC offset for a timezone
  ${y('unix')}       Convert Unix timestamp to human-readable time

${b('EXAMPLES')}
  ${c('tzc "2pm" --from EST --to Asia/Dubai')}
  ${c('tzc "14:30" --from America/New_York --to Europe/London')}
  ${c('tzc now --from PST --to IST')}
  ${c('tzc world --zones "America/New_York,Europe/London,Asia/Dubai,Asia/Tokyo"')}
  ${c('tzc meeting --zones "America/New_York,Europe/London,Asia/Dubai"')}
  ${c('tzc meeting --zones "EST,GMT,IST" --work-start 8 --work-end 17')}
  ${c('tzc list')}
  ${c('tzc list America')}
  ${c('tzc offset Asia/Dubai')}
  ${c('tzc unix 1700000000 --zone Asia/Dubai')}

${b('FLAGS')}
  ${g('--from, -f')}      Source timezone (alias or IANA name)
  ${g('--to, -t')}        Target timezone (alias or IANA name)
  ${g('--zones, -z')}     Comma-separated list of timezones
  ${g('--zone')}          Single timezone for offset/unix commands
  ${g('--work-start')}    Business day start hour (default: 9)
  ${g('--work-end')}      Business day end hour (default: 18)
  ${g('--json')}          Output as JSON
  ${g('--no-color')}      Disable ANSI colors
  ${g('--help, -h')}      Show this help

${b('TIMEZONE ALIASES')}
  ${g('EST PST CST MST GMT UTC CET EET IST GST JST KST AEST NZST')}
  ${g('EDT PDT CDT MDT BST ICT HKT SAST EAT CAT WAT AKST HST')}
`);
}

// ── Arg parser ────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = [];
  const flags = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next; i += 2;
      } else {
        flags[key] = true; i++;
      }
    } else if (a.startsWith('-') && a.length === 2) {
      const key = a.slice(1);
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next; i += 2;
      } else {
        flags[key] = true; i++;
      }
    } else {
      args.push(a); i++;
    }
  }
  return { args, flags };
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const argv = process.argv.slice(2);
  const { args, flags } = parseArgs(argv);

  if (flags['no-color']) useColor = false;
  if (flags.help || flags.h || argv.length === 0) { printHelp(); return; }

  const cmd = args[0];

  try {
    if (cmd === 'world') {
      cmdWorld(args.slice(1), flags);
    } else if (cmd === 'meeting') {
      cmdMeeting(args.slice(1), flags);
    } else if (cmd === 'list') {
      cmdList(args.slice(1), flags);
    } else if (cmd === 'offset') {
      cmdOffset(args.slice(1), flags);
    } else if (cmd === 'unix') {
      cmdUnix(args.slice(1), flags);
    } else {
      // Default: convert
      cmdConvert(args, flags);
    }
  } catch (err) {
    console.error(clr('red', `  Error: ${err.message}`));
    process.exit(1);
  }
}

main();
