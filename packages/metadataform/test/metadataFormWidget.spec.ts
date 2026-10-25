/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONExt } from '@lumino/coreutils';
import type { Context } from '@jupyterlab/docregistry';
import type { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { NotebookTools, NotebookTracker } from '@jupyterlab/notebook';
import {
  initNotebookContext,
  NBTestUtils
} from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer, sleep } from '@jupyterlab/testing';
import type { FieldProps } from '@rjsf/utils';
import React from 'react';
import type { MetadataForm } from '../src';
import { MetadataFormWidget } from '../src';

const server = new JupyterServer();

/**
 * Set the value of a text field, as typing does, and wait for the change.
 */
async function typeInto(input: HTMLInputElement, value: string): Promise<void> {
  // React tracks the value of the field, so set it with the native setter.
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  )!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await sleep(100);
}

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

describe('metadataform/form defaults', () => {
  let notebookTools: NotebookTools;
  let tracker: NotebookTracker;
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;
  let schema: MetadataForm.IMetadataSchema;

  beforeEach(async () => {
    schema = {
      type: 'object',
      properties: {
        '/editable': {
          type: 'boolean',
          default: true
        },
        '/slideshow/slide_type': {
          type: 'string',
          default: ''
        },
        '/tags': {
          type: 'array',
          default: [],
          items: {
            type: 'string'
          }
        }
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

    tracker.activeCell!.model.deleteMetadata('tags');
  });

  afterEach(() => {
    notebookTools.dispose();
    panel.dispose();
    context.dispose();
  });

  async function buildForm(): Promise<MetadataFormWidget> {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: JSONExt.deepCopy(schema),
      metaInformation: {},
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

  it('should not write the default values when building the form', async () => {
    await buildForm();
    const model = tracker.activeCell!.model;
    expect(model.getMetadata('editable')).toBeUndefined();
    expect(model.getMetadata('slideshow')).toBeUndefined();
    expect(model.getMetadata('tags')).toBeUndefined();
  });

  it('should write only the field that is changed in the form', async () => {
    const metadataForm = await buildForm();
    await typeInto(
      metadataForm.node.querySelector<HTMLInputElement>(
        'input[id$="/slideshow/slide_type"]'
      )!,
      'slide'
    );
    const model = tracker.activeCell!.model;
    expect(model.getMetadata('slideshow')).toEqual({ slide_type: 'slide' });
    expect(model.getMetadata('editable')).toBeUndefined();
    expect(model.getMetadata('tags')).toBeUndefined();
  });

  it('should write a default value over an existing value', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('slideshow', { slide_type: 'slide' });
    const metadataForm = await buildForm();
    metadataForm.updateMetadata({ '/slideshow/slide_type': '' });
    expect(model.getMetadata('slideshow')).toEqual({ slide_type: '' });
  });
});

describe('metadataform/form conditional defaults', () => {
  let notebookTools: NotebookTools;
  let tracker: NotebookTracker;
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;

  beforeEach(async () => {
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

  async function buildForm(
    elseHasDefault = true,
    options: { conditionDefault?: boolean; elseKey?: string } = {}
  ): Promise<MetadataFormWidget> {
    const { conditionDefault, elseKey = '/choice' } = options;
    const schema: MetadataForm.IMetadataSchema = {
      type: 'object',
      properties: {
        '/condition':
          conditionDefault === undefined
            ? { type: 'boolean' }
            : { type: 'boolean', default: conditionDefault }
      },
      allOf: [
        {
          if: {
            properties: { '/condition': { const: true } },
            required: ['/condition']
          },
          then: {
            properties: {
              '/choice': { type: 'string', default: 'then-default' }
            }
          },
          else: {
            properties: {
              [elseKey]: elseHasDefault
                ? { type: 'string', default: 'else-default' }
                : { type: 'string', enum: ['then-default', 'another-value'] }
            }
          }
        }
      ]
    };
    const metadataForm = new MetadataFormWidget({
      metadataSchema: schema,
      metaInformation: {},
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

  it('should not write the default of the active then branch', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('condition', true);
    const metadataForm = await buildForm();

    const choice =
      metadataForm.node.querySelector<HTMLInputElement>('input[type="text"]');
    expect(choice?.value).toBe('then-default');
    expect(model.getMetadata('choice')).toBeUndefined();
  });

  it('should not write the default of the active else branch', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('condition', false);
    const metadataForm = await buildForm();

    const choice =
      metadataForm.node.querySelector<HTMLInputElement>('input[type="text"]');
    expect(choice?.value).toBe('else-default');
    expect(model.getMetadata('choice')).toBeUndefined();
  });

  it('should write a value that is only the default of the inactive branch', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('condition', false);
    const metadataForm = await buildForm(false);
    expect(model.getMetadata('choice')).toBeUndefined();

    metadataForm.updateMetadata({
      '/condition': false,
      '/choice': 'then-default'
    });

    expect(model.getMetadata('choice')).toBe('then-default');
  });

  it('should show and keep the current value of a conditional key', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('condition', false);
    model.setMetadata('choice', 'custom-value');
    const metadataForm = await buildForm();

    const choice =
      metadataForm.node.querySelector<HTMLInputElement>('input[type="text"]');
    expect(choice?.value).toBe('custom-value');
    expect(model.getMetadata('choice')).toBe('custom-value');
  });

  it('should write the default of the active branch over an existing value', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('condition', false);
    model.setMetadata('choice', 'custom-value');
    const metadataForm = await buildForm();
    expect(model.getMetadata('choice')).toBe('custom-value');

    metadataForm.updateMetadata({
      '/condition': false,
      '/choice': 'else-default'
    });

    expect(model.getMetadata('choice')).toBe('else-default');
  });

  it('should not write the values that the form fills in for a condition with a default', async () => {
    const model = tracker.activeCell!.model;
    const metadataForm = await buildForm(true, { conditionDefault: true });

    // RJSF selects the branch of the defaults with the metadata, which lacks
    // the condition, and then shows the field of the other branch.
    const condition = metadataForm.node.querySelector<HTMLInputElement>(
      'input[type="checkbox"]'
    );
    const choice =
      metadataForm.node.querySelector<HTMLInputElement>('input[type="text"]');
    expect(condition?.checked).toBe(true);
    expect(choice?.value).toBe('else-default');
    expect(model.getMetadata('condition')).toBeUndefined();
    expect(model.getMetadata('choice')).toBeUndefined();
  });

  it.each(['/choice', '/other'])(
    'should write only the condition when it is switched in the form (else key: %s)',
    async elseKey => {
      const model = tracker.activeCell!.model;
      model.setMetadata('condition', true);
      const metadataForm = await buildForm(true, { elseKey });

      metadataForm.node
        .querySelector<HTMLInputElement>('input[type="checkbox"]')!
        .click();
      await sleep(100);

      expect(model.getMetadata('condition')).toBe(false);
      expect(model.getMetadata('choice')).toBeUndefined();
      expect(model.getMetadata('other')).toBeUndefined();
    }
  );

  it('should write a value that is typed in the form, even if it is a default', async () => {
    const model = tracker.activeCell!.model;
    const metadataForm = await buildForm(false, { conditionDefault: true });
    const choice =
      metadataForm.node.querySelector<HTMLInputElement>('input[type="text"]')!;
    expect(choice.value).toBe('');

    await typeInto(choice, 'then-default');

    expect(model.getMetadata('choice')).toBe('then-default');
    expect(model.getMetadata('condition')).toBeUndefined();
  });

  it.each(['then-default', 'else-default'])(
    'should write what a custom field sends (%s)',
    async value => {
      const model = tracker.activeCell!.model;
      model.setMetadata('condition', true);
      const metadataForm = await buildForm();

      // A custom field sends only its own key.
      metadataForm.updateMetadata({ '/choice': value });

      expect(model.getMetadata('choice')).toBe(value);
    }
  );
});

describe('metadataform/form field ids', () => {
  let notebookTools: NotebookTools;
  let tracker: NotebookTracker;
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;

  beforeEach(async () => {
    context = await initNotebookContext();
    panel = NBTestUtils.createNotebookPanel(context);
    NBTestUtils.populateNotebook(panel.content);

    tracker = new NotebookTracker({ namespace: 'notebook' });
    await tracker.add(panel);
    notebookTools = new NotebookTools({ tracker });

    // Give the posted messages a chance to be handled.
    await sleep();

    const model = tracker.activeCell!.model;
    for (const key of Object.keys(model.metadata)) {
      if (key !== 'trusted') model.deleteMetadata(key);
    }
  });

  afterEach(() => {
    notebookTools.dispose();
    panel.dispose();
    context.dispose();
  });

  async function buildForm(
    properties: MetadataForm.IMetadataSchema['properties'],
    uiSchema: MetadataForm.IUiSchema = {},
    metaInformation: MetadataForm.IMetaInformation = {},
    allOf?: MetadataForm.IMetadataSchema['allOf']
  ): Promise<MetadataFormWidget> {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: { type: 'object', properties, ...(allOf && { allOf }) },
      metaInformation,
      uiSchema,
      pluginId: 'test-plugin'
    });
    notebookTools.addSection({ sectionName: 'testSchema', tool: metadataForm });
    metadataForm.notebookTools = notebookTools;
    metadataForm.updateMetadata({}, true);
    metadataForm.form?.update();
    await sleep(100);
    await metadataForm.form?.renderPromise;
    return metadataForm;
  }

  function cellMetadata(): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      ...tracker.activeCell!.model.metadata
    };
    delete metadata.trusted;
    return metadata;
  }

  it('should write a change when the uiSchema sets the root field id', async () => {
    const metadataForm = await buildForm(
      { '/slideshow/slide_type': { type: 'string', default: '' } },
      { 'ui:rootFieldId': 'custom-root' } as unknown as MetadataForm.IUiSchema
    );
    const input = metadataForm.node.querySelector<HTMLInputElement>(
      'input[id$="/slideshow/slide_type"]'
    )!;
    expect(input.id).toBe('custom-root_/slideshow/slide_type');

    await typeInto(input, 'slide');

    expect(cellMetadata()).toEqual({ slideshow: { slide_type: 'slide' } });
  });

  it.each([0, 1])(
    'should write the changed field when two fields have the same id (field %s)',
    async index => {
      // Field ids join names with `_`, so the nested field `b` of `/a` and the
      // key `/a_b` have the same id.
      const model = tracker.activeCell!.model;
      model.setMetadata('a', { b: 'nested' });
      model.setMetadata('a_b', 'top');
      const metadataForm = await buildForm({
        '/a': { type: 'object', properties: { b: { type: 'string' } } },
        '/a_b': { type: 'string' }
      });
      const inputs =
        metadataForm.node.querySelectorAll<HTMLInputElement>(
          'input[id$="_/a_b"]'
        );
      expect(inputs).toHaveLength(2);

      await typeInto(inputs[index], 'changed');

      expect(model.getMetadata('a')).toEqual({
        b: index === 0 ? 'changed' : 'nested'
      });
      expect(model.getMetadata('a_b')).toBe(index === 0 ? 'top' : 'changed');
    }
  );

  it('should write the changed field when the change shows a field with the same id', async () => {
    // Checking `b` of `/a` selects a branch with the key `/a_b`, whose field
    // has the same id and whose default the form fills in.
    const model = tracker.activeCell!.model;
    model.setMetadata('a', { b: false });
    const metadataForm = await buildForm(
      { '/a': { type: 'object', properties: { b: { type: 'boolean' } } } },
      {},
      {},
      [
        {
          if: {
            properties: {
              '/a': { properties: { b: { const: true } }, required: ['b'] }
            },
            required: ['/a']
          },
          then: {
            properties: { '/a_b': { type: 'string', default: 'auto' } }
          }
        }
      ]
    );

    metadataForm.node
      .querySelector<HTMLInputElement>('input[type="checkbox"]')!
      .click();
    await sleep(100);

    const shown = metadataForm.node.querySelector<HTMLInputElement>(
      'input[type="text"][id$="_/a_b"]'
    );
    expect(shown?.value).toBe('auto');
    expect(cellMetadata()).toEqual({ a: { b: true } });
  });

  it('should write each change when a oneOf option has a field with the id of another key', async () => {
    // The field of `/a` renders its option with its own props, and the field
    // `b` of the option has the same id as the key `/a_b`.
    const model = tracker.activeCell!.model;
    model.setMetadata('a', { b: 'nested' });
    model.setMetadata('a_b', 'top');
    const metadataForm = await buildForm({
      '/a': {
        oneOf: [
          { title: 'B', type: 'object', properties: { b: { type: 'string' } } },
          { title: 'C', type: 'object', properties: { c: { type: 'string' } } }
        ]
      },
      '/a_b': { type: 'string' }
    });
    const inputs = Array.from(
      metadataForm.node.querySelectorAll<HTMLInputElement>('input[type="text"]')
    );
    const nested = inputs.find(input => input.value === 'nested')!;
    const top = inputs.find(input => input.value === 'top')!;
    expect(nested.id).toBe(top.id);

    await typeInto(nested, 'nested changed');
    await typeInto(top, 'top changed');

    expect(model.getMetadata('a')).toEqual({ b: 'nested changed' });
    expect(model.getMetadata('a_b')).toBe('top changed');
  });

  it('should write the last value when a field reports two changes at once', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('note', 'before');
    // A custom field that reports an intermediate and a final value in one
    // interaction; the form reports both changes after it has updated.
    const TwoChanges = (props: FieldProps): JSX.Element =>
      React.createElement(
        'button',
        {
          type: 'button',
          onClick: () => {
            props.onChange('intermediate');
            props.onChange('final');
          }
        },
        'Change'
      );
    const metadataForm = await buildForm({ '/note': { type: 'string' } }, {
      '/note': { 'ui:field': TwoChanges }
    } as unknown as MetadataForm.IUiSchema);

    metadataForm.node.querySelector<HTMLButtonElement>('button')!.click();
    await sleep(100);

    expect(model.getMetadata('note')).toBe('final');
  });

  it('should write the array when one of its items is changed', async () => {
    tracker.activeCell!.model.setMetadata('list', ['first', 'second']);
    const metadataForm = await buildForm({
      '/list': { type: 'array', items: { type: 'string' } }
    });

    await typeInto(
      metadataForm.node.querySelector<HTMLInputElement>(
        'input[id$="_/list_1"]'
      )!,
      'changed'
    );

    expect(cellMetadata()).toEqual({ list: ['first', 'changed'] });
  });

  it.each([
    ['Add item', ['first', 'second', 'new']],
    ['Remove item', ['second']],
    ['Move item down', ['second', 'first']]
  ])('should write the array after the operation %s', async (title, list) => {
    tracker.activeCell!.model.setMetadata('list', ['first', 'second']);
    const metadataForm = await buildForm({
      '/list': { type: 'array', items: { type: 'string', default: 'new' } }
    });

    // The first button with the title belongs to the array or its first item.
    metadataForm.node.querySelector<HTMLElement>(`[title="${title}"]`)!.click();
    await sleep(100);

    expect(cellMetadata()).toEqual({ list });
  });

  it('should write the object when one of its fields is changed', async () => {
    tracker.activeCell!.model.setMetadata('obj', { p: 'old', q: 'kept' });
    const metadataForm = await buildForm({
      '/obj': {
        type: 'object',
        properties: { p: { type: 'string' }, q: { type: 'string' } }
      }
    });

    await typeInto(
      metadataForm.node.querySelector<HTMLInputElement>(
        'input[id$="_/obj_p"]'
      )!,
      'new'
    );

    expect(cellMetadata()).toEqual({ obj: { p: 'new', q: 'kept' } });
  });

  it.each([
    ['null', null],
    ['a string', 'slide'],
    ['a number', 3]
  ])(
    'should show and write a nested key whose parent is %s',
    async (_name, parent) => {
      const model = tracker.activeCell!.model;
      // The model ignores null for a missing key, so set an object first.
      model.setMetadata('slideshow', {});
      model.setMetadata('slideshow', parent);
      const metadataForm = await buildForm({
        '/slideshow/slide_type': { type: 'string', default: '' }
      });
      const input = metadataForm.node.querySelector<HTMLInputElement>(
        'input[id$="/slideshow/slide_type"]'
      )!;
      expect(input.value).toBe('');
      expect(cellMetadata()).toEqual({ slideshow: parent });

      await typeInto(input, 'slide');

      expect(cellMetadata()).toEqual({ slideshow: { slide_type: 'slide' } });
    }
  );

  it('should write a nested key whose intermediate value is not an object', async () => {
    tracker.activeCell!.model.setMetadata('a', { b: 'x', kept: 1 });
    const metadataForm = await buildForm({ '/a/b/c': { type: 'string' } });

    await typeInto(
      metadataForm.node.querySelector<HTMLInputElement>('input[id$="/a/b/c"]')!,
      'value'
    );

    expect(cellMetadata()).toEqual({ a: { b: { c: 'value' }, kept: 1 } });
  });

  it.each([null, 'x', 3, false, ''])(
    'should preserve a non-object intermediate %p when clearing a missing nested key',
    async parent => {
      tracker.activeCell!.model.setMetadata('a', { b: parent, kept: 1 });
      const metadataForm = await buildForm({ '/a/b/c': { type: 'string' } });

      expect(() =>
        metadataForm.updateMetadata({ '/a/b/c': undefined })
      ).not.toThrow();
      expect(cellMetadata()).toEqual({ a: { b: parent, kept: 1 } });
    }
  );

  it('should preserve a non-object intermediate when a displayed default is cleared', async () => {
    tracker.activeCell!.model.setMetadata('a', { b: 3, kept: 1 });
    const metadataForm = await buildForm({
      '/a/b/c': { type: 'string', default: 'placeholder' }
    });
    const input = metadataForm.node.querySelector<HTMLInputElement>(
      'input[id$="/a/b/c"]'
    )!;
    expect(input.value).toBe('placeholder');

    await typeInto(input, '');

    expect(cellMetadata()).toEqual({ a: { b: 3, kept: 1 } });
  });

  it('should still prune empty object ancestors when clearing a missing nested key', async () => {
    tracker.activeCell!.model.setMetadata('a', { b: {}, kept: 1 });
    const metadataForm = await buildForm({ '/a/b/c/d': { type: 'string' } });

    metadataForm.updateMetadata({ '/a/b/c/d': undefined });

    expect(cellMetadata()).toEqual({ a: { kept: 1 } });
  });

  it('should remove the metadata of a field that is cleared', async () => {
    tracker.activeCell!.model.setMetadata('slideshow', { slide_type: 'slide' });
    const metadataForm = await buildForm({
      '/slideshow/slide_type': { type: 'string', default: '' }
    });

    await typeInto(
      metadataForm.node.querySelector<HTMLInputElement>(
        'input[id$="/slideshow/slide_type"]'
      )!,
      ''
    );

    expect(cellMetadata()).toEqual({});
  });

  it('should write a notebook level key that is changed in the form', async () => {
    const metadataForm = await buildForm(
      { '/toc/base_numbering': { type: 'integer' } },
      {},
      { '/toc/base_numbering': { level: 'notebook' } }
    );

    await typeInto(
      metadataForm.node.querySelector<HTMLInputElement>(
        'input[id$="/toc/base_numbering"]'
      )!,
      '3'
    );

    const toc = tracker.currentWidget!.model!.getMetadata('toc') as Record<
      string,
      unknown
    >;
    expect(toc['base_numbering']).toBe(3);
    expect(cellMetadata()).toEqual({});
  });

  it('should write a oneOf field when its option is switched', async () => {
    const metadataForm = await buildForm({
      '/mode': {
        oneOf: [
          {
            title: 'A',
            type: 'object',
            properties: { a: { type: 'string', default: 'x' } }
          },
          {
            title: 'B',
            type: 'object',
            properties: { b: { type: 'string', default: 'y' } }
          }
        ]
      }
    });
    expect(cellMetadata()).toEqual({});

    // The option select has its own id: the field id with a suffix.
    const select = metadataForm.node.querySelector<HTMLSelectElement>(
      'select[id$="_/mode__oneof_select"]'
    )!;
    select.value = '1';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(100);

    expect(cellMetadata()).toEqual({ mode: { b: 'y' } });
  });

  it('should keep the metadata when the form sets a missing null key', async () => {
    // RJSF sets a missing null field to null from an effect, like a change of
    // the field, so the form writes it. The cell model ignores null for a
    // missing key; a null field nested in an object would write the object.
    await buildForm({
      '/heading': { type: 'null', title: 'A heading' },
      '/x': { type: 'string' }
    });
    await sleep(100);

    expect(cellMetadata()).toEqual({});
  });
});
