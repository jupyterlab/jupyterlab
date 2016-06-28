// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import 'codemirror/mode/meta';
import 'codemirror/keymap/vim.js';
import 'codemirror/theme/material.css';
import 'codemirror/theme/zenburn.css';
import 'codemirror/theme/abcdef.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/hopscotch.css';
import 'codemirror/theme/mbo.css';
import 'codemirror/theme/mdn-like.css';
import 'codemirror/theme/seti.css';
import 'codemirror/theme/the-matrix.css';
import 'codemirror/theme/xq-light.css';
import 'codemirror/addon/edit/matchbrackets.js';


import {
  IKernelId
} from 'jupyter-js-services';

import {
  loadModeByFileName
} from '../codemirror';

import {
  CodeMirrorWidget
} from '../codemirror/widget';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  ABCWidgetFactory, IDocumentModel, IWidgetFactory, IDocumentContext
} from '../docregistry';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  Widget
} from 'phosphor-widget';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-EditorWidget';


/**
 * A document widget for codemirrors.
 */
export
class EditorWidget extends Widget {
  /**
   * Construct a new editor widget.
   */
  constructor(context: IDocumentContext<IDocumentModel>) {
    super();
    this.layout = new PanelLayout();
    this.addClass(EDITOR_CLASS);
    var codeMirror = new CodeMirrorWidget();
    var layout = this.layout as PanelLayout;
    let editor = codeMirror.editor;
    let model = context.model;
    this.createMenu(layout, editor);
    layout.addChild(codeMirror);
    editor.setOption('lineNumbers', true);
    let doc = editor.getDoc();
    doc.setValue(model.toString());
    this.title.text = context.path.split('/').pop();
    loadModeByFileName(editor, context.path);
    model.stateChanged.connect((m, args) => {
      if (args.name === 'dirty') {
        if (args.newValue) {
          this.title.className += ` ${DIRTY_CLASS}`;
        } else {
          this.title.className = this.title.className.replace(DIRTY_CLASS, '');
        }
      }
    });
    context.pathChanged.connect((c, path) => {
      loadModeByFileName(editor, path);
      this.title.text = path.split('/').pop();
    });
    model.contentChanged.connect(() => {
      let old = doc.getValue();
      let text = model.toString();
      if (old !== text) {
        doc.setValue(text);
      }
    });
    CodeMirror.on(doc, 'change', (instance, change) => {
      if (change.origin !== 'setValue') {
        model.fromString(instance.getValue());
      }
    });
  }

  createMenu(layout : PanelLayout, editor : any) {
    var vimMode = false, brackets = false, defaultEditor = true, lineWrap = false, lineNums = true;

    let themeHandler = (item : MenuItem) => {
      editor.setOption('theme', item.text);
    }

    let matchBracketsHandler = (item : MenuItem) => {
      brackets = !brackets;
      editor.setOption('matchBrackets', brackets);
      editor.setOption('closeBrackets', "()[]{}''\"\"``");
    }

    /**
      * Disabled until I can figure out why attempting to input a command in vim mode
      * removes the menu bar :/
      */
    // let vimHandler = (item : MenuItem) => {
    //   vimMode = !vimMode;
    //   defaultEditor = false;
    //   if (vimMode) {
    //     editor.setOption('keyMap', "vim");
    //   }
    //   else {
    //     editor.setOption('keyMap', "default");
    //   }
    // }

    let defaultModeHandler = (item : MenuItem) => {
      defaultEditor = true;
      vimMode = false;
      editor.setOption('keyMap', "default");
    }

    let lineWrapHandler = (item : MenuItem) => {
      lineWrap = !lineWrap;
      editor.setOption('lineWrapping', lineWrap);
    }

    let lineNumHandler = (item : MenuItem) => {
      lineNums = !lineNums;
      editor.setOption('lineNumbers', lineNums);
    }

    let syntaxHandler = (item : MenuItem) => {
      editor.setOption('');
    }

    let menuOne = new Menu([
      new MenuItem({
        text: 'Match Brackets',
        handler: matchBracketsHandler
      }),
      new MenuItem({
        text: 'Line Numbers',
        handler: lineNumHandler
      }),
      new MenuItem({
        text: 'Line Wrapping',
        handler: lineWrapHandler
      }),
      new MenuItem({
        text: 'Syntax Highlighting'
        // handler: syntaxHandler
      })
      ]);

    let menuTwo = this.createThemeMenu(themeHandler);

    let menuThree = new Menu([
      new MenuItem({
        text: 'Default',
        handler: defaultModeHandler,
        shortcut: 'Ctrl+D'
      }),
      new MenuItem({
        text: 'Vim Mode'
        // handler: vimHandler
      }),
      new MenuItem({
        text: 'EMacs Mode'
      })
      ]);

    let menuBar = new MenuBar([
      new MenuItem({
        text: 'Settings',
        submenu: menuOne,
        shortcut: 'Ctrl+S'
      }),
      new MenuItem({
        text: 'Themes',
        submenu: menuTwo,
        shortcut: 'Ctrl+T'
      }),
      new MenuItem({
        text: 'Modes',
        submenu: menuThree,
        shortcut: 'Ctrl+M'
      })
      ])

    layout.addChild(menuBar);
  }

  createThemeMenu(themeHandler : any) : Menu {
    let menu = new Menu([
      new MenuItem({
        text: 'default',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'abcdef',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'base16-dark',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'base16-light',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'hopscotch',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'material',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'mbo',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'mdn-like',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'seti',
        handler: themeHandler
      }),      
      new MenuItem({
        text: 'the-matrix',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'xq-light',
        handler: themeHandler
      }),
      new MenuItem({
        text: 'zenburn',
        handler: themeHandler
      })
      ]);

    return menu;
  }
}


/**
 * A widget factory for editors.
 */
export
class EditorWidgetFactory extends ABCWidgetFactory implements IWidgetFactory<EditorWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernelId): EditorWidget {
    if (kernel) {
      context.changeKernel(kernel);
    }
    return new EditorWidget(context);
  }
}
