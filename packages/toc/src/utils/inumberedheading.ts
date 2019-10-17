// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IHeading } from '../toc';

/**
 * Describes an interface for a numbered heading.
 *
 * @private
 */
interface INumberedHeading extends IHeading {
  /**
   * Heading numbering.
   */
  numbering?: string | null;
}

/**
 * Exports.
 */
export { INumberedHeading };
