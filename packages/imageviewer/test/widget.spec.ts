// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { DocumentRegistry } from '@jupyterlab/docregistry';
import {
  Base64ModelFactory,
  Context,
  DocumentWidget,
  TextModelFactory
} from '@jupyterlab/docregistry';
import { createFileContext } from '@jupyterlab/docregistry/lib/testutils';
import { ImageViewer, ImageViewerFactory } from '@jupyterlab/imageviewer';
import type { Contents, ServiceManager } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { UUID } from '@lumino/coreutils';
import type { Message } from '@lumino/messaging';
import { MessageLoop } from '@lumino/messaging';
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
  Object.defineProperty(window.URL, 'createObjectURL', {
    configurable: true,
    value: () => '',
    writable: true
  });
}

if (typeof window.URL.revokeObjectURL === 'undefined') {
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    configurable: true,
    value: () => undefined,
    writable: true
  });
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
 * The common SVG image model.
 */
const SVG: Partial<Contents.IModel> = {
  path: UUID.uuid4() + '.svg',
  type: 'file',
  mimetype: 'image/svg+xml',
  content: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  format: 'text'
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
    await manager.contents.save(IMAGE.path!, IMAGE);
    await manager.contents.save(SVG.path!, SVG);
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

    it('should revoke object URLs after text images load', async () => {
      const objectUrl = 'blob:http://localhost/imageviewer-test-svg';
      const createObjectURL = jest
        .spyOn(window.URL, 'createObjectURL')
        .mockReturnValue(objectUrl);
      const revokeObjectURL = jest
        .spyOn(window.URL, 'revokeObjectURL')
        .mockImplementation(() => undefined);
      const svgContext = new Context({
        manager,
        factory: new TextModelFactory(),
        path: SVG.path!
      });
      const svgWidget = new LogImage(svgContext);

      try {
        await svgContext.initialize(false);
        await svgWidget.ready;

        const img = svgWidget.node.querySelector('img') as HTMLImageElement;
        expect(createObjectURL).toHaveBeenCalledTimes(1);
        expect(svgWidget.hasClass('jp-mod-svg')).toBe(true);
        expect(img.src).toBe(objectUrl);
        expect(revokeObjectURL).not.toHaveBeenCalled();

        img.dispatchEvent(new Event('load'));

        expect(revokeObjectURL).toHaveBeenCalledTimes(1);
        expect(revokeObjectURL).toHaveBeenCalledWith(objectUrl);

        svgWidget.dispose();
        expect(revokeObjectURL).toHaveBeenCalledTimes(1);
      } finally {
        svgWidget.dispose();
        svgContext.dispose();
        createObjectURL.mockRestore();
        revokeObjectURL.mockRestore();
      }
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
