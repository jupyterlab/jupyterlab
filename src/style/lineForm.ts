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
