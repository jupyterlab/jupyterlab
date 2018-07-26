import * as React from 'react';

import icon from '../style/icon';
import { classes, style } from 'typestyle/lib';

export namespace IconItem {
    export interface IProps {
        source: string;
    }
}

// tslint:disable-next-line:variable-name
export const IconItem = (
    props: IconItem.IProps & React.HTMLAttributes<HTMLDivElement>
): React.ReactElement<IconItem.IProps> => {
    const { source, className, ...rest } = props;
    return (
        <div
            className={classes(className, source, style(icon({ x: 0, y: 5 })))}
            {...rest}
        />
    );
};
