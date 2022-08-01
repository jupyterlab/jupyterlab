/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { style } from 'typestyle';
import { UISize } from '../components/ShortcutUI';

export const TopStyle = style({
  display: 'block'
});

export const TopNavStyle = style({
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box',
  fontSize: 'var(--jp-ui-font-size1)',
  backgroundColor: 'var(--jp-layout-color0)',
  zIndex: 1,
  height: '56px'
});

export const SymbolsStyle = style({
  width: '15%',
  display: 'table',
  paddingLeft: '12px',
  lineHeight: '24px',
  paddingTop: '5px'
});

export const SymbolsSmallStyle = style({
  lineHeight: '14px'
});

export const SymbolsRowStyle = style({
  justifyContent: 'center',
  marginBottom: '8px',
  display: 'table-row',

  $nest: {
    '& div': {
      margin: '0px 10px',
      fontSize: 'var(--jp-ui-font-size1)',
      display: 'table-cell'
    },

    '& span': {
      fontSize: 'var(--jp-ui-font-size1)'
    }
  }
});

export const SearchContainerStyle = style({
  width: '60%',
  textAlign: 'center'
});

export const SearchStyle = style({
  borderWidth: 'var(--jp-border-width)',
  borderStyle: 'solid',
  borderColor: 'var(--jp-layout-color3)',
  height: '30px',
  width: '65%',
  fontSize: 'var(--jp-ui-font-size1)',
  color: 'var(--jp-ui-font-color0)',
  paddingLeft: '6px',
  backgroundColor: 'var(--jp-layout-color1)',
  backgroundImage: 'var(--jp-icon-search)',
  backgroundSize: '18px',
  backgroundPositionY: '6px',
  backgroundPositionX: '98%',
  backgroundRepeat: 'no-repeat',
  marginTop: '8px',
  outline: 'none',

  $nest: {
    '&:focus': {
      border: 'var(--jp-border-width) solid var(--md-blue-500)',
      boxShadow: 'inset 0 0 4px var(--md-blue-300)'
    },
    '&::placeholder': {
      color: 'var(--jp-ui-font-color2)'
    }
  }
});

export const AdvancedOptionsContainerStyle = style({
  display: 'contents'
});

export const AdvancedOptionsStyle = style({
  display: 'block',
  paddingTop: '5px'
});

export const AdvancedOptionsSmallStyle = style({
  width: '30%'
});

export const AdvancedOptionsRightStyle = style({
  marginTop: '8px'
});

export function AdvancedOptionsLinkStyle(size: UISize) {
  if (size === UISize.Regular) {
    return style({
      color: 'var(--jp-brand-color2)',
      textDecoration: 'none',
      marginRight: '15px',

      $nest: {
        '&:hover': {
          color: 'var(--jp-brand-color1)'
        },
        '&:active': {
          color: 'var(--jp-brand-color0)'
        }
      }
    });
  } else {
    return style({
      color: 'var(--jp-brand-color2)',
      textDecoration: 'none',
      textAlign: 'center',
      display: 'block',

      $nest: {
        '&:hover': {
          color: 'var(--jp-brand-color1)'
        },
        '&:active': {
          color: 'var(--jp-brand-color0)'
        }
      }
    });
  }
}

export const HeaderRowContainerStyle = style({
  paddingRight: '14px'
});

export const HeaderRowStyle = style({
  fontWeight: 'bold',
  fontSize: 'var(--jp-ui-font-size1)',
  backgroundColor: 'var(--jp-layout-color0)',
  width: '100%',
  zIndex: 1,
  display: 'table',
  padding: '10px 0'
});

export const commandIconStyle = style({
  marginRight: '13px'
});

export const altIconStyle = style({
  marginLeft: '14px'
});

export const controlIconStyle = style({
  marginLeft: '8px',
  marginRight: '16px'
});
