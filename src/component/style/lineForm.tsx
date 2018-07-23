import { style } from 'typestyle';

export const lineForm = style({
    fontFamily:
        '"HelveticaNeue-Medium", "Helvetica Neue Medium", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;',
    fontSize: '12px',
    margin: '5px'
});

export const hoverItem = style({
    flexDirection: 'column',
    marginLeft: 'auto',
    marginRight: 'auto',
    background: '#F2F2F2',
    // backgroundColor: '#EEEEEE',
    maxWidth: '500px',
    maxHeight: '500px',
    wordWrap: 'break-word',
    borderRadius: `var(--jp-border-radius)`,
    border: '0.25px solid #BDBDBD',
    boxSizing: 'border-box',
    boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.25)',
    fontSize: 'var(--jp-ui-font-size1)',
    color: 'var(--jp-ui-font-color1)'
});

/*
display: flex;
    flex-direction: column;
    margin-left: auto;
    margin-right: auto;
    background: 'aqua';
    background-color: aliceblue;
    max-width: 500px;
    max-height: 500px;
    box-sizing: border-box;
    box-shadow: var(--jp-elevation-z20);
    word-wrap: break-word;
    border-radius: var(--jp-border-radius);
    /* This is needed so that all font sizing of children done in ems is
     * relative to this base size */
/* font-size: var(--jp-ui-font-size1);
    color: var(--jp-ui-font-color1); */
