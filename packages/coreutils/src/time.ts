// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { parseISO, formatDistanceToNow, format as formatDate } from 'date-fns';

/**
 * The namespace for date functions.
 */
export namespace Time {
  /**
   * Convert a timestring to a date object
   *
   * @param value - The date timestring or date object. This function is used internally in the Time namespace
   *
   * @returns A date object
   */
  function convertToDateObject(value: string | Date): Date {
    typeof value === 'string' ? (value = parseISO(value)) : (value = value);
    return value;
  }

  /**
   * Convert a timestring to a human readable string (e.g. 'two minutes ago').
   *
   * @param value - The date timestring or date object.
   *
   * @returns A formatted date.
   */
  export function formatHuman(value: string | Date): string {
    // We must convert any strings to Date objects as that is the type expected by formatDate
    value = convertToDateObject(value);

    return formatDistanceToNow(value, {
      includeSeconds: false,
      addSuffix: true
    });
  }

  /**
   * Convert a timestring to a date format.
   *
   * @param value - The date timestring or date object.
   *
   * @param format - The format string.
   *
   * @returns A formatted date.
   */
  export function format(
    value: string | Date,
    formatString = 'yyyy-MM-dd HH:mm'
  ): string {
    // We must convert any strings to Date objects as that is the type expected by formatDate
    value = convertToDateObject(value);

    return formatDate(value, formatString);
  }
}
