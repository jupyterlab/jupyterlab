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

/**
 * The namespace for date functions.
 */
export namespace Time {
  export type HumanStyle = Intl.ResolvedRelativeTimeFormatOptions['style'];

  /**
   * Convert a timestring to a human readable string (e.g. 'two minutes ago').
   *
   * @param value - The date timestring or date object.
   *
   * @returns A formatted date.
   */
  export function formatHuman(
    value: string | Date,
    format: HumanStyle = 'long'
  ): string {
    const lang = document.documentElement.lang || 'en';
    const formatter = new Intl.RelativeTimeFormat(lang, {
      numeric: 'auto',
      style: format
    });
    const delta = new Date(value).getTime() - Date.now();
    for (let unit of UNITS) {
      const amount = Math.ceil(delta / unit.milliseconds);
      if (amount === 0) {
        continue;
      }
      return formatter.format(amount, unit.name);
    }
    return formatter.format(0, 'seconds');
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
