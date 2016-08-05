// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    RenderMime
} from '../../rendermime';

import {
    CodeCellModel, RawCellModel
} from '../../notebook/cells/model';

import {
    CodeCellWidget, RawCellWidget
} from '../../notebook/cells/widget';

import {
    defaultCodeCellRenderer, defaultRawCellRenderer
} from '../../notebook/codemirror/notebook/widget';

import {
    ConsoleWidget
} from '../widget';

export class CodeMirrorRenderer extends ConsoleWidget.Renderer {

    createBanner(): RawCellWidget {
        let widget = new RawCellWidget({
            renderer: defaultRawCellRenderer
        });
        widget.model = new RawCellModel();
        return widget;
    }

    createPrompt(rendermime: RenderMime): CodeCellWidget {
        let widget = new CodeCellWidget({
            rendermime,
            renderer: defaultCodeCellRenderer
        });
        widget.model = new CodeCellModel();
        return widget;
    }

}

export const defaultCodeMirrorRenderer = new CodeMirrorRenderer();