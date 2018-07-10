import {
  ShortcutObject
} from '../index'

import {
  ShortcutButton
} from './ShortcutButton'

import {
  ShortcutInput
} from './ShortcutInput'

import * as React from 'react'

import '../../style/ShortcutItem.css';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: ShortcutObject,
  handleUpdate: Function,
  resetShortcut: Function,
  deleteShortcut: Function,
  showSelectors: boolean,
  keyBindingsUsed: Object,
  sortConflict: Function,
  clearConflicts: Function
}
  
/** State for ShortcutItem component */
export interface IShortcutItemState {
  value: string,
  displayInput: boolean
}

/** React component for each command shortcut item */
export class ShortcutItem extends React.Component<IShortcutItemProps, IShortcutItemState> {
  constructor(props) {
    super(props)
    this.state = {
      value: '',
      displayInput: false
    }
  }
  
  /** Toggle display state of input box */
  private toggleInput = () : void => {
    this.setState(
      {
        displayInput: !this.state.displayInput,
        value: ''
      }
    )
  }
  
  /** Transform special key names into unicode characters */
  toSymbols = (value: string): string => {
    let display: string[] = new Array<string>()
    let wordKeys = 
      [
        'Tab', 
        'Enter', 
        'ArrowUp', 
        'ArrowDown', 
        'ArrowRight', 
        'ArrowLeft', 
        'Escape'
      ]
    for (let key of value.split(' ')) {
      if (key === 'Ctrl') {
        display.push('⌃')
      } else if (key === 'Accel') {
        display.push('⌘')
      } else if (key === 'Shift') {
        display.push('⇧')
      } else if (key === 'Alt') {
        display.push('⌥')
      } else if (wordKeys.includes(key)) {
        display.push(key)
      } else {
        display.push(key.toUpperCase())
      }
    }
    return display.join(' ')
  }

  render() {
    const hasConflict = this.props.shortcut.hasConflict ? 'conflict-row' : ''
    const isExpanded = this.state.displayInput ? 
      'jp-cmditem row expanded-row' 
      : 'jp-cmditem row'
    return (
      <div 
      className={`${isExpanded} ${hasConflict}`}>
        <div className='cell'>
          <div className='jp-shortcutitem-category'>{this.props.shortcut.category}</div>
        </div>
        <div className='cell'>
          <div className='jp-label'>{this.props.shortcut.label}</div>
        </div>
        <div className='cell'>
          <div className='shortcut-cell-container'>
            {/** Create shortcut boxes and delete buttons for each shortcut */}
            {Object.keys(this.props.shortcut.keys).filter(key => 
              this.props.shortcut.keys[key][0] !== '')
              .map((key, index) => 
                <div className="jp-shortcut-div" key={key + '_' + index}>
                  {this.props.shortcut.keys[key]
                    .map((keyBinding, index) =>  
                      <div className='jp-shortcut-key-container' key={index}>
                        <div className='jp-shortcut-key'>
                          {this.toSymbols(keyBinding)}
                        </div>
                        {index + 1 < this.props.shortcut.keys[key].length ? <div className='comma'>,</div> : null}
                      </div>
                    )
                  }
                  <ShortcutButton 
                    shortcutKeys={this.props.shortcut.keys[key]} 
                    deleteShortcut={this.props.deleteShortcut}
                    shortcutObject={this.props.shortcut} 
                    shortcutId={key}
                    toSymbols={this.toSymbols}
                    index={index}
                  / >
                  {(index === 0 && Object.keys(this.props.shortcut.keys).filter(key => 
                    this.props.shortcut.keys[key][0] !== '')
                    .length > 1) ? <div className='or'>or</div> : null}
                </div>
              )
            }

            {/** Add a plus for adding new shortcuts if there are less than two set */}
            {Object.keys(this.props.shortcut.keys).filter(key => 
              this.props.shortcut.keys[key][0] !== '')
              .length < 2 &&
              <span 
                className='jp-input-plus' 
                onClick={() => {this.toggleInput(), this.props.clearConflicts()}}
              >
                {!this.state.displayInput && '+'}
              </span>
            }

            {/** Display input box when toggled */}
            {this.state.displayInput && 
              <ShortcutInput handleUpdate={this.props.handleUpdate}
                toggleInput={this.toggleInput}
                shortcut={this.props.shortcut}
                toSymbols={this.toSymbols}
                keyBindingsUsed={this.props.keyBindingsUsed}
                sortConflict={this.props.sortConflict}
                clearConflicts={this.props.clearConflicts}
                displayInput={this.state.displayInput}
              />
            }
          </div>
        </div>
        <div className='cell'>
          <div className='jp-source'>{this.props.shortcut.source}</div>
          {this.props.shortcut.source === 'Custom' &&
            <a className='jp-reset' onClick={() => 
              this.props.resetShortcut(this.props.shortcut)
            }>
              reset
            </a>
          }
        </div>
        {this.props.showSelectors && 
          <div className='cell'>
            <div className='jp-selector'>{this.props.shortcut.selector}</div>
          </div>
        }
      </div>
    )
  }
}