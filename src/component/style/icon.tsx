import { style } from 'typestyle';

export const iconitem = style({
    backgroundRepeat: 'no-repeat',
    backgroundSize: '18px',
    backgroundPositionY: '5px',
    minHeight: 'var(--jp-private-menubar-height)',
    width: '20px',
    display: 'inline-block',
    alignContent: 'center',
    marginRight: '5px',
    marginLeft: '5px',
    $nest: {
        '&:hover': {
            backgroundColor: '#8a8a8a'
        }
    }
});

// split into stand alone and together
