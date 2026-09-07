export interface ZonedInstant {
  utcInstant: string; // ISO 8601 UTC timestamp: e.g. 2026-09-07T10:00:00.000Z
  ianaTimezone: string; // e.g. 'Asia/Qatar'
}

export type BusinessDate = string; // YYYY-MM-DD

export interface DateWindow {
  start: ZonedInstant;
  end: ZonedInstant;
}

export class TimeUtil {
  /**
   * Creates a ZonedInstant from a Date or ISO string and IANA timezone.
   */
  static createZonedInstant(date: Date | string = new Date(), timezone = 'Asia/Qatar'): ZonedInstant {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      throw new Error(`Invalid date provided: ${date}`);
    }
    return {
      utcInstant: d.toISOString(),
      ianaTimezone: timezone,
    };
  }

  /**
   * Validates if a string is a valid ISO 8601 instant with timezone offset.
   */
  static isValidIsoInstant(val: string): boolean {
    if (!val || typeof val !== 'string') return false;
    const date = new Date(val);
    return !isNaN(date.getTime()) && (val.includes('Z') || /[+-]\d{2}:\d{2}$/.test(val));
  }

  /**
   * Validates a business date format YYYY-MM-DD.
   */
  static isValidBusinessDate(val: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(val);
  }

  /**
   * Checks if an instant is within a half-open window [start, end).
   */
  static isWithinHalfOpenInterval(instant: Date | string, start: Date | string, end: Date | string): boolean {
    const t = new Date(instant).getTime();
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return t >= s && t < e;
  }

  /**
   * Checks if two half-open intervals [s1, e1) and [s2, e2) overlap.
   */
  static intervalsOverlap(s1: Date | string, e1: Date | string, s2: Date | string, e2: Date | string): boolean {
    const start1 = new Date(s1).getTime();
    const end1 = new Date(e1).getTime();
    const start2 = new Date(s2).getTime();
    const end2 = new Date(e2).getTime();

    if (start1 >= end1 || start2 >= end2) {
      throw new Error('Invalid interval: start must be strictly before end');
    }

    return start1 < end2 && start2 < end1;
  }
}
