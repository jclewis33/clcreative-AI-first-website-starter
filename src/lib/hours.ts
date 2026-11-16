/**
 * Opening hours, day by day — one list in `SITE.openingHours` feeds the hours
 * table (OfficeCard, the contact page) and `openingHoursSpecification` in the
 * sitewide JSON-LD. Plain data and pure functions, so the config, components
 * and jsonld.ts can all import it.
 *
 * Times are 24-hour "HH:MM" strings ("09:00", "17:30"), as schema.org wants
 * them. A day that appears in no entry is closed. A day may appear in two
 * entries for a split day (a lunch break): both ranges show.
 */

/** schema.org's two-letter day codes, Monday first. */
export type Weekday = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

export interface OpeningHours {
  /** The days these hours apply to: `["Mo", "Tu", "We", "Th"]`. */
  days: Weekday[];
  /** Opening time, 24-hour: "09:00". */
  opens: string;
  /** Closing time, 24-hour: "17:30". */
  closes: string;
}

/** One row of the hours table: "Monday" · "9:00 am – 5:30 pm". */
export interface HoursRow {
  /** The day, or a run of days with the same hours ("Sat & Sun", "Mon – Thu"). */
  label: string;
  /** The hours, or `closedLabel`. */
  value: string;
  /** No hours that day. */
  closed: boolean;
}

const WEEK: Weekday[] = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const DAY_NAMES: Record<
  Weekday,
  { long: string; short: string; schema: string }
> = {
  Mo: { long: "Monday", short: "Mon", schema: "https://schema.org/Monday" },
  Tu: { long: "Tuesday", short: "Tue", schema: "https://schema.org/Tuesday" },
  We: {
    long: "Wednesday",
    short: "Wed",
    schema: "https://schema.org/Wednesday",
  },
  Th: { long: "Thursday", short: "Thu", schema: "https://schema.org/Thursday" },
  Fr: { long: "Friday", short: "Fri", schema: "https://schema.org/Friday" },
  Sa: { long: "Saturday", short: "Sat", schema: "https://schema.org/Saturday" },
  Su: { long: "Sunday", short: "Sun", schema: "https://schema.org/Sunday" },
};

/** "13:30" → "1:30 pm"; "09:00" → "9:00 am"; "12:00" → "12:00 pm". */
export function formatTime(time: string): string {
  const [h = "0", m = "00"] = time.split(":");
  const hour = Number(h);
  if (Number.isNaN(hour)) return time;
  const suffix = hour >= 12 && hour < 24 ? "pm" : "am";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m.padStart(2, "0")} ${suffix}`;
}

/** The hours a single day shows: "9:00 am – 5:30 pm", two ranges joined with ", ". */
function dayValue(hours: OpeningHours[], day: Weekday): string {
  return hours
    .filter((h) => h.days.includes(day))
    .sort((a, b) => a.opens.localeCompare(b.opens))
    .map((h) => `${formatTime(h.opens)} – ${formatTime(h.closes)}`)
    .join(", ");
}

/**
 * The week as table rows, Monday first. Neighbouring days with the same hours
 * share a row ("Sat & Sun", "Mon – Thu"); a lone day keeps its full name.
 */
export function hoursRows(
  hours: OpeningHours[],
  closedLabel = "Closed",
): HoursRow[] {
  const rows: { days: Weekday[]; value: string }[] = [];
  for (const day of WEEK) {
    const value = dayValue(hours, day);
    const last = rows.at(-1);
    if (last && last.value === value) last.days.push(day);
    else rows.push({ days: [day], value });
  }
  return rows.map(({ days, value }) => {
    const first = DAY_NAMES[days[0]];
    const end = DAY_NAMES[days[days.length - 1]];
    const label =
      days.length === 1
        ? first.long
        : days.length === 2
          ? `${first.short} & ${end.short}`
          : `${first.short} – ${end.short}`;
    return { label, value: value || closedLabel, closed: !value };
  });
}

/** schema.org `openingHoursSpecification` for the LocalBusiness node. */
export function openingHoursJsonLd(hours: OpeningHours[]) {
  return hours.map((h) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: h.days.map((d) => DAY_NAMES[d].schema),
    opens: h.opens,
    closes: h.closes,
  }));
}
