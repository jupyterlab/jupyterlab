/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONExt } from '@lumino/coreutils';
import { Context } from '@jupyterlab/docregistry';
import {
  INotebookModel,
  NotebookPanel,
  NotebookTools,
  NotebookTracker
} from '@jupyterlab/notebook';
import {
  initNotebookContext,
  NBTestUtils
} from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer, sleep } from '@jupyterlab/testing';
import { MetadataForm, MetadataFormWidget } from '../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('metadataform/form simple', () => {
  let notebookTools: NotebookTools;
  let tracker: NotebookTracker;
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;
  let schema: MetadataForm.IMetadataSchema;
  let metaInformation: MetadataForm.IMetaInformation;

  beforeEach(async () => {
    schema = {
      type: 'object',
      properties: {
        '/cell-metadata': {
          type: 'string'
        },
        '/notebook-metadata': {
          type: 'string'
        }
      }
    };

    metaInformation = {
      '/cell-metadata': {
        cellTypes: ['code']
      },
      '/notebook-metadata': {
        level: 'notebook'
      }
    };

    context = await initNotebookContext();
    panel = NBTestUtils.createNotebookPanel(context);
    NBTestUtils.populateNotebook(panel.content);

    tracker = new NotebookTracker({ namespace: 'notebook' });
    await tracker.add(panel);
    notebookTools = new NotebookTools({ tracker });

    // Give the posted messages a chance to be handled.
    await sleep();
  });

  afterEach(() => {
    notebookTools.dispose();
    panel.dispose();
    context.dispose();
  });

  async function buildForm(): Promise<MetadataFormWidget> {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: JSONExt.deepCopy(schema),
      metaInformation: metaInformation,
      pluginId: 'test-plugin'
    });
    // add the metadataForm in a section of the notebookTools.
    notebookTools.addSection({ sectionName: 'testSchema', tool: metadataForm });
    // associate notebook to metadataForm.
    metadataForm.notebookTools = notebookTools;
    // Fake update metadata to force build.
    metadataForm.updateMetadata({}, true);
    // Manually update the form (force render).
    metadataForm.form?.update();
    // Wait for the message to be received, and the promise to be updated.
    await sleep(100);
    // Wait for the rendering to be over.
    await metadataForm.form?.renderPromise;

    return metadataForm;
  }

  it('should have only placeholder as no notebook is associated', () => {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: schema,
      metaInformation: metaInformation,
      pluginId: 'test-plugin'
    });
    metadataForm.updateMetadata({}, true);
    const node = metadataForm.node as HTMLElement;
    expect(node.children).toHaveLength(1);
    const formNode = node.children[0];
    expect(formNode.className.split(' ')).toContain(
      'jp-MetadataForm-placeholder'
    );
  });

  it('should return the metadataKeys', async () => {
    const metadataForm = await buildForm();
    expect(metadataForm.metadataKeys).toEqual([
      '/cell-metadata',
      '/notebook-metadata'
    ]);
  });

  it('should return the properties', async () => {
    const metadataForm = await buildForm();
    expect(metadataForm.getProperties('/cell-metadata')).toEqual(
      schema.properties['/cell-metadata']
    );
    expect(metadataForm.getProperties('/notebook-metadata')).toEqual(
      schema.properties['/notebook-metadata']
    );
  });

  it('should set the properties', async () => {
    const metadataForm = await buildForm();
    const node = metadataForm.node as HTMLElement;
    expect(
      node
        .getElementsByClassName('jp-inputFieldWrapper')[0]
        .children[0].getAttribute('type')
    ).toBe('text');

    metadataForm.setProperties('/cell-metadata', { type: 'integer' });
    expect(metadataForm.getProperties('/cell-metadata')).not.toEqual(
      schema.properties['/cell-metadata']
    );

    // Force the form to update and expect the text input has been changed to number input.
    metadataForm.updateMetadata({}, true);
    metadataForm.form?.update();
    await sleep(100);
    expect(
      node
        .getElementsByClassName('jp-inputFieldWrapper')[0]
        .children[0].getAttribute('type')
    ).toBe('number');
  });

  it('should build the form', async () => {
    const metadataForm = await buildForm();

    const node = metadataForm.node as HTMLElement;
    expect(node.children).toHaveLength(1);
    const formNode = node.children[0];
    expect(formNode.className.split(' ')).toContain('jp-MetadataForm');
    expect(formNode.children).toHaveLength(1);
    expect(formNode.children[0].className).toBe('rjsf');

    // Expect 2 inputs in the form.
    expect(
      formNode.getElementsByClassName('jp-inputFieldWrapper')
    ).toHaveLength(2);
  });

  it('should update cell metadata', async () => {
    const metadataForm = await buildForm();
    expect(
      tracker.activeCell?.model.getMetadata('cell-metadata')
    ).toBeUndefined();
    metadataForm.updateMetadata({ '/cell-metadata': 'test value' });
    expect(tracker.activeCell?.model.getMetadata('cell-metadata')).toBe(
      'test value'
    );
  });

  it('should update notebook metadata', async () => {
    const metadataForm = await buildForm();
    expect(
      tracker.currentWidget?.model?.getMetadata('notebook-metadata')
    ).toBeUndefined();
    metadataForm.updateMetadata({ '/notebook-metadata': 'test value' });
    expect(tracker.currentWidget?.model?.getMetadata('notebook-metadata')).toBe(
      'test value'
    );
  });

  it('should not update cell metadata if metadataKey is not in schema', async () => {
    const metadataForm = await buildForm();
    expect(
      tracker.activeCell?.model.getMetadata('fake-metadata')
    ).toBeUndefined();
    metadataForm.updateMetadata({ '/fake-metadata': 'test value' });
    expect(
      tracker.activeCell?.model.getMetadata('fake-metadata')
    ).toBeUndefined();
  });

  it('should not update the cell metadata if the cell type is not a valid one', async () => {
    const metadataForm = await buildForm();

    // Switch to a markdown cell.
    tracker.currentWidget!.content.activeCellIndex++;

    expect(
      tracker.activeCell?.model.getMetadata('cell-metadata')
    ).toBeUndefined();
    metadataForm.updateMetadata({ '/cell-metadata': 'test value' });
    expect(
      tracker.activeCell?.model.getMetadata('cell-metadata')
    ).toBeUndefined();
  });

  it('should not update the form if it is not visible', async () => {
    const metadataForm = await buildForm();

    // Switch to a markdown cell.
    tracker.currentWidget!.content.activeCellIndex++;

    // The form should not be updated from signal because it is not visible.
    metadataForm.form?.update();
    await sleep(100);
    const node = metadataForm.node as HTMLElement;
    expect(node.getElementsByClassName('jp-inputFieldWrapper')).toHaveLength(2);

    // Force the form to update, the cell field should have disappeared.
    metadataForm.updateMetadata({}, true);
    metadataForm.form?.update();
    await sleep(100);
    expect(node.getElementsByClassName('jp-inputFieldWrapper')).toHaveLength(1);
  });
});

