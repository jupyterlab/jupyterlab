import { style } from 'typestyle';

const icon = {
    backgroundRepeat: 'no-repeat',
    backgroundSize: '18px',
    backgroundPositionY: '5px',
    minHeight: 'var(--jp-private-menubar-height)',
    width: '20px',
    display: 'inline-block',
    alignContent: 'center'
};

const individual = {
    marginRight: '5px',
    marginLeft: '5px',
    $nest: {
        '&:hover': {
            backgroundColor: '#8a8a8a'
        }
    }
};
// split into stand alone and together

export const individualIcon = style(icon, individual);

export const iconitem = style(icon);
