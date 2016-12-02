// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '../../../lib/codemirror';

import {
  ConsoleContent
} from '../../../lib/console';

import {
  CodeCellWidget
} from '../../../lib/notebook/cells';


export
function createRenderer(): ConsoleContent.Renderer {
  const factory = new CodeMirrorEditorFactory();
  const bannerRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
  const promptRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => factory.newInlineEditor(host.node, {
      extra: {
        matchBrackets: false,
        autoCloseBrackets: false,
        extraKeys: {
          Enter: function () { /* no-op */ }
        }
      }
    })
  });
  const foreignCellRenderer = promptRenderer;
  const editorMimeTypeService = new CodeMirrorMimeTypeService();
  return new ConsoleContent.Renderer({
    bannerRenderer, promptRenderer, foreignCellRenderer, editorMimeTypeService
  });
}
