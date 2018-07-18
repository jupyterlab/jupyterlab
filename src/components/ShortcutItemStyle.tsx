import { style } from 'typestyle';

export const CellStyle = style({
  padding: '6px 12px',
  display: 'table-cell',
  width: '20%',
  verticalAlign: 'middle'
});

export const CellTextStyle = style({
  lineHeight: '34px',
  height: '34px'
});

export const ShortcutCellStyle = style({
  display: 'flex',
  minWidth: '100px',
  flexWrap: 'wrap'
});

export const RowStyle = style({
  padding: '10px',
  width: '100%',
  display: 'table-row',
  borderBottom: 'solid',
  borderBottomColor: 'var(--jp-border-color1)',
  borderBottomWidth: 'var(--jp-border-width)',
  verticalAlign: 'middle',
  backgroundColor: 'var(--jp-layout-color0)'
});

export const ConflictRowStyle = style({
  backgroundColor: 'var(--jp-error-color2)'
});

export const ShortcutContainerStyle = style({
  display: 'flex',
  flexWrap: 'wrap'
});

export const ShortcutKeysContainerStyle = style({
  fontFamily: 'var(--jp-code-font-family)',
  fontSize: 'var(--jp-code-font-size)',
  display: 'flex'
});

export const ShortcutKeysStyle = style({
  borderWidth: 'var(--jp-border-width)',
  borderColor: 'var(--jp-border-color1)',
  background: 'var(--jp-layout-color2)',
  padding: '7px 6px 4px 6px',
  borderRadius: 'var(--jp-border-radius)',
  margin: '3px 0'
});

export const OrStyle = style({
  marginRight: '12px',
  marginTop: '8px'
});

export const CommaStyle = style({
  marginTop: '10px',
  marginRight: '2px',
  marginLeft: '2px'
});

export const PlusStyle = style({
  backgroundImage: 'var(--jp-icon-add-light-blue)',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '16px',
  width: '16px',
  height: '21px',
  marginTop: '9px',

  $nest: {
    '&:hover': {
      backgroundImage: 'var(--jp-icon-add-blue)'
    },

    '&:focus': {
      backgroundImage: 'var(--jp-icon-add-blue)'
    }
  }
});

export const ResetStyle = style({
  color: 'var(--jp-brand-color2)',
  paddingLeft: '10px',

  $nest: {
    '&:hover': {
      textDecoration: 'underline'
    }
  }
});

export const SourceCellStyle = style({
  display: 'inline-block'
});
