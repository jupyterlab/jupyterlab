import * as React from 'react';

import { individualIcon } from './style/icon';

export namespace IconItem {
    export interface IProps {
        source: string;
    }
}

export class IconItem extends React.Component<IconItem.IProps, {}> {
    render() {
        return <div className={this.props.source + ' ' + individualIcon} />;
    }
}
