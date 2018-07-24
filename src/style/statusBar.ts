import { style } from 'typestyle/lib';
import vars from './variables';
import { rightToLeft, leftToRight, centeredFlex } from './layout';

export const statusBar = style(
    {
        borderTop:
            'var(--jp-border-width) solid var(--jp-toolbar-border-color)',
        background: vars.backgroundColor,
        minHeight: vars.height,
        justifyContent: 'space-between',
        paddingLeft: vars.statusBarPadding,
        paddingRight: vars.statusBarPadding
    },
    centeredFlex
);

export const side = style(centeredFlex);

export const leftSide = style(leftToRight);

export const rightSide = style(rightToLeft);

export const item = style({
    maxHeight: vars.height,
    marginLeft: vars.itemMargin,
    marginRight: vars.itemMargin
});

const itemPadding = {
    paddingLeft: vars.itemPadding,
    paddingRight: vars.itemPadding
};

export const interactiveHover = style(
    {
        $nest: {
            '&:hover': {
                backgroundColor: vars.hoverColor,
                cursor: 'pointer'
            }
        }
    },
    itemPadding
);

export const nonInteractiveItem = style(itemPadding);
