/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Context } from '@jupyterlab/docregistry';
import { ReactWidget } from '@jupyterlab/apputils';
import type { INotebookModel, NotebookPanel } from '@jupyterlab/notebook';
import { NotebookTools, NotebookTracker } from '@jupyterlab/notebook';
import {
  initNotebookContext,
  NBTestUtils
} from '@jupyterlab/notebook/lib/testutils';
import { JupyterServer, sleep } from '@jupyterlab/testing';
import { JSONExt } from '@lumino/coreutils';
import { MessageLoop } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import type { IChangeEvent } from '@rjsf/core';
import React from 'react';
import { FormWidget } from '../src/form';
import { MetadataFormWidget } from '../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('metadataform initialization flushed by another root unmount', () => {
  let context: Context<INotebookModel>;
  let panel: NotebookPanel;
  let tracker: NotebookTracker;
  let notebookTools: NotebookTools;
  let metadataForm: MetadataFormWidget;
  let forms: Set<FormWidget>;

  function buildPendingForm(): FormWidget {
    metadataForm.updateMetadata({}, true);
    const form = metadataForm.form!;
    forms.add(form);
    return form;
  }

  function flushByUnmount(form: FormWidget, transition: () => void): void {
    const otherRoot = new (class extends ReactWidget {
      render(): null {
        return null;
      }
    })();
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.addEventListener('click', () => {
      // Native click priority queues this React render synchronously, while
      // the unrelated root's unmount subsequently flushes it.
      MessageLoop.sendMessage(form, Widget.Msg.UpdateRequest);
      transition();
      MessageLoop.sendMessage(otherRoot, Widget.Msg.UpdateRequest);
    });
    try {
      button.click();
    } finally {
      button.remove();
      otherRoot.dispose();
    }
  }

  function captureInitializationStacks(): string[] {
    const stacks: string[] = [];
    // Observe the initialization where RJSF reports it, before the form
    // decides what to write.
    const render = FormWidget.prototype.render;
    function observedRender(this: FormWidget): JSX.Element | null {
      const element = render.call(this);
      if (element === null) return null;
      return React.cloneElement(element, {
        onChange: (event: IChangeEvent, id?: string) => {
          if (id === undefined && '/tags' in (event.formData ?? {})) {
            const limit = Error.stackTraceLimit;
            try {
              Error.stackTraceLimit = 100;
              stacks.push(new Error('Metadata initialization').stack ?? '');
            } finally {
              Error.stackTraceLimit = limit;
            }
          }
          element.props.onChange(event, id);
        }
      });
    }
    jest
      .spyOn(FormWidget.prototype, 'render')
      .mockImplementation(observedRender);
    jest.spyOn(metadataForm, 'updateMetadata');
    return stacks;
  }

  function expectNoInitializationWritten(): void {
    const written = jest
      .mocked(metadataForm.updateMetadata)
      .mock.calls.map(([formData]) => formData)
      .filter(formData => '/tags' in formData);
    expect(written).toEqual([]);
  }

  function expectInitializationDuringUnmount(stacks: string[]): void {
    expect(stacks).toHaveLength(1);
    expect(stacks[0]).toMatch(/at [^\n]*\.unmount[^\n]*react-dom/);
    expect(stacks[0]).toMatch(/@rjsf[\\/]core/);
  }

  beforeEach(async () => {
    forms = new Set();
    context = await initNotebookContext();
    panel = NBTestUtils.createNotebookPanel(context);
    NBTestUtils.populateNotebook(panel.content);
    tracker = new NotebookTracker({ namespace: 'notebook' });
    await tracker.add(panel);
    notebookTools = new NotebookTools({ tracker });
    metadataForm = new MetadataFormWidget({
      metadataSchema: {
        type: 'object',
        properties: {
          '/tags': {
            type: 'array',
            items: { type: 'string' },
            default: []
          },
          '/editable': { type: 'boolean', default: true },
          '/deletable': { type: 'boolean', default: true },
          '/slideshow/slide_type': { type: 'string', default: '' }
        }
      },
      metaInformation: {},
      pluginId: 'stale-initialization-test'
    });
    notebookTools.addSection({
      sectionName: 'testSchema',
      tool: metadataForm
    });
    metadataForm.notebookTools = notebookTools;

    // Load the lazy validator before controlling the later render ordering.
    const warmup = buildPendingForm();
    warmup.update();
    await sleep(100);
    await warmup.renderPromise;
    // The tests need the loaded validator and hidden notebook tools, as with
    // a collapsed sidebar, which do not rebuild the form on changes.
    if (
      warmup.render() === null ||
      notebookTools.isVisible ||
      notebookTools.isAttached
    ) {
      throw new Error('Unexpected test setup');
    }

    const source = panel.content.widgets[0].model;
    source.setMetadata('tags', ['not-in-handout']);
    source.deleteMetadata('editable');
    source.deleteMetadata('deletable');
    source.deleteMetadata('slideshow');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const form of forms) {
      form.dispose();
    }
    notebookTools.dispose();
    tracker.dispose();
    panel.dispose();
    context.dispose();
  });

  it('preserves the full metadata of another cell when a stale form initializes', () => {
    const source = panel.content.widgets[0];
    const victim = panel.content.widgets[3];
    victim.model.setMetadata('tags', ['exercise-solution']);
    victim.model.setMetadata('editable', false);
    victim.model.setMetadata('deletable', false);
    victim.model.setMetadata('slideshow', {
      slide_type: 'slide',
      extra: 'retain this nested value'
    });
    const sourceBefore = JSONExt.deepCopy(source.model.metadata);
    const victimBefore = JSONExt.deepCopy(victim.model.metadata);
    const staleForm = buildPendingForm();
    const stacks = captureInitializationStacks();

    flushByUnmount(staleForm, () => {
      panel.content.activeCellIndex = 3;
    });
    expect(tracker.activeCell).toBe(victim);

    expectInitializationDuringUnmount(stacks);
    expectNoInitializationWritten();
    expect(victim.model.metadata).toEqual(victimBefore);
    expect(source.model.metadata).toEqual(sourceBefore);
  });

  it('preserves newer metadata when a superseded form initializes for the same cell', () => {
    const source = panel.content.widgets[0];
    const staleForm = buildPendingForm();
    const stacks = captureInitializationStacks();
    let before = JSONExt.deepCopy(source.model.metadata);
    flushByUnmount(staleForm, () => {
      source.model.setMetadata('tags', ['exercise-solution']);
      source.model.setMetadata('editable', false);
      source.model.setMetadata('deletable', false);
      source.model.setMetadata('slideshow', { slide_type: 'slide' });
      buildPendingForm();
      before = JSONExt.deepCopy(source.model.metadata);
    });

    if (stacks.length) {
      expectInitializationDuringUnmount(stacks);
    }
    expectNoInitializationWritten();
    expect(source.model.metadata).toEqual(before);
  });
});
