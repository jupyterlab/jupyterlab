import * as React from 'react';

namespace SharedStyles {
  export const tagInputStyleProperties = {
    padding: '0px',
    paddingBottom: '3px',
    color: 'var(--jp-layout-color4)',
    fontSize: '12px',
    border: 'none',
    outline: 'none',
    resize: 'horizontal',
    maxWidth: '100%',
    backgroundColor: 'var(--jp-layout-color1)',
    maxHeight: '30px'
  } as React.CSSProperties;

  export const tagStyleProperties = {
    boxSizing: 'border-box',
    borderRadius: '20px',
    padding: '10px',
    paddingBottom: '4px',
    paddingTop: '7px',
    margin: '3px',
    width: 'fit-content',
    maxWidth: 'calc(100% - 25px)'
  } as React.CSSProperties;

  export const confirmButtonProperties = {
    borderRadius: '3px',
    backgroundColor: 'var(--jp-layout-color1)',
    border: '1px solid #bdbdbd',
    margin: '5px',
    marginTop: '7px',
    paddingLeft: '7px',
    paddingRight: '7px',
    paddingTop: '4px',
    paddingBottom: '4px',
    fontSize: '12px'
  };

  export const tagOperationsProperties = {
    padding: '5px',
    paddingLeft: '10px',
    fontSize: '13px',
    width: '100%'
  };
}

export default SharedStyles;
