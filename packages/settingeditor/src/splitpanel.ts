/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  SplitPanel as SPanel
} from '@phosphor/widgets';

import {
  ISignal, Signal
} from '@phosphor/signaling';


/**
 * A deprecated split panel that will be removed when the phosphor split panel
 * supports a handle moved signal. See https://github.com/phosphorjs/phosphor/issues/297.
 */
export
class SplitPanel extends SPanel {
  /**
   * Emits when the split handle has moved.
   */
  readonly handleMoved: ISignal<any, void> = new Signal<any, void>(this);

  handleEvent(event: Event): void {
    super.handleEvent(event);

    if (event.type === 'mouseup') {
      (this.handleMoved as Signal<any, void>).emit(undefined);
    }
  }
}
