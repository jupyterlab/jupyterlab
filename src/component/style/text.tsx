import { style } from 'typestyle';

export const textitem = style({
    minHeight: 'var(--jp-private-menubar-height)',
    position: 'relative',
    top: '25%',
    display: 'inline-block',
    textAlign: 'center',
    verticalAlign: 'middle',
    lineHeight: 'var(--jp-private-menubar-height)',
    color: '#EEEEEE',
    fontSize: '12px',
    fontFamily:
        '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;',
    $nest: {
        '&:hover': {
            backgroundColor: '#8A8A8A'
        }
    },
    // backgroundPositionY: '5px',
    // paddingTop: '6px',
    alignContent: 'center',
    // marginRight: '4px',
    // marginLeft: '4px'
    paddingRight: '10px',
    paddingLeft: '10px'
});
