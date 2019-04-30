// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';

import { progressBarItem, fillerItem } from '../style/progressBar';

/**
 * A namespace for ProgressBar statics.
 */
export namespace ProgressBar {
  /**
   * Props for the ProgressBar.
   */
  export interface IProps {
    /**
     * The current progress percentage, from 0 to 100
     */
    percentage: number;
  }
}

/**
 * A functional tsx component for a progress bar.
 */
export function ProgressBar(props: ProgressBar.IProps) {
  return (
    <div className={progressBarItem}>
      <Filler percentage={props.percentage} />
    </div>
  );
}

/**
 * A namespace for Filler statics.
 */
namespace Filler {
  /**
   * Props for the Filler component.
   */
  export interface IProps {
    /**
     * The current percentage filled, from 0 to 100
     */
    percentage: number;
  }
}

/**
 * A functional tsx component for a partially filled div.
 */
function Filler(props: Filler.IProps) {
  return (
    <div
      className={fillerItem}
      style={{
        width: `${props.percentage}px`
      }}
    />
  );
}
