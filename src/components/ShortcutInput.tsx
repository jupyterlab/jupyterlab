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
  takenBy: ShortcutObject,
}

export class ShortcutInput extends React.Component<IShortcutInputProps, IShortcutInputState> {
  state = {
    value: '',
    userInput: '',
    isAvailable: true,
    takenBy: new ShortcutObject(),
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
      'Control',
      'Alt',
      'Accel',
      'Meta',
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
        if (event.ctrlKey && event.key != 'Control') {
          userInput = (userInput + ' Ctrl').trim()
        }
        if (event.metaKey && event.key != 'Meta') {
          userInput = (userInput + ' Accel').trim()
        }
        if (event.altKey && event.key != 'Alt') {
          userInput = (userInput + ' Alt').trim()
        }
        if (event.shiftKey && event.key != 'Shift') {
          userInput = (userInput + ' Shift').trim()
        }
        if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim()
        } else {
          if (event.key === 'Meta') {
            userInput = (userInput + ' Accel').trim()
          } else if (event.key === 'Control') {
            userInput = (userInput + ' Ctrl').trim()
          } else {
            userInput = (userInput + ' ' + event.key).trim()
          }
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
  checkShortcutAvailability = (userInput: string, keys: string[]) : ShortcutObject => {
    let isAvailable = (!Object.keys(this.props.keyBindingsUsed)
                      .includes(userInput + '_' + this.props.shortcut.selector)) 
                      || userInput === ''
    let takenBy = new ShortcutObject()
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

  checkConflict(takenBy: ShortcutObject) : void {
    if(takenBy.id !== '' && takenBy.id !== this.props.shortcut.id) {
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

  handleBlur = (event) => {
    console.log(event.relatedTarget)
    if (event.relatedTarget === null || event.relatedTarget.className.split(' ')[0] !== 'jp-submit') {
      this.props.toggleInput();
      this.setState(
        {
          value: '',
          userInput: ''
        }
      )
      this.props.clearConflicts();
    }
  }

  render() {
    let inputClassName = 'jp-input';
    if (!this.state.isAvailable) {inputClassName += ' jp-input-unavailable'}
    if (this.state.value === '') {inputClassName += ' jp-input-empty'}

    let divClassName = 'jp-input-box'
    if (!this.props.displayInput) {divClassName += ' jp-input-box-hidden'}

    return (
      <div className={divClassName}
        onBlur={(event) => this.handleBlur(event)}
      >
        <input className={inputClassName}
          value={this.state.value} 
          onKeyDown={this.handleInput}
          ref = {(input) => input && input.focus()}
          placeholder = 'press keys'
        >
        </input>
        <button className={this.state.value === '' ? 'jp-submit jp-submit-empty' : 'jp-submit'}
          disabled={!this.state.isAvailable} 
          onClick= {() => {
            this.props.handleUpdate(
              this.props.shortcut, 
              this.keysFromValue(this.state.userInput)
            )
            this.setState(
              {
                value:'', 
              }
            )
            this.props.toggleInput()
          }}
        >
        </button>
      </div>
    )
  }
}
