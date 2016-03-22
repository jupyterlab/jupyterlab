// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as Backbone from 'backbone';

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to an BackboneViewWrapper widget.
 */
const BACKBONEVIEWWRAPPER_CLASS = 'jp-BackboneViewWrapper';


/**
 * A phosphor widget which wraps a `Backbone` view instance.
 */
export
class BackboneViewWrapper extends Widget {
  /**
   * Construct a new `Backbone` wrapper widget.
   *
   * @param view - The `Backbone.View` instance being wrapped.
   */
  constructor(view: Backbone.View<any>) {
    super();
    this.addClass(BACKBONEVIEWWRAPPER_CLASS);
    this._view = view;
    this.node.appendChild(this._view.el);
  }

  private _view: Backbone.View<any>;
}
