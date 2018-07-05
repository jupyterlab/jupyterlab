import {
  ShortcutObject
} from '../index'

import {
  ShortcutButton
} from './ShortcutButton'

import {
  ShortcutInput
} from './ShortcutInput'

import * as React from 'react';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: ShortcutObject;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
  showSelectors: boolean;
  keyBindingsUsed: Object;
}
  
/** State for ShortcutItem component */
export interface IShortcutItemState {
  value: string;
  displayInput: boolean;
}

  /** React component for each command shortcut item */
export class ShortcutItem extends React.Component<IShortcutItemProps, IShortcutItemState> {
  constructor(props) {
    super(props);
    this.state = {
      value: '',
      displayInput: false
    }
  }
  
  /** Toggle display state of input area */
  private toggleInput = () : void => {
    this.setState(prevState => ({
      displayInput: !prevState.displayInput,
      value: ''
    }));
  }

  toSymbols = (value: string): string => {
    let display: string[] = []
    let wordKeys = ['Tab', 'Enter', 'ArrowUp','ArrowDown','ArrowRight','ArrowLeft','Escape'];
    for (let key of value.split(' ')) {
      if (key === 'Ctrl') {
        display.push('⌃')
      }
      else if (key === 'Accel') {
        display.push('⌘')
      }
      else if (key === 'Shift') {
        display.push('⇧')
      }
      else if (key === 'Alt') {
        display.push('⌥')
      }
      else if (wordKeys.includes(key)) {
        display.push(key)
      }
      else {
        display.push(key.toUpperCase())
      }
    }
    return display.join(' ')
  }

  render() {
    let first = true
    return (
      <div className='jp-cmditem row'>
        <div className='cell'>
          <div className='jp-shortcutitem-category'>{this.props.shortcut.category}</div>
        </div>
        <div className='cell'>
          <div className='jp-label'>{this.props.shortcut.label}</div>
        </div>
        <div className='cell'>
          {Object.keys(this.props.shortcut.keys).filter(key => this.props.shortcut.keys[key][0] !== '').map((key, index) => 
            <div className="jp-shortcut-div" key={key + '_' + index}>
              <ShortcutButton 
                shortcutKeys={this.props.shortcut.keys[key]} 
                deleteShortcut={this.props.deleteShortcut}
                shortcutObject={this.props.shortcut} 
                shortcutId={key}
                toSymbols={this.toSymbols}
                index={index}
                first={first}
              />
              {(first && Object.keys(this.props.shortcut.keys).filter(key => this.props.shortcut.keys[key][0] !== '').length > 1) ? <p>or</p> : null}
              {first = false}
            </div>
          )}
          {Object.keys(this.props.shortcut.keys).filter(key => this.props.shortcut.keys[key][0] !== '').length < 2 &&
            <span className='jp-input-plus' onClick={this.toggleInput}>+</span>
          }
          {this.state.displayInput && 
            <ShortcutInput handleUpdate={this.props.handleUpdate}
              toggleInput={this.toggleInput}
              shortcut={this.props.shortcut}
              toSymbols={this.toSymbols}
              keyBindingsUsed={this.props.keyBindingsUsed}
            />
          }
        </div>
        <div className='cell'>
          <div className='jp-source'>{this.props.shortcut.source}</div>
          <a className='jp-reset' onClick={() => 
            this.props.resetShortcut(this.props.shortcut.commandName)
          }>
            reset
          </a>
        </div>
        {this.props.showSelectors && 
          <div className='cell'>
            <div className='jp-selector'>{this.props.shortcut.selector}</div>
          </div>
        }
      </div>
    );
  }
}