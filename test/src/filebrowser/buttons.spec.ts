// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  DocumentManager
} from '@jupyterlab/docmanager';

import {
  DocumentRegistry, TextModelFactory, ABCWidgetFactory
} from '@jupyterlab/docregistry';

import {
  FileButtons, FileBrowserModel
} from '@jupyterlab/filebrowser';

import {
  acceptDialog
} from '../utils';


class WidgetFactory extends ABCWidgetFactory<Widget, DocumentRegistry.IModel> {

  protected createNewWidget(context: DocumentRegistry.Context): Widget {
    let widget = new Widget();
    widget.addClass('WidgetFactory');
    return widget;
  }
}


describe('filebrowser/buttons', () => {

  let services: ServiceManager.IManager;
  let manager: DocumentManager;
  let registry: DocumentRegistry;
  let commands: CommandRegistry;
  let model: FileBrowserModel;
  let buttons: FileButtons;
  let modelFactory = new TextModelFactory();
  let widgetFactory = new WidgetFactory({
    name: 'test',
    fileExtensions: ['.txt'],
    defaultFor: ['.txt'],
    canStartKernel: true,
    preferKernel: true
  });
  let openedWidget: Widget;

  before((done) => {
    services = new ServiceManager();
    services.ready.then(done, done);
  });

  beforeEach(() => {
    openedWidget = null;
    commands = new CommandRegistry();
    registry = new DocumentRegistry();
    registry.addModelFactory(modelFactory);
    registry.addWidgetFactory(widgetFactory);
    manager = new DocumentManager({
      registry,
      manager: services,
      opener: {
        open: (widget: Widget) => {
          openedWidget = widget;
        }
      }
    });
    model = new FileBrowserModel({ manager: services });
    buttons = new FileButtons({ model, manager, commands });
  });

  afterEach(() => {
    buttons.dispose();
    model.dispose();
  });

  describe('FileButtons', () => {

    describe('#constructor()', () => {

      it('should create a new filebuttons widget', () => {
        expect(buttons).to.be.a(FileButtons);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        buttons.dispose();
        expect(buttons.isDisposed).to.be(true);
        buttons.dispose();
        expect(buttons.isDisposed).to.be(true);
      });
    });

    describe('#model', () => {

      it('should be the model used by the widget', () => {
        expect(buttons.model).to.be(model);
      });

    });

    describe('#manager', () => {

      it('should be the document manager used by the widget', () => {
        expect(buttons.manager).to.be(manager);
      });

    });

    describe('#createNode', () => {

      it('should be the create node', () => {
        let node = buttons.createNode;
        expect(node.classList.contains('jp-id-create')).to.be(true);
      });

      it('should create a new folder', (done) => {
        Widget.attach(buttons, document.body);
        let node = buttons.createNode;
        simulate(node, 'mousedown');
        let menu = document.getElementsByClassName('p-Menu')[0];
        simulate(menu, 'keydown', { keyCode: 40 });
        simulate(menu, 'keydown', { keyCode: 13 });
        model.fileChanged.connect((sender, args) => {
          expect(args.newValue.type).to.be('directory');
          done();
        });
      });

      it('should create a new text file', (done) => {
        Widget.attach(buttons, document.body);
        let node = buttons.createNode;
        registry.addCreator({
          name: 'Text File',
          fileType: 'Text',
        });
        simulate(node, 'mousedown');
        let menu = document.getElementsByClassName('p-Menu')[0];
        simulate(menu, 'keydown', { keyCode: 40 });
        simulate(menu, 'keydown', { keyCode: 40 });
        simulate(menu, 'keydown', { keyCode: 13 });
        model.fileChanged.connect((sender, args) => {
          expect(args.newValue.type).to.be('file');
          done();
        });
        acceptDialog();
      });

    });

    describe('#uploadNode', () => {

      it('should be the upload node', () => {
        let node = buttons.uploadNode;
        expect(node.classList.contains('jp-id-upload')).to.be(true);
      });

    });

    describe('#refreshNode', () => {

      it('should be the refresh node', () => {
        let node = buttons.refreshNode;
        expect(node.classList.contains('jp-id-refresh')).to.be(true);
      });

      it('should trigger a refresh of the model', (done) => {
        Widget.attach(buttons, document.body);
        let node = buttons.refreshNode;
        simulate(node, 'click');
        model.refreshed.connect(() => { done(); });
      });

    });

    describe('#createFrom()', () => {

      it('should create a widget using a file creator', (done) => {
        registry.addCreator({
          name: 'Text File',
          fileType: 'Text',
        });
        buttons.createFrom('Text File').then(widget => {
          expect(widget).to.be(openedWidget);
        }).then(done, done);
        acceptDialog();
      });

      it('should reject if the creator is not registered', (done) => {
        buttons.createFrom('foo').catch(reason => {
          expect(reason).to.be('Creator not registered: foo');
        }).then(done, done);
      });

    });

    describe('#open()', () => {

      it('should open a file by path', (done) => {
        model.newUntitled({ type: 'file' }).then(contents => {
          let widget = buttons.open(contents.path);
          expect(openedWidget).to.be(widget);
        }).then(done, done);
      });

    });

    describe('#createNew()', () => {

      it('should create a new file on a path', (done) => {
        model.newUntitled({ type: 'file' }).then(contents => {
          let widget = buttons.createNew(contents.path);
          expect(openedWidget).to.be(widget);
        }).then(done, done);
      });

    });

  });

});
