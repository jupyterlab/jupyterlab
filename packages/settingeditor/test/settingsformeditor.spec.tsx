// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { nullTranslator } from '@jupyterlab/translation';
import { SettingsFormEditor } from '../src/SettingsFormEditor';
import React from 'react';
import renderer, { act } from 'react-test-renderer';
import type { ISettingRegistry, Settings } from '@jupyterlab/settingregistry';
import { SettingRegistry } from '@jupyterlab/settingregistry';
import { FormComponent } from '@jupyterlab/ui-components';
import { TestConnector } from './utils';
import type { IChangeEvent } from '@rjsf/core';
import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';

class RecordingConnector extends TestConnector {
  readonly saveRequests: string[] = [];

  async save(id: string, raw: string): Promise<void> {
    this.saveRequests.push(raw);
    return super.save(id, raw);
  }
}

function createChangeEvent(
  formData: ReadonlyPartialJSONObject
): IChangeEvent<ReadonlyPartialJSONObject> {
  return {
    errors: [],
    formData
  } as unknown as IChangeEvent<ReadonlyPartialJSONObject>;
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('@jupyterlab/settingeditor', () => {
  describe('SettingFormEditor', () => {
    let connector: TestConnector;
    let registry: SettingRegistry;
    let settings: Settings | null;

    beforeAll(() => {
      connector = new TestConnector();
    });

    beforeEach(() => {
      registry = new SettingRegistry({ connector });
    });

    afterEach(async () => {
      if (settings) {
        settings.dispose();
        settings = null;
      }
      connector.schemas = {};
      await connector.clear();
    });

    it('should render a dummy schema', async () => {
      const id = 'alpha';
      const schema: ISettingRegistry.ISchema = { type: 'object' };

      connector.schemas[id] = schema;

      settings = (await registry.load(id)) as Settings;

      const component = renderer.create(
        <SettingsFormEditor
          filteredValues={'all'}
          hasError={() => void 0}
          onSelect={() => void 0}
          renderers={{}}
          settings={settings}
          translator={nullTranslator}
          updateDirtyState={() => void 0}
        ></SettingsFormEditor>
      );

      expect(component).not.toBeNull();
    });

    it('should render a subset of the schema', async () => {
      // If
      const id = 'alpha';
      const schema: ISettingRegistry.ISchema = {
        type: 'object',
        properties: {
          keyA: { type: 'string', default: 'A' },
          keyB: { type: 'string', default: 'B' },
          keyC: { title: 'Third key', type: 'string', default: 'C' },
          keyD: { type: 'string', default: 'D' }
        }
      };
      connector.schemas[id] = schema;
      settings = (await registry.load(id)) as Settings;

      // When
      const component = renderer.create(
        <SettingsFormEditor
          // Filter by field and by title
          filteredValues={['keyA', 'Third key']}
          hasError={() => void 0}
          onSelect={() => void 0}
          renderers={{}}
          settings={settings}
          translator={nullTranslator}
          updateDirtyState={() => void 0}
        ></SettingsFormEditor>
      );

      // Then
      const instance = component.root;
      const form = instance.findByType(FormComponent);
      expect(form.props.formData).toEqual({ keyA: 'A', keyC: 'C' });
      expect(Object.keys(form.props.schema.properties)).toEqual(
        Object.keys(form.props.formData)
      );
    });

    it('should render all properties when filteredValues is tag', async () => {
      const id = 'alpha';
      const schema: ISettingRegistry.ISchema = {
        type: 'object',
        tags: ['my-tag'],
        properties: {
          keyA: { type: 'string', default: 'A' },
          keyB: { type: 'string', default: 'B' }
        }
      };
      connector.schemas[id] = schema;
      settings = (await registry.load(id)) as Settings;

      const component = renderer.create(
        <SettingsFormEditor
          filteredValues={'tag'}
          hasError={() => void 0}
          onSelect={() => void 0}
          renderers={{}}
          settings={settings}
          translator={nullTranslator}
          updateDirtyState={() => void 0}
        />
      );

      const form = component.root.findByType(FormComponent);
      expect(Object.keys(form.props.schema.properties ?? {})).toEqual([
        'keyA',
        'keyB'
      ]);
    });

    it('should preserve pending form data when settings change before save', async () => {
      jest.useFakeTimers();

      const id = 'alpha';
      const field = 'settings';
      const raceConnector = new RecordingConnector();
      const raceRegistry = new SettingRegistry({ connector: raceConnector });
      let component: renderer.ReactTestRenderer | null = null;

      try {
        raceConnector.schemas[id] = {
          type: 'object',
          properties: {
            [field]: {
              type: 'object',
              properties: {
                first: { type: 'boolean', default: false },
                second: { type: 'boolean', default: false }
              }
            }
          }
        };
        settings = (await raceRegistry.load(id)) as Settings;

        component = renderer.create(
          <SettingsFormEditor
            filteredValues={'all'}
            hasError={() => void 0}
            onSelect={() => void 0}
            renderers={{}}
            settings={settings}
            translator={nullTranslator}
            updateDirtyState={() => void 0}
          ></SettingsFormEditor>
        );

        const form = component.root.findByType(FormComponent);

        await act(async () => {
          form.props.onChange(
            createChangeEvent({
              [field]: { first: true, second: true }
            })
          );
        });

        await act(async () => {
          await raceRegistry.upload(
            id,
            JSON.stringify({ [field]: { first: true } }, undefined, 4)
          );
        });

        await act(async () => {
          jest.advanceTimersByTime(500);
          await flushPromises();
        });

        expect(raceConnector.saveRequests).toHaveLength(2);
        expect(JSON.parse(raceConnector.saveRequests[1])).toEqual({
          [field]: { first: true, second: true }
        });
      } finally {
        component?.unmount();
        await raceConnector.clear();
        jest.useRealTimers();
      }
    });
  });
});
