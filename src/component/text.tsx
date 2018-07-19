import * as React from 'react';

import { individualText } from './style/text';

export namespace TextItem {
    export interface IProps {
        source: any;
    }
}

export class TextItem extends React.Component<TextItem.IProps, {}> {
    render() {
        return <div className={individualText}> {this.props.source} </div>;
    }
}
