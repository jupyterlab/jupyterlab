// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Message } from '@lumino/messaging';

import { TabPanel, Widget } from '@lumino/widgets';

import { JSONValue } from '@lumino/coreutils';

import { simulate } from 'simulate-event';

import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';

import { Context } from '@jupyterlab/docregistry';

import { ObservableJSON } from '@jupyterlab/observables';

import {
  INotebookModel,
  NotebookActions,
  NotebookPanel,
  NotebookTools,
  NotebookTracker
} from '@jupyterlab/notebook';

import { initNotebookContext, sleep, NBTestUtils } from '@jupyterlab/testutils';

class LogTool extends NotebookTools.Tool {
  methods: string[] = [];

  protected onActiveNotebookPanelChanged(msg: Message): void {
    super.onActiveNotebookPanelChanged(msg);
    this.methods.push('onActiveNotebookPanelChanged');
  }

  protected onActiveCellChanged(msg: Message): void {
    super.onActiveCellChanged(msg);
    this.methods.push('onActiveCellChanged');
  }

  protected onSelectionChanged(msg: Message): void {
    super.onSelectionChanged(msg);
    this.methods.push('onSelectionChanged');
  }

  protected onActiveCellMetadataChanged(
    msg: ObservableJSON.ChangeMessage
  ): void {
    super.onActiveCellMetadataChanged(msg);
    this.methods.push('onActiveCellMetadataChanged');
  }

  protected onActiveNotebookPanelMetadataChanged(
    msg: ObservableJSON.ChangeMessage
  ): void {
    super.onActiveNotebookPanelMetadataChanged(msg);
    this.methods.push('onActiveNotebookPanelMetadataChanged');
  }
}

