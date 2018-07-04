import {
    ShortcutObject
} from '../index'

import {
    ShortcutButton
} from './ShortcutButton'

import * as React from 'react';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
    shortcut: ShortcutObject;
    handleUpdate: Function;
    resetShortcut: Function;
    deleteShortcut: Function;
    showSelectors: boolean;
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
  
  /** Parse and normalize user input */
  private handleInput = (event: any) : void => {
    if (event.key == 'Backspace'){
      this.setState({value: this.state.value.substr(0, 
        this.state.value.lastIndexOf(' ') + 1)});
    } else if (event.key == 'Control'){
      this.setState({value: this.state.value + ' Ctrl'});
    } else if (event.key == 'Meta'){
      this.setState({value: this.state.value + ' Accel'});
    } else if (event.key == 'Alt' || event.key == 'Shift'  
      || event.key == 'Enter' || event.ctrlKey || event.metaKey) {
      this.setState({value: this.state.value + ' ' + event.key});
    } else {
      this.setState({value: this.state.value + ' '});
    }
  }

  /** Update input box's displayed value */
  private updateInputValue = (event: any) : void => {
    this.setState({
      value: event.target.value
    });
  }

  /** Toggle display state of input area */
  private toggleInput = () : void => {
    this.setState(prevState => ({
      displayInput: !prevState.displayInput,
      value: ''
    }));
  }

  render() {
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
            <ShortcutButton 
              key={key}
              shortcutKeys={this.props.shortcut.keys[key]} 
              deleteShortcut={this.props.deleteShortcut}
              shortcutObject={this.props.shortcut} 
              shortcutId={key}
            />
          )}
          {Object.keys(this.props.shortcut.keys).filter(key => this.props.shortcut.keys[key][0] !== '').length < 2 &&
            <span className='jp-input-plus' onClick={this.toggleInput}>+</span>
          }
          {(this.state.displayInput ? (
            <div className='cell'>
              <input className='jp-input' 
                value={this.state.value} 
                onChange={this.updateInputValue} 
                onKeyDown={this.handleInput}>
              </input>
              <button className='jp-submit' 
                onClick= {() => {
                    this.props.handleUpdate(this.props.shortcut, Object.keys(this.props.shortcut.keys).length, this.state.value); 
                    this.toggleInput();
                  }
                }>
                Submit
              </button>
            </div>
          ) : (
            null
            )
          )}
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