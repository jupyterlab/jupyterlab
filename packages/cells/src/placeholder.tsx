/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/


import {
  h, VirtualNode
} from '@phosphor/virtualdom';

import {
  VDomRenderer
} from '@jupyterlab/apputils';


const INPUT_PLACEHOLDER_CLASS = 'jp-InputPlaceholder';

const INPUT_PROMPT_CLASS = 'jp-InputPlaceholder-prompt';

const INPUT_CONTENT_CLASS = 'jp-InputPlaceholder-content';

const OUTPUT_PLACEHOLDER_CLASS = 'jp-OutputPlaceholder';

const OUTPUT_PROMPT_CLASS = 'jp-OutputPlaceholder-prompt';

const OUTPUT_CONTENT_CLASS = 'jp-OutputPlaceholder-content';

export
class InputPlaceholder extends VDomRenderer<null> {

  constructor() {
    super();
    this.addClass(INPUT_PLACEHOLDER_CLASS);
  }

  protected render(): VirtualNode | ReadonlyArray<VirtualNode> {
    return [
        <div className={INPUT_PROMPT_CLASS}>
        </div>,
        <div className={INPUT_CONTENT_CLASS}>
        </div>
    ]
  }

}


export
class OutputPlaceholder extends VDomRenderer<null> {

  constructor() {
    super();
    this.addClass(OUTPUT_PLACEHOLDER_CLASS);
  }

  protected render(): VirtualNode | ReadonlyArray<VirtualNode> {
    return [
        <div className={OUTPUT_PROMPT_CLASS}>
        </div>,
        <div className={OUTPUT_CONTENT_CLASS}>
        </div>
    ]
  }

}