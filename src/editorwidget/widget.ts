// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
from 'codemirror';

import 'codemirror/mode/meta';

import {
  IKernel
} from 'jupyter-js-services';

import {
  loadModeByFileName
} from '../codemirror';

import {
  CodeMirrorWidget
} from '../codemirror/widget';

import {
  ABCWidgetFactory, IDocumentModel, IWidgetFactory, IDocumentContext
} from '../docregistry';

import {
  Menu, MenuBar, MenuItem
} from 'phosphor-menus';

import {
  MainMenu
} from '../mainmenu/plugin';

import {
  tracker
} from './plugin';


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
 class EditorWidget extends CodeMirrorWidget {
  /**
   * Construct a new editor widget.
   */
   constructor(context: IDocumentContext<IDocumentModel>) {
     super();
     this.addClass(EDITOR_CLASS);
     tracker.addWidget(this);
     let editor = this.editor;
     let model = context.model;
     let themeHandler = (item : MenuItem) => {
       editor.setOption('theme', item.text);
     }                                                                                                                                                                       
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

  /**
   * Create a theme menu for the editor widget.
   */
   protected createThemeMenu(themeHandler : (Item : MenuItem) => void) : MenuItem {
     let menu = new MenuItem([
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
 class EditorWidgetFactory extends ABCWidgetFactory<EditorWidget, IDocumentModel> {
  /**
   * Create a new widget given a context.
   */
   createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): EditorWidget {
     if (kernel) {
       context.changeKernel(kernel);
     }
     let widget = new EditorWidget(context);
     this.widgetCreated.emit(widget);
     return widget;
   }
 }
