import {
  style
} from 'typestyle'

export const HeaderStyle = style (
  {
    display: 'flex'
  }
)

export const SortButtonStyle = style (
  {
    transform: 'rotate(180deg)',
    paddingLeft: '10px',
    color: 'var(--jp-ui-font-color2)',
    border: 'none',
    backgroundColor: 'var(--jp-layout-color0)',

    $nest: {
      '&:hover': {
        fontWeight: 600,
        color: 'var(--jp-ui-font-color0)'
      },
      '&:focus': {
        outline: 'none'
      },
      '&:active': {
        fontWeight: 600,
        color: 'var(--jp-ui-font-color0)'
      }
    }
  }
)

export const CurrentSortButtonStyle = style (
  {
    fontWeight: 'bold',
    color: 'var(--jp-ui-font-color0)'
  }
)