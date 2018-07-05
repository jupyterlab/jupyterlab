import * as React from 'react';
import {ShortcutObject} from './ShortcutObject';

export interface IShortcutProps {
    command: ShortcutObject;
    first: boolean;
    index: number;
    deleteShortcut: Function;
    toSymbols: Function;
}

export class Shortcut extends React.Component<IShortcutProps, {}> {
    render() {
        return (
            <button 
                className={this.props.first?"jp-shortcut jp-shortcut-left":"jp-shortcut jp-shortcut-right"} 
                onClick={() => 
                    this.props.deleteShortcut(this.props.command, this.props.index, this.props.command.keys.length)
                }
            >
                {this.props.command.keys[this.props.index]
                    .map(keys => this.props.toSymbols(keys)).join(', ')
                }
            </button>
        )
    }
}