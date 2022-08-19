/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { style } from 'typestyle';

export const TopWhitespaceStyle = style({
  content: ' ',
  height: 'var(--jp-toolbar-micro-height)',
  borderBottom: 'var(--jp-border-width) solid var(--jp-toolbar-border-color)',
  boxShadow: 'var(--jp-toolbar-box-shadow)',
  zIndex: 2,
  width: '100%',
  background: 'var(--jp-toolbar-background)',
  position: 'relative'
});

export const ShortcutUIStyle = style({
  display: 'flex',
  flexDirection: 'column',
  fontSize: 'var(--jp-ui-font-size1)',
  fontFamily: 'var(--jp-ui-font-family)',
  color: 'var(--jp-content-font-color1)',
  minWidth: '450px',
  width: '100%'
});
