import * as React from 'react';

import { textItem } from '../style/text';

export namespace TextItem {
    export interface IProps {
        source: any;
        title?: string;
    }
}

export class TextItem extends React.Component<TextItem.IProps, {}> {
    render() {
        return (
            <span className={textItem} title={this.props.title}>
                {this.props.source}
            </span>
        );
    }
}
