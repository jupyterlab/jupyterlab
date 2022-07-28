/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { style } from 'typestyle/lib';

export const shortcutStyle = style({
  margin: '9px 5px 5px 4px',
  paddingTop: '8px',
  backgroundSize: '16px',
  height: '16px',
  width: '16px',
  backgroundImage: 'var(--jp-icon-remove-med)',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  backgroundColor: 'var(--jp-layout-color0)',
  border: 'none',

  $nest: {
    '&:hover': {
      backgroundImage: 'var(--jp-icon-remove)'
    },
    '&:active': {
      backgroundImage: 'var(--jp-icon-remove)'
    },
    '&:focus': {
      backgroundImage: 'var(--jp-icon-remove)',
      outline: 'none'
    }
  }
});

export const shortcutConflictStyle = style({
  backgroundImage: 'var(--jp-icon-remove-light)',
  backgroundColor: 'var(--jp-error-color2)',

  $nest: {
    '&:hover': {
      backgroundImage: 'var(--jp-icon-remove-med)'
    },
    '&:active': {
      backgroundImage: 'var(--jp-icon-remove-med)'
    },
    '&:focus': {
      backgroundImage: 'var(--jp-icon-remove-med)'
    }
  }
});
