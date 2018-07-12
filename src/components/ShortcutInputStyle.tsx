import {
    style, keyframes
  } from 'typestyle'

export const InputBoxStyle = style(
    {
      display: 'inline-flex',
      paddingTop: '5px'
    }
  )
  
export const InputBoxHiddenStyle = style(
    {
      display: 'hidden'
    }
  )
  
export  const slideAnimation = keyframes(
  {
    from: {
      width: '0%',
      left: '0'
    },
    to: {
      width: '100%',
      left: '0'
    }
  }
)
  
export const InputStyle = style (
  {
    animationDuration: '0.5s',
    animationTimingFunction: 'ease-out',
    animationName: slideAnimation,
    borderWidth: 'var(--jp-border-width)',
    borderColor: 'var(--jp-border-color3)',
    borderStyle: 'solid',
    backgroundColor: 'var(--jp-layout-color0)',
    marginLeft: '10px',
    paddingLeft:'10px',
    width: '120px',
    height: '20px',
    display: 'block',

    $nest: {
      '&:focus': {
        outline: 'none',
        color: 'var(--jp-content-font-color1)'
      },
      '&::placeholder': {
        color: 'var(--jp-content-font-color3)'
      }
    }
  }
)
  
export const InputUnavailableStyle = style (
  {
    borderColor: 'var(--jp-error-color2)'
  }
)
  
export const SubmitStyle = style (
  {
    background: 'var(--jp-brand-color1)',
    borderRadius: '0px',
    color: 'var(--jp-layout-color0)',
    fontFamily: 'var(--jp-ui-font-family)',
    display: 'block',
    height: '24px',
    backgroundImage: 'var( --jp-icon-checkmark)',
    backgroundRepeat: 'no-repeat',
    width: '26px',

    $nest: {
      '&:disabled': {
        background: 'var(--jp-error-color1)',
        border: 'none'
      },
      '&:focus': {
        outline: 'none' 
      }
    }
  }
)
  
export const SubmitEmptyStyle = style (
  {
    background: 'var(--jp-layout-color2)',
    backgroundImage: 'var( --jp-icon-checkmark-disabled)'
  }
)