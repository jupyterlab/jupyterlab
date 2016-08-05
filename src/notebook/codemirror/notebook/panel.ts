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

import * as widget
from './widget';

export class CodeMirrorRenderer extends NotebookPanel.Renderer {

    createContent(rendermime: RenderMime): Notebook  {
        return new Notebook({
            rendermime,
            renderer: widget.defaultCodeMirrorRenderer
        });
    }

}

export const defaultCodeMirrorRenderer = new CodeMirrorRenderer()