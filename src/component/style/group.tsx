import { style } from 'typestyle';

export const groupitem = style({
    $nest: {
        '&:hover': {
            backgroundColor: '#8a8a8a'
        }
    },
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center'
});
