import {
  ShortcutObject
} from '../index'

import * as React from 'react'

import {
  style, classes, keyframes
} from 'typestyle'

import '../../style/ShortcutInput.css';

const InputBoxStyle = style(
  {
    display: 'inline-flex'
  }
)

const InputBoxHiddenStyle = style(
  {
    display: 'hidden'
  }
)

const slideAnimation = keyframes(
  {
    from: {
      width: '0%',
      left: '0'
    },
    to: {
      width: '100%',
      left: '0'
    }
  }
)

const InputStyle = style (
  {
    animationDuration: '0.5s',
    animationTimingFunction: 'ease-out',
    animationName: slideAnimation,
    borderWidth: 'var(--jp-border-width)',
    borderColor: 'var(--jp-border-color3)',
    borderStyle: 'solid',
    backgroundColor: 'var(--jp-layout-color0)',
    marginLeft: '10px',
    paddingLeft:'10px',
    width: '120px',
    height: '20px',
    display: 'block',

    $nest: {
      '&:focus': {
        outline: 'none',
        color: 'var(--jp-content-font-color1)'
      },
      '&::placeholder': {
        color: 'var(--jp-content-font-color3)'
      }
    }
  }
)

const InputUnavailableStyle = style (
  {
    borderColor: 'var(--jp-error-color2)'
  }
)

const SubmitStyle = style (
  {
    background: 'var(--jp-brand-color1)',
    borderRadius: '0px',
    color: 'var(--jp-layout-color0)',
    fontFamily: 'var(--jp-ui-font-family)',
    display: 'block',
    height: '24px',
    backgroundImage: 'var( --jp-icon-checkmark)',
    backgroundRepeat: 'no-repeat',
    width: '26px',

    $nest: {
      '&:disabled': {
        background: 'var(--jp-error-color1)',
        border: 'none'
      },
      '&:focus': {
        outline: 'none' 
      }
    }
  }
)

const SubmitEmptyStyle = style (
  {
    background: 'var(--jp-layout-color2)',
    backgroundImage: 'var( --jp-icon-checkmark-disabled)'
  }
)

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
    if (event.relatedTarget === null || event.relatedTarget.id !== 'no-blur') {
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
    let inputClassName = InputStyle;
    if (!this.state.isAvailable) {inputClassName = classes(inputClassName, InputUnavailableStyle)}

    // let divClassName = 'jp-input-box'
    // if (!this.props.displayInput) {divClassName += ' jp-input-box-hidden'}

    return (
      <div className={this.props.displayInput ? InputBoxStyle : InputBoxHiddenStyle}
        onBlur={(event) => this.handleBlur(event)}
      >
        <input className={inputClassName}
          value={this.state.value} 
          onKeyDown={this.handleInput}
          ref = {(input) => input && input.focus()}
          placeholder = 'press keys'
        >
        </input>
        <button 
          className={this.state.value === '' ? 
            classes(SubmitStyle,SubmitEmptyStyle) 
            : SubmitStyle
          }
          id = {this.state.value !== '' ? 'no-blur' : 'blur'}
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
