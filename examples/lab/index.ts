/*-----------------------------------------------------------------------------
| Copyright (c) 2014-2015, PhosphorJS Contributors
|
| Distributed under the terms of the BSD 3-Clause License.
|
| The full license is in the file LICENSE, distributed with this software.
|----------------------------------------------------------------------------*/
'use strict';

import {
  EditorModel, CodeMirrorWidget
} from '../lib/index';


function main(): void {
  var model = new EditorModel();
  var view = new CodeMirrorWidget(model);

  view.attach(document.getElementById('main'));
  model.filename = 'test.js'
  view.update();

  window.onresize = () => view.update();
}

window.onload = main;
