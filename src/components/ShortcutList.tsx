import {
  ShortcutItem
} from './ShortcutItem'

import {
  ShortcutTitleItem
} from './ShortcutTitleItem'

import * as React from 'react';

import {
  CellStyle, RowStyle
} from './ShortcutItemStyle'

import {
  classes, style
} from 'typestyle'

import '../../style/ShortcutList.css';

export const TableHeaderStyle = style(
  {
    fontWeight: 'bold', //'var(--jp-content-heading-font-weight)',
    fontSize: 'var(--jp-ui-font-size2)'
  }
)

/** Props for ShortcutList component */
export interface IShortcutListProps {
  shortcuts: Object,
  handleUpdate: Function,
  resetShortcut: Function,
  deleteShortcut: Function,
  showSelectors: boolean,
  keyBindingsUsed: Object,
  updateSort: Function,
  currentSort: string,
  sortConflict: Function,
  clearConflicts: Function
}

/** React component for list of shortcuts */
export class ShortcutList extends React.Component<IShortcutListProps, {}> {
  render() {
    return (
      <div className='jp-shortcutlist'>
        <div className={classes(RowStyle, TableHeaderStyle)}>
        <div className={CellStyle}>
          <ShortcutTitleItem 
            title = 'Category'
            updateSort = {this.props.updateSort}
            active = {this.props.currentSort}
          />
        </div>
        <div className={CellStyle}>
          <ShortcutTitleItem 
            title = 'Command'
            updateSort = {this.props.updateSort}
            active = {this.props.currentSort}
          />
        </div>
        <div className={CellStyle}>
          <div className='title-div'>
            Shortcut
          </div>
        </div>
        <div className={CellStyle}>
          <ShortcutTitleItem 
            title = 'Source'
            updateSort = {this.props.updateSort}
            active = {this.props.currentSort}
          />
        </div>
        {this.props.showSelectors && 
          <div className={CellStyle}>
            <ShortcutTitleItem 
              title = 'Selectors'
              updateSort = {this.props.updateSort}
              active = {this.props.currentSort}
            />
          </div>
        }
      </div>
        {Object(this.props.shortcuts).map(shortcut => 
          <ShortcutItem key={shortcut.commandName + "_" + shortcut.selector} 
            resetShortcut={this.props.resetShortcut} 
            shortcut={shortcut} 
            handleUpdate={this.props.handleUpdate}
            deleteShortcut={this.props.deleteShortcut}
            showSelectors={this.props.showSelectors}
            keyBindingsUsed={this.props.keyBindingsUsed}
            sortConflict={this.props.sortConflict}
            clearConflicts={this.props.clearConflicts}
          />
        )}
      </div>
    )
  }
}