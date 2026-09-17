export const DHAKA_TZ = "Asia/Dhaka";

function dhakaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: DHAKA_TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of fmt.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return map;
}

export function dhakaYear(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: DHAKA_TZ, year: "numeric" }).format(date),
  );
}

/** YYYY-MM-DD in Asia/Dhaka */
export function dhakaIsoDate(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 16 September 2026 */
export function formatLongDate(isoDate: string | Date): string {
  if (!isoDate) return "";
  if (typeof isoDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    const [y, m, day] = isoDate.split("-").map(Number);
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    return `${day} ${months[m! - 1]} ${y}`;
  }
  const d = typeof isoDate === "string" ? new Date(isoDate) : isoDate;
  if (isNaN(d.getTime())) return "";
  const map = dhakaParts(d);
  return `${Number(map.day)} ${map.month} ${map.year}`;
}

/** 09:42 PM */
export function formatTimeDhaka(date = new Date()): string {
  const map = dhakaParts(date);
  const hour = map.hour?.padStart(2, "0") ?? "12";
  const minute = map.minute?.padStart(2, "0") ?? "00";
  const dayPeriod = (map.dayPeriod ?? "PM").toUpperCase();
  return `${hour}:${minute} ${dayPeriod}`;
}

export function nowDhaka(): { isoDate: string; time: string; year: number; longDate: string } {
  const isoDate = dhakaIsoDate();
  return {
    isoDate,
    time: formatTimeDhaka(),
    year: dhakaYear(),
    longDate: formatLongDate(isoDate),
  };
}

export function greetingDhaka(date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DHAKA_TZ,
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
  if (hour < 5) return "Good evening";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function relativeDate(isoDate: string): string {
  const today = dhakaIsoDate();
  const t = Date.parse(`${isoDate}T00:00:00`);
  const n = Date.parse(`${today}T00:00:00`);
  const days = Math.round((n - t) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days === -1) return "Tomorrow";
  if (days > 1 && days < 7) return `${days} days ago`;
  if (days < -1 && days > -7) return `In ${-days} days`;
  return formatLongDate(isoDate);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function addDaysIso(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export type DatePreset = {
  label: string;
  startDate: string;
  endDate: string;
};

export function getAnalyticsPresets(): DatePreset[] {
  const today = dhakaIsoDate();
  const year = today.slice(0, 4);
  const month = today.slice(0, 7);
  
  // Last Month calculations
  const lastMonthDay = addDaysIso(`${month}-01`, -1);
  const lastMonth = lastMonthDay.slice(0, 7);

  return [
    { label: "Today", startDate: today, endDate: today },
    { label: "This Week", startDate: addDaysIso(today, -6), endDate: today },
    { label: "This Month", startDate: `${month}-01`, endDate: today },
    { label: "Last 30 Days", startDate: addDaysIso(today, -29), endDate: today },
    { label: "Last Month", startDate: `${lastMonth}-01`, endDate: lastMonthDay },
    { label: "This Year", startDate: `${year}-01-01`, endDate: today },
  ];
}
