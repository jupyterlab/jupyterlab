import vars from './variables';
import { NestedCSSProperties } from 'typestyle/lib/types';
import { style } from 'typestyle/lib';

export const baseText: NestedCSSProperties = {
    fontSize: vars.fontSize,
    fontFamily:
        '"HelveticaNeue-Regular", "Helvetica Neue Regular", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif'
};

export const textItem = style(baseText, {
    lineHeight: vars.height,
    color: vars.textColor
});
