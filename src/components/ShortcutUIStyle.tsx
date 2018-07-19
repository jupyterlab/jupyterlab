import { style } from 'typestyle';

export const TopWhitespaceStyle = style({
  content: ' ',
  height: 'var(--jp-toolbar-micro-height)',
  borderBottomWidth: 'var(--jp-border-width)',
  borderBottomColor: 'var(--jp-toolbar-border-color)',
  boxShadow: 'var(--jp-toolbar-box-shadow)',
  zIndex: 2,
  width: '100%',
  background: 'var(--jp-toolbar-background)',
  position: 'relative'
});
