# timezone-converter

Convert times across timezones, show world clocks, and find meeting times.

Zero external dependencies. Pure Node.js 18+. Uses `Intl.DateTimeFormat` throughout.

```
$ tzc "2pm" --from EST --to Asia/Dubai

  Time Conversion
  ──────────────────────────────────────────
  America/New_York             02:00 PM
  UTC-05:00                    Standard time

  ↓ converted to

  Asia/Dubai                   11:00 PM
  UTC+04:00                    Standard time
```

## Install

```sh
npm install -g timezone-converter
```

Or run without installing:

```sh
npx timezone-converter --help
```

## Usage

```
tzc [command] [args] [flags]
```

Both `timezone-converter` and `tzc` are available as bin aliases.

## Commands

### Convert a time

```sh
tzc "2pm" --from EST --to Asia/Dubai
tzc "14:30" --from America/New_York --to Europe/London
tzc now --from PST --to IST
tzc "9am" --from GMT --to JST
```

### World clock

```sh
tzc world --zones "America/New_York,Europe/London,Asia/Dubai,Asia/Tokyo"

  World Clock    (as of 2026-03-03T10:00:00.000Z)
  ────────────────────────────────────────────────────────────
  America/New_York               05:00:00 AM   UTC-05:00
  Europe/London                  10:00:00 AM   UTC+00:00
  Asia/Dubai                     02:00:00 PM   UTC+04:00
  Asia/Tokyo                     07:00:00 PM   UTC+09:00
```

### Find meeting times

```sh
tzc meeting --zones "America/New_York,Europe/London"
tzc meeting --zones "EST,GMT,IST" --work-start 8 --work-end 17

  Meeting Time Finder
  Business hours: 9:00 – 18:00 local in each zone
  ────────────────────────────────────────────────
  UTC Time    America/New_York     Europe/London
  ────────────────────────────────────────────────
  02:00 PM    09:00 AM             02:00 PM
  02:30 PM    09:30 AM             02:30 PM
  03:00 PM    10:00 AM             03:00 PM    ← core hours
  ...
```

### List timezones

```sh
tzc list               # all 600+ IANA zones
tzc list America       # filter by name
tzc list Asia
```

### UTC offset

```sh
tzc offset Asia/Dubai
tzc offset EST

  Asia/Dubai
  Offset : UTC+04:00
  DST    : Not active
```

### Unix timestamp conversion

```sh
tzc unix 1700000000 --zone Asia/Dubai
tzc unix 1700000000 --zone America/New_York

  Unix: 1700000000
  Zone: Asia/Dubai
  Time: 02:13:20 AM   UTC+04:00
  ISO:  2023-11-14T22:13:20.000Z
```

## Flags

| Flag | Short | Description |
|------|-------|-------------|
| `--from` | `-f` | Source timezone |
| `--to` | `-t` | Target timezone |
| `--zones` | `-z` | Comma-separated timezone list |
| `--zone` | | Single timezone (offset/unix commands) |
| `--work-start` | | Business day start hour (default: 9) |
| `--work-end` | | Business day end hour (default: 18) |
| `--json` | | Output as JSON |
| `--no-color` | | Disable ANSI colors |
| `--help` | `-h` | Show help |

## JSON output

Every command supports `--json`:

```sh
tzc "2pm" --from EST --to Asia/Dubai --json
```

```json
{
  "input": "2pm",
  "from": {
    "timezone": "America/New_York",
    "time": "02:00 PM",
    "offset": "UTC-05:00",
    "dst": false
  },
  "to": {
    "timezone": "Asia/Dubai",
    "time": "11:00 PM",
    "offset": "UTC+04:00",
    "dst": false
  },
  "unix": 1772564400
}
```

## Timezone aliases

Common abbreviations are supported:

| Alias | Resolves to |
|-------|-------------|
| `EST` / `EDT` | America/New_York |
| `PST` / `PDT` | America/Los_Angeles |
| `CST` / `CDT` | America/Chicago |
| `MST` / `MDT` | America/Denver |
| `GMT` | Europe/London |
| `UTC` | UTC |
| `CET` / `CEST` | Europe/Paris |
| `EET` / `EEST` | Europe/Helsinki |
| `IST` | Asia/Kolkata |
| `GST` | Asia/Dubai |
| `JST` | Asia/Tokyo |
| `KST` | Asia/Seoul |
| `AEST` / `AEDT` | Australia/Sydney |
| `NZST` / `NZDT` | Pacific/Auckland |
| `SAST` | Africa/Johannesburg |
| `HST` | Pacific/Honolulu |
| `AKST` | America/Anchorage |

Run `tzc list` for all 600+ IANA zone names.

## Time input formats

| Format | Example |
|--------|---------|
| 12-hour | `2pm`, `2:30pm` |
| 24-hour | `14:30`, `14` |
| Natural | `now` |
| Unix (10 digit) | `1700000000` |
| Unix (13 digit ms) | `1700000000000` |

## Requirements

- Node.js 18+
- Zero npm dependencies

## License

MIT
