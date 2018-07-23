import { style } from 'typestyle';

const text = {
    minHeight: 'var(--jp-private-menubar-height)',
    display: 'inline-block',
    lineHeight: 'var(--jp-private-menubar-height)',
    alignContent: 'center',
    color: '#EEEEEE',
    fontSize: 'var(--jp-ui-font-size1)',
    fontFamily:
        '"HelveticaNeue-Medium", "Helvetica Neue Medium", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;',
    $nest: {
        '&:hover': {
            backgroundColor: '#8A8A8A'
        }
    }
};

const individual = {
    paddingRight: '10px',
    paddingLeft: '10px',
    $nest: {
        '&:hover': {
            backgroundColor: '#8a8a8a'
        }
    }
};

export const individualText = style(individual, text);

export const textitem = style(text);
