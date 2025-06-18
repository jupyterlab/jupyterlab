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
  ContentsManager,
  RestContentProvider,
  ServerConnection
} from '@jupyterlab/services';
import { ITranslator } from '@jupyterlab/translation';
import { URLExt } from '@jupyterlab/coreutils';
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
 * Get MIME type for an audio file extension from the document registry
 */
function getAudioMimeType(docRegistry: DocumentRegistry, path: string): string {
  const fileTypes = docRegistry.getFileTypesForPath(path);

  // Find the first audio file type
  for (const fileType of fileTypes) {
    if (fileType.mimeTypes.some(mimeType => mimeType.startsWith('audio/'))) {
      // Return the first audio MIME type
      const audioMimeType = fileType.mimeTypes.find(mimeType =>
        mimeType.startsWith('audio/')
      );
      if (audioMimeType) {
        return audioMimeType;
      }
    }
  }

  // Fallback to mp3 if no match found
  return 'audio/mp3';
}

/**
 * Custom content model for audio streaming
 */
interface IAudioContentsModel extends Contents.IModel {
  /**
   * The streaming URL for the audio
   */
  content: string; // This will be the direct URL to the audio file
}

/**
 * Options for AudioStreamContentProvider constructor
 */
interface IAudioStreamContentProviderOptions {
  /**
   * The API endpoint for content operations
   */
  apiEndpoint: string;

  /**
   * The server settings
   */
  serverSettings: ServerConnection.ISettings;
}

/**
 * Custom content provider for audio streaming
 */
class AudioContentProvider extends RestContentProvider {
  constructor(options: IAudioStreamContentProviderOptions) {
    super(options);
    this._serverSettings = options.serverSettings;
  }

  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<IAudioContentsModel> {
    try {
      // Instead of fetching the actual content, we return a URL that points
      // directly to the audio file, allowing the browser to handle streaming
      const baseUrl = this._serverSettings.baseUrl;
      const audioUrl = URLExt.join(
        baseUrl,
        'files',
        encodeURIComponent(localPath)
      );

      // Get basic file info from the server
      const model = await super.get(localPath, { ...options, content: false });

      return {
        ...model,
        content: audioUrl,
        format: 'text' // We return the URL as text content
      } as IAudioContentsModel;
    } catch (error) {
      console.error('Error creating audio URL:', error);
      // Fallback to original behavior if needed
      const model = await super.get(localPath, options);
      return {
        ...model,
        content: model.content || ''
      } as IAudioContentsModel;
    }
  }

  private _serverSettings: ServerConnection.ISettings;
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
    this._docRegistry = options.docRegistry;

    // Get MIME type from document registry
    this._mimeType = getAudioMimeType(this._docRegistry, this._context.path);

    // Create the audio element
    this._audio = document.createElement('audio');
    this._audio.controls = true;

    this.node.appendChild(this._audio);

    // Load audio when context is ready
    void this._context.ready.then(() => {
      this._updateAudio();
    });

    // Listen for context model changes
    this._context.model.contentChanged.connect(this._updateAudio, this);
  }

  /**
   * The audio viewer's context.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._context = null!;
    this._docRegistry = null!;
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
  private _updateAudio(): void {
    if (!this._context.model || !this._audio) {
      return;
    }

    const content = this._context.model.toString();
    if (content) {
      try {
        // Check if content is a URL (from our content provider)
        if (
          content.startsWith('http://') ||
          content.startsWith('https://') ||
          content.startsWith('/')
        ) {
          // Direct URL - let the browser handle streaming
          this._audio.src = content;
        } else {
          // Fallback: treat as base64 content (for backwards compatibility)
          const byteCharacters = atob(content);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: this._mimeType });
          const url = URL.createObjectURL(blob);

          // Clean up previous URL if it was a blob URL
          if (this._audio.src && this._audio.src.startsWith('blob:')) {
            URL.revokeObjectURL(this._audio.src);
          }

          this._audio.src = url;
        }
      } catch (error) {
        console.error('Error loading audio:', error);
      }
    }
  }

  private _context: DocumentRegistry.Context;
  private _docRegistry: DocumentRegistry;
  private _audio: HTMLAudioElement;
  private _mimeType: string;
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
     * The document registry.
     */
    docRegistry: DocumentRegistry;

    /**
     * The MIME type of the audio.
     */
    mimeType?: string;
  }
}

/**
 * A document widget for audios.
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
  export interface IOptions extends DocumentWidget.IOptions<AudioViewer> {
    /**
     * The MIME type of the audio.
     */
    mimeType?: string;
  }
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
    this._docRegistry = options.docRegistry;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<AudioViewer> {
    const content = new AudioViewer({
      context,
      docRegistry: this._docRegistry
    });
    const widget = new AudioDocumentWidget({
      content,
      context
    });
    return widget;
  }

  private _docRegistry: DocumentRegistry;
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
     * The document registry.
     */
    docRegistry: DocumentRegistry;
  }
}

/**
 * The audio extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/audio-extension:plugin',
  description: 'Adds viewer for audio files',
  autoStart: true,
  requires: [ITranslator],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    restorer: ILayoutRestorer | null
  ): void => {
    const trans = translator.load('jupyterlab');

    // Get audio file types from the document registry
    const audioFileTypes = getAudioFileTypes(app.docRegistry);

    // Register the audio stream content provider once
    const drive = (app.serviceManager.contents as ContentsManager).defaultDrive;
    const registry = drive?.contentProviderRegistry;
    if (registry) {
      const audioContentProvider = new AudioContentProvider({
        apiEndpoint: '/api/contents',
        serverSettings: app.serviceManager.serverSettings
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
      modelName: 'text',
      contentProviderId: AUDIO_CONTENT_PROVIDER_ID,
      docRegistry: app.docRegistry
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
        widget.title.icon = audioFileType.icon!;
        widget.title.iconClass = audioFileType.iconClass!;
        widget.title.iconLabel = audioFileType.iconLabel!;
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
