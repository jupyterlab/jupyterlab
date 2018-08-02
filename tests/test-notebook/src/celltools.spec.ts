// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { Message } from '@phosphor/messaging';

import { TabPanel, Widget } from '@phosphor/widgets';

import { simulate } from 'simulate-event';

import { CodeMirrorEditorFactory } from '@jupyterlab/codemirror';

import { ObservableJSON } from '@jupyterlab/observables';

import {
  CellTools,
  NotebookPanel,
  NotebookTracker,
  NotebookActions
} from '@jupyterlab/notebook';

import {
  createNotebookContext,
  sleep,
  NBTestUtils
} from '@jupyterlab/testutils';

class LogTool extends CellTools.Tool {
  methods: string[] = [];

  protected onActiveCellChanged(msg: Message): void {
    super.onActiveCellChanged(msg);
    this.methods.push('onActiveCellChanged');
  }

  protected onSelectionChanged(msg: Message): void {
    super.onSelectionChanged(msg);
    this.methods.push('onSelectionChanged');
  }

  protected onMetadataChanged(msg: ObservableJSON.ChangeMessage): void {
    super.onMetadataChanged(msg);
    this.methods.push('onMetadataChanged');
  }
}

class LogKeySelector extends CellTools.KeySelector {
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

  protected onMetadataChanged(message: ObservableJSON.ChangeMessage): void {
    super.onMetadataChanged(message);
    this.methods.push('onMetadataChanged');
  }

  protected onValueChanged(): void {
    super.onValueChanged();
    this.methods.push('onValueChanged');
  }
}

