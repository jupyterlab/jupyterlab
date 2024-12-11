/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

const fs = require('fs');

// Most of the -extension packages are useless as their
// public API is the plugins array. Add them only if they
// export other items.
const packages = [
  'application',
  'apputils',
  'attachments',
  'cells',
  'codeeditor',
  'codemirror',
  'completer',
  'console',
  'coreutils',
  'csvviewer',
  'debugger',
  'docmanager-extension',
  'docmanager',
  'docregistry',
  'documentsearch-extension',
  'documentsearch',
  'extensionmanager',
  'filebrowser',
  'fileeditor-extension',
  'fileeditor',
  'htmlviewer',
  'hub-extension',
  'imageviewer-extension',
  'imageviewer',
  'inspector',
  'javascript-extension',
  'json-extension',
  'launcher',
  'logconsole-extension',
  'logconsole',
  'lsp-extension',
  'mainmenu-extension',
  'mainmenu',
  'markdownviewer',
  'mathjax-extension',
  'nbformat',
  'notebook',
  'observables',
  'outputarea',
  'pdf-extension',
  'property-inspector',
  'rendermime-interfaces',
  'rendermime',
  'running-extension',
  'running',
  'services',
  'settingeditor',
  'settingregistry',
  'statedb',
  'statusbar',
  'terminal',
  'toc',
  'tooltip',
  'translation',
  'ui-components',
  'vega5-extension',
  'workspaces'
];

const entryPoints = packages
  .map(p => `packages/${p}`)
  .filter(function (path) {
    return fs.existsSync(path);
  });

