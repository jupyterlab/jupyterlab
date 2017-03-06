// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as moment
 from 'moment';


/**
 * Convert a timestring to a human readable string (e.g. 'two minutes ago').
 *
 * @param value - The date timestring.
 *
 * @returns A formatted date.
 */
export
function humanTime(value: string): string {
  let time = moment(value).fromNow();
  time = time === 'a few seconds ago' ? 'seconds ago' : time;
  return time;
}


/**
 * Convert a timestring to a date format.
 *
 * @param value - The date timestring.
 *
 * @param format - The format string.
 *
 * @returns A formatted date.
 */
export
function dateTime(value: string, format='YYYY-MM-DD HH:mm'): string {
  return moment(value).format(format);
}
