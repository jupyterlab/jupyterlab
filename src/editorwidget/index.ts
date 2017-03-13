// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/application';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  AttachedProperty
} from '@phosphor/properties';

import {
  IInstanceTracker
} from '../apputils';

import {
  CommandIDs as ConsoleCommandIDs
} from '../console';

import {
  EditorWidget
} from './widget';

export * from './widget';


/**
 * The command IDs used by the editor plugin.
 */
export
namespace CommandIDs {
  export
  const lineNumbers: string = 'editor:line-numbers';

  export
  const lineWrap: string = 'editor:line-wrap';

  export
  const createConsole: string = 'editor:create-console';

  export
  const runCode: string = 'editor:run-code';
};


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

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: args => { toggleLineNums(args); },
    label: 'Toggle Line Numbers'
  });

  commands.addCommand(CommandIDs.lineWrap, {
    execute: args => { toggleLineWrap(args); },
    label: 'Toggle Line Wrap'
  });

  commands.addCommand(CommandIDs.createConsole, {
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
      return commands.execute(ConsoleCommandIDs.create, options)
        .then(id => { sessionIdProperty.set(widget, id); });
    },
    label: 'Create Console for Editor'
  });

  commands.addCommand(CommandIDs.runCode, {
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
      return commands.execute(ConsoleCommandIDs.inject, options);
    },
    label: 'Run Code'
  });
}
