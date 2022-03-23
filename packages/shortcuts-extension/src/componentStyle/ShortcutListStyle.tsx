import { style } from 'typestyle';

export const ShortcutListStyle = style({
  width: '100%',
  display: 'table',
  borderCollapse: 'collapse'
});

export function ShortcutListContainerStyle(
  topNavHeight: number,
  widgetHeight: number
) {
  return style({
    overflowY: 'scroll',
    height: widgetHeight - topNavHeight,
    borderTop: 'solid',
    borderTopColor: 'var(--jp-border-color1)',
    borderTopWidth: 'var(--jp-border-width)'
  });
}
