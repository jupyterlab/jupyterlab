/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Widget
} from '@phosphor/widgets';


/**
 * The spinner class.
 */
export
class Spinner extends Widget {
  /**
   * Construct a spinner widget.
   */
  constructor () {
    super();
    this.addClass('jp-Spinner');
    let content = document.createElement('div');
    content.className = 'jp-SpinnerContent';
    this.node.appendChild(content);
  }
}
