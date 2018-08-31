import { style } from 'typestyle';

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
    '& #add-link': {
      marginLeft: 'auto'
    }
  }
})

export const SingleShortcutCellStyle = style({
  justifyContent: 'space-between'
})

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
      background: 'var(--jp-layout-color2)',
    },
    '&:hover #add-link': {
      display: 'block'
    }
  }
});

export function ConflictContainerStyle(showSelectors: boolean, errorSize: string) {
  if (showSelectors && errorSize === 'regular') {
    return (
      style({
        display: 'flex',
        flexWrap: 'wrap',
        padding: '6px 12px',
        marginLeft: '20%'
      })
    )
  } else if (!showSelectors && errorSize === 'regular') {
    return (
      style({
        display: 'flex',
        flexWrap: 'wrap',
        padding: '6px 12px',
        marginLeft: '25%'
      })
    )
  } else {
    return (
      style({
        display: 'flex',
        flexWrap: 'wrap',
        padding: '6px 12px',
        marginLeft: '0'
      })
    )
  }
}

export const ErrorMessageStyle = style({
  color: 'var(--jp-error-color1)',
  marginTop: '9px'
})

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
        '&:hover': {

        },
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
        '&:hover': {

        },
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

})

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
  color: 'var(--jp-content-font-color3)'
});

export const CommaStyle = style({
  marginTop: '10px',
  marginRight: '2px',
  marginLeft: '2px'
});

export const PlusStyle = style({
  // backgroundColor: 'var(--jp-brand-color2)',
  // color: 'var(--jp-layout-color0)',
  // textDecoration: 'none',
  // display: 'block',
  // textAlign: 'center',
  // textTransform: 'uppercase',
  // boxSizing: 'border-box',
  // padding: '0px 12px',
  // height: '30px',
  // lineHeight: '30px',
  // border: '1px solid var(--jp-brand-color1)',

  display: 'none',
  background: 'var(--jp-brand-color3)',
  borderColor: 'var(--jp-layout-color0)',
  borderRadius: 'var(--jp-border-radius)',
  borderWidth: 'var(--jp-border-width)',
  margin: '3px 0',
  padding: '5px 6px',

  $nest: {
    '&:hover': {
      backgroundColor: 'var(--jp-brand-color2)',
    },
    '&:active': {
      backgroundColor: 'var(--jp-brand-color2)',
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
