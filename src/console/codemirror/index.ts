// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ConsoleContent
} from '../content';

import {
  IEditorServices
} from '../../codeeditor';

import {
  CodeMirrorEditorFactory, CodeMirrorMimeTypeService
} from '../../codemirror';

import {
  CodeCellWidget
} from '../../notebook/cells';


/**
 * Create a console renderer given editor services.
 */
export
function createRenderer(editorServices?: IEditorServices): ConsoleContent.IRenderer {
  editorServices = editorServices || {
    factory: new CodeMirrorEditorFactory(),
    mimeTypeService: new CodeMirrorMimeTypeService()
  };
  const bannerRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
      wordWrap: true
    })
  });
  const promptRenderer = new CodeCellWidget.Renderer({
    editorFactory: host => editorServices.factory.newInlineEditor(host.node, {
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
  const editorMimeTypeService = editorServices.mimeTypeService;
  return new ConsoleContent.Renderer({
    bannerRenderer, promptRenderer, foreignCellRenderer, editorMimeTypeService
  });
}
