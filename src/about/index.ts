// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  h, VNode
} from 'phosphor/lib/ui/vdom';

import {
  VDomModel, VDomWidget
} from '../common/vdom';

export
class AboutModel extends VDomModel {
  constructor() {
    super();
  }

}

export
class AboutWidget extends VDomWidget<AboutModel> {
  constructor() {
    super();
  }

  protected render(): VNode {

    let mainArea =
    h.div({className: 'section', id: 'about'},
      h.a({id: 'main-area'}),
      h.div({className: 'sectioncenter'},
        h.p({className: 'header content'},
          h.span({className: 'jp-img jp-About-hero-mainarea'}),
          'Main Area'
        ),
        h.span({className: 'jp-img jp-About-mainarea'}),
        h.p({className: 'content-desc'}, 'Hello'),
        h.p({className: 'content-desc'}, 'Hello Again'),
        h.a({href: '#command'},
          h.span({className: 'nav-button'})
        )
      )
    );

    return mainArea;
  }
}
