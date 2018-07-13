import * as React from 'react';

import { textitem } from './style/text';

export interface ITextProps {
    source: any;
}

export class TextItem extends React.Component<ITextProps, {}> {
    render() {
        return <div className={textitem}> {this.props.source} </div>;
    }
}
