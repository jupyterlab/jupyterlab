/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module audio-extension
 */

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { WidgetTracker } from '@jupyterlab/apputils';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import {
  Contents,
  IDefaultDrive,
  RestContentProvider
} from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import { Widget } from '@lumino/widgets';

/**
 * The class name added to an audio viewer.
 */
const AUDIO_CLASS = 'jp-AudioViewer';

/**
 * The name of the factory that creates audio widgets.
 */
const FACTORY_AUDIO = 'AudioViewer';

/**
 * Content provider ID for audio streaming
 */
const AUDIO_CONTENT_PROVIDER_ID = 'audio-provider';

/**
 * Get audio file types from the document registry
 */
function getAudioFileTypes(docRegistry: DocumentRegistry): string[] {
  const audioFileTypes: string[] = [];

  // Iterate through all registered file types
  for (const fileType of docRegistry.fileTypes()) {
    // Check if it's an audio file type by checking the MIME types
    if (fileType.mimeTypes.some(mimeType => mimeType.startsWith('audio/'))) {
      audioFileTypes.push(fileType.name);
    }
  }

  return audioFileTypes;
}

/**
 * An audio viewer widget.
 */
export class AudioViewer extends Widget {
  /**
   * Construct a new audio viewer widget.
   */
  constructor(options: AudioViewer.IOptions) {
    super();
    this.addClass(AUDIO_CLASS);
    this._context = options.context;
    this._contentsManager = options.contentsManager;

    // Create the audio element
    this._audio = document.createElement('audio');
    this._audio.controls = true;

    this.node.appendChild(this._audio);

    // Load audio when context is ready
    void this._context.ready.then(() => {
      void this._updateAudio();
    });

    // Listen for context model changes
    this._context.model.contentChanged.connect(this._updateAudio, this);
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
  }

  /**
   * Handle `resize` messages for the widget.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    if (this._audio) {
      this._audio.style.width = '100%';
    }
  }

  /**
   * Update the audio source.
   */
  private async _updateAudio(): Promise<void> {
    // Use getDownloadUrl for proper URL encoding and security tokens
    const audioUrl = await this._contentsManager.getDownloadUrl(
      this._context.path
    );
    this._audio.src = audioUrl;
  }

  private _context: DocumentRegistry.Context;
  private _audio: HTMLAudioElement;
  private _contentsManager: Contents.IManager;
}

/**
 * The namespace for AudioViewer class statics.
 */
export namespace AudioViewer {
  /**
   * The options used to create an audio viewer widget.
   */
  export interface IOptions {
    /**
     * The document context for the audio being rendered by the widget.
     */
    context: DocumentRegistry.Context;

    /**
     * The contents manager.
     */
    contentsManager: Contents.IManager;
  }
}

/**
 * A document widget for audio.
 */
export class AudioDocumentWidget extends DocumentWidget<AudioViewer> {
  constructor(options: AudioDocumentWidget.IOptions) {
    super(options);
  }
}

/**
 * The namespace for AudioDocumentWidget class statics.
 */
export namespace AudioDocumentWidget {
  /**
   * The options used to create an audio document widget.
   */
  export interface IOptions extends DocumentWidget.IOptions<AudioViewer> {}
}

/**
 * A widget factory for audio viewers.
 */
export class AudioViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<AudioViewer>
> {
  /**
   * Construct a new audio viewer factory.
   */
  constructor(options: AudioViewerFactory.IOptions) {
    super(options);
    this._contentsManager = options.contentsManager;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<AudioViewer> {
    const content = new AudioViewer({
      context,
      contentsManager: this._contentsManager
    });
    const widget = new AudioDocumentWidget({
      content,
      context
    });
    return widget;
  }

  private _contentsManager: Contents.IManager;
}

/**
 * The namespace for AudioViewerFactory class statics.
 */
export namespace AudioViewerFactory {
  /**
   * The options used to create an audio viewer factory.
   */
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * The contents manager.
     */
    contentsManager: Contents.IManager;
  }
}

/**
 * A content provider for audio files.
 *
 * This overrides the default behavior of the RestContentProvider to not include the file content.
 */
class AudioContentProvider extends RestContentProvider {
  constructor(options: RestContentProvider.IOptions) {
    super(options);
  }

  /**
   * Get a file or directory.
   *
   * @param localPath - The path to the file.
   * @param options - The options used to fetch the file.
   *
   * @returns A promise which resolves with the file content.
   */
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    return super.get(localPath, { ...options, content: false });
  }
}

/**
 * The audio extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/audio-extension:plugin',
  description: 'Adds a viewer for audio files',
  autoStart: true,
  requires: [ITranslator, IDefaultDrive],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    defaultDrive: Contents.IDrive,
    restorer: ILayoutRestorer | null
  ): void => {
    const trans = translator.load('jupyterlab');

    const { contents, serverSettings } = app.serviceManager;

    // Get audio file types from the document registry
    const audioFileTypes = getAudioFileTypes(app.docRegistry);

    // Register the audio stream content provider once
    const registry = defaultDrive.contentProviderRegistry;
    if (registry) {
      const audioContentProvider = new AudioContentProvider({
        apiEndpoint: '/api/contents',
        serverSettings
      });
      registry.register(AUDIO_CONTENT_PROVIDER_ID, audioContentProvider);
    }

    // Create tracker for all audio widgets
    const tracker = new WidgetTracker<IDocumentWidget<AudioViewer>>({
      namespace: 'audioviewer'
    });

    // Create single factory for all audio types
    const factory = new AudioViewerFactory({
      name: FACTORY_AUDIO,
      label: trans.__('Audio Viewer'),
      fileTypes: audioFileTypes,
      defaultFor: audioFileTypes,
      readOnly: true,
      translator,
      modelName: 'base64',
      contentProviderId: AUDIO_CONTENT_PROVIDER_ID,
      contentsManager: contents
    });

    app.docRegistry.addWidgetFactory(factory);

    factory.widgetCreated.connect(async (sender, widget) => {
      // Track the widget
      void tracker.add(widget);

      // Notify the widget tracker if restore data needs to update
      widget.context.pathChanged.connect(() => {
        void tracker.save(widget);
      });

      // Set appropriate icon based on file type from document registry
      const fileTypes = app.docRegistry.getFileTypesForPath(
        widget.context.path
      );
      const audioFileType = fileTypes.find(ft =>
        ft.mimeTypes.some(mimeType => mimeType.startsWith('audio/'))
      );

      if (audioFileType) {
        widget.title.icon = audioFileType.icon;
        widget.title.iconClass = audioFileType.iconClass || '';
        widget.title.iconLabel = audioFileType.iconLabel || '';
      }
    });

    if (restorer) {
      // Handle state restoration for all audio types
      void restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({
          path: widget.context.path,
          factory: FACTORY_AUDIO
        }),
        name: widget => widget.context.path
      });
    }
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;
