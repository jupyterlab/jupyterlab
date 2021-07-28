// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { keyframes, style } from 'typestyle/lib';

export const progressBarItem = (width?: number | undefined): string =>
  style({
    height: '10px',
    width: width ? `${width}px` : '100px',
    border: '0.25px solid var(--jp-brand-color2)',
    borderRadius: '3px',
    overflow: 'hidden',
    alignSelf: 'center'
  });

const animationKeyframe = keyframes({
  from: {
    backgroundPosition: '0 0'
  },
  to: {
    backgroundPosition: '40px 40px'
  }
});

export const fillerItem = (contentWidth?: number | undefined): string =>
  style({
    background: 'var(--jp-brand-color2)',
    backgroundImage: `linear-gradient(
    -45deg,
    rgba(255, 255, 255, 0.2) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.2) 75%,
    transparent 75%,
    transparent
  )`,
    backgroundSize: '40px 40px',
    float: 'left',
    width: '0%',
    height: '100%',
    fontSize: '12px',
    lineHeight: '14px',
    color: '#ffffff',
    textAlign: 'center',
    animationName: animationKeyframe,
    animationDuration: '2s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
    $nest: {
      p: {
        color: 'var(--jp-ui-font-color1)',
        fontFamily: 'var(--jp-ui-font-family)',
        lineHeight: '10px',
        width: contentWidth ? `${contentWidth}px` : `100px`
      }
    }
  });
