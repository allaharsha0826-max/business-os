export type ZonedParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  weekday: string;
  ymd: string;
};

export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((part) => [part.type, part.value]),
  );
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  return {
    year,
    month,
    day,
    hour: parts.hour,
    minute: parts.minute,
    weekday: parts.weekday,
    ymd: `${year}-${month}-${day}`,
  };
}

/** Convert a wall-clock time in `timeZone` to a UTC Date. */
export function zonedLocalToUtc(ymd: string, hm: string, timeZone: string) {
  const [year, month, day] = ymd.split("-").map(Number);
  const [hour, minute] = hm.split(":").map(Number);
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const parts = zonedParts(guess, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    0,
  );
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  return new Date(guess.getTime() + (desired - asUtc));
}

export function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export function formatTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatLongDate(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function greetingFor(date: Date, timeZone: string) {
  const hour = Number(zonedParts(date, timeZone).hour);
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function ago(iso: string, now = Date.now()) {
  const delta = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function googleCalendarUrl(input: {
  title: string;
  startsAt: string;
  endsAt: string;
  details: string;
}) {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${stamp(input.startsAt)}/${stamp(input.endsAt)}`,
    details: input.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
