// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    RenderMime
} from '../../../rendermime';

import {
    Notebook
} from '../../notebook/widget';

import {
    NotebookPanel
} from '../../notebook/panel';

import {
    defaultCodeMirrorNotebookRenderer
} from './widget';

export class CodeMirrorNotebookPanelRenderer extends NotebookPanel.Renderer {

    createContent(rendermime: RenderMime): Notebook  {
        return new Notebook({
            rendermime,
            renderer: defaultCodeMirrorNotebookRenderer
        });
    }

}

export const defaultCodeMirrorNotebookPanelRenderer = new CodeMirrorNotebookPanelRenderer()