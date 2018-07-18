import { style } from 'typestyle';

export const HeaderStyle = style({
  display: 'flex',

  $nest: {
    '&:hover div': {
      fontWeight: 600,
      color: 'var(--jp-ui-font-color0)'
    },
    '&:focus div': {
      outline: 'none'
    },
    '&:active div': {
      fontWeight: 600,
      color: 'var(--jp-ui-font-color0)'
    }
  }
});

export const CurrentHeaderStyle = style({
  $nest: {
    '& div': {
      color: 'var(--jp-ui-font-color0)',
      fontWeight: 'bold'
    }
  }
});

export const SortButtonStyle = style({
  transform: 'rotate(180deg)',
  marginLeft: '10px',
  color: 'var(--jp-ui-font-color2)',
  border: 'none',
  backgroundColor: 'var(--jp-layout-color0)',
  fontSize: 'var(--jp-ui-font-size1)'
});
