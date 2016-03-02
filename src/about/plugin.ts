// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  Widget
} from 'phosphor-widget';


/**
 * The about page extension.
 */
export
const aboutExtension = {
  id: 'jupyter.extensions.about',
  activate: (app: Application) => {
    let widget = new Widget();
    widget.id = 'about-jupyterlab';
    widget.title.text = 'About';
    widget.title.closable = false;
    widget.node.textContent = 'hello, world';
    app.shell.addToMainArea(widget);
  }
}
