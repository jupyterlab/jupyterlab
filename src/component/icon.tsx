import * as React from 'react';

import { iconitem } from './style/icon';

export interface IIconProps {
    source: string;
}

export class IconItem extends React.Component<IIconProps, {}> {
    render() {
        return <div className={this.props.source + ' ' + iconitem} />;
    }
}
