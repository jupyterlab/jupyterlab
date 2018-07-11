import {
  style
} from 'typestyle/lib'

export const shortcutStyle = style(
  {
    margin: '9px 12px 0px 4px',
    paddingTop: '8px',
    backgroundSize: '16px',
    height: '16px',
    width: '16px',
    backgroundImage: 'var(--jp-icon-close)',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'var(--jp-layout-color0)',
    border: 'none',
    opacity: 0.5,

    $nest: {
      '&:hover': {
        opacity: 1
      },
      '&:active': {
        color: 'var(--jp-layout-color3)'
      },
      '&:focus': {
        outline: 'none'
      }
    }
  }
)

export const shortcutConflictStyle = style (
  {
    backgroundColor: 'var(--jp-error-color2)',
    opacity: 0.75
  }
)