describe('@jupyterlab/notebook', () => {
  describe('celltools', () => {
    let celltools: CellTools;
    let tabpanel: TabPanel;
    let tracker: NotebookTracker;
    let panel0: NotebookPanel;
    let panel1: NotebookPanel;

    beforeEach(async () => {
      const context0 = await createNotebookContext();
      await context0.initialize(true);
      panel0 = NBTestUtils.createNotebookPanel(context0);
      NBTestUtils.populateNotebook(panel0.content);

      const context1 = await createNotebookContext();
      await context1.initialize(true);
      panel1 = NBTestUtils.createNotebookPanel(context1);
      NBTestUtils.populateNotebook(panel1.content);

      tracker = new NotebookTracker({ namespace: 'notebook' });
      tracker.add(panel0);
      tracker.add(panel1);
      celltools = new CellTools({ tracker });
      tabpanel = new TabPanel();
      tabpanel.addWidget(panel0);
      tabpanel.addWidget(panel1);
      tabpanel.addWidget(celltools);
      tabpanel.node.style.height = '800px';
      Widget.attach(tabpanel, document.body);
      // Give the posted messages a chance to be handled.
      await sleep();
    });

    afterEach(() => {
      tabpanel.dispose();
      celltools.dispose();
    });

    describe('CellTools', () => {
      describe('#constructor()', () => {
        it('should create a celltools object', () => {
          expect(celltools).to.be.an.instanceof(CellTools);
        });
      });

      describe('#activeCell', () => {
        it('should be the active cell', () => {
          expect(celltools.activeCell).to.equal(panel1.content.activeCell);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(celltools.activeCell).to.equal(panel0.content.activeCell);
        });
      });

      describe('#selectedCells', () => {
        it('should be the currently selected cells', () => {
          expect(celltools.selectedCells).to.deep.equal([
            panel1.content.activeCell
          ]);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(celltools.selectedCells).to.deep.equal([
            panel0.content.activeCell
          ]);
          panel0.content.select(panel0.content.widgets[1]);
          expect(celltools.selectedCells.length).to.equal(2);
        });
      });

      describe('#addItem()', () => {
        it('should add a cell tool item', () => {
          const tool = new CellTools.Tool();
          celltools.addItem({ tool });
          tool.dispose();
        });

        it('should accept a rank', () => {
          const tool = new CellTools.Tool();
          celltools.addItem({ tool, rank: 100 });
          tool.dispose();
        });
      });
    });

    describe('CellTools.Tool', () => {
      describe('#constructor', () => {
        it('should create a new base tool', () => {
          const tool = new CellTools.Tool();
          expect(tool).to.be.an.instanceof(CellTools.Tool);
        });
      });

      describe('#parent', () => {
        it('should be the celltools object used by the tool', () => {
          const tool = new CellTools.Tool({});
          celltools.addItem({ tool });
          expect(tool.parent).to.equal(celltools);
        });
      });

      describe('#onActiveCellChanged()', () => {
        it('should be called when the active cell changes', () => {
          const tool = new LogTool({});
          celltools.addItem({ tool });
          tool.methods = [];
          simulate(panel0.node, 'focus');
          expect(tool.methods).to.contain('onActiveCellChanged');
        });
      });

      describe('#onSelectionChanged()', () => {
        it('should be called when the selection changes', () => {
          const tool = new LogTool({});
          celltools.addItem({ tool });
          tool.methods = [];
          const current = tracker.currentWidget;
          current.content.select(current.content.widgets[1]);
          expect(tool.methods).to.contain('onSelectionChanged');
        });
      });

      describe('#onMetadataChanged()', () => {
        it('should be called when the metadata changes', () => {
          const tool = new LogTool({});
          celltools.addItem({ tool });
          tool.methods = [];
          const metadata = celltools.activeCell.model.metadata;
          metadata.set('foo', 1);
          metadata.set('foo', 2);
          expect(tool.methods).to.contain('onMetadataChanged');
        });
      });
    });

    describe('CellTools.ActiveCellTool', () => {
      it('should create a new active cell tool', () => {
        const tool = new CellTools.ActiveCellTool();
        celltools.addItem({ tool });
        expect(tool).to.be.an.instanceof(CellTools.ActiveCellTool);
      });

      it('should handle a change to the active cell', () => {
        const tool = new CellTools.ActiveCellTool();
        celltools.addItem({ tool });
        const widget = tracker.currentWidget;
        widget.content.activeCellIndex++;
        widget.content.activeCell.model.metadata.set('bar', 1);
        expect(tool.node.querySelector('.jp-InputArea-editor')).to.be.ok;
      });
    });

    describe('CellTools.MetadataEditorTool', () => {
      const editorServices = new CodeMirrorEditorFactory();
      const editorFactory = editorServices.newInlineEditor.bind(editorServices);

      it('should create a new metadata editor tool', () => {
        const tool = new CellTools.MetadataEditorTool({ editorFactory });
        expect(tool).to.be.an.instanceof(CellTools.MetadataEditorTool);
      });

      it('should handle a change to the active cell', () => {
        const tool = new CellTools.MetadataEditorTool({ editorFactory });
        celltools.addItem({ tool });
        const model = tool.editor.model;
        expect(JSON.stringify(model.value.text)).to.be.ok;
        const widget = tracker.currentWidget;
        widget.content.activeCellIndex++;
        widget.content.activeCell.model.metadata.set('bar', 1);
        expect(JSON.stringify(model.value.text)).to.contain('bar');
      });

      it('should handle a change to the metadata', () => {
        const tool = new CellTools.MetadataEditorTool({ editorFactory });
        celltools.addItem({ tool });
        const model = tool.editor.model;
        const previous = model.value.text;
        const metadata = celltools.activeCell.model.metadata;
        metadata.set('foo', 1);
        expect(model.value.text).to.not.equal(previous);
      });
    });

    describe('CellTools.KeySelector', () => {
      let tool: LogKeySelector;

      beforeEach(() => {
        tool = new LogKeySelector({
          key: 'foo',
          optionsMap: {
            bar: 1,
            baz: [1, 2, 'a']
          }
        });
        celltools.addItem({ tool });
        simulate(panel0.node, 'focus');
        tabpanel.currentIndex = 2;
      });

      afterEach(() => {
        tool.dispose();
      });

      describe('#constructor()', () => {
        it('should create a new key selector', () => {
          expect(tool).to.be.an.instanceof(CellTools.KeySelector);
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
            const metadata = celltools.activeCell.model.metadata;
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
          celltools.dispose();
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
          const metadata = celltools.activeCell.model.metadata;
          expect(metadata.get('foo')).to.deep.equal([1, 2, 'a']);
        });
      });

      describe('#onActiveCellChanged()', () => {
        it('should update the select value', () => {
          const cell = panel0.content.model.cells.get(1);
          cell.metadata.set('foo', 1);
          panel0.content.activeCellIndex = 1;
          expect(tool.methods).to.contain('onActiveCellChanged');
          expect(tool.selectNode.value).to.equal('1');
        });
      });

      describe('#onMetadataChanged()', () => {
        it('should update the select value', () => {
          const metadata = celltools.activeCell.model.metadata;
          metadata.set('foo', 1);
          expect(tool.methods).to.contain('onMetadataChanged');
          expect(tool.selectNode.value).to.equal('1');
        });
      });
    });

    describe('CellTools.createSlideShowSelector()', () => {
      it('should create a slide show selector', () => {
        const tool = CellTools.createSlideShowSelector();
        tool.selectNode.selectedIndex = -1;
        celltools.addItem({ tool });
        simulate(panel0.node, 'focus');
        tabpanel.currentIndex = 2;
        expect(tool).to.be.an.instanceof(CellTools.KeySelector);
        expect(tool.key).to.equal('slideshow');
        const select = tool.selectNode;
        expect(select.value).to.equal('');
        const metadata = celltools.activeCell.model.metadata;
        expect(metadata.get('slideshow')).to.be.undefined;
        simulate(select, 'focus');
        tool.selectNode.selectedIndex = 1;
        simulate(select, 'change');
        expect(metadata.get('slideshow')).to.deep.equal({
          slide_type: 'slide'
        });
      });
    });

    describe('CellTools.createNBConvertSelector()', () => {
      it('should create a raw mimetype selector', () => {
        const tool = CellTools.createNBConvertSelector();
        tool.selectNode.selectedIndex = -1;
        celltools.addItem({ tool });
        simulate(panel0.node, 'focus');
        NotebookActions.changeCellType(panel0.content, 'raw');
        tabpanel.currentIndex = 2;
        expect(tool).to.be.an.instanceof(CellTools.KeySelector);
        expect(tool.key).to.equal('raw_mimetype');
        const select = tool.selectNode;
        expect(select.value).to.equal('');

        const metadata = celltools.activeCell.model.metadata;
        expect(metadata.get('raw_mimetype')).to.be.undefined;
        simulate(select, 'focus');
        tool.selectNode.selectedIndex = 2;
        simulate(select, 'change');
        expect(metadata.get('raw_mimetype')).to.equal('text/restructuredtext');
      });

      it('should have no effect on a code cell', () => {
        const tool = CellTools.createNBConvertSelector();
        tool.selectNode.selectedIndex = -1;
        celltools.addItem({ tool });
        simulate(panel0.node, 'focus');
        NotebookActions.changeCellType(panel0.content, 'code');

        tabpanel.currentIndex = 2;
        expect(tool).to.be.an.instanceof(CellTools.KeySelector);
        expect(tool.key).to.equal('raw_mimetype');
        const select = tool.selectNode;
        expect(select.disabled).to.equal(true);
        expect(select.value).to.equal('');
      });
    });
  });
});