class LogKeySelector extends NotebookTools.KeySelector {
  events: string[] = [];
  methods: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(message: Message): void {
    super.onAfterAttach(message);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(message: Message): void {
    super.onBeforeDetach(message);
    this.methods.push('onBeforeDetach');
  }

  protected onActiveCellChanged(message: Message): void {
    super.onActiveCellChanged(message);
    this.methods.push('onActiveCellChanged');
  }

  protected onActiveCellMetadataChanged(
    message: ObservableJSON.ChangeMessage
  ): void {
    super.onActiveCellMetadataChanged(message);
    this.methods.push('onActiveCellMetadataChanged');
  }

  protected onValueChanged(): void {
    super.onValueChanged();
    this.methods.push('onValueChanged');
  }
}

describe('@jupyterlab/notebook', () => {
  describe('notebooktools', () => {
    let notebookTools: NotebookTools;
    let tabpanel: TabPanel;
    let tracker: NotebookTracker;
    let context0: Context<INotebookModel>;
    let context1: Context<INotebookModel>;
    let panel0: NotebookPanel;
    let panel1: NotebookPanel;

    beforeEach(async () => {
      context0 = await initNotebookContext();
      panel0 = NBTestUtils.createNotebookPanel(context0);
      NBTestUtils.populateNotebook(panel0.content);
      context1 = await initNotebookContext();
      panel1 = NBTestUtils.createNotebookPanel(context1);
      NBTestUtils.populateNotebook(panel1.content);
      tracker = new NotebookTracker({ namespace: 'notebook' });
      await tracker.add(panel0);
      await tracker.add(panel1);
      notebookTools = new NotebookTools({ tracker });
      tabpanel = new TabPanel();
      tabpanel.addWidget(panel0);
      tabpanel.addWidget(panel1);
      tabpanel.addWidget(notebookTools);
      tabpanel.node.style.height = '800px';
      Widget.attach(tabpanel, document.body);
      // Give the posted messages a chance to be handled.
      await sleep();
    });

    afterEach(() => {
      tabpanel.dispose();
      notebookTools.dispose();
      panel1.dispose();
      panel0.dispose();

      context1.dispose();
      context0.dispose();
    });

    describe('NotebookTools', () => {
      describe('#constructor()', () => {
        it('should create a notebooktools object', () => {
          expect(notebookTools).to.be.an.instanceof(NotebookTools);
        });
      });

      describe('#activeNotebookPanel', () => {
        it('should be the active notebook', () => {
          expect(notebookTools.activeNotebookPanel).to.equal(panel1);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(notebookTools.activeNotebookPanel).to.equal(panel0);
        });
      });

      describe('#activeCell', () => {
        it('should be the active cell', () => {
          expect(notebookTools.activeCell).to.equal(panel1.content.activeCell);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(notebookTools.activeCell).to.equal(panel0.content.activeCell);
        });
      });

      describe('#selectedCells', () => {
        it('should be the currently selected cells', () => {
          expect(notebookTools.selectedCells).to.deep.equal([
            panel1.content.activeCell
          ]);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(notebookTools.selectedCells).to.deep.equal([
            panel0.content.activeCell
          ]);
          panel0.content.select(panel0.content.widgets[1]);
          expect(notebookTools.selectedCells.length).to.equal(2);
        });
      });

      describe('#addItem()', () => {
        it('should add a cell tool item', () => {
          const tool = new NotebookTools.Tool();
          notebookTools.addItem({ tool });
          tool.dispose();
        });

        it('should accept a rank', () => {
          const tool = new NotebookTools.Tool();
          notebookTools.addItem({ tool, rank: 100 });
          tool.dispose();
        });
      });
    });

    describe('NotebookTools.Tool', () => {
      describe('#constructor', () => {
        it('should create a new base tool', () => {
          const tool = new NotebookTools.Tool();
          expect(tool).to.be.an.instanceof(NotebookTools.Tool);
        });
      });

      describe('#parent', () => {
        it('should be the notebooktools object used by the tool', () => {
          const tool = new NotebookTools.Tool({});
          notebookTools.addItem({ tool });
          expect(tool.notebookTools).to.equal(notebookTools);
        });
      });

      describe('#onActiveNotebookPanelChanged()', () => {
        it('should be called when the active notebook panel changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool });
          tool.methods = [];
          simulate(panel0.node, 'focus');
          expect(tool.methods).to.contain('onActiveNotebookPanelChanged');
        });
      });

      describe('#onActiveCellChanged()', () => {
        it('should be called when the active cell changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool });
          tool.methods = [];
          simulate(panel0.node, 'focus');
          expect(tool.methods).to.contain('onActiveCellChanged');
        });
      });

      describe('#onSelectionChanged()', () => {
        it('should be called when the selection changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool });
          tool.methods = [];
          const current = tracker.currentWidget!;
          current.content.select(current.content.widgets[1]);
          expect(tool.methods).to.contain('onSelectionChanged');
        });
      });

      describe('#onActiveCellMetadataChanged()', () => {
        it('should be called when the active cell metadata changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool });
          tool.methods = [];
          const metadata = notebookTools.activeCell!.model.metadata;
          metadata.set('foo', 1);
          metadata.set('foo', 2);
          expect(tool.methods).to.contain('onActiveCellMetadataChanged');
        });
      });

      describe('#onActiveNotebookPanelMetadataChanged()', () => {
        it('should be called when the active notebook panel metadata changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool });
          tool.methods = [];
          const metadata = notebookTools.activeNotebookPanel!.model!.metadata;
          metadata.set('foo', 1);
          metadata.set('foo', 2);
          expect(tool.methods).to.contain(
            'onActiveNotebookPanelMetadataChanged'
          );
        });
      });
    });

    describe('NotebookTools.ActiveCellTool', () => {
      it('should create a new active cell tool', () => {
        const tool = new NotebookTools.ActiveCellTool();
        notebookTools.addItem({ tool });
        expect(tool).to.be.an.instanceof(NotebookTools.ActiveCellTool);
      });

      it('should handle a change to the active cell', () => {
        const tool = new NotebookTools.ActiveCellTool();
        notebookTools.addItem({ tool });
        const widget = tracker.currentWidget!;
        widget.content.activeCellIndex++;
        widget.content.activeCell!.model.metadata.set('bar', 1);
        expect(tool.node.querySelector('.jp-InputArea-editor')).to.be.ok;
      });
    });

    describe('NotebookTools.CellMetadataEditorTool', () => {
      const editorServices = new CodeMirrorEditorFactory();
      const editorFactory = editorServices.newInlineEditor.bind(editorServices);

      it('should create a new metadata editor tool', () => {
        const tool = new NotebookTools.CellMetadataEditorTool({
          editorFactory
        });
        expect(tool).to.be.an.instanceof(NotebookTools.CellMetadataEditorTool);
      });

      it('should handle a change to the active cell', () => {
        const tool = new NotebookTools.CellMetadataEditorTool({
          editorFactory
        });
        notebookTools.addItem({ tool });
        const model = tool.editor.model;
        expect(JSON.stringify(model.value.text)).to.be.ok;
        const widget = tracker.currentWidget!;
        widget.content.activeCellIndex++;
        widget.content.activeCell!.model.metadata.set('bar', 1);
        expect(JSON.stringify(model.value.text)).to.contain('bar');
      });

      it('should handle a change to the metadata', () => {
        const tool = new NotebookTools.CellMetadataEditorTool({
          editorFactory
        });
        notebookTools.addItem({ tool });
        const model = tool.editor.model;
        const previous = model.value.text;
        const metadata = notebookTools.activeCell!.model.metadata;
        metadata.set('foo', 1);
        expect(model.value.text).to.not.equal(previous);
      });
    });

    describe('NotebookTools.NotebookMetadataEditorTool', () => {
      const editorServices = new CodeMirrorEditorFactory();
      const editorFactory = editorServices.newInlineEditor.bind(editorServices);

      it('should create a new metadata editor tool', () => {
        const tool = new NotebookTools.NotebookMetadataEditorTool({
          editorFactory
        });
        expect(tool).to.be.an.instanceof(
          NotebookTools.NotebookMetadataEditorTool
        );
      });

      it('should handle a change to the active notebook', () => {
        panel0.model!.metadata.set('panel0', 1);
        panel1.model!.metadata.set('panel1', 1);
        const tool = new NotebookTools.NotebookMetadataEditorTool({
          editorFactory
        });
        notebookTools.addItem({ tool });
        const model = tool.editor.model;
        expect(JSON.stringify(model.value.text)).to.be.ok;

        simulate(panel0.node, 'focus');
        expect(JSON.stringify(model.value.text)).to.contain('panel0');
        expect(JSON.stringify(model.value.text)).to.not.contain('panel1');

        simulate(panel1.node, 'focus');
        expect(JSON.stringify(model.value.text)).to.not.contain('panel0');
        expect(JSON.stringify(model.value.text)).to.contain('panel1');
      });

      it('should handle a change to the metadata', () => {
        const tool = new NotebookTools.NotebookMetadataEditorTool({
          editorFactory
        });
        notebookTools.addItem({ tool });
        const model = tool.editor.model;
        const widget = tracker.currentWidget!;
        expect(JSON.stringify(model.value.text)).to.not.contain('newvalue');
        widget.content.model!.metadata.set('newvalue', 1);
        expect(JSON.stringify(model.value.text)).to.contain('newvalue');
      });
    });

    describe('NotebookTools.KeySelector', () => {
      let tool: LogKeySelector;

      beforeEach(() => {
        tool = new LogKeySelector({
          key: 'foo',
          optionsMap: {
            bar: 1,
            baz: [1, 2, 'a']
          }
        });
        notebookTools.addItem({ tool });
        simulate(panel0.node, 'focus');
        tabpanel.currentIndex = 2;
      });

      afterEach(() => {
        tool.dispose();
      });

      describe('#constructor()', () => {
        it('should create a new key selector', () => {
          expect(tool).to.be.an.instanceof(NotebookTools.KeySelector);
        });
      });

      describe('#key', () => {
        it('should be the key used by the selector', () => {
          expect(tool.key).to.equal('foo');
        });
      });

      describe('#selectNode', () => {
        it('should be the select node', () => {
          expect(tool.selectNode.localName).to.equal('select');
        });
      });

      describe('#handleEvent()', () => {
        context('change', () => {
          it('should update the metadata', () => {
            const select = tool.selectNode;
            simulate(select, 'focus');
            select.selectedIndex = 1;
            simulate(select, 'change');
            expect(tool.events).to.contain('change');
            const metadata = notebookTools.activeCell!.model.metadata;
            expect(metadata.get('foo')).to.deep.equal([1, 2, 'a']);
          });
        });

        context('focus', () => {
          it('should add the focused class to the wrapper node', () => {
            const select = tool.selectNode;
            simulate(select, 'focus');
            const selector = '.jp-mod-focused';
            expect(tool.node.querySelector(selector)).to.be.ok;
          });
        });

        context('blur', () => {
          it('should remove the focused class from the wrapper node', () => {
            const select = tool.selectNode;
            simulate(select, 'focus');
            simulate(select, 'blur');
            const selector = '.jp-mod-focused';
            expect(tool.node.querySelector(selector)).to.not.be.ok;
          });
        });
      });

      describe('#onAfterAttach()', () => {
        it('should add event listeners', () => {
          const select = tool.selectNode;
          expect(tool.methods).to.contain('onAfterAttach');
          simulate(select, 'focus');
          simulate(select, 'blur');
          select.selectedIndex = 0;
          simulate(select, 'change');
          expect(tool.events).to.deep.equal(['change']);
        });
      });

      describe('#onBeforeDetach()', () => {
        it('should remove event listeners', () => {
          const select = tool.selectNode;
          notebookTools.dispose();
          expect(tool.methods).to.contain('onBeforeDetach');
          simulate(select, 'focus');
          simulate(select, 'blur');
          simulate(select, 'change');
          expect(tool.events).to.deep.equal([]);
        });
      });

      describe('#onValueChanged()', () => {
        it('should update the metadata', () => {
          const select = tool.selectNode;
          simulate(select, 'focus');
          select.selectedIndex = 1;
          simulate(select, 'change');
          expect(tool.methods).to.contain('onValueChanged');
          const metadata = notebookTools.activeCell!.model.metadata;
          expect(metadata.get('foo')).to.deep.equal([1, 2, 'a']);
        });
      });

      describe('#onActiveCellChanged()', () => {
        it('should update the select value', () => {
          const cell = panel0.content.model!.cells.get(1);
          cell.metadata.set('foo', 1);
          panel0.content.activeCellIndex = 1;
          expect(tool.methods).to.contain('onActiveCellChanged');
          expect(tool.selectNode.value).to.equal('1');
        });
      });

      describe('#onActiveCellMetadataChanged()', () => {
        it('should update the select value', () => {
          const metadata = notebookTools.activeCell!.model.metadata;
          metadata.set('foo', 1);
          expect(tool.methods).to.contain('onActiveCellMetadataChanged');
          expect(tool.selectNode.value).to.equal('1');
        });
      });
    });

    describe('NotebookTools.createSlideShowSelector()', () => {
      it('should create a slide show selector', () => {
        const tool = NotebookTools.createSlideShowSelector();
        tool.selectNode.selectedIndex = -1;
        notebookTools.addItem({ tool });
        simulate(panel0.node, 'focus');
        tabpanel.currentIndex = 2;
        expect(tool).to.be.an.instanceof(NotebookTools.KeySelector);
        expect(tool.key).to.equal('slideshow');
        const select = tool.selectNode;
        expect(select.value).to.equal('');
        const metadata = notebookTools.activeCell!.model.metadata;
        expect(metadata.get('slideshow')).to.be.undefined;
        simulate(select, 'focus');
        tool.selectNode.selectedIndex = 1;
        simulate(select, 'change');
        expect(metadata.get('slideshow')).to.deep.equal({
          slide_type: 'slide'
        });
      });
    });

    describe('NotebookTools.createNBConvertSelector()', () => {
      it('should create a raw mimetype selector', () => {
        let optionsMap: { [key: string]: JSONValue } = {
          None: '-',
          LaTeX: 'text/latex',
          reST: 'text/restructuredtext',
          HTML: 'text/html',
          Markdown: 'text/markdown',
          Python: 'text/x-python'
        };
        optionsMap.None = '-';
        const tool = NotebookTools.createNBConvertSelector(optionsMap);
        tool.selectNode.selectedIndex = -1;
        notebookTools.addItem({ tool });
        simulate(panel0.node, 'focus');
        NotebookActions.changeCellType(panel0.content, 'raw');
        tabpanel.currentIndex = 2;
        expect(tool).to.be.an.instanceof(NotebookTools.KeySelector);
        expect(tool.key).to.equal('raw_mimetype');
        const select = tool.selectNode;
        expect(select.value).to.equal('');

        const metadata = notebookTools.activeCell!.model.metadata;
        expect(metadata.get('raw_mimetype')).to.be.undefined;
        simulate(select, 'focus');
        tool.selectNode.selectedIndex = 2;
        simulate(select, 'change');
        expect(metadata.get('raw_mimetype')).to.equal('text/restructuredtext');
      });

      it('should have no effect on a code cell', () => {
        let optionsMap: { [key: string]: JSONValue } = {
          None: '-',
          LaTeX: 'text/latex',
          reST: 'text/restructuredtext',
          HTML: 'text/html',
          Markdown: 'text/markdown',
          Python: 'text/x-python'
        };
        const tool = NotebookTools.createNBConvertSelector(optionsMap);
        tool.selectNode.selectedIndex = -1;
        notebookTools.addItem({ tool });
        simulate(panel0.node, 'focus');
        NotebookActions.changeCellType(panel0.content, 'code');

        tabpanel.currentIndex = 2;
        expect(tool).to.be.an.instanceof(NotebookTools.KeySelector);
        expect(tool.key).to.equal('raw_mimetype');
        const select = tool.selectNode;
        expect(select.disabled).to.equal(true);
        expect(select.value).to.equal('');
      });
    });
  });
});
