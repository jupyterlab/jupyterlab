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

const PLACEHOLDER_CLASS = 'jp-Placeholder'

const INPUT_PROMPT_CLASS = 'jp-Placeholder-prompt jp-InputPrompt';

const OUTPUT_PROMPT_CLASS = 'jp-Placeholder-prompt jp-OutputPrompt';

const CONTENT_CLASS = 'jp-Placeholder-content';

const INPUT_PLACEHOLDER_CLASS = 'jp-InputPlaceholder';

const OUTPUT_PLACEHOLDER_CLASS = 'jp-OutputPlaceholder';



export
abstract class Placeholder extends VDomRenderer<null> {
  constructor() {
    super();
    this.addClass(PLACEHOLDER_CLASS);
  }

}


export
class InputPlaceholder extends Placeholder {
  constructor() {
    super();
    this.addClass(INPUT_PLACEHOLDER_CLASS);
  }

  protected render(): VirtualNode | ReadonlyArray<VirtualNode> {
    return [
        <div className={INPUT_PROMPT_CLASS}>
        </div>,
        <div className={CONTENT_CLASS}>
          <div className="jp-MoreHorizIcon" />
        </div>
    ]
  }

}


export
class OutputPlaceholder extends Placeholder {

  constructor() {
    super();
    this.addClass(OUTPUT_PLACEHOLDER_CLASS);
  }

  protected render(): VirtualNode | ReadonlyArray<VirtualNode> {
    return [
        <div className={OUTPUT_PROMPT_CLASS}>
        </div>,
        <div className={CONTENT_CLASS}>
          <div className="jp-MoreHorizIcon" />
        </div>
    ]
  }

}