// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CompletableEditorWidget
} from '../../../../lib/notebook/completion/editor';

export
function expectCompletableEditorWidget(widget:Widget|CompletableEditorWidget, callback:(widget:CompletableEditorWidget)=>void) {
  if (CompletableEditorWidget.is(widget)) {
    callback(widget);
  } else {
    expect().fail('Expected an widget of CompletableEditorWidget type, but: ' + widget);      
  }
}
