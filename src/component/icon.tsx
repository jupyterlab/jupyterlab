import * as React from 'react';
import { style } from 'typestyle';

const iconitem = style({
    backgroundRepeat: 'no-repeat',
    backgroundSize: '24px',
    backgroundPositionX: '0px',
    backgroundPositionY: '5px',
    minHeight: '28px',
    minWidth: '35px',
    display: 'inline-block'
});

export interface IProps {
    source: string;
}

export class IconItem extends React.Component<IProps, {}> {
    render() {
        return <div className={this.props.source + ' ' + iconitem} />;
    }
}
