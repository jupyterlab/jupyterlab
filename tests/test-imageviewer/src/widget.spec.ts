// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  Contents, ServiceManager
} from '@jupyterlab/services';

import {
  Message, MessageLoop
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  Base64ModelFactory, Context, DocumentRegistry, DocumentWidget
} from '@jupyterlab/docregistry';

import {
  ImageViewer, ImageViewerFactory
} from '@jupyterlab/imageviewer';

import {
  createFileContext
} from '../../utils';


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


/**
 * The common image model.
 */
const IMAGE: Partial<Contents.IModel> = {
  path: uuid() + '.png',
  type: 'file',
  mimetype: 'image/png',
  content:  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  format: 'base64'
};


/**
 * The alternate content.
 */
const OTHER = ('iVBORw0KGgoAAAANSUhEUgAAAAUA' +
  'AAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO' +
  '9TXL0Y4OHwAAAABJRU5ErkJggg=='
);


describe('ImageViewer', () => {

  let factory = new Base64ModelFactory();
  let context: Context<DocumentRegistry.IModel>;
  let manager: ServiceManager.IManager;
  let widget: LogImage;

  before(() => {
    manager = new ServiceManager();
    return manager.ready.then(() => {
      return manager.contents.save(IMAGE.path, IMAGE);
    });
  });

  beforeEach(() => {
    context = new Context({ manager, factory, path: IMAGE.path });
    widget = new LogImage(context);
    return context.initialize(false);
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {

    it('should create an ImageViewer', () => {
      expect(widget).to.be.an(ImageViewer);
    });

    it('should keep the title in sync with the file name', (done) => {
      let newPath = (IMAGE as any).path = uuid() + '.png';
      expect(widget.title.label).to.be(context.path);
      context.pathChanged.connect(() => {
        expect(widget.title.label).to.be(newPath);
        done();
      });
      manager.contents.rename(context.path, newPath).catch(done);
    });

    it('should set the content after the context is ready', (done) => {
      context.ready.then(() => {
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        let img = widget.node.querySelector('img') as HTMLImageElement;
        expect(img.src).to.contain(IMAGE.content);
        done();
      }).catch(done);
    });

    it('should handle a change to the content', (done) => {
      context.ready.then(() => {
        context.model.fromString(OTHER);
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        let img = widget.node.querySelector('img') as HTMLImageElement;
        expect(img.src).to.contain(OTHER);
        done();
      }).catch(done);
    });

  });

  describe('#context', () => {

    it('should be the context associated with the widget', () => {
      expect(widget.context).to.be(context);
    });

  });

  describe('#scale', () => {

    it('should default to 1', () => {
      expect(widget.scale).to.be(1);
    });

    it('should be settable', () => {
      widget.scale = 0.5;
      expect(widget.scale).to.be(0.5);
    });

  });

  describe('#dispose()', () => {

    it('should dispose of the resources used by the widget', () => {
      expect(widget.isDisposed).to.be(false);
      widget.dispose();
      expect(widget.isDisposed).to.be(true);
      widget.dispose();
      expect(widget.isDisposed).to.be(true);
    });

  });

  describe('#onUpdateRequest()', () => {

    it('should render the image', () => {
      let img: HTMLImageElement = widget.node.querySelector('img');
      return widget.ready.then(() => {
        MessageLoop.sendMessage(widget, Widget.Msg.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        expect(img.src).to.contain(IMAGE.content);
      });
    });

  });

  describe('#onActivateRequest()', () => {

    it('should focus the widget', () => {
      Widget.attach(widget, document.body);
      MessageLoop.sendMessage(widget, Widget.Msg.ActivateRequest);
      expect(widget.methods).to.contain('onActivateRequest');
      expect(widget.node.contains(document.activeElement)).to.be(true);
    });

  });

});


describe('ImageViewerFactory', () => {

  describe('#createNewWidget', () => {

    it('should create an image document widget', () => {
      let factory = new ImageViewerFactory({
        name: 'Image',
        modelName: 'base64',
        fileTypes: ['png'],
        defaultFor: ['png']
      });
      let context = createFileContext(IMAGE.path);
      let d = factory.createNew(context);
      expect(d).to.be.an(DocumentWidget);
      expect(d.content).to.be.an(ImageViewer);
    });

  });

});
