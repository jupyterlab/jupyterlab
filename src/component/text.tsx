import * as React from 'react';

import { textitem } from './style/text';

export namespace TextItem {
    export interface IProps {
        source: any;
    }
}

export class TextItem extends React.Component<TextItem.IProps, {}> {
    render() {
        return <div className={textitem}> {this.props.source} </div>;
    }
}
