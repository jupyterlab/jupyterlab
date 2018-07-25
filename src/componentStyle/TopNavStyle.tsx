import { style } from 'typestyle';

export const TopStyle = style({
  display: 'block'
});

export const TopNavStyle = style({
  display: 'flex',
  boxSizing: 'border-box',
  fontSize: 'var(--jp-ui-font-size2)',
  backgroundColor: 'var(--jp-layout-color0)',
  zIndex: 1,
  paddingTop: '30px',
  paddingBottom: '30px',
  height: 110
});

export const SymbolsStyle = style({
  width: '15%',
  display: 'table',
  paddingLeft: '5%',
  lineHeight: '24px'
});

export const SymbolsSmallStyle = style({
  lineHeight: '14px'
})

export const SymbolsRowStyle = style({
  display: 'table-row',
  justifyContent: 'center',
  paddingLeft: '20%',

  $nest: {
    '& div': {
      margin: '0px 10px',
      fontSize: 'var(--jp-ui-font-size1)',
      display: 'table-cell',
      width: '60%'
    }
  }
});

export const SearchContainerStyle = style({
  width: ' 50%',
  textAlign: 'center'
});

export const SearchStyle = style({
  borderWidth: 'var(--jp-border-width)',
  borderStyle: 'solid',
  borderColor: 'var(--jp-layout-color3)',
  /* border-radius: var(--jp-border-radius);   this is 2px */
  borderRadius: '3px',
  height: '20px',
  width: '65%',
  fontSize: 'var(--jp-ui-font-size1)',
  color: 'var(--jp-ui-font-color0)',
  padding: '3px',
  paddingLeft: '6px',
  textIndent: '4px',
  backgroundColor: 'var(--jp-layout-color1)',
  backgroundImage: 'var(--jp-icon-search)',
  backgroundSize: '18px',
  backgroundPositionY: '4px',
  backgroundPositionX: '98%',
  backgroundRepeat: 'no-repeat',
  marginTop: '8px',

  $nest: {
    '&:focus': {
      outline: 'none'
    },
    '&::placeholder': {
      color: 'var(--jp-ui-font-color2)'
    }
  }
});

export const AdvancedOptionsContainerStyle = style (
  {
    display: 'contents'
  }
)

export const AdvancedOptionsStyle = style({
  display: 'block',
  width: '15%'
});

export const AdvancedOptionsSmallStyle = style ({
  width: '30%'
})

export const AdvancedOptionsRightStyle = style({
  marginTop: '8px',
});

export const AdvancedOptionsLinkStyle = style({
  color: 'var(--jp-brand-color2)',
  textDecoration: 'none',
  display: 'block',
  textAlign: 'center',

  $nest: {
    '&:hover': {
      textDecoration: 'underline'
    },
    '&:active': {
      color: 'var(--jp-brand-color0)'
    }
  }
});

export const AdvancedOptionsRightLinkStyle = style({
  textAlign: 'left',
  paddingLeft: '30px'
})

export const HeaderRowContainerStyle = style({
  paddingRight: '14px',
})

export const HeaderRowStyle = style({
  fontWeight: 'bold', //'var(--jp-content-heading-font-weight)',
  fontSize: 'var(--jp-ui-font-size2)',
  backgroundColor: 'var(--jp-layout-color0)',
  width: '100%',
  zIndex: 1,
  display: 'table',
  padding: '10px 0',
});
