// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ServiceManager, utils
} from '@jupyterlab/services';

import {
  Message, MessageLoop.sendMessage
} from '@phosphor/messaging';

import {
  Widget, WidgetMessage
} from '@phosphor/widgets';

import {
  Base64ModelFactory, Context, DocumentRegistry
} from '../../../lib/docregistry';

import {
  ImageWidget, ImageWidgetFactory
} from '../../../lib/imagewidget';

import {
  createFileContext
} from '../utils';


class LogImage extends ImageWidget {

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
const IMAGE: Contents.IModel = {
  path: utils.uuid() + '.png',
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


describe('ImageWidget', () => {

  let factory = new Base64ModelFactory();
  let context: DocumentRegistry.Context;
  let manager: ServiceManager.IManager;
  let widget: LogImage;

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(() => {
      return manager.contents.save(IMAGE.path, IMAGE);
    }).then(() => {
      done();
    }).catch(done);
  });

  beforeEach((done) => {
    context = new Context({ manager, factory, path: IMAGE.path });
    widget = new LogImage(context);
    return context.revert().then(done, done);
  });

  afterEach(() => {
    widget.dispose();
  });

  describe('#constructor()', () => {

    it('should create an ImageWidget', () => {
      expect(widget).to.be.an(ImageWidget);
    });

    it('should keep the title in sync with the file name', (done) => {
      let newPath = (IMAGE as any).path = utils.uuid() + '.png';
      expect(widget.title.label).to.be(context.path);
      context.pathChanged.connect(() => {
        expect(widget.title.label).to.be(newPath);
        done();
      });
      return manager.contents.rename(context.path, newPath).catch(done);
    });

    it('should set the content after the context is ready', (done) => {
      context.ready.then(() => {
        MessageLoop.sendMessage(widget, WidgetMessage.UpdateRequest);
        let img = widget.node.querySelector('img') as HTMLImageElement;
        expect(img.src).to.contain(IMAGE.content);
        done();
      }).catch(done);
    });

    it('should handle a change to the content', (done) => {
      context.ready.then(() => {
        context.model.fromString(OTHER);
        MessageLoop.sendMessage(widget, WidgetMessage.UpdateRequest);
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

    it('should add the image', (done) => {
      let img: HTMLImageElement = widget.node.querySelector('img');
      expect(img.src).to.be('');
      context.ready.then(() => {
        MessageLoop.sendMessage(widget, WidgetMessage.UpdateRequest);
        expect(widget.methods).to.contain('onUpdateRequest');
        expect(img.src).to.contain(IMAGE.content);
        done();
      }).catch(done);
    });

  });

  describe('#onActivateRequest()', () => {

    it('should focus the widget', () => {
      Widget.attach(widget, document.body);
      MessageLoop.sendMessage(widget, WidgetMessage.ActivateRequest);
      expect(widget.methods).to.contain('onActivateRequest');
      expect(widget.node.contains(document.activeElement)).to.be(true);
    });

  });

});


describe('ImageWidgetFactory', () => {

  describe('#createNewWidget', () => {

    it('should create an image widget', () => {
      let factory = new ImageWidgetFactory({
        name: 'Image',
        modelName: 'base64',
        fileExtensions: ['.png'],
        defaultFor: ['.png']
      });
      let context = createFileContext(IMAGE.path);
      expect(factory.createNew(context)).to.be.an(ImageWidget);
    });

  });

});
