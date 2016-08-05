// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
    CodeCellWidget
} from '../../cells/widget';

import {
    CellEditorWidget
} from './editor';

export const defaultEditorConfiguration: CodeMirror.EditorConfiguration = {
    indentUnit: 4,
    readOnly: false,
    theme: 'default',
    extraKeys: {
        'Cmd-Right': 'goLineRight',
        'End': 'goLineRight',
        'Cmd-Left': 'goLineLeft',
        'Tab': 'indentMore',
        'Shift-Tab': 'indentLess',
        'Cmd-Alt-[': 'indentAuto',
        'Ctrl-Alt-[': 'indentAuto',
        'Cmd-/': 'toggleComment',
        'Ctrl-/': 'toggleComment',
    }
};

export class CodeMirrorRenderer extends CodeCellWidget.Renderer {

    private _editorConfiguration: CodeMirror.EditorConfiguration = defaultEditorConfiguration;
    private _editorInitializer: (editor: CellEditorWidget) => void = editor => {};

    constructor(options: {
        editorConfiguration?: CodeMirror.EditorConfiguration,
        editorInitializer?: (editor: CellEditorWidget) => void
    } = {}) {
        super();
        this._editorConfiguration = options.editorConfiguration || this._editorConfiguration
        this._editorInitializer = options.editorInitializer || this._editorInitializer
    }

    createCellEditor(): CellEditorWidget {
        const widget = new CellEditorWidget(this._editorConfiguration);
        this._editorInitializer(widget);
        return widget;
    }

}

export const defaultCodeMirrorRenderer = new CodeMirrorRenderer();