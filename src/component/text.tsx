import * as React from 'react';

import text from '../style/text';
import { style } from 'typestyle/lib';

export namespace TextItem {
    export interface IProps {
        source: any;
        title?: string;
    }
}

export class TextItem extends React.Component<TextItem.IProps, {}> {
    render() {
        return (
            <span className={style(text)} title={this.props.title}>
                {this.props.source}
            </span>
        );
    }
}
