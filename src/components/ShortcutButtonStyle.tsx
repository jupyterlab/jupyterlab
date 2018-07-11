import {
  style
} from 'typestyle'

export const shortcutStyle = style(
  {
    margin: '4px 8px 0 4px',
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