describe('metadataform/form conditional', () => {
  let notebookTools: NotebookTools;
  let tracker: NotebookTracker;
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;
  let schema: MetadataForm.IMetadataSchema;
  let metaInformation: MetadataForm.IMetaInformation;

  beforeEach(async () => {
    schema = {
      type: 'object',
      properties: {
        '/condition': {
          type: 'string'
        }
      },
      allOf: [
        {
          if: {
            properties: {
              '/condition': {
                const: 'condition'
              }
            }
          },
          then: {
            properties: {
              '/then': {
                type: 'string'
              }
            }
          },
          else: {
            properties: {
              '/else': {
                type: 'string'
              }
            }
          }
        }
      ]
    };

    metaInformation = {};

    context = await initNotebookContext();
    panel = NBTestUtils.createNotebookPanel(context);
    NBTestUtils.populateNotebook(panel.content);

    tracker = new NotebookTracker({ namespace: 'notebook' });
    await tracker.add(panel);
    notebookTools = new NotebookTools({ tracker });

    // Give the posted messages a chance to be handled.
    await sleep();
  });

  afterEach(() => {
    notebookTools.dispose();
    panel.dispose();
    context.dispose();
  });

  async function buildForm(): Promise<MetadataFormWidget> {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: JSONExt.deepCopy(schema),
      metaInformation: metaInformation,
      pluginId: 'test-plugin'
    });
    // add the metadataForm in a section of the notebookTools.
    notebookTools.addSection({ sectionName: 'testSchema', tool: metadataForm });
    // associate notebook to metadataForm.
    metadataForm.notebookTools = notebookTools;
    // Fake update metadata to force build.
    metadataForm.updateMetadata({}, true);
    // Manually update the form (force render).
    metadataForm.form?.update();
    // Wait for the message to be received, and the promise to be updated.
    await sleep(100);
    // Wait for the rendering to be over.
    await metadataForm.form?.renderPromise;

    return metadataForm;
  }

  it('should return the conditional metadataKeys', async () => {
    const metadataForm = await buildForm();
    expect(metadataForm.metadataKeys).toEqual(['/condition', '/then', '/else']);
  });
});
