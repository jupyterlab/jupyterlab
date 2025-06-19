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
  IDefaultDrive,
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
 * Custom content provider for video streaming
 */
class VideoContentProvider extends RestContentProvider {
  async get(
    localPath: string,
    options?: Contents.IFetchOptions
  ): Promise<Contents.IModel> {
    // Always pass content: false to avoid loading large video files into memory
    return super.get(localPath, { ...options, content: false });
  }
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
    this._serverSettings = options.serverSettings;

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
    if (this._video) {
      this._video.style.width = '100%';
      this._video.style.height = '100%';
    }
  }

  /**
   * Update the video source.
   */
  private _updateVideo(): void {
    // Use the file path directly - the browser will request it from the server
    const videoUrl = URLExt.join(
      this._serverSettings.baseUrl,
      'files',
      this._context.path
    );
    this._video.src = videoUrl;
  }

  private _context: DocumentRegistry.Context;
  private _video: HTMLVideoElement;
  private _serverSettings: ServerConnection.ISettings;
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
     * The server settings.
     */
    serverSettings: ServerConnection.ISettings;
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
  export interface IOptions extends DocumentWidget.IOptions<VideoViewer> {}
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
    this._serverSettings = options.serverSettings;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.Context
  ): IDocumentWidget<VideoViewer> {
    const content = new VideoViewer({
      context,
      serverSettings: this._serverSettings
    });
    const widget = new VideoDocumentWidget({
      content,
      context
    });
    return widget;
  }

  private _serverSettings: ServerConnection.ISettings;
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
     * The server settings.
     */
    serverSettings: ServerConnection.ISettings;
  }
}

/**
 * The video extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/video-extension:plugin',
  description: 'Adds viewer for video files',
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
    const serverSettings = app.serviceManager.serverSettings;

    // Get video file types from the document registry
    const videoFileTypes = getVideoFileTypes(app.docRegistry);

    // Register the video stream content provider once
    const registry = defaultDrive.contentProviderRegistry;
    if (registry) {
      const videoContentProvider = new VideoContentProvider({
        apiEndpoint: '/api/contents',
        serverSettings
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
      serverSettings
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
        widget.title.icon = videoFileType.icon;
        widget.title.iconClass = videoFileType.iconClass || '';
        widget.title.iconLabel = videoFileType.iconLabel || '';
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
