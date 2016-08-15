// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EditorWidget
} from '../editorwidget/widget'

import {
  StandaloneEditorDecorator
} from '../editorwidget/standalone/widget'

import {
  StandaloneEditorPresenter
} from '../editorwidget/standalone/presenter'

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  CodeMirroStandaloneEditorWidget
} from './standalone/widget';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  IKernel
} from 'jupyter-js-services';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import {
  DEFAULT_CODEMIRROR_THEME
} from './widget';

/**
 * The map of command ids used by the code mirror editor.
 */
const COMMANDS = {
  lineNumbers: 'codeMirrorEditor:line-numbers',
  lineWrap: 'codeMirrorEditor:line-wrap',
  matchBrackets: 'codeMirrorEditor:match-brackets',
  vimMode: 'codeMirrorEditor:vim-mode',
  defaultMode: 'codeMirrorEditor:default-mode',
  changeTheme: 'codeMirrorEditor:change-theme'
}

export
class CodeMirrorEditorWidgetFactory extends EditorWidget.Factory {

  tracker = new FocusTracker<CodeMirroStandaloneEditorWidget>()

  constructor(private _app: JupyterLab, private _pallete: ICommandPalette) {
    super();
  }

  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    this._app = null;
    this._pallete = null;
    this.tracker.dispose();
    this.tracker = null;
  }

  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): EditorWidget {
    if (kernel) {
      context.changeKernel(kernel);
    }
    const widget = new CodeMirroStandaloneEditorWidget({
      extraKeys: {
        'Tab': 'indentMore',
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: true,
      lineWrapping: true,
    });
    const decorator = new StandaloneEditorDecorator(widget);
    widget.presenter = new StandaloneEditorPresenter(decorator);
    widget.presenter.context = context;
    
    this.widgetCreated.emit(widget);
    this.tracker.add(widget);
    return widget;
  }

  registerMenuItems(menu: Menu) {
    const { commands, keymap } = this._app;

    const settings = new Menu({ commands, keymap });
    settings.title.label = 'Settings';
    settings.addItem({ command: COMMANDS.lineNumbers });
    settings.addItem({ command: COMMANDS.lineWrap });
    settings.addItem({ command: COMMANDS.matchBrackets });
    settings.addItem({ command: COMMANDS.defaultMode });
    settings.addItem({ command: COMMANDS.vimMode });

    const theme = new Menu({ commands, keymap });
    theme.title.label = 'Theme';
    [
      'default', 'abcdef', 'base16-dark', 'base16-light', 'hopscotch',
      'material', 'mbo', 'mdn-like', 'seti', 'the-matrix', 'default',
      'xq-light', 'zenburn'
    ].forEach(name => theme.addItem({
      command: 'editor:change-theme',
      args: { theme: name }
    }));

    menu.addItem({ type: 'submenu', menu: settings });
    menu.addItem({ type: 'submenu', menu: theme });
  }

  registerCommands(category?: string) {
    this.registerCommand({
      id: COMMANDS.lineNumbers,
      execute: () => { this.toggleLineNums(); },
      label: 'Toggle Line Numbers',
      category
    })
    this.registerCommand({
      id: COMMANDS.lineWrap,
      execute: () => { this.toggleLineWrap(); },
      label: 'Toggle Line Numbers',
      category
    })
    this.registerCommand({
      id: COMMANDS.matchBrackets,
      execute: () => { this.toggleMatchBrackets(); },
      label: 'Toggle Match Brackets',
      category
    })
    this.registerCommand({
      id: COMMANDS.defaultMode,
      execute: () => { this.toggleDefault(); },
      label: 'Vim Mode Off',
      category
    })
    this.registerCommand({
      id: COMMANDS.vimMode,
      execute: () => { this.toggleDefault(); },
      label: 'Vim Mode',
      category
    })

    this._app.commands.addCommand(COMMANDS.changeTheme, {
      label: args => {
        return args['theme'] as string;
      },
      execute: args => {
        const name: string = args['theme'] as string || 'default';
        each(this.tracker.widgets, widget => {
          widget.editor.setOption('theme', name);
        });
      }
    });
  }

  protected registerCommand(options: {
    id: string,
    execute: () => void
    label: string
    category?: string
  }) {
    this._app.commands.addCommand(options.id, {
      execute: options.execute,
      label: options.label,
    });
    this._pallete.addItem({
      command: options.id,
      category: options.category
    })
  }

  /**
   * Toggle editor line numbers
   */
  toggleLineNums() {
    const widget = this.tracker.currentWidget;
    if (widget) {
      const editor = widget.editor;
      editor.setOption('lineNumbers', !editor.getOption('lineNumbers'));
    }
  }

  /**
   * Toggle editor line wrap
   */
  toggleLineWrap() {
    const widget = this.tracker.currentWidget;
    if (widget) {
      const editor = widget.editor;
      editor.setOption('lineWrapping', !editor.getOption('lineWrapping'));
    }
  }

  /**
   * Toggle editor matching brackets
   */
  toggleMatchBrackets() {
    const widget = this.tracker.currentWidget;
    if (widget) {
      const editor = widget.editor;
      editor.setOption('matchBrackets', !editor.getOption('matchBrackets'));
    }
  }

  /**
   * Turns on the editor's vim mode
   */
  toggleVim() {
    each(this.tracker.widgets, widget => {
      widget.editor.setOption('keyMap', 'vim');
    });
  }

  /**
   * Sets the editor to default editing mode
   */
  toggleDefault() {
    each(this.tracker.widgets, widget => {
      widget.editor.setOption('keyMap', 'default');
    });
  }
}