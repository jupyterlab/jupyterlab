import {
  ShortcutObject
} from '../index'

import * as React from 'react'

import '../../style/ShortcutInput.css';

export interface IShortcutInputProps {
  handleUpdate: Function,
  toggleInput: Function,
  shortcut: ShortcutObject,
  toSymbols: Function,
  keyBindingsUsed: Object,
  sortConflict: Function,
  clearConflicts: Function
}

export interface IShortcutInputState {
  value: string,
  userInput: string,
  isAvailable: boolean,
  takenBy: string,
  splits: number[],
}

export class ShortcutInput extends React.Component<IShortcutInputProps, IShortcutInputState> {
  state = {
    value: '',
    userInput: '',
    isAvailable: true,
    takenBy: '',
    splits: [-1],
  }

  /** Get array of keys from user input */
  keysFromValue = (value, splits) => {
    let keys: string[] = new Array<string>()
    let splitsCopy = splits.slice()
    splitsCopy.push(value.length)
    if (splitsCopy.length > 2) {
      for (let i = 0; i < splitsCopy.length; i++) {
        let newKey = value.slice(splitsCopy[i] + 1, splitsCopy[i + 1])
        keys.push(newKey)
      }
      if (keys.includes("")) {
        keys.pop()
      }
    }
    else {
      keys = [value]
    }
    return keys
  }

  /** Parse user input for chained shortcuts */
  parseChaining = (event: any, splits: number[], value: string, userInput: string) : string => {
    event.preventDefault()
    let wordKeys = 
    [
      'Tab', 
      'Shift', 
      'Ctrl',
      'Alt',
      'Accel', 
      'Enter', 
      'ArrowUp', 
      'ArrowDown', 
      'ArrowRight', 
      'ArrowLeft', 
      'Escape'
    ]
    if (event.key === 'Backspace') {
      userInput = ''
      value = ''
      splits = [-1]
      this.setState(
        {
          value: value, 
          userInput: userInput, 
          splits: splits
        } 
      )
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
        } else {
          userInput = (userInput + ' ' + event.key).trim()
        }
      } else {
        if (event.key === 'Control') {
          userInput = (userInput + ' Ctrl').trim()
        } else if (event.key === 'Meta') {
          userInput = (userInput + ' Accel').trim()
        } else if (event.key === 'Shift') {
          userInput = (userInput + ' Shift').trim()
        } else if (event.key === 'Alt') {
          userInput = (userInput + ' Alt').trim()
        } else if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim()
        } else {
          userInput = (userInput + ' ' + event.key).trim()
        }
      }
    }
    return userInput
  }

  /** Check if shortcut being typed is already taken */
  checkShortcutAvailability = (userInput: string, keys: string[]) : string => {
    let isAvailable = !Object.keys(this.props.keyBindingsUsed)
                      .includes(userInput + '_' + this.props.shortcut.selector) 
                      || userInput === ''
    let takenBy = ''
    if (isAvailable) {
      for (let binding of keys) {
        if (Object.keys(this.props.keyBindingsUsed)
            .includes(binding + '_' + this.props.shortcut.selector) 
            && userInput !== '') {
          isAvailable = false
          takenBy = this.props.keyBindingsUsed[
            binding + '_' + this.props.shortcut.selector
          ]
        }
      }
    } else {
      takenBy = this.props.keyBindingsUsed[
        userInput + '_' + this.props.shortcut.selector
      ]
    }
    this.setState({isAvailable: isAvailable})
    return takenBy
  }

  checkConflict(takenBy: ShortcutObject | string) : void {
    if(takenBy instanceof ShortcutObject) {
      this.props.sortConflict(this.props.shortcut, takenBy)
    } else {
      this.props.clearConflicts()
    }
  }

  /** Parse and normalize user input */
  handleInput = (event: any) : void => {
    let splits = this.state.splits
    let value = this.state.value
    let userInput = this.state.userInput

    userInput = this.parseChaining(event, splits, value, userInput)

    value = this.props.toSymbols(userInput)
    let keys = this.keysFromValue(userInput, splits)
    let takenBy = this.checkShortcutAvailability(userInput, keys)
    this.checkConflict(takenBy)

    this.setState(
      {
        value: value, 
        userInput: userInput, 
        splits: splits, 
        takenBy: takenBy,
      }
    )
  }

  render() {
    return (
      <div className='jp-input-box'>
        <input className={this.state.isAvailable 
            ? 'jp-input' 
            : 'jp-input jp-input-unavailable'
          }
          value={this.state.value} 
          onKeyDown={this.handleInput}
          ref = {(input) => input && input.focus()}
        >
        </input>
        {!this.state.isAvailable && 
          <div className='jp-input-warning'>
            Already in use
          </div>
        }
        <button className='jp-submit'
          disabled={!this.state.isAvailable} 
          onClick= {() => {
              this.props.handleUpdate(this.props.shortcut, 
              this.keysFromValue(this.state.userInput, this.state.splits),
            ) 
            this.setState(
              {
                value:'', 
                splits:[-1]
              }
            )
            this.props.toggleInput()
          }}
          >
          Apply
        </button>
      </div>
    )
  }
}
