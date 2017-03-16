// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JSONObject, Token
} from '@phosphor/coreutils';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  EditorWidget
} from './widget';

export * from './widget';


/**
 * A class that tracks editor widgets.
 */
export
interface IEditorTracker extends IInstanceTracker<EditorWidget> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const IEditorTracker = new Token<IEditorTracker>('jupyter.services.editor-tracker');
/* tslint:enable */


/**
 * Add the default commands for the editor.
 */
export
function addDefaultCommands(tracker: IEditorTracker, commands: CommandRegistry) {
  /**
   * Toggle editor line numbers
   */
  function toggleLineNums(args: JSONObject) {
    let widget = tracker.currentWidget;
    if (!widget) {
      return;
    }
    widget.editor.lineNumbers = !widget.editor.lineNumbers;
    if (args['activate'] !== false) {
      widget.activate();
    }
  }

  /**
   * Toggle editor line wrap
   */
  function toggleLineWrap(args: JSONObject) {
    let widget = tracker.currentWidget;
    if (!widget) {
      return;
    }
    widget.editor.wordWrap = !widget.editor.wordWrap;
    if (args['activate'] !== false) {
      widget.activate();
    }
  }

  /**
   * An attached property for the session id associated with an editor widget.
   */
  const sessionIdProperty = new AttachedProperty<EditorWidget, string>({
    name: 'sessionId',
    create: () => ''
  });

  commands.addCommand('editor:line-numbers', {
    execute: args => { toggleLineNums(args); },
    label: 'Toggle Line Numbers'
  });

  commands.addCommand('editor:line-wrap', {
    execute: args => { toggleLineWrap(args); },
    label: 'Toggle Line Wrap'
  });

  commands.addCommand('editor:create-console', {
    execute: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let options: JSONObject = {
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage,
        activate: args['activate']
      };
      return commands.execute('console:create', options)
        .then(id => { sessionIdProperty.set(widget, id); });
    },
    label: 'Create Console for Editor'
  });

  commands.addCommand('editor:run-code', {
    execute: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      // Get the session id.
      let id = sessionIdProperty.get(widget);
      if (!id) {
        return;
      }
      // Get the selected code from the editor.
      const editor = widget.editor;
      const selection = editor.getSelection();
      const start = editor.getOffsetAt(selection.start);
      const end = editor.getOffsetAt(selection.end);
      const options: JSONObject = {
        id,
        code: editor.model.value.text.substring(start, end),
        activate: args['activate']
      };
      return commands.execute('console:inject', options);
    },
    label: 'Run Code'
  });
}
