// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as React from 'react';
import { OptionsManager } from './options_manager';
import { numberingIcon } from '@jupyterlab/ui-components';
import { TranslationBundle } from '@jupyterlab/translation';

/**
 * Interface describing toolbar properties.
 *
 * @private
 */
interface IProperties {}

/**
 * Interface describing toolbar state.
 *
 * @private
 */
interface IState {
  /**
   * Boolean indicating whether numbering is enabled.
   */
  numbering: boolean;
}

/**
 * Returns a component for rendering a Markdown table of contents toolbar.
 *
 * @private
 * @param options - generator options
 * @returns toolbar component
 */
function toolbar(options: OptionsManager) {
  return class Toolbar extends React.Component<IProperties, IState> {
    /**
     * Returns a component for rendering a Markdown table of contents toolbar.
     *
     * @param props - toolbar properties
     * @returns toolbar component
     */
    constructor(props: IProperties) {
      super(props);
      this.state = { numbering: false };
      options.initializeOptions(false);
      this._trans = options.translator.load('jupyterlab');
    }

    /**
     * Renders a toolbar.
     *
     * @returns rendered toolbar
     */
    render() {
      const toggleNumbering = () => {
        options.numbering = !options.numbering;
        this.setState({ numbering: options.numbering });
      };
      const icon = (
        <div
          onClick={event => toggleNumbering()}
          role="text"
          aria-label={this._trans.__('Toggle Auto-Numbering')}
          title={this._trans.__('Toggle Auto-Numbering')}
          className={
            this.state.numbering
              ? 'toc-toolbar-icon-selected'
              : 'toc-toolbar-icon'
          }
        >
          <numberingIcon.react />
        </div>
      );
      return (
        <div>
          <div className={'toc-toolbar'}>{icon}</div>
        </div>
      );
    }

    _trans: TranslationBundle;
  };
}

/**
 * Exports.
 */
export { toolbar };
