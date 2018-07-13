import {
  style
} from 'typestyle'

export const TopNavStyle = style (
  {
    display: 'flex',
    fontSize: 'var(--jp-ui-font-size2)',
    padding: '10px',
    paddingTop: '30px',
    paddingBottom: '60px',
    position: 'fixed',
    backgroundColor: 'var(--jp-layout-color0)',
    width: '94.5%',
    zIndex: 1
  }
)

export const SymbolsStyle = style(
  {
    width: '20%'
  }
)

export const SymbolsRowStyle = style (
  {
    display: 'flex',
    justifyContent: 'center',
    paddingLeft: '20%',

    $nest: {
      '& div': {
        margin: '0px 10px',
        fontSize: 'var(--jp-ui-font-size1)'
      }
    }
  }
)

// export const SymbolsRowStyle = style (
//   {transition: 'padding-left .5s'},
//   media(
//     {
//       minWidth:0, 
//       maxWidth:1000
//     }, 
//     {
//       paddingLeft:'5%',
//       display: 'flex',
//       justifyContent: 'center',

//       $nest: {
//         '& div': {
//           margin: '0px 10px',
//           fontSize: 'var(--jp-ui-font-size1)'
//         }
//       }
//     }
//   ),
//   media(
//     {
//       minWidth:1001
//     },
//     {
//       paddingLeft: '20%',
//       display: 'flex',
//       justifyContent: 'center',

//       $nest: {
//         '& div': {
//           margin: '0px 10px',
//           fontSize: 'var(--jp-ui-font-size1)'
//         }
//       }
//     }
//   )
// )

export const SearchContainerStyle = style (
  {
    width:' 50%',
    textAlign: 'center'
  }
)

export const SearchStyle = style (
  {
    borderWidth: 'var(--jp-border-width)',
    borderStyle: 'solid',
    borderColor: 'var(--jp-layout-color4)',
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
        outline:'none'
      },
      '&::placeholder': {
        color: 'var(--jp-ui-font-color2)'
      }
    }
  }
)

export const AdvancedOptionsStyle = style (
  {
    display: 'block',
    width: '15%'
  }
)

export const AdvancedOptionsRightStyle = style (
  {
    marginTop: '8px'
  }
)

export const AdvancedOptionsLinkStyle = style (
  {
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
  }
)

export const AdvancedOptionsLinkRightStyle = style (
  {
    textAlign: 'left'
  }
)
