// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module markdownviewer-extension
 */

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ILayoutRestorer } from '@jupyterlab/application';
import { Clipboard, ISanitizer, WidgetTracker } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import { ISearchProviderRegistry } from '@jupyterlab/documentsearch';
import { IEditorTracker } from '@jupyterlab/fileeditor';
import type { MarkdownDocument } from '@jupyterlab/markdownviewer';
import {
  IMarkdownViewerTracker,
  MarkdownViewer,
  MarkdownViewerFactory,
  MarkdownViewerTableOfContentsFactory
} from '@jupyterlab/markdownviewer';
import type { IRenderMime } from '@jupyterlab/rendermime';
import {
  IRenderMimeRegistry,
  markdownRendererFactory
} from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITableOfContentsRegistry } from '@jupyterlab/toc';
import { ITranslator, type TranslationBundle } from '@jupyterlab/translation';
import { linkIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { MarkdownScrollSyncManager } from './scrollsync';

import { markdownViewerSearchProviderFactory } from './searchprovider';

/**
 * The command IDs used by the markdownviewer plugin.
 */
namespace CommandIDs {
  export const markdownPreview = 'markdownviewer:open';
  export const markdownEditor = 'markdownviewer:edit';
  export const trust = 'markdownviewer:trust';
  export const copy = 'markdownviewer:copy';
}

/**
 * The name of the factory that creates markdown viewer widgets.
 */
const FACTORY = 'Markdown Preview';

/**
 * The markdown viewer plugin.
 */
const plugin: JupyterFrontEndPlugin<IMarkdownViewerTracker> = {
  activate,
  id: '@jupyterlab/markdownviewer-extension:plugin',
  description: 'Adds markdown file viewer and provides its tracker.',
  provides: IMarkdownViewerTracker,
  requires: [IRenderMimeRegistry, ITranslator],
  optional: [
    ILayoutRestorer,
    ISettingRegistry,
    ITableOfContentsRegistry,
    ISearchProviderRegistry,
    ISanitizer,
    IEditorTracker
  ],
  autoStart: true
};

/**
 * Activate the markdown viewer plugin.
 */
function activate(
  app: JupyterFrontEnd,
  rendermime: IRenderMimeRegistry,
  translator: ITranslator,
  restorer: ILayoutRestorer | null,
  settingRegistry: ISettingRegistry | null,
  tocRegistry: ITableOfContentsRegistry | null,
  searchRegistry: ISearchProviderRegistry | null,
  sanitizer: IRenderMime.ISanitizer | null,
  editorTracker: IEditorTracker | null
): IMarkdownViewerTracker {
  const trans = translator.load('jupyterlab');
  const { commands, docRegistry } = app;

  // Add the markdown renderer factory.
  rendermime.addFactory(markdownRendererFactory);

  const namespace = 'markdownviewer-widget';
  const tracker = new WidgetTracker<MarkdownDocument>({
    namespace
  });

  // Register the search provider for the rendered markdown.
  if (searchRegistry) {
    searchRegistry.add(
      'jp-markdownViewerSearchProvider',
      markdownViewerSearchProviderFactory
    );
  }

  const scrollSync = editorTracker
    ? new MarkdownScrollSyncManager({
        editorTracker,
        rendermime
      })
    : null;

  let config: Partial<MarkdownViewer.IConfig> = {
    ...MarkdownViewer.defaultConfig
  };

  // The setting only seeds new previews; the toolbar button overrides it per
  // preview.
  let syncScrollingDefault = false;

  /**
   * Update the settings of a widget.
   */
  function updateWidget(widget: MarkdownViewer): void {
    Object.keys(config).forEach((k: keyof MarkdownViewer.IConfig) => {
      widget.setOption(k, config[k] ?? null);
    });
  }

  if (settingRegistry) {
    const updateSettings = (settings: ISettingRegistry.ISettings) => {
      const { syncScrolling, ...viewerConfig } = settings.composite;
      config = viewerConfig as Partial<MarkdownViewer.IConfig>;
      const syncByDefault = syncScrolling === true;
      if (syncByDefault !== syncScrollingDefault) {
        syncScrollingDefault = syncByDefault;
        tracker.forEach(widget => {
          scrollSync?.setEnabled(widget, syncByDefault);
        });
      }
      tracker.forEach(widget => {
        updateWidget(widget.content);
      });
    };

    // Fetch the initial state of the settings.
    settingRegistry
      .load(plugin.id)
      .then((settings: ISettingRegistry.ISettings) => {
        settings.changed.connect(() => {
          updateSettings(settings);
        });
        updateSettings(settings);
      })
      .catch((reason: Error) => {
        console.error(reason.message);
      });
  }

  const toolbarFactory = scrollSync
    ? (widget: MarkdownDocument) => [
        {
          name: 'syncScrolling',
          widget: createSyncScrollingButton(widget, scrollSync, trans)
        }
      ]
    : undefined;

  // Register the MarkdownViewer factory.
  const factory = new MarkdownViewerFactory({
    rendermime,
    name: FACTORY,
    label: trans.__('Markdown Preview'),
    primaryFileType: docRegistry.getFileType('markdown'),
    fileTypes: ['markdown'],
    defaultRendered: ['markdown'],
    toolbarFactory
  });
  factory.widgetCreated.connect((sender, widget) => {
    // Notify the widget tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => {
      void tracker.save(widget);
    });
    // Handle the settings of new widgets.
    updateWidget(widget.content);
    scrollSync?.setEnabled(widget, syncScrollingDefault);
    // Set data-trust-command attribute
    widget.content.node.setAttribute('data-trust-command', CommandIDs.trust);
    void tracker.add(widget);
  });
  docRegistry.addWidgetFactory(factory);

  // Handle state restoration.
  if (restorer) {
    void restorer.restore(tracker, {
      command: 'docmanager:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path
    });
  }

  commands.addCommand(CommandIDs.markdownPreview, {
    label: trans.__('Markdown Preview'),
    execute: args => {
      const path = args['path'];
      if (typeof path !== 'string') {
        return;
      }
      return commands.execute('docmanager:open', {
        path,
        factory: FACTORY,
        options: args['options']
      });
    },
    describedBy: {
      args: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: trans.__('The path to the markdown file to preview')
          },
          options: {
            type: 'object',
            description: trans.__('Options for opening the preview')
          }
        },
        required: ['path']
      }
    }
  });

  commands.addCommand(CommandIDs.markdownEditor, {
    execute: () => {
      const widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      const path = widget.context.path;
      return commands.execute('docmanager:open', {
        path,
        factory: 'Editor',
        options: {
          mode: 'split-right'
        }
      });
    },
    isVisible: () => {
      const widget = tracker.currentWidget;
      return (
        (widget && PathExt.extname(widget.context.path) === '.md') || false
      );
    },
    label: trans.__('Show Markdown Editor'),
    describedBy: {
      args: {
        type: 'object',
        properties: {}
      }
    }
  });

  commands.addCommand(CommandIDs.trust, {
    label: trans.__('Trust Markdown Preview'),
    execute: () => {
      const widget = tracker.currentWidget;
      if (widget) {
        widget.content.node.classList.add('jp-mod-trusted');
        app.commandLinker.markTrusted(widget.content.node);
        return { trusted: true };
      }
      return { trusted: false };
    },
    describedBy: {
      args: {
        type: 'object',
        properties: {}
      }
    }
  });

  commands.addCommand(CommandIDs.copy, {
    label: trans.__('Copy'),
    isEnabled: () => {
      const selection = document.getSelection();
      const widget = tracker.currentWidget;
      return (
        widget !== null &&
        selection !== null &&
        selection.toString().length > 0 &&
        widget.content.node.contains(selection.anchorNode)
      );
    },
    execute: () => {
      const selection = document.getSelection();
      if (selection !== null && selection.toString().length > 0) {
        Clipboard.copyToSystem(selection.toString());
      }
    },
    describedBy: {
      args: {
        type: 'object',
        properties: {}
      }
    }
  });

  if (tocRegistry) {
    tocRegistry.add(
      new MarkdownViewerTableOfContentsFactory(
        tracker,
        rendermime.markdownParser,
        sanitizer ?? rendermime.sanitizer
      )
    );
  }

  return tracker;
}

/**
 * Create a toolbar button toggling scroll synchronization for one preview,
 * without changing the global `syncScrolling` setting.
 */
function createSyncScrollingButton(
  preview: MarkdownDocument,
  scrollSync: MarkdownScrollSyncManager,
  trans: TranslationBundle
): ToolbarButton {
  const button = new ToolbarButton({
    icon: linkIcon,
    className: 'jp-MarkdownViewer-syncButton',
    pressed: scrollSync.isEnabled(preview),
    tooltip: trans.__('Synchronize scrolling with the Markdown editor'),
    pressedTooltip: trans.__(
      'Stop synchronizing scrolling with the Markdown editor'
    ),
    onClick: () => {
      scrollSync.setEnabled(preview, !scrollSync.isEnabled(preview));
    }
  });

  // The setting can toggle the preview too.
  const onEnabledChanged = () => {
    button.pressed = scrollSync.isEnabled(preview);
  };
  scrollSync.enabledChanged.connect(onEnabledChanged);
  button.disposed.connect(() => {
    scrollSync.enabledChanged.disconnect(onEnabledChanged);
  });

  return button;
}

/**
 * Export the plugin as default.
 */
export default plugin;
