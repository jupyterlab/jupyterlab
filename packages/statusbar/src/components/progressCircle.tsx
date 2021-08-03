import React from 'react';
import { progressCircleStyle } from '../style/circleBar';

export namespace ProgressCircle {
  /**
   * Props for the ProgressBar.
   */
  export interface IProps {
    /**
     * The current progress percentage, from 0 to 100
     */
    progress: number;

    width?: number;

    height?: number;
  }
}

export function ProgressCircle(props: ProgressCircle.IProps): JSX.Element {
  const d = (progress: number): string => {
    const angle = Math.max(progress * 3.6, 0.1) ;
    console.log('angle', angle);
    
    const rad = (angle * Math.PI) / 180,
      x = Math.sin(rad) * 125,
      y = Math.cos(rad) * -125,
      mid = angle < 180 ? 1 : 0,
      shape = 'M 0 0 v -125 A 125 125 1 ' + mid + ' 0 ' + x + ' ' + y + ' z';
    return shape;
  };
  return (
    <div className={progressCircleStyle(props.width, props.height)}>
      <svg viewBox="0 0 250 250">
        <circle
          cx="125"
          cy="125"
          r="112.5"
          stroke="var(--jp-inverse-layout-color3)"
          strokeWidth="25"
          fill="none"
        />
        <path
          transform="translate(125,125) scale(.9)"
          d={d(props.progress)}
          fill={'var(--jp-inverse-layout-color3)'}
        />
      </svg>
    </div>
  );
}
