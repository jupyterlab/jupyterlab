// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

/**
 * Themes are very very important 
 */
import 'codemirror/mode/meta';
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
    this.createMenu(layout);
    layout.addChild(codeMirror);
    editor.setOption('lineNumbers', true);
    editor.setOption('theme', "material");
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
  // onClick() {
  //   let theme_arr = ["zenburn", ""];
  //   let selectedTheme = "zenburn";
  //   this.editor.setOption('theme', selectedTheme);
  // }

  createMenu(layout : PanelLayout) {
    let menuOne = new Menu([
      new MenuItem({
        text: 'Match Brackets'
      }),
      new MenuItem({
        text: 'Line Numbers'
      }),
      new MenuItem({
        text: 'Line Wrapping'
      }),
      new MenuItem({
        text: 'Syntax Highlighting'
      })
      ]);

    let menuTwo = new Menu([
      new MenuItem({
        text: 'abcdef'
      }),
      new MenuItem({
        text: 'base16-dark'
      }),
      new MenuItem({
        text: 'base16-light'
      }),
      new MenuItem({
        text: 'hopscotch'
      }),
      new MenuItem({
        text: 'material'
      }),
      new MenuItem({
        text: 'mbo'
      }),
      new MenuItem({
        text: 'mdn-like'
      }),
      new MenuItem({
        text: 'seti'
      }),      
      new MenuItem({
        text: 'the-matrix'
      }),
      new MenuItem({
        text: 'xq-light'
      }),
      new MenuItem({
        text: 'zenburn'
      })
      ]);

    let menuThree = new Menu([
      new MenuItem({
        text: 'Vim Mode'
      }),
      new MenuItem({
        text: 'EMacs Mode'
      })
      ]);

    let menuBar = new MenuBar([
      new MenuItem({
        text: 'Settings',
        submenu: menuOne,
        shortcut: 'Ctrl-S'
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

  createEditor() {
    let editor = new CodeMirrorWidget().editor;
    return editor;
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
