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
  clearConflicts: Function,
  displayInput: boolean
}

export interface IShortcutInputState {
  value: string,
  userInput: string,
  isAvailable: boolean,
  takenBy: string,
}

export class ShortcutInput extends React.Component<IShortcutInputProps, IShortcutInputState> {
  state = {
    value: '',
    userInput: '',
    isAvailable: true,
    takenBy: '',
  }

  /** Get array of keys from user input */
  keysFromValue = (value) => {
    let keys: string[] = value.split(',')
    return keys
  }

  /** Parse user input for chained shortcuts */
  parseChaining = (event: any, value: string, userInput: string) : string => {
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
      this.setState(
        {
          value: value, 
          userInput: userInput, 
        } 
      )
    } else {
      let lastKey = (userInput.substr(userInput.lastIndexOf(' ') + 1, userInput.length)).trim()
      if (wordKeys.lastIndexOf(lastKey) === -1 && lastKey != '') {
        userInput = (userInput + ',');
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
    let value = this.state.value
    let userInput = this.state.userInput

    userInput = this.parseChaining(event, value, userInput)

    value = this.props.toSymbols(userInput)
    let keys = this.keysFromValue(userInput)
    let takenBy = this.checkShortcutAvailability(userInput, keys)
    this.checkConflict(takenBy)

    this.setState(
      {
        value: value, 
        userInput: userInput, 
        takenBy: takenBy,
      }
    )
  }

  Blur = (event) => {
    if (event.relatedTarget === null || event.relatedTarget.className !== 'jp-submit') {
      this.props.toggleInput();
    }
  }

  render() {
    let className = 'jp-input';
    if (!this.state.isAvailable) {className += ' jp-input-unavailable'}
    if (!this.props.displayInput) {className += ' jp-input-hidden'}

    return (
      <div className={this.props.displayInput ? 'jp-input-box' : 'jp-input-box jp-input-box-hidden'}
        onBlur={(event) => this.Blur(event)}
      >
        <input className={className}
          value={this.state.value} 
          onKeyDown={this.handleInput}
          ref = {(input) => input && input.focus()}
          placeholder = 'press keys'
        >
        </input>
        {/* {!this.state.isAvailable && 
          <div className='jp-input-warning'>
          Already in use
          </div>
        } */}
        <button className='jp-submit'
          disabled={!this.state.isAvailable} 
          onClick= {() => {
            this.props.handleUpdate(this.props.shortcut, 
              this.keysFromValue(this.state.userInput)
            ) 
            this.setState(
              {
                value:'', 
              }
            )
            this.props.toggleInput()
          }}
          data-tooltip= 'test'
        >
        </button>
      </div>
    )
  }
}
