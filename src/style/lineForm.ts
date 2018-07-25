import { style } from 'typestyle/lib';

export const hoverItem = style({
    background: '#F2F2F2',
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)'
});

export const lineFormSearch = style({
    padding: '4px 12px',
    backgroundColor: 'var(--jp-layout-color2)',
    borderBottom: '1px solid var(--jp-border-color1)',
    boxShadow: 'var(--jp-toolbar-box-shadow)',
    zIndex: 2
});

export const lineFormCaption = style({
    fontSize: '11px',
    lineHeight: '13px',
    marginTop: '4px'
});

export const lineFormWrapper = style({
    overflow: 'hidden',
    padding: '0px 8px',
    border: '1px solid var(--jp-border-color0)',
    backgroundColor: 'var(--jp-input-active-background)',
    height: '30px',
    $nest: {
        '&::after': {
            content: `' '`,
            color: 'white',
            backgroundColor: 'var(--jp-brand-color1)',
            position: 'absolute',
            top: '4px',
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

export const lineFormWrapperFocusWithin = style({
    border: 'var(--jp-border-width) solid var(--md-blue-500)',
    boxShadow: 'inset 0 0 4px var(--md-blue-300)'
});

export const lineFormInput = style({
    background: 'transparent',
    width: 'calc(100% - 18px)',
    height: '100%',
    float: 'left',
    border: 'none',
    outline: 'none',
    fontSize: 'var(--jp-ui-font-size1)',
    color: 'var(--jp-ui-font-color0)',
    lineHeight: '28px'
});
