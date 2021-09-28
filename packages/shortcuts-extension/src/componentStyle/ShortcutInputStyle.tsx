import { keyframes, style } from 'typestyle';

export const InputBoxStyle = style({
  display: 'inline-flex',
  paddingTop: '2px'
});

export const InputBoxNewStyle = style({
  marginLeft: '10px'
});

export const InputBoxHiddenStyle = style({
  display: 'hidden'
});

const slideAnimation = keyframes({
  from: {
    width: '0',
    left: '0'
  },
  to: {
    width: '120px',
    left: '0'
  }
});

export const InputStyle = style({
  animationDuration: '0.5s',
  animationTimingFunction: 'ease-out',
  animationName: slideAnimation,
  borderWidth: 'var(--jp-border-width)',
  borderColor: 'var(--jp-border-color3)',
  borderStyle: 'solid',
  backgroundColor: 'var(--jp-layout-color0)',
  marginLeft: 'auto',
  paddingLeft: '10px',
  width: '120px',
  height: '25px',
  lineHeight: '25px',
  display: 'block',

  $nest: {
    '&:focus': {
      outline: 'none',
      color: 'var(--jp-content-font-color1)',
      borderColor: 'var(--jp-brand-color2)'
    }
  }
});

export const InputUnavailableStyle = style({
  $nest: {
    '&:focus': {
      borderColor: 'var(--jp-error-color2)'
    }
  }
});

export const InputTextStyle = style({
  overflowX: 'hidden',
  overflowY: 'hidden',
  margin: '0',
  marginTop: '4px',
  padding: '0 5px',
  height: '17px',
  lineHeight: '17px',
  width: 'fit-content'
});

export const InputSelectedTextStyle = style({
  backgroundColor: 'var(--jp-brand-color3)',
  overflow: 'hidden'
});

export const InputWaitingStyle = style({
  color: 'var(--jp-content-font-color3)'
});

export const SubmitStyle = style({
  background: 'var(--jp-brand-color1)',
  borderRadius: '0px',
  border: 'none',
  color: 'var(--jp-layout-color0)',
  fontFamily: 'var(--jp-ui-font-family)',
  display: 'block',
  height: '27px',
  backgroundImage: 'var( --jp-icon-checkmark-white )',
  backgroundRepeat: 'no-repeat',
  width: '26px',

  $nest: {
    '&:focus': {
      outline: 'none'
    }
  }
});

export const SubmitNonFunctionalStyle = style({
  backgroundImage: 'var( --jp-icon-checkmark-white )',
  background: 'var(--jp-layout-color3)'
});

export const SubmitConflictStyle = style({
  background: 'var(--jp-error-color1)',
  backgroundImage: 'var(--jp-icon-error-white )',
  backgroundRepeat: 'no-repeat',
  backgroundSize: '20px',
  backgroundPositionX: '2px',
  backgroundPositionY: '2px',
  border: 'none'
});
