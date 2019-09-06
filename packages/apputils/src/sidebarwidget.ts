/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Widget } from '@phosphor/widgets';

export class SideBarWidget extends Widget {
  activateInSidebar(): void {
    let parent: Widget = this.parent;

    while (parent) {
      if ('activateById' in parent) {
        (parent as any).activateById(this.id);
      }
      parent = parent.parent;
    }
  }
}
