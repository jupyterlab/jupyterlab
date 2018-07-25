import { style } from 'typestyle/lib';
import variables from './variables';

// export const lineForm = style({
//     fontFamily:
//         '"HelveticaNeue-Medium", "Helvetica Neue Medium", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;',
//     fontSize: '12px',
// });

export const hoverItem = style({
    flexDirection: 'column',
    marginLeft: 'auto',
    marginRight: 'auto',
    background: '#F2F2F2',
    maxWidth: '500px',
    maxHeight: '500px',
    wordWrap: 'break-word',
    borderRadius: `var(--jp-border-radius)`,
    border: '0.25px solid #BDBDBD',
    boxSizing: 'border-box',
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
    fontSize: variables.fontSize,
    color: 'var(--jp-ui-font-color1)'
});

export const lineFormSearch = style({
    padding: '8px',
    backgroundColor: 'var(--jp-layout-color2)',
    borderBottom: '1px solid var(--jp-border-color1)',
    boxShadow: 'var(--jp-toolbar-box-shadow)',
    zIndex: 2
});

export const lineFormWrapper = style({
    overflow: 'overlay',
    border: '1px solid var(--jp-border-color0)',
    backgroundColor: 'var(--jp-input-active-background)',
    height: '30px',
    $nest: {
        '&::after': {
            content: `' '`,
            color: 'white',
            backgroundColor: 'var(--jp-brand-color1)',
            position: 'absolute',
            top: '8px',
            right: '8px',
            height: '32px',
            width: '12px',
            padding: '0px 12px',
            backgroundSize: '20px',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center'
        }
    }
});

export const lineFormInput = style({
    background: 'transparent',
    width: 'calc(100% - 18px)',
    height: 'calc(100% - 8.5px)',
    border: 'none',
    outline: 'none',
    fontSize: 'var(--jp-ui-font-size1)',
    color: 'var(--jp-ui-font-color0)',
    lineHeight: 'var(--jp-private-lineForm-search-height)',
    paddingTop: '5px',
    $nest: {
        '&:focus': {
            border: 'var(--jp-border-width) solid var(--md-blue-500)',
            boxShadow: 'inset 0 0 4px var(--md-blue-300)'
        }
    }
});
