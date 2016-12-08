// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Contents, ServiceManager, utils
} from '@jupyterlab/services';

import {
  Message, sendMessage
} from 'phosphor/lib/core/messaging';

import {
  WidgetMessage
} from 'phosphor/lib/ui/widget';

import {
  Base64ModelFactory, Context, DocumentRegistry
} from '../../../lib/docregistry';

import {
  ImageWidget, ImageWidgetFactory
} from '../../../lib/imagewidget';


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


const IMAGES: Contents.IModel[] = [
  {
    path: utils.uuid() + '.png',
    type: 'file',
    mimetype: 'image/png',
    content:  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    format: 'base64'
  },
  {
    path: utils.uuid() + '.gif',
    type: 'file',
    mimetype: 'image/gif',
    content: 'R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=',
    format: 'base64'
  }
];


describe('ImageWidget', () => {

  let factory = new Base64ModelFactory();
  let context: DocumentRegistry.Context;
  let manager: ServiceManager.IManager;
  let widget: ImageWidget;

  before((done) => {
    manager = new ServiceManager();
    manager.ready.then(() => {
      return manager.contents.save(IMAGES[0].path, IMAGES[0]);
    }).then(() => {
      return manager.contents.save(IMAGES[1].path, IMAGES[1]);
    }).then(() => {
      done();
    }).catch(done);
  });

  beforeEach((done) => {
    context = new Context({ manager, factory, path: IMAGES[0].path });
    widget = new ImageWidget(context);
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
      let newPath = utils.uuid() + '.png';
      expect(widget.title.label).to.be(context.path);
      context.pathChanged.connect(() => {
        expect(widget.title.label).to.be(newPath);
        done();
      });
      return manager.contents.rename(context.path, newPath).catch(done);
    });

    it('should handle a change to the content', () => {

    });

  });

  describe('#context', () => {

    it('should be the context associated with the widget', () => {
      expect(widget.context).to.be(context);
    });

  });

  describe('#scale', () => {

  });

  describe('#dispose()', () => {

  });

  describe('#onUpdateRequest()', () => {

  });

  describe('#onActivateRequest()', () => {

  });

});


describe('ImageWidgetFactory', () => {

  describe('#createNewWidget', () => {

  });

});
