// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Message
} from 'phosphor-messaging';

import {
  ChildMessage, Widget
} from 'phosphor-widget';

import {
  nbformat
} from '../../../../lib/notebook/notebook/nbformat';

import {
  OutputAreaModel, OutputAreaWidget
} from '../../../../lib/notebook/output-area';

import {
  MimeMap, RenderMime
} from '../../../../lib/rendermime';

import {
  defaultRenderMime
} from '../../rendermime/rendermime.spec';

import {
  DEFAULT_OUTPUTS
} from './model.spec';


/**
 * The default rendermime instance to use for testing.
 */
const rendermime = defaultRenderMime();


class LogOutputAreaWidget extends OutputAreaWidget {

  methods: string[] = [];

  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    this.methods.push('onUpdateRequest');
  }

  protected onChildAdded(msg: ChildMessage): void {
    super.onChildAdded(msg);
    this.methods.push('onChildAdded');
  }

  protected onChildRemoved(msg: ChildMessage): void {
    super.onChildRemoved(msg);
    this.methods.push('onChildRemoved');
  }

  protected onModelChanged(oldValue: OutputAreaModel, newValue: OutputAreaModel): void {
    super.onModelChanged(oldValue, newValue);
    this.methods.push('onModelChanged');
  }
}


class LogRenderer extends OutputAreaWidget.Renderer {

  methods: string[] = [];

  createOutput(): Widget {
    this.methods.push('createOutput');
    return super.createOutput();
  }

  updateOutput(output: nbformat.IOutput, rendermime: RenderMime<Widget>, widget: Widget, trusted?: boolean): void {
    super.updateOutput(output, rendermime, widget, trusted);
    this.methods.push('updateOutput');
  }
}


function createWidget(): LogOutputAreaWidget {
  let widget = new LogOutputAreaWidget({ rendermime });
  let model = new OutputAreaModel();
  for (let output of DEFAULT_OUTPUTS) {
    model.add(output);
  }
  widget.model = model;
  return widget;
}


