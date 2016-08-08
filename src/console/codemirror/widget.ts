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
    defaultCodeMirrorCodeCellRenderer, defaultCodeMirrorRawCellRenderer
} from '../../notebook/codemirror/notebook/widget';

import {
    ConsoleWidget
} from '../widget';

export class CodeMirrorConsoleRenderer extends ConsoleWidget.Renderer {

    createBanner(): RawCellWidget {
        let widget = new RawCellWidget({
            renderer: defaultCodeMirrorRawCellRenderer
        });
        widget.model = new RawCellModel();
        return widget;
    }

    createPrompt(rendermime: RenderMime): CodeCellWidget {
        let widget = new CodeCellWidget({
            rendermime,
            renderer: defaultCodeMirrorCodeCellRenderer
        });
        widget.model = new CodeCellModel();
        return widget;
    }

}

export const defaultCodeMirrorConsoleRenderer = new CodeMirrorConsoleRenderer();