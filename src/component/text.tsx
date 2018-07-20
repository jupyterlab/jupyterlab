import * as React from 'react';

import { individualText } from './style/text';

export namespace TextItem {
    export interface IProps {
        source: any;
        title?: string;
    }
}

export class TextItem extends React.Component<TextItem.IProps, {}> {
    render() {
        return (
            <div className={individualText} title={this.props.title}>
                {this.props.source}
            </div>
        );
    }
}
