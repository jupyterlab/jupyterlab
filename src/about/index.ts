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
    return h.h1('It Works!');
  }
}
