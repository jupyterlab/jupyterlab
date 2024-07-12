// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Base64ModelFactory,
  Context,
  DocumentRegistry,
  DocumentWidget
} from '@jupyterlab/docregistry';
import { createFileContext } from '@jupyterlab/docregistry/lib/testutils';
import { ImageViewer, ImageViewerFactory } from '@jupyterlab/imageviewer';
import { Contents, ServiceManager } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import { Message, MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';

class LogImage extends ImageViewer {
  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onActivateRequest(msg: Message): void {
    super.onActivateRequest(msg);
    this.methods.push('onActivateRequest');
  }
}

// jsdom does not have createObjectURL and revokeObjectURL, so we define them.
if (typeof window.URL.createObjectURL === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noOp = () => {};
  Object.defineProperty(window.URL, 'createObjectURL', { value: noOp });
  Object.defineProperty(window.URL, 'revokeObjectURL', { value: noOp });
}

/**
 * The common image model.
 */
const IMAGE: Partial<Contents.IModel> = {
  path: UUID.uuid4() + '.png',
  type: 'file',
  mimetype: 'image/png',
  content: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  format: 'base64'
};

/**
 * The alternate content.
 */
const OTHER =
  'iVBORw0KGgoAAAANSUhEUgAAAAUA' +
  'AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO' +
  '9TXL0Y4OHwAAAABJRU5ErkJggg==';

describe('ImageViewer', () => {
  const factory = new Base64ModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let manager: ServiceManager.IManager;
  let widget: LogImage;

  beforeAll(async () => {
    manager = new ServiceManagerMock();
    await manager.ready;
    return manager.contents.save(IMAGE.path!, IMAGE);
  });

  beforeEach(() => {
    context = new Context({ manager, factory, path: IMAGE.path! });
    widget = new LogImage(context);
    return context.initialize(false);
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {
    it('should create an ImageViewer', () => {
      expect(widget).toBeInstanceOf(ImageViewer);
    });

    it('should keep the title in sync with the file name', async () => {
      const newPath = ((IMAGE as any).path = UUID.uuid4() + '.png');
      expect(widget.title.label).toBe(context.path);
      let called = false;
      context.pathChanged.connect(() => {
        expect(widget.title.label).toBe(newPath);
        called = true;
      });
      await manager.contents.rename(context.path, newPath);
      expect(called).toBe(true);
    });

    it('should set the content after the context is ready', async () => {
      await context.ready;
      MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
      const img = widget.node.querySelector('img') as HTMLImageElement;
      expect(img.src).toContain(IMAGE.content);
    });

    it('should handle a change to the content', async () => {
      await context.ready;
      context.model.fromString(OTHER);
      MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
      const img = widget.node.querySelector('img') as HTMLImageElement;
      expect(img.src).toContain(OTHER);
    });
  });

  describe('#context', () => {
    it('should be the context associated with the widget', () => {
      expect(widget.context).toBe(context);
    });
  });

  describe('#scale', () => {
    it('should default to 1', () => {
      expect(widget.scale).toBe(1);
    });

    it('should be settable', () => {
      widget.scale = 0.5;
      expect(widget.scale).toBe(0.5);
    });
  });

  describe('#dispose()', () => {
    it('should dispose of the resources used by the widget', () => {
      expect(widget.isDisposed).toBe(false);
      widget.dispose();
      expect(widget.isDisposed).toBe(true);
      widget.dispose();
      expect(widget.isDisposed).toBe(true);
    });
  });

  describe('#onUpdateRequest()', () => {
    it('should render the image', async () => {
      const img: HTMLImageElement = widget.node.querySelector('img')!;
      await widget.ready;
      MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
      expect(widget.methods).toContain('onUpdateRequest');
      expect(img.src).toContain(IMAGE.content);
    });
  });

  describe('#onActivateRequest()', () => {
    it('should focus the widget', () => {
      Widget.attach(widget, document.body);
      MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
      expect(widget.methods).toContain('onActivateRequest');
      expect(widget.node.contains(document.activeElement)).toBe(true);
    });
  });
});

describe('ImageViewerFactory', () => {
  describe('#createNewWidget', () => {
    it('should create an image document widget', () => {
      const factory = new ImageViewerFactory({
        name: 'Image',
        modelName: 'base64',
        fileTypes: ['png'],
        defaultFor: ['png']
      });
      const context = createFileContext(IMAGE.path, new ServiceManagerMock());
      const d = factory.createNew(context);
      expect(d).toBeInstanceOf(DocumentWidget);
      expect(d.content).toBeInstanceOf(ImageViewer);
    });
  });
});
