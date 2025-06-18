/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
/**
 * @packageDocumentation
 * @module video-extension
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
 * The class name added to a video viewer.
 */
const VIDEO_CLASS = 'jp-VideoViewer';

/**
 * The name of the factory that creates video widgets.
 */
const FACTORY_VIDEO = 'VideoViewer';

/**
 * Content provider ID for video streaming
 */
const VIDEO_CONTENT_PROVIDER_ID = 'video-provider';

/**
 * Get video file types from the document registry
 */
function getVideoFileTypes(docRegistry: DocumentRegistry): string[] {
  const videoFileTypes: string[] = [];

  // Iterate through all registered file types
  for (const fileType of docRegistry.fileTypes()) {
    // Check if it's a video file type by checking the MIME types
    if (fileType.mimeTypes.some(mimeType => mimeType.startsWith('video/'))) {
      videoFileTypes.push(fileType.name);
    }
  }

  return videoFileTypes;
}

/**
 * Get MIME type for a video file extension from the document registry
 */
function getVideoMimeType(docRegistry: DocumentRegistry, path: string): string {
  const fileTypes = docRegistry.getFileTypesForPath(path);

  // Find the first video file type
  for (const fileType of fileTypes) {
    if (fileType.mimeTypes.some(mimeType => mimeType.startsWith('video/'))) {
      // Return the first video MIME type
      const videoMimeType = fileType.mimeTypes.find(mimeType =>
        mimeType.startsWith('video/')
      );
      if (videoMimeType) {
        return videoMimeType;
      }
    }
  }

  // Fallback to mp4 if no match found
  return 'video/mp4';
}

/**
 * Custom content model for video streaming
 */
interface IVideoContentsModel extends Contents.IModel {
  /**
   * The streaming URL for the video
   */
  content: string; // This will be the direct URL to the video file
}

/**
 * Options for VideoStreamContentProvider constructor
 */
interface IVideoStreamContentProviderOptions {
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
 * Custom content provider for video streaming
 */
class VideoContentProvider extends RestContentProvider {
  constructor(options: IVideoStreamContentProviderOptions) {
    super(options);
    this._serverSettings = options.serverSettings;
  }

  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<IVideoContentsModel> {
    try {
      // Instead of fetching the actual content, we return a URL that points
      // directly to the video file, allowing the browser to handle streaming
      const baseUrl = this._serverSettings.baseUrl;
      const videoUrl = URLExt.join(
        baseUrl,
        'files',
        encodeURIComponent(localPath)
      );

      // Get basic file info from the server
      const model = await super.get(localPath, { ...options, content: false });

      return {
        ...model,
        content: videoUrl,
        format: 'text' // We return the URL as text content
      } as IVideoContentsModel;
    } catch (error) {
      console.error('Error creating video URL:', error);
      // Fallback to original behavior if needed
      const model = await super.get(localPath, options);
      return {
        ...model,
        content: model.content || ''
      } as IVideoContentsModel;
    }
  }

  private _serverSettings: ServerConnection.ISettings;
}

/**
 * A video viewer widget.
 */
export class VideoViewer extends Widget {
  /**
   * Construct a new video viewer widget.
   */
  constructor(options: VideoViewer.IOptions) {
    super();
    this.addClass(VIDEO_CLASS);
    this._context = options.context;
    this._docRegistry = options.docRegistry;

    // Get MIME type from document registry
    this._mimeType = getVideoMimeType(this._docRegistry, this._context.path);

    // Create the video element
    this._video = document.createElement('video');
    this._video.controls = true;

    this.node.appendChild(this._video);

    // Load video when context is ready
    void this._context.ready.then(() => {
      this._updateVideo();
    });

    // Listen for context model changes
    this._context.model.contentChanged.connect(this._updateVideo, this);
  }

  /**
   * The video viewer's context.
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
    if (this._video) {
      this._video.style.width = '100%';
      this._video.style.height = '100%';
    }
  }

  /**
   * Update the video source.
   */
  private _updateVideo(): void {
    if (!this._context.model || !this._video) {
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
          this._video.src = content;
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
          if (this._video.src && this._video.src.startsWith('blob:')) {
            URL.revokeObjectURL(this._video.src);
          }

          this._video.src = url;
        }
      } catch (error) {
        console.error('Error loading video:', error);
      }
    }
  }

  private _context: DocumentRegistry.Context;
  private _docRegistry: DocumentRegistry;
  private _video: HTMLVideoElement;
  private _mimeType: string;
}

