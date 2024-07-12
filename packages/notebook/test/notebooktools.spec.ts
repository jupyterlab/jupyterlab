// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Context } from '@jupyterlab/docregistry';
import {
  INotebookModel,
  NotebookPanel,
  NotebookTools,
  NotebookTracker
} from '@jupyterlab/notebook';
import { initNotebookContext } from '@jupyterlab/notebook/lib/testutils';
import { ObservableJSON } from '@jupyterlab/observables';
import { JupyterServer, sleep } from '@jupyterlab/testing';
import { Collapser } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { PanelLayout, TabPanel, Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';
import * as utils from './utils';

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

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/notebook', () => {
  describe('notebooktools', () => {
    let notebookTools: NotebookTools;
    let sectionName: string;
    let tabpanel: TabPanel;
    let tracker: NotebookTracker;
    let context0: Context<INotebookModel>;
    let context1: Context<INotebookModel>;
    let panel0: NotebookPanel;
    let panel1: NotebookPanel;

    beforeEach(async () => {
      context0 = await initNotebookContext();
      panel0 = utils.createNotebookPanel(context0);
      utils.populateNotebook(panel0.content);
      context1 = await initNotebookContext();
      panel1 = utils.createNotebookPanel(context1);
      utils.populateNotebook(panel1.content);
      tracker = new NotebookTracker({ namespace: 'notebook' });
      await tracker.add(panel0);
      await tracker.add(panel1);
      notebookTools = new NotebookTools({ tracker });
      sectionName = 'section';
      notebookTools.addSection({ sectionName: sectionName });
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
          expect(notebookTools).toBeInstanceOf(NotebookTools);
        });
      });

      describe('#activeNotebookPanel', () => {
        it('should be the active notebook', () => {
          expect(notebookTools.activeNotebookPanel).toBe(panel1);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(notebookTools.activeNotebookPanel).toBe(panel0);
        });
      });

      describe('#activeCell', () => {
        it('should be the active cell', () => {
          expect(notebookTools.activeCell).toBe(panel1.content.activeCell);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(notebookTools.activeCell).toBe(panel0.content.activeCell);
        });
      });

      describe('#selectedCells', () => {
        it('should be the currently selected cells', () => {
          expect(notebookTools.selectedCells).toEqual([
            panel1.content.activeCell
          ]);
          tabpanel.currentIndex = 0;
          simulate(panel0.node, 'focus');
          expect(notebookTools.selectedCells).toEqual([
            panel0.content.activeCell
          ]);
          panel0.content.select(panel0.content.widgets[1]);
          expect(notebookTools.selectedCells.length).toBe(2);
        });
      });

      describe('#addSection()', () => {
        it('should add an empty section', () => {
          const newSectionName = 'newSection';
          expect(() => {
            notebookTools.addSection({ sectionName: newSectionName });
          }).not.toThrow();
          const currentWidgets = (
            notebookTools.layout as PanelLayout
          ).widgets.map(w => {
            return (w as Collapser).widget;
          });
          expect(
            currentWidgets.filter(w => w.title.label === newSectionName)
          ).toHaveLength(1);
        });

        it('should add an section with a widget', () => {
          const newSectionName = 'newSection';
          const tool = new NotebookTools.Tool();
          expect(() => {
            notebookTools.addSection({ sectionName: newSectionName, tool });
          }).not.toThrow();
          const currentWidgets = (
            notebookTools.layout as PanelLayout
          ).widgets.map(w => {
            return (w as Collapser).widget;
          });
          const sections = currentWidgets.filter(
            w => w.title.label === newSectionName
          );
          expect(sections).toHaveLength(1);
          expect((sections[0].layout as PanelLayout).widgets).toContain(tool);
        });
      });

      describe('#addItem()', () => {
        it('should add a cell tool item', () => {
          const tool = new NotebookTools.Tool();
          expect(() => {
            notebookTools.addItem({ tool, section: sectionName });
          }).not.toThrow();
          tool.dispose();
        });

        it('should accept a rank', () => {
          const tool = new NotebookTools.Tool();
          expect(() => {
            notebookTools.addItem({ tool, section: sectionName, rank: 100 });
          }).not.toThrow();
          tool.dispose();
        });
      });
    });

    describe('NotebookTools.Tool', () => {
      describe('#constructor', () => {
        it('should create a new base tool', () => {
          const tool = new NotebookTools.Tool();
          expect(tool).toBeInstanceOf(NotebookTools.Tool);
        });
      });

      describe('#parent', () => {
        it('should be the notebooktools object used by the tool', () => {
          const tool = new NotebookTools.Tool({});
          notebookTools.addItem({ tool, section: sectionName });
          expect(tool.notebookTools).toBe(notebookTools);
        });
      });

      describe('#onActiveNotebookPanelChanged()', () => {
        it('should be called when the active notebook panel changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool, section: sectionName });
          tool.methods = [];
          simulate(panel0.node, 'focus');
          expect(tool.methods).toContain('onActiveNotebookPanelChanged');
        });
      });

      describe('#onActiveCellChanged()', () => {
        it('should be called when the active cell changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool, section: sectionName });
          tool.methods = [];
          simulate(panel0.node, 'focus');
          expect(tool.methods).toContain('onActiveCellChanged');
        });
      });

      describe('#onSelectionChanged()', () => {
        it('should be called when the selection changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool, section: sectionName });
          tool.methods = [];
          const current = tracker.currentWidget!;
          current.content.select(current.content.widgets[1]);
          expect(tool.methods).toContain('onSelectionChanged');
        });
      });

      describe('#onActiveCellMetadataChanged()', () => {
        it('should be called when the active cell metadata changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool, section: sectionName });
          tool.methods = [];
          const model = notebookTools.activeCell!.model;
          model.setMetadata('foo', 1);
          model.setMetadata('foo', 2);
          expect(tool.methods).toContain('onActiveCellMetadataChanged');
        });
      });

      describe('#onActiveNotebookPanelMetadataChanged()', () => {
        it('should be called when the active notebook panel metadata changes', () => {
          const tool = new LogTool({});
          notebookTools.addItem({ tool, section: sectionName });
          tool.methods = [];
          const model = notebookTools.activeNotebookPanel!.model!;
          model.setMetadata('foo', 1);
          model.setMetadata('foo', 2);
          expect(tool.methods).toContain(
            'onActiveNotebookPanelMetadataChanged'
          );
        });
      });
    });
  });
});