module.exports = {
  entryPoints,
  entryPointStrategy: 'packages',
  includeVersion: false,
  externalSymbolLinkMappings: {
    '@codemirror/language': {
      LanguageSupport:
        'https://codemirror.net/docs/ref/#language.LanguageSupport'
    },
    '@codemirror/state': {
      Extension: 'https://codemirror.net/docs/ref/#state.Extension',
      SelectionRange: 'https://codemirror.net/docs/ref/#state.SelectionRange',
      StateEffect: 'https://codemirror.net/docs/ref/#state.StateEffect'
    },
    '@jupyter/ydoc': {
      createStandaloneCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/functions/createStandaloneCell.html',
      DocumentChange:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/types/DocumentChange.html',
      FileChange:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/types/FileChange.html',
      IMapChange:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/IMapChange.html',
      ISharedAttachmentsCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedAttachmentsCell.html',
      ISharedCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/types/ISharedCell.html',
      ISharedCodeCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedCodeCell.html',
      ISharedDocument:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedDocument.html',
      ISharedFile:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedFile.html',
      ISharedMarkdownCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedMarkdownCell.html',
      ISharedNotebook:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedNotebook-1.html',
      ISharedRawCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedRawCell.html',
      ISharedText:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/ISharedText.html',
      IYText:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/interfaces/IYText.html',
      NotebookChange:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/types/NotebookChange.html',
      SourceChange:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/types/SourceChange.html',
      YCodeCell:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/classes/YCodeCell.html',
      YDocument:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/classes/YDocument-1.html',
      YFile:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/classes/YFile.html',
      YNotebook:
        'https://jupyter-ydoc.readthedocs.io/en/latest/api/classes/YNotebook.html'
    },
    '@lumino/application': {
      Application:
        'https://lumino.readthedocs.io/en/latest/api/classes/application.Application-1.html',
      IPlugin:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/application.IPlugin.html'
    },
    '@lumino/commands': {
      CommandRegistry:
        'https://lumino.readthedocs.io/en/latest/api/classes/commands.CommandRegistry-1.html',
      'CommandRegistry.ICommandOptions':
        'https://lumino.readthedocs.io/en/latest/api/interfaces/commands.CommandRegistry.ICommandOptions.html'
    },
    '@lumino/coreutils': {
      JSONObject:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/coreutils.JSONObject.html',
      JSONValue:
        'https://lumino.readthedocs.io/en/latest/api/types/coreutils.JSONValue.html',
      PartialJSONValue:
        'https://lumino.readthedocs.io/en/latest/api/types/coreutils.PartialJSONValue.html',
      ReadonlyJSONObject:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/coreutils.ReadonlyJSONObject.html',
      ReadonlyPartialJSONObject:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/coreutils.ReadonlyPartialJSONObject.html',
      Token:
        'https://lumino.readthedocs.io/en/latest/api/classes/coreutils.Token.html'
    },
    '@lumino/disposable': {
      IDisposable:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/disposable.IDisposable.html',
      IObservableDisposable:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/disposable.IObservableDisposable.html'
    },
    '@lumino/signaling': {
      ISignal:
        'https://lumino.readthedocs.io/en/latest/api/interfaces/signaling.ISignal.html',
      Signal:
        'https://lumino.readthedocs.io/en/latest/api/classes/signaling.Signal-1.html'
    },
    '@lumino/virtualdom': {
      VirtualElement:
        'https://lumino.readthedocs.io/en/stable/api/modules/virtualdom.VirtualElement.html',
      'VirtualElement.IRenderer':
        'https://lumino.readthedocs.io/en/latest/api/types/virtualdom.VirtualElement.IRenderer.html'
    },
    '@lumino/widgets': {
      ContextMenu:
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.ContextMenu-1.html',
      'ContextMenu.IOptions':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.ContextMenu.IOptions.html',
      DockPanel:
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.DockPanel-1.html',
      'DockPanel.IOptions':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.DockPanel.IOptions.html',
      FocusTracker:
        'https://lumino.readthedocs.io/en/latest/api/classes/widgets.FocusTracker-1.html',
      'FocusTracker.IChangedArgs':
        'https://lumino.readthedocs.io/en/latest/api/interfaces/widgets.FocusTracker.IChangedArgs.html',
      Menu: 'https://lumino.readthedocs.io/en/stable/api/classes/widgets.Menu-1.html',
      'Menu.IItem':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.Menu.IItem.html',
      'Menu.IItemOptions':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.Menu.IItemOptions.html',
      'MenuBar.Renderer':
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.MenuBar.Renderer.html',
      'MenuBar.IRenderData':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.MenuBar.IRenderData.html',
      Panel:
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.Panel-1.html',
      PanelLayout:
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.PanelLayout.html',
      SplitPanel:
        'https://lumino.readthedocs.io/en/latest/api/classes/widgets.SplitPanel-1.html',
      TabBar:
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.TabBar-1.html',
      'TabBar.IOptions':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.TabBar.IOptions.html',
      TabPanel:
        'https://lumino.readthedocs.io/en/stable/api/classes/widgets.TabPanel-1.html',
      'TabPanel.IOptions':
        'https://lumino.readthedocs.io/en/stable/api/interfaces/widgets.TabPanel.IOptions.html',
      Widget:
        'https://lumino.readthedocs.io/en/latest/api/classes/widgets.Widget-1.html'
    },
    '@rjsf/utils': {
      FieldProps:
        'https://rjsf-team.github.io/react-jsonschema-form/docs/advanced-customization/custom-widgets-fields/#field-props'
    },
    yjs: {
      RelativePosition: 'https://docs.yjs.dev/api/relative-positions',
      UndoManager: 'https://docs.yjs.dev/api/undo-manager',
      Text: 'https://docs.yjs.dev/api/shared-types/y.text',
      YText: 'https://docs.yjs.dev/api/shared-types/y.text'
    }
  },
  githubPages: false,
  navigationLinks: {
    GitHub: 'https://github.com/jupyterlab/jupyterlab',
    Jupyter: 'https://jupyter.org'
  },
  name: '@jupyterlab',
  plugin: ['typedoc-plugin-mdn-links'],
  out: 'docs/source/api',
  readme: 'README.md',
  theme: 'default',
  titleLink: 'https://jupyterlab.readthedocs.io/en/latest'
};
