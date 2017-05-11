// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILayoutRestorer, InstanceTracker, IStateDB
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  IDocumentRegistry
} from '@jupyterlab/docregistry';

import {
  IEditorTracker, FileEditor, FileEditorFactory
} from '@jupyterlab/fileeditor';

import {
  ILauncher
} from '@jupyterlab/launcher';


/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';

/**
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';


/**
 * The command IDs used by the fileeditor plugin.
 */
namespace CommandIDs {
  export
  const lineNumbers = 'editor:line-numbers';

  export
  const wordWrap = 'editor:word-wrap';

  export
  const createConsole = 'editor:create-console';

  export
  const runCode = 'editor:run-code';
};


/**
 * The editor tracker extension.
 */
const plugin: JupyterLabPlugin<IEditorTracker> = {
  activate,
  id: 'jupyter.services.editor-tracker',
  requires: [IDocumentRegistry, ILayoutRestorer, IEditorServices, IStateDB],
  optional: [ILauncher],
  provides: IEditorTracker,
  autoStart: true
};

/**
 * Export the plugins as default.
 */
export default plugin;


/**
 * Activate the editor tracker plugin.
 */
function activate(app: JupyterLab, registry: IDocumentRegistry, restorer: ILayoutRestorer, editorServices: IEditorServices, state: IStateDB, launcher: ILauncher | null): IEditorTracker {
  const factory = new FileEditorFactory({
    editorServices,
    factoryOptions: {
      name: FACTORY,
      fileExtensions: ['*'],
      defaultFor: ['*']
    }
  });
  const { commands, shell } = app;
  const id = 'editor:settings';
  const tracker = new InstanceTracker<FileEditor>({
    namespace: 'editor',
    shell
  });

  const markdownMarkers: string[] = ["```", "~~~~", "`"]
  const markdownExtensions: string[] = [
    '.markdown',
    '.mdown',
    '.mkdn',
    '.md',
    '.mkd',
    '.mdwn',
    '.mdtxt',
    '.mdtext',
    '.text',
    '.txt',
    '.Rmd'
  ];

  let lineNumbers = true;
  let wordWrap = true;

  // Handle state restoration.
  restorer.restore(tracker, {
    command: 'file-operations:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  // Fetch the initial state of the settings.
  state.fetch(id).then(settings => {
    if (!settings) {
      return;
    }
    if (typeof settings['wordWrap'] === 'string') {
      commands.execute(CommandIDs.wordWrap, settings);
    }
    if (typeof settings['lineNumbers'] === 'string') {
      commands.execute(CommandIDs.lineNumbers, settings);
    }
  });

  /**
   * Save the editor widget settings state.
   */
  function saveState(): Promise<void> {
    return state.save(id, { lineNumbers, wordWrap });
  }

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = EDITOR_ICON_CLASS;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
    widget.editor.lineNumbers = lineNumbers;
    widget.editor.wordWrap = wordWrap;
  });
  registry.addWidgetFactory(factory);

  /**
   * Handle the settings of new widgets.
   */
  tracker.widgetAdded.connect((sender, widget) => {
    let editor = widget.editor;
    editor.lineNumbers = lineNumbers;
    editor.wordWrap = wordWrap;
  });

  /**
   * Toggle editor line numbers
   */
  function toggleLineNums(args: JSONObject): Promise<void> {
    lineNumbers = !lineNumbers;
    tracker.forEach(widget => {
      widget.editor.lineNumbers = lineNumbers;
    });
    return saveState();
  }

  /**
   * Toggle editor line wrap
   */
  function toggleLineWrap(args: JSONObject): Promise<void> {
    wordWrap = !wordWrap;
    tracker.forEach(widget => {
      widget.editor.wordWrap = wordWrap;
    });
    return saveState();
  }

  /**
   * A test for whether the tracker has an active widget.
   */
  function hasWidget(): boolean {
    return tracker.currentWidget !== null;
  }


  class CodeSnippet {
    startLine: number;
    endLine: number;
    code: string;
    constructor(startLine: number) {
      this.startLine = startLine;
      this.code = "";
    }
  }

  function findNextMarker(text: string) {
    for (let marker of markdownMarkers) {
      const index = text.indexOf(marker);
      if (index > -1) {
        return marker;
      }
    }
    return '';
  }
  /**
   * Construct all code snippets from current text
   * (this could be potentially optimized if we can cache and detect differences)
   */
  function findCodeSnippets(): CodeSnippet[] {
    let widget = tracker.currentWidget;
    if (!widget) {
      return [];
    }
    const lines = widget.editor.model.value.text.split("\n");
    const codeSnippets: CodeSnippet[] = [];
    var currentCode = null;
    for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      const marker = findNextMarker(line);
      const lineContainsMarker = marker != '';
      const constructingSnippet = currentCode != null;
      //skip this line if it is not part of any code snippet and doesn't contain a marker
      if (!lineContainsMarker && !constructingSnippet) {
        continue;
      }

      //check if we are already constructing a code snippet
      if (!constructingSnippet) {
        //start constructing
        currentCode = new CodeSnippet(lineIndex);

        //check whether this is a single line code snippet
        const firstIndex = line.indexOf(marker);
        const lastIndex = line.lastIndexOf(marker);
        const isSingleLine = firstIndex != lastIndex
        if (isSingleLine) {
          currentCode.code = line.substring(firstIndex + marker.length, lastIndex);
          currentCode.endLine = lineIndex;
          codeSnippets.push(currentCode);
          currentCode = null;
        } else {
          currentCode.code = line.substring(firstIndex + marker.length);
        } 
      } else {
        //already constructing
        if (lineContainsMarker) {
          currentCode.code += "\n" + line.substring(0, line.indexOf(marker));
          currentCode.endLine = lineIndex;
          codeSnippets.push(currentCode);
          currentCode = null;
        } else {
          currentCode.code += "\n" + line;
        }
      }
    }
    return codeSnippets;
  }

  /** To detect if there is no current selection */
  function hasSelection(): boolean {
    let widget = tracker.currentWidget;
    if (!widget) {
      return false;
    }
    const editor = widget.editor;
    const selection = editor.getSelection();
    if (selection.start.column == selection.end.column &&
      selection.start.line == selection.end.line) {
      return false;
    }
    return true;
  }

  commands.addCommand(CommandIDs.lineNumbers, {
    execute: toggleLineNums,
    isEnabled: hasWidget,
    isToggled: () => { return lineNumbers; },
    label: 'Line Numbers'
  });

  commands.addCommand(CommandIDs.wordWrap, {
    execute: toggleLineWrap,
    isEnabled: hasWidget,
    isToggled: () => { return wordWrap; },
    label: 'Word Wrap'
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
      return commands.execute('console:create', options);
    },
    isEnabled: hasWidget,
    label: 'Create Console for Editor'
  });

  commands.addCommand(CommandIDs.runCode, {
    execute: args => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }

      var code = ""
      const editor = widget.editor;
      const extension = widget.context.path.substring(widget.context.path.lastIndexOf("."));
      if (!hasSelection() && markdownExtensions.indexOf(extension) > -1) {
        var snippets = findCodeSnippets();
        for (let codeSnippet of snippets) {
          if (codeSnippet.startLine <= editor.getSelection().start.line &&
            editor.getSelection().start.line <= codeSnippet.endLine) {
            code = codeSnippet.code;
            break;
          }
        }
      } else {
        // Get the selected code from the editor.
        const selection = editor.getSelection();
        const start = editor.getOffsetAt(selection.start);
        const end = editor.getOffsetAt(selection.end);
        code = editor.model.value.text.substring(start, end);
        if (start == end) {
          code = editor.getLine(selection.start.line); 
        }
      }

      const options: JSONObject = {
        path: widget.context.path,
        code: code,
        activate: false
      };
      // Advance cursor to the next line.
      const cursor = editor.getCursorPosition();
      if (cursor.line + 1 == editor.lineCount) {
        let text = editor.model.value.text;
        editor.model.value.text = text + '\n';
      }
      editor.setCursorPosition({ line: cursor.line + 1, column: cursor.column });

      return commands.execute('console:inject', options);
    },
    isEnabled: hasWidget,
    label: 'Run Code'
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      args: { creatorName: 'Text File' },
      command: 'file-operations:create-from',
      name: 'Text Editor'
    });
  }

  return tracker;
}
