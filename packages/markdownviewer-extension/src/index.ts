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
import { ISanitizer, WidgetTracker } from '@jupyterlab/apputils';
import { PathExt } from '@jupyterlab/coreutils';
import type { DocumentRegistry } from '@jupyterlab/docregistry';
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

/**
 * The command IDs used by the markdownviewer plugin.
 */
namespace CommandIDs {
  export const markdownPreview = 'markdownviewer:open';
  export const markdownEditor = 'markdownviewer:edit';
  export const trust = 'markdownviewer:trust';
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

  // Synchronize scrolling between Markdown source editors and their previews.
  // Only available when the file editor tracker is present.
  const scrollSync = editorTracker
    ? new MarkdownScrollSyncManager({
        editorTracker,
        rendermime
      })
    : null;

  let config: Partial<MarkdownViewer.IConfig> = {
    ...MarkdownViewer.defaultConfig
  };

  // Default scroll sync state for newly opened previews.
  let syncScrollingDefault = false;

  /**
   * Update the settings of a widget.
   */
  function updateWidget(widget: MarkdownViewer): void {
    (
      Object.keys(
        MarkdownViewer.defaultConfig
      ) as (keyof MarkdownViewer.IConfig)[]
    ).forEach(k => {
      widget.setOption(k, config[k] ?? null);
    });
  }

  if (settingRegistry) {
    const updateSettings = (settings: ISettingRegistry.ISettings) => {
      config = settings.composite as Partial<MarkdownViewer.IConfig>;
      const syncScrolling = settings.composite['syncScrolling'] === true;
      if (syncScrolling !== syncScrollingDefault) {
        syncScrollingDefault = syncScrolling;
        // Re-apply the new default to every open preview.
        tracker.forEach(widget => {
          scrollSync?.setEnabled(widget, syncScrolling);
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

  // Add a per-preview toolbar button to toggle scroll synchronization.
  let toolbarFactory:
    | ((widget: MarkdownDocument) => DocumentRegistry.IToolbarItem[])
    | undefined;
  if (scrollSync) {
    const manager = scrollSync;
    toolbarFactory = (widget: MarkdownDocument) => [
      {
        name: 'syncScrolling',
        widget: createSyncScrollingButton(widget, manager, trans)
      }
    ];
  }

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
 * Create a toolbar button that toggles scroll synchronization for a single
 * Markdown preview.
 *
 * The button reflects and overrides the preview's synchronization state without
 * changing the global `syncScrolling` setting.
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

  // Keep the button in sync with the preview's state, including changes coming
  // from the settings.
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
