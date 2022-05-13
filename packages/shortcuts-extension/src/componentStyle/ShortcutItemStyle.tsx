import { style } from 'typestyle';
import { UISize } from '../components/ShortcutUI.js';

export const CellStyle = style({
  padding: '6px 12px',
  display: 'table-cell',
  width: '20%',
  verticalAlign: 'middle'
});

export const ShortcutCellStyle = style({
  display: 'flex',
  minWidth: '100px',
  flexWrap: 'wrap'
});

export const EmptyShortcutCellStyle = style({
  height: '32px',

  $nest: {
    '& #add-link': {}
  }
});

export const SingleShortcutCellStyle = style({});

export const RowStyle = style({
  padding: '10px',
  width: '100%',
  display: 'table-row',
  borderBottom: 'solid',
  borderBottomColor: 'var(--jp-border-color1)',
  borderBottomWidth: 'var(--jp-border-width)',
  verticalAlign: 'middle',
  backgroundColor: 'var(--jp-layout-color0)',

  $nest: {
    '&:hover #shortcut-keys': {
      borderColor: 'var(--jp-border-color1)',
      background: 'var(--jp-layout-color2)'
    },
    '&:hover #add-link': {
      display: 'block'
    },
    '&:hover #or': {
      display: 'block'
    }
  }
});

function getMarginLeft(showSelectors: boolean, errorSize: UISize): string {
  if (errorSize === UISize.Regular) {
    return showSelectors ? '20%' : '25%';
  } else {
    return '0';
  }
}

export function ConflictContainerStyle(
  showSelectors: boolean,
  errorSize: UISize
) {
  return style({
    display: 'flex',
    flexWrap: 'wrap',
    padding: '6px 12px',
    marginLeft: getMarginLeft(showSelectors, errorSize)
  });
}

export const ErrorMessageStyle = style({
  color: 'var(--jp-error-color1)',
  marginTop: '9px'
});

export const ErrorButtonStyle = style({
  lineHeight: '34px',
  marginLeft: '10px',

  $nest: {
    '& button:nth-of-type(1)': {
      height: '25px',
      marginRight: '5px',
      backgroundColor: 'var(--jp-border-color0)',
      color: 'white',
      outline: 'none',

      $nest: {
        '&:hover': {},
        '&:active': {
          outline: 'none',
          border: 'none'
        },
        '&focus': {
          outline: 'none',
          border: 'none'
        }
      }
    },
    '& button:nth-of-type(2)': {
      height: '25px',
      backgroundColor: 'var(--jp-error-color1)',
      color: 'white',
      outline: 'none',

      $nest: {
        '&:hover': {},
        '&:active': {
          outline: 'none',
          border: 'none'
        },
        '&focus': {
          outline: 'none',
          border: 'none'
        }
      }
    }
  }
});

export const ShortcutContainerStyle = style({
  display: 'flex',
  flexWrap: 'wrap',

  $nest: {
    '&:hover #shortcut-keys': {
      borderColor: 'var(--jp-border-color3)',
      background: 'var(--jp-layout-color3)'
    }
  }
});

export const ShortcutKeysContainerStyle = style({
  fontSize: 'var(--jp-code-font-size)',
  fontFamily: 'var(--jp-ui-font-family)',
  display: 'flex'
});

export const ShortcutKeysStyle = style({
  borderWidth: 'var(--jp-border-width)',
  borderColor: 'var(--jp-layout-color0)',
  background: 'var(--jp-layout-color0)',
  padding: '5px 6px',
  borderRadius: 'var(--jp-border-radius)',
  margin: '3px 0'
});

export const OrStyle = style({
  marginRight: '12px',
  marginLeft: '12px',
  marginTop: '8px',
  color: 'var(--jp-content-font-color3)',
  display: 'none',

  $nest: {
    '&:hover': {
      display: 'block'
    }
  }
});

export const OrTwoStyle = style({
  marginRight: '12px',
  marginLeft: '12px',
  marginTop: '8px',
  color: 'var(--jp-content-font-color3)',
  display: 'block'
});

export const CommaStyle = style({
  marginTop: '10px',
  marginRight: '2px',
  marginLeft: '2px'
});

export const PlusStyle = style({
  display: 'none',
  background: 'var(--jp-brand-color3)',
  borderColor: 'var(--jp-layout-color0)',
  borderRadius: 'var(--jp-border-radius)',
  borderWidth: 'var(--jp-border-width)',
  margin: '3px 0',
  padding: '5px 6px',

  $nest: {
    '&:hover': {
      backgroundColor: 'var(--jp-brand-color2)'
    },
    '&:active': {
      backgroundColor: 'var(--jp-brand-color2)'
    }
  }
});

export const ResetStyle = style({
  color: 'var(--jp-brand-color2)',
  paddingLeft: '10px',

  $nest: {
    '&:hover': {
      color: 'var(--jp-brand-color1)'
    }
  }
});

export const SourceCellStyle = style({
  display: 'inline-block'
});