describe('notebook/output-area/widget', () => {

  describe('OutputAreaWidget', () => {

    describe('#constructor()', () => {

      it('should take an options object', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget).to.be.an(OutputAreaWidget);
      });

      it('should take an optional renderer', () => {
        let renderer = Object.create(OutputAreaWidget.defaultRenderer);
        let widget = new OutputAreaWidget({ rendermime, renderer });
        expect(widget.renderer).to.be(renderer);
      });

      it('should add the `jp-OutputArea` class', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.hasClass('jp-OutputArea')).to.be(true);
      });

    });

    describe('#modelChanged', () => {

      it('should be emitted when the model of the widget changes', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let called = false;
        widget.modelChanged.connect((sender, args) => {
          expect(sender).to.be(widget);
          expect(args).to.be(void 0);
          called = true;
        });
        widget.model = new OutputAreaModel();
        expect(called).to.be(true);
      });

    });

    describe('#model', () => {

      it('should default to `null`', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.model).to.be(null);
      });

      it('should set the model', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let model = new OutputAreaModel();
        widget.model = model;
        expect(widget.model).to.be(model);
      });

      it('should emit `modelChanged` when the model changes', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let called = false;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = new OutputAreaModel();
        expect(called).to.be(true);
      });

      it('should not emit `modelChanged` when the model does not change', () => {
        let widget = new OutputAreaWidget({ rendermime });
        let called = false;
        let model = new OutputAreaModel();
        widget.model = model;
        widget.modelChanged.connect(() => { called = true; });
        widget.model = model;
        expect(called).to.be(false);
      });

      it('should create widgets for the model items', () => {
        let widget = createWidget();
        expect(widget.childCount()).to.be(5);
      });

      context('model `changed` signal', () => {

        it('should dispose of the child widget when an output is removed', () => {
          let widget = createWidget();
          let child = widget.childAt(0);
          widget.model.clear();
          expect(child.isDisposed).to.be(true);
        });

        it('should add the `jp-OutputArea-output` class to new widgets', () => {
          let widget = new LogOutputAreaWidget({ rendermime });
          widget.model = new OutputAreaModel();
          widget.model.add(DEFAULT_OUTPUTS[0]);
          let child = widget.childAt(0);
          expect(child.hasClass('jp-OutputArea-output')).to.be(true);
        });

      });

    });

    describe('#rendermime', () => {

      it('should be the rendermime instance used by the widget', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.rendermime).to.be(rendermime);
      });

      it('should be read-only', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(() => { widget.rendermime = null; }).to.throwError();
      });

    });

    describe('#renderer', () => {

      it('should be the renderer used by the widget', () => {
        let renderer = new OutputAreaWidget.Renderer();
        let widget = new OutputAreaWidget({ rendermime, renderer });
        expect(widget.renderer).to.be(renderer);
      });

      it('should be read-only', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(() => { widget.renderer = null; }).to.throwError();
      });

      it('should be called to create and update when a widget is added', () => {
        let renderer = new LogRenderer();
        let widget = new LogOutputAreaWidget({ rendermime, renderer });
        let model = new OutputAreaModel();
        widget.model = model;
        model.add(DEFAULT_OUTPUTS[0]);
        expect(renderer.methods).to.contain('createOutput');
        expect(renderer.methods).to.contain('updateOutput');
      });

    });

    describe('#trusted', () => {

      it('should get the trusted state of the widget', () => {
        let widget = new OutputAreaWidget({ rendermime });
        expect(widget.trusted).to.be(false);
      });

      it('should set the trusted state of the widget', () => {
        let widget = new OutputAreaWidget({ rendermime });
        widget.trusted = true;
        expect(widget.trusted).to.be(true);
      });

      it('should re-render the widgets', () => {
        let renderer = new LogRenderer();
        let widget = new OutputAreaWidget({ rendermime, renderer });
        widget.model = new OutputAreaModel();
        widget.model.add(DEFAULT_OUTPUTS[0]);
        renderer.methods = [];
        widget.trusted = true;
        expect(renderer.methods).to.contain('updateOutput');
      });

    });

    describe('#collapsed', () => {

      it('should get the collapsed state of the widget', () => {
        let widget = createWidget();
        expect(widget.collapsed).to.be(false);
      });

      it('should set the collapsed state of the widget', () => {
        let widget = createWidget();
        widget.collapsed = true;
        expect(widget.collapsed).to.be(true);
      });

      it('should post an update request', (done) => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.collapsed = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#fixedHeight', () => {

      it('should get the fixed height state of the widget', () => {
        let widget = createWidget();
        expect(widget.fixedHeight).to.be(false);
      });

      it('should set the fixed height state of the widget', () => {
        let widget = createWidget();
        widget.fixedHeight = true;
        expect(widget.fixedHeight).to.be(true);
      });

      it('should post an update request', (done) => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.fixedHeight = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          done();
        });
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources held by the widget', () => {
        let widget = createWidget();
        widget.dispose();
        expect(widget.model).to.be(null);
        expect(widget.rendermime).to.be(null);
        expect(widget.renderer).to.be(null);
      });

      it('should be safe to call more than once', () => {
        let widget = createWidget();
        widget.dispose();
        widget.dispose();
        expect(widget.isDisposed).to.be(true);
      });

    });

    describe('#childAt()', () => {

      it('should get the child widget at the specified index', () => {
        let widget = createWidget();
        expect(widget.childAt(0)).to.be.a(Widget);
      });

    });

    describe('#childCount()', () => {

      it('should get the number of child widgets', () => {
        let widget = createWidget();
        expect(widget.childCount()).to.be(5);
        widget.model.clear();
        expect(widget.childCount()).to.be(0);
      });

    });

    describe('#onUpdateRequest()', () => {

      it('should set the appropriate classes on the widget', (done) => {
        let widget = createWidget();
        widget.collapsed = true;
        widget.fixedHeight = true;
        requestAnimationFrame(() => {
          expect(widget.methods).to.contain('onUpdateRequest');
          expect(widget.hasClass('jp-mod-fixedHeight')).to.be(true);
          expect(widget.hasClass('jp-mod-collapsed')).to.be(true);
          done();
        });
      });

    });

    describe('#onModelChanged()', () => {

      it('should be called when the model changes', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.model = new OutputAreaModel();
        expect(widget.methods).to.contain('onModelChanged');
      });

      it('should not be called when the model does not change', () => {
        let widget = new LogOutputAreaWidget({ rendermime });
        widget.model = new OutputAreaModel();
        widget.methods = [];
        widget.model = widget.model;
        expect(widget.methods).to.not.contain('onModelChanged');
      });

    });

    describe('.Renderer', () => {

      describe('#createOutput()', () => {

        it('should create a widget', () => {
          let renderer = new OutputAreaWidget.Renderer();
          let widget = renderer.createOutput();
          expect(widget).to.be.a(Widget);
        });

      });

      describe('#updateOutput()', () => {

        it('should handle all bundle types when trusted', () => {
          let renderer = new OutputAreaWidget.Renderer();
          let widget = renderer.createOutput();
          for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
            let output = DEFAULT_OUTPUTS[i];
            renderer.updateOutput(output, rendermime, widget, true);
          }
        });

        it('should handle all bundle types when not trusted', () => {
          let renderer = new OutputAreaWidget.Renderer();
          let widget = renderer.createOutput();
          for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
            let output = DEFAULT_OUTPUTS[i];
            renderer.updateOutput(output, rendermime, widget, false);
          }
        });

      });

      describe('#getBundle()', () => {

        it('should handle all bundle types', () => {
          let renderer = new OutputAreaWidget.Renderer();
          for (let i = 0; i < DEFAULT_OUTPUTS.length; i++) {
            let output = DEFAULT_OUTPUTS[i];
            let bundle = renderer.getBundle(output);
            expect(Object.keys(bundle).length).to.not.be(0);
          }
        });

      });

      describe('#convertBundle()', () => {

        it('should handle bundles with strings', () => {
          let bundle: nbformat.MimeBundle = {
            'text/plain': 'foo'
          };
          let renderer = new OutputAreaWidget.Renderer();
          let map = renderer.convertBundle(bundle);
          expect(map).to.eql(bundle);
        });

        it('should handle bundles with string arrays', () => {
          let bundle: nbformat.MimeBundle = {
            'text/plain': ['foo', 'bar']
          };
          let renderer = new OutputAreaWidget.Renderer();
          let map = renderer.convertBundle(bundle);
          expect(map).to.eql({ 'text/plain': 'foo\nbar' });
        });

      });

      describe('#sanitize()', () => {

        it('should sanitize html input', () => {
          let map: MimeMap<string> = {
            'text/html': '<div>hello, 1 < 2</div>'
          };
          let renderer = new OutputAreaWidget.Renderer();
          renderer.sanitize(map);
          expect(map['text/html']).to.be('<div>hello, 1 &lt; 2</div>');
        });

        it('should allow text/plain', () => {
          let map: MimeMap<string> = {
            'text/plain': '<div>hello, 1 < 2</div>'
          };
          let renderer = new OutputAreaWidget.Renderer();
          renderer.sanitize(map);
          expect(map['text/plain']).to.be('<div>hello, 1 < 2</div>');
        });

        it('should disallow unknown mimetype', () => {
          let map: MimeMap<string> = {
            'foo/bar': '<div>hello, 1 < 2</div>'
          };
          let renderer = new OutputAreaWidget.Renderer();
          renderer.sanitize(map);
          expect(map['foo/bar']).to.be(void 0);
        });

      });

    });

    describe('.defaultRenderer', () => {

      it('should be a `Renderer` instance', () => {
        expect(OutputAreaWidget.defaultRenderer).to.be.an(OutputAreaWidget.Renderer);
      });

    });

  });

});
