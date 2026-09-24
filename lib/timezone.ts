type ZonedDateTimeInput = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
};

const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>();
const partsFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getOffsetFormatter(timeZone: string) {
  let formatter = offsetFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    offsetFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function getOffsetMs(date: Date, timeZone: string) {
  const value = getOffsetFormatter(timeZone)
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  if (!value || value === "GMT" || value === "UTC") return 0;

  const match = value.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return (match[1] === "+" ? 1 : -1) * minutes * 60_000;
}

/** Converts a wall-clock time in a named IANA zone to an absolute UTC Date. */
export function zonedDateTimeToUtc(input: ZonedDateTimeInput, timeZone: string) {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour ?? 0,
    input.minute ?? 0,
    input.second ?? 0,
  );
  const firstOffset = getOffsetMs(new Date(utcGuess), timeZone);
  const firstGuess = utcGuess - firstOffset;
  const secondOffset = getOffsetMs(new Date(firstGuess), timeZone);
  return new Date(utcGuess - secondOffset);
}

export function getZonedDateParts(date: Date, timeZone: string) {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    partsFormatterCache.set(timeZone, formatter);
  }

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dayOfWeek: weekdays[parts.weekday] ?? 0,
  };
}

export function getBusinessDateRange(dateKey: string, timeZone: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const start = zonedDateTimeToUtc({ year, month, day }, timeZone);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const end = zonedDateTimeToUtc({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  }, timeZone);
  const localDate = new Date(Date.UTC(year, month - 1, day, 12));
  return { start, end, dayOfWeek: localDate.getUTCDay() };
}

export function parseTime(time: string) {
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute, totalMinutes: hour * 60 + minute };
}

export function dateKeyToParts(dateKey: string) {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return null;
  return { year, month, day };
}
