/** Durban runs on South African Standard Time (UTC+2, no DST). */
export const TZ = "Africa/Johannesburg";

const base: Intl.DateTimeFormatOptions = {
  timeZone: TZ,
  hourCycle: "h23",
  hour: "2-digit",
  minute: "2-digit",
};
const hm = new Intl.DateTimeFormat("en-GB", base);
const hms = new Intl.DateTimeFormat("en-GB", { ...base, second: "2-digit" });

export function sastHM(d: Date = new Date()): string {
  return hm.format(d);
}

export function sastHMS(d: Date = new Date()): string {
  return hms.format(d);
}

export interface ClockParts {
  readonly h: string;
  readonly m: string;
  readonly s: string;
}

export function sastParts(d: Date = new Date()): ClockParts {
  const parts = hms.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "--";
  return { h: get("hour"), m: get("minute"), s: get("second") };
}

/** ms until the next whole second — keeps the clock phase-locked instead of drifting. */
export function untilNextSecond(d: Date = new Date()): number {
  return 1000 - d.getMilliseconds();
}
