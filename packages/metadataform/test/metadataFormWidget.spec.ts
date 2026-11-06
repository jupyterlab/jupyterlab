/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { JSONExt } from '@lumino/coreutils';
import type { PanelLayout } from '@lumino/widgets';
import { Widget } from '@lumino/widgets';
import type { Context } from '@jupyterlab/docregistry';
import type { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { NotebookTools, NotebookTracker } from '@jupyterlab/notebook';
import {
  initNotebookContext,
  NBTestUtils
} from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer, sleep } from '@jupyterlab/testing';
import { Collapser } from '@jupyterlab/ui-components';
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

/**
 * A text field that fills an empty value when it mounts, as the environment
 * widget of pixi-kernel does.
 */
function FillOnMount(props: FieldProps): JSX.Element {
  const { formData, idSchema, onChange } = props;
  React.useEffect(() => {
    if (!formData) onChange('filled');
  }, [formData, onChange]);
  return React.createElement('input', {
    id: idSchema.$id,
    value: formData ?? '',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(event.target.value)
  });
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

  it('should bind the form callbacks to the cell the form was built for', async () => {
    const metadataForm = await buildForm();
    const content = tracker.currentWidget!.content;
    const firstCell = content.widgets[0];
    const input = metadataForm.node.querySelector<HTMLInputElement>(
      'input[id$="_/cell-metadata"]'
    )!;

    // Render the form element to grab the wired-up callbacks.
    const element = metadataForm.form!.render();
    expect(element).not.toBeNull();
    const props = element!.props;

    // Switch to another code cell after the form was built.
    content.activeCellIndex = 3;
    const secondCell = tracker.activeCell!;
    expect(secondCell).not.toBe(firstCell);

    // A change in the form must not write to the newly active cell.
    await typeInto(input, 'stale onchange');
    expect(secondCell.model!.getMetadata('cell-metadata')).toBeUndefined();

    // The custom-field formContext path is guarded the same way.
    props.formContext.updateMetadata({ '/cell-metadata': 'stale field' }, true);
    expect(secondCell.model!.getMetadata('cell-metadata')).toBeUndefined();

    // A change in the form writes again once the original cell is active.
    content.activeCellIndex = 0;
    await typeInto(input, 'fresh value');
    expect(firstCell.model!.getMetadata('cell-metadata')).toBe('fresh value');
  });

  it('should not update metadata from an obsolete form for the same cell', async () => {
    const model = tracker.activeCell!.model;
    model.setMetadata('cell-metadata', 'before');
    const metadataForm = await buildForm();
    const obsolete = metadataForm.form!;
    const obsoleteInput = obsolete.node.querySelector<HTMLInputElement>(
      'input[id$="_/cell-metadata"]'
    )!;
    const obsoleteContext = obsolete.render()!.props.formContext;
    try {
      // A newer form replaces it for the same cell.
      model.setMetadata('cell-metadata', 'newer');
      metadataForm.updateMetadata({}, true);
      const current = metadataForm.form!;
      expect(current).not.toBe(obsolete);
      current.update();
      await sleep(100);
      await current.renderPromise;

      // Neither a field nor the custom-field context of the obsolete form writes.
      await typeInto(obsoleteInput, 'obsolete input');
      expect(model.getMetadata('cell-metadata')).toBe('newer');
      obsoleteContext.updateMetadata(
        { '/cell-metadata': 'obsolete custom' },
        true
      );
      expect(model.getMetadata('cell-metadata')).toBe('newer');
      expect(metadataForm.form).toBe(current);

      // Both paths of the current form write.
      const currentInput = current.node.querySelector<HTMLInputElement>(
        'input[id$="_/cell-metadata"]'
      )!;
      await typeInto(currentInput, 'current input');
      expect(model.getMetadata('cell-metadata')).toBe('current input');
      const currentContext = current.render()!.props.formContext;
      currentContext.updateMetadata({ '/cell-metadata': 'current custom' });
      expect(model.getMetadata('cell-metadata')).toBe('current custom');
    } finally {
      obsolete.dispose();
    }
  });

  it('should not write from a form mounted again after the active cell changed', async () => {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: JSONExt.deepCopy(schema),
      metaInformation,
      uiSchema: {
        '/cell-metadata': { 'ui:field': FillOnMount }
      } as unknown as MetadataForm.IUiSchema,
      pluginId: 'test-plugin'
    });
    notebookTools.addSection({ sectionName: 'testSchema', tool: metadataForm });
    metadataForm.notebookTools = notebookTools;
    // The section is collapsed, so the form is not rebuilt for another cell.
    Widget.attach(notebookTools, document.body);
    metadataForm.updateMetadata({}, true);
    await sleep(100);
    await metadataForm.form!.renderPromise;
    const content = tracker.currentWidget!.content;
    content.activeCellIndex = 3;
    const secondCell = tracker.activeCell!;

    // The Property Inspector detaches and attaches the notebook tools when
    // another notebook gets the focus, which mounts the form again.
    Widget.detach(notebookTools);
    Widget.attach(notebookTools, document.body);
    await sleep(100);
    await metadataForm.form?.renderPromise;

    expect(secondCell.model.getMetadata('cell-metadata')).toBeUndefined();
  });

  async function buildVisibleForm(
    uiSchema?: MetadataForm.IUiSchema
  ): Promise<MetadataFormWidget> {
    const metadataForm = new MetadataFormWidget({
      metadataSchema: JSONExt.deepCopy(schema),
      metaInformation,
      uiSchema,
      pluginId: 'test-plugin'
    });
    notebookTools.addSection({ sectionName: 'testSchema', tool: metadataForm });
    metadataForm.notebookTools = notebookTools;
    Widget.attach(notebookTools, document.body);
    const collapser = (notebookTools.layout as PanelLayout).widgets.find(
      widget => widget instanceof Collapser && widget.contains(metadataForm)
    ) as Collapser;
    // Expanding the section shows the form, which builds it.
    collapser.collapsed = false;
    await sleep(100);
    await metadataForm.form!.renderPromise;
    return metadataForm;
  }

  it('should show the metadata of the active cell when attached again', async () => {
    const content = tracker.currentWidget!.content;
    content.widgets[3].model.setMetadata('cell-metadata', 'second');
    const metadataForm = await buildVisibleForm();

    // The Property Inspector detaches the notebook tools while another
    // document has the focus.
    Widget.detach(notebookTools);
    content.activeCellIndex = 3;
    Widget.attach(notebookTools, document.body);
    await sleep(100);
    await metadataForm.form!.renderPromise;

    const input = metadataForm.node.querySelector<HTMLInputElement>(
      'input[id$="_/cell-metadata"]'
    )!;
    expect(input.value).toBe('second');
  });

  it('should write an edit to the active cell after being attached again', async () => {
    const content = tracker.currentWidget!.content;
    const metadataForm = await buildVisibleForm();

    Widget.detach(notebookTools);
    content.activeCellIndex = 3;
    const secondCell = tracker.activeCell!;
    Widget.attach(notebookTools, document.body);
    await sleep(100);
    await metadataForm.form!.renderPromise;

    const input = metadataForm.node.querySelector<HTMLInputElement>(
      'input[id$="_/cell-metadata"]'
    )!;
    await typeInto(input, 'edited');
    expect(secondCell.model.getMetadata('cell-metadata')).toBe('edited');
  });

  it('should not overwrite an edit when a hidden form is attached again', async () => {
    const metadataForm = await buildVisibleForm({
      '/cell-metadata': { 'ui:field': FillOnMount }
    } as unknown as MetadataForm.IUiSchema);
    const model = tracker.activeCell!.model;
    const input = metadataForm.node.querySelector<HTMLInputElement>(
      'input[id$="_/cell-metadata"]'
    )!;
    await typeInto(input, 'edited');

    // A collapsed sidebar hides the form, and the Property Inspector attaches
    // it again when another document and then the notebook get the focus.
    notebookTools.hide();
    Widget.detach(notebookTools);
    Widget.attach(notebookTools, document.body);
    await sleep(100);

    expect(model.getMetadata('cell-metadata')).toBe('edited');
  });

  it('should not log an error when added to an expanded section', () => {
    notebookTools.addSection({ sectionName: 'expanded' });
    Widget.attach(notebookTools, document.body);
    const collapser = (notebookTools.layout as PanelLayout).widgets.find(
      widget => widget instanceof Collapser
    ) as Collapser;
    collapser.collapsed = false;
    const error = jest.spyOn(console, 'error');
    try {
      notebookTools.addItem({
        section: 'expanded',
        tool: new MetadataFormWidget({
          metadataSchema: JSONExt.deepCopy(schema),
          metaInformation,
          pluginId: 'test-plugin'
        })
      });
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
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
