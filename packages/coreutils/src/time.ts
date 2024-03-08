// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * A list of time units with their associated value in milliseconds.
 */
const UNITS: { name: Intl.RelativeTimeFormatUnit; milliseconds: number }[] = [
  { name: 'years', milliseconds: 365 * 24 * 60 * 60 * 1000 },
  { name: 'months', milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { name: 'days', milliseconds: 24 * 60 * 60 * 1000 },
  { name: 'hours', milliseconds: 60 * 60 * 1000 },
  { name: 'minutes', milliseconds: 60 * 1000 },
  { name: 'seconds', milliseconds: 1000 }
];

const SUPERSHORT_UNITS = {
  'year': 'y',
  'years': 'y',
  'quarter': 'q',
  'quarters': 'q',
  'months': 'mo',
  'month': 'mo',
  'weeks': 'w',
  'week': 'w',
  'days': 'd',
  'day': 'd',
  'hours': 'h',
  'hour': 'h',
  'minutes': 'min',
  'minute': 'min',
  'seconds': 's',
  'second': 's',
};

/**
 * The namespace for date functions.
 */
export namespace Time {
  /**
   * Convert a timestring to a human readable string (e.g. 'two minutes ago').
   *
   * @param value - The date timestring or date object.
   *
   * @returns A formatted date.
   */
  export function formatHuman(value: string | Date): string {
    const delta = new Date(value).getTime() - Date.now();
    for (let unit of UNITS) {
      const amount = Math.ceil(delta / unit.milliseconds);
      if (amount === 0) {
        continue;
      }
      // In the rare case that the timestamp is in the future, prepend a "+"
      const stringAmount = (amount > 0) ? `+${amount}` : `${-amount}`;
      return stringAmount + SUPERSHORT_UNITS[unit.name];
    }
    return '0s';
  }

  /**
   * Convenient helper to convert a timestring to a date format.
   *
   * @param value - The date timestring or date object.
   *
   * @returns A formatted date.
   */
  export function format(value: string | Date): string {
    const lang = document.documentElement.lang || 'en';
    const formatter = new Intl.DateTimeFormat(lang, {
      dateStyle: 'short',
      timeStyle: 'short'
    });
    return formatter.format(new Date(value));
  }
}
