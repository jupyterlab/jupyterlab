import * as React from 'react';

import icon from '../style/icon';
import { classes, style } from 'typestyle/lib';

export namespace IconItem {
    export interface IProps {
        source: string;
    }
}

export class IconItem extends React.Component<IconItem.IProps, {}> {
    render() {
        return (
            <div
                className={classes(
                    this.props.source,
                    style(icon({ x: 0, y: 5 }))
                )}
            />
        );
    }
}
