import {
  ShortcutObject
} from '../index';

import * as React from 'react';

export interface IShortcutInputProps {
  handleUpdate: Function,
  toggleInput: Function,
  shortcut: ShortcutObject,
  toSymbols: Function,
  keyBindingsUsed: Object;
}

export interface IShortcutInputState {
  value: string,
  userInput: string,
  isAvailable: boolean,
  takenBy: string,
  splits: number[]
}

export class ShortcutInput extends React.Component<IShortcutInputProps, IShortcutInputState> {
  state = {
    value: '',
    userInput: '',
    isAvailable: true,
    takenBy: '',
    splits: [-1]
  }

  keysFromValue = (value, splits) => {
    let keys: string[] = []
    let splits2 = splits.slice()
    splits2.push(value.length)
    if (splits2.length > 2) {
      for (let i = 0; i < splits2.length; i++) {
        let newKey = value.slice(splits2[i]+1, splits2[i+1])
        keys.push(newKey)
      }
      if (keys.includes("")) {
        keys.pop();
      }
    }
    else {
      keys = [value]
    }
    return keys
  }

  /** Parse and normalize user input */
  handleInput = (event: any) : void => {
    let splits = this.state.splits
    let value = this.state.value
    let userInput = this.state.userInput
    event.preventDefault();

    let wordKeys = ['Tab', 'Shift', 'Ctrl', 'Alt', 'Accel', 'Enter', 'ArrowUp','ArrowDown','ArrowRight','ArrowLeft','Escape'];

    /** Check for chaining */
    event.preventDefault()
    if (event.key === 'Backspace') {
      userInput = ''
      value = ''
      splits = [-1]
      this.setState({value: value, userInput: userInput, splits: splits})
    } else {
      let lastKey = (userInput.substr(userInput.lastIndexOf(' ') + 1, userInput.length)).trim()
      if (wordKeys.lastIndexOf(lastKey) === -1 && lastKey != '') {
        splits.push(userInput.length)
        if (event.ctrlKey) {
          userInput = (userInput + ' Ctrl').trim()
        }
        if (event.metaKey) {
          userInput = (userInput + ' Accel').trim()
        }
        if (event.altKey) {
          userInput = (userInput + ' Alt').trim()
        }
        if (event.shiftKey) {
          userInput = (userInput + ' Shift').trim()
        }
        if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim()
        } 
        else {
          userInput = (userInput + ' ' + event.key).trim()
        }
      } else {
        if (event.key === 'Control') {
          userInput = (userInput + ' Ctrl').trim()
        }
        else if (event.key === 'Meta') {
          userInput = (userInput + ' Accel').trim()
        }
        else if (event.key === 'Shift') {
          userInput = (userInput + ' Shift').trim()
        }
        else if (event.key === 'Alt') {
          userInput = (userInput + ' Alt').trim()
        }
        else if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim()
        }
        else {
          userInput = (userInput + ' ' + event.key).trim()
        }
      }
    }
    value = this.props.toSymbols(userInput);
    let keys = this.keysFromValue(userInput, splits);

    /** Check if shortcut being typed is already taken or if there exists a prefix to it */
    let isAvailable = !Object.keys(this.props.keyBindingsUsed).includes(userInput+'_'+this.props.shortcut.selector) || userInput===''
    let takenBy = ''
    if (isAvailable) {
      for (let binding of keys) {
        if (Object.keys(this.props.keyBindingsUsed).includes(binding+'_'+this.props.shortcut.selector) && userInput!=='') {
          isAvailable = false
          takenBy = this.props.keyBindingsUsed[binding+'_'+this.props.shortcut.selector]
        }
      }
    }
    else {
      takenBy = this.props.keyBindingsUsed[userInput+'_'+this.props.shortcut.selector]
    }
    this.setState({value: value, isAvailable: isAvailable, userInput: userInput, splits: splits, takenBy: takenBy})
  }

  render() {
    return (
      <div className='cell'>
          <input className='jp-input'
            value={this.state.value} 
            onKeyDown={this.handleInput}>
          </input>
          {!this.state.isAvailable && 
            <div className='jp-input-warning'>
            Shortcut already in use by {this.state.takenBy}
            </div>
          }
          <button className='jp-submit'
            disabled={!this.state.isAvailable} 
            onClick= {() => {
              this.props.handleUpdate(this.props.shortcut, this.keysFromValue(this.state.userInput, this.state.splits)); 
              this.setState({value:'', splits:[-1]})
              this.props.toggleInput();
              }
            }>
            Submit
          </button>
      </div>
    )
  }
}
