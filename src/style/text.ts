import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';
import { style } from 'typestyle/lib';

export const baseText: NestedCSSProperties = {
    fontSize: vars.fontSize,
    fontFamily:
        '"HelveticaNeue-Medium", "Helvetica Neue Medium", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif'
};

export const textItem = style(baseText, {
    lineHeight: vars.height,
    color: vars.textColor
});