/**
 * The namespace for VideoViewer class statics.
 */
export namespace VideoViewer {
  /**
   * The options used to create a video viewer widget.
   */
  export interface IOptions {
    /**
     * The document context for the video being rendered by the widget.
     */
    context: DocumentRegistry.Context;

    /**
     * The document registry.
     */
    docRegistry: DocumentRegistry;

    /**
     * The MIME type of the video.
     */
    mimeType?: string;
  }
}

/**
 * A document widget for videos.
 */
export class VideoDocumentWidget extends DocumentWidget<VideoViewer> {
  constructor(options: VideoDocumentWidget.IOptions) {
    super(options);
  }
}

/**
 * The namespace for VideoDocumentWidget class statics.
 */
export namespace VideoDocumentWidget {
  /**
   * The options used to create a video document widget.
   */
  export interface IOptions extends DocumentWidget.IOptions<VideoViewer> {
    /**
     * The MIME type of the video.
     */
    mimeType?: string;
  }
}

/**
 * A widget factory for video viewers.
 */
export class VideoViewerFactory extends ABCWidgetFactory<
  IDocumentWidget<VideoViewer>
> {
  /**
   * Construct a new video viewer factory.
   */
  constructor(options: VideoViewerFactory.IOptions) {
    super(options);
    this._docRegistry = options.docRegistry;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<VideoViewer> {
    const content = new VideoViewer({
      context,
      docRegistry: this._docRegistry
    });
    const widget = new VideoDocumentWidget({
      content,
      context
    });
    return widget;
  }

  private _docRegistry: DocumentRegistry;
}

/**
 * The namespace for VideoViewerFactory class statics.
 */
export namespace VideoViewerFactory {
  /**
   * The options used to create a video viewer factory.
   */
  export interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    /**
     * The document registry.
     */
    docRegistry: DocumentRegistry;
  }
}

/**
 * The video extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/video-extension:plugin',
  description: 'Adds viewer for video files',
  autoStart: true,
  requires: [ITranslator],
  optional: [ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    restorer: ILayoutRestorer | null
  ): void => {
    const trans = translator.load('jupyterlab');

    // Get video file types from the document registry
    const videoFileTypes = getVideoFileTypes(app.docRegistry);

    // Register the video stream content provider once
    const drive = (app.serviceManager.contents as ContentsManager).defaultDrive;
    const registry = drive?.contentProviderRegistry;
    if (registry) {
      const videoContentProvider = new VideoContentProvider({
        apiEndpoint: '/api/contents',
        serverSettings: app.serviceManager.serverSettings
      });
      registry.register(VIDEO_CONTENT_PROVIDER_ID, videoContentProvider);
    }

    // Create tracker for all video widgets
    const tracker = new WidgetTracker<IDocumentWidget<VideoViewer>>({
      namespace: 'videoviewer'
    });

    // Create single factory for all video types
    const factory = new VideoViewerFactory({
      name: FACTORY_VIDEO,
      label: trans.__('Video Viewer'),
      fileTypes: videoFileTypes,
      defaultFor: videoFileTypes,
      readOnly: true,
      translator,
      modelName: 'text',
      contentProviderId: VIDEO_CONTENT_PROVIDER_ID,
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
      const videoFileType = fileTypes.find(ft =>
        ft.mimeTypes.some(mimeType => mimeType.startsWith('video/'))
      );

      if (videoFileType) {
        widget.title.icon = videoFileType.icon!;
        widget.title.iconClass = videoFileType.iconClass!;
        widget.title.iconLabel = videoFileType.iconLabel!;
      }
    });

    if (restorer) {
      // Handle state restoration for all video types
      void restorer.restore(tracker, {
        command: 'docmanager:open',
        args: widget => ({
          path: widget.context.path,
          factory: FACTORY_VIDEO
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
