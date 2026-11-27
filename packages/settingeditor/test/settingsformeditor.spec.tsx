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
  formData: ReadonlyPartialJSONObject,
  errors: any[] = []
): IChangeEvent<ReadonlyPartialJSONObject> {
  return {
    errors,
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
          filteredValues={{ kind: 'all' }}
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
          keyD: { title: 'Fourth key', type: 'string', default: 'D' }
        }
      };
      connector.schemas[id] = schema;
      settings = (await registry.load(id)) as Settings;

      // When
      const component = renderer.create(
        <SettingsFormEditor
          filteredValues={{
            kind: 'properties',
            matches: [
              { matchedBy: 'key', label: 'keyA', path: ['keyA'] },
              { matchedBy: 'title', label: 'Third key', path: ['keyC'] },
              { matchedBy: 'title', label: 'Nested', path: ['keyD', 'nested'] }
            ]
          }}
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
      expect(form.props.formData).toEqual({ keyA: 'A', keyC: 'C', keyD: 'D' });
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
          filteredValues={{ kind: 'tag' }}
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
            filteredValues={{ kind: 'all' }}
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

    it('should not reorder array items while editing until blur', async () => {
      jest.useFakeTimers();

      const id = 'alpha';
      const testConnector = new RecordingConnector();
      const testRegistry = new SettingRegistry({ connector: testConnector });
      let component: renderer.ReactTestRenderer | null = null;

      try {
        testConnector.schemas[id] = {
          type: 'object',
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rank: { type: 'number' }
                }
              },
              default: [
                { name: 'itemA', rank: 10 },
                { name: 'itemB', rank: 20 }
              ]
            }
          }
        };

        // Transform plugin data to sort toolbar items by rank in composite,
        // matching the behavior of registry.transform in packages/apputils/src/toolbar/factory.ts
        testRegistry.transform(id, {
          compose: plugin => {
            const composite = { ...plugin.data.composite };
            const user = (plugin.data.user.toolbar as any[]) ?? [];
            const items =
              user.length > 0 ? user : ((composite.toolbar as any[]) ?? []);
            composite.toolbar = [...items].sort(
              (a, b) => (a.rank ?? 50) - (b.rank ?? 50)
            );
            plugin.data = { composite, user: plugin.data.user };
            return plugin;
          }
        });

        settings = (await testRegistry.load(id)) as Settings;

        component = renderer.create(
          <SettingsFormEditor
            filteredValues={{ kind: 'all' }}
            hasError={() => void 0}
            onSelect={() => void 0}
            renderers={{}}
            settings={settings}
            translator={nullTranslator}
            updateDirtyState={() => void 0}
          />
        );

        let form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemA');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemB');

        const wrapper = component.root.findByProps({
          className: 'jp-SettingsFormWrapper'
        });

        // Focus inside the form
        await act(async () => {
          wrapper.props.onFocus();
        });

        // Change rank of itemB from 20 to 5 (which would sort before itemA)
        await act(async () => {
          form.props.onChange(
            createChangeEvent({
              toolbar: [
                { name: 'itemA', rank: 10 },
                { name: 'itemB', rank: 5 }
              ]
            })
          );
        });

        // Advance timers by 500ms so debouncer triggers save
        await act(async () => {
          jest.advanceTimersByTime(500);
          await flushPromises();
        });

        // While still focused, toolbar items must NOT have reordered in form formData
        form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemA');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemB');

        // When focus moves between elements inside the form wrapper, items must NOT reorder
        await act(async () => {
          const insideElement = {};
          wrapper.props.onBlur({
            currentTarget: { contains: (node: any) => node === insideElement },
            relatedTarget: insideElement
          });
          await flushPromises();
        });

        form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemA');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemB');

        // Blur the input (user finishes editing and focus leaves the form)
        await act(async () => {
          wrapper.props.onBlur({
            currentTarget: { contains: () => false },
            relatedTarget: null
          });
          await flushPromises();
        });

        // After blur, toolbar items should now be reordered according to rank
        form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemB');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemA');
      } finally {
        component?.unmount();
        await testConnector.clear();
        jest.useRealTimers();
      }
    });

    it('should reorder array items after pressing Enter', async () => {
      jest.useFakeTimers();

      const id = 'alpha';
      const testConnector = new RecordingConnector();
      const testRegistry = new SettingRegistry({ connector: testConnector });
      let component: renderer.ReactTestRenderer | null = null;
      let input: HTMLInputElement | null = null;

      try {
        testConnector.schemas[id] = {
          type: 'object',
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rank: { type: 'number' }
                }
              },
              default: [
                { name: 'itemA', rank: 10 },
                { name: 'itemB', rank: 20 }
              ]
            }
          }
        };

        testRegistry.transform(id, {
          compose: plugin => {
            const composite = { ...plugin.data.composite };
            const user = (plugin.data.user.toolbar as any[]) ?? [];
            const items =
              user.length > 0 ? user : ((composite.toolbar as any[]) ?? []);
            composite.toolbar = [...items].sort(
              (a, b) => (a.rank ?? 50) - (b.rank ?? 50)
            );
            plugin.data = { composite, user: plugin.data.user };
            return plugin;
          }
        });

        settings = (await testRegistry.load(id)) as Settings;

        component = renderer.create(
          <SettingsFormEditor
            filteredValues={{ kind: 'all' }}
            hasError={() => void 0}
            onSelect={() => void 0}
            renderers={{}}
            settings={settings}
            translator={nullTranslator}
            updateDirtyState={() => void 0}
          />
        );

        let form = component.root.findByType(FormComponent);

        // Attach an input element with the form's id prefix to document
        input = document.createElement('input');
        input.id = `jp-SettingsEditor-${id}_toolbar_1_rank`;
        document.body.appendChild(input);
        input.focus();

        // Focus inside the form
        const wrapper = component.root.findByProps({
          className: 'jp-SettingsFormWrapper'
        });
        await act(async () => {
          wrapper.props.onFocus();
        });

        // Change rank of itemB from 20 to 5
        await act(async () => {
          form.props.onChange(
            createChangeEvent({
              toolbar: [
                { name: 'itemA', rank: 10 },
                { name: 'itemB', rank: 5 }
              ]
            })
          );
        });

        // Advance timers by 500ms so debouncer triggers save
        await act(async () => {
          jest.advanceTimersByTime(500);
          await flushPromises();
        });

        // While still focused, toolbar items must NOT have reordered
        form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemA');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemB');

        // Press Enter key while input is active
        await act(async () => {
          wrapper.props.onKeyDown({
            key: 'Enter',
            target: input,
            nativeEvent: { isComposing: false },
            keyCode: 13
          });
          await flushPromises();
        });

        // After Enter, toolbar items should now be reordered according to rank
        form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemB');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemA');
      } finally {
        if (input?.parentNode) {
          input.parentNode.removeChild(input);
        }
        component?.unmount();
        await testConnector.clear();
        jest.useRealTimers();
      }
    });

    it('should ignore Enter key during IME composition', async () => {
      jest.useFakeTimers();

      const id = 'alpha';
      const testConnector = new RecordingConnector();
      const testRegistry = new SettingRegistry({ connector: testConnector });
      let component: renderer.ReactTestRenderer | null = null;
      let input: HTMLInputElement | null = null;

      try {
        testConnector.schemas[id] = {
          type: 'object',
          'jupyter.lab.transform': true,
          properties: {
            toolbar: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  rank: { type: 'number' }
                }
              },
              default: [
                { name: 'itemA', rank: 10 },
                { name: 'itemB', rank: 20 }
              ]
            }
          }
        };

        testRegistry.transform(id, {
          compose: plugin => {
            const composite = { ...plugin.data.composite };
            const user = (plugin.data.user.toolbar as any[]) ?? [];
            const items =
              user.length > 0 ? user : ((composite.toolbar as any[]) ?? []);
            composite.toolbar = [...items].sort(
              (a, b) => (a.rank ?? 50) - (b.rank ?? 50)
            );
            plugin.data = { composite, user: plugin.data.user };
            return plugin;
          }
        });

        settings = (await testRegistry.load(id)) as Settings;

        component = renderer.create(
          <SettingsFormEditor
            filteredValues={{ kind: 'all' }}
            hasError={() => void 0}
            onSelect={() => void 0}
            renderers={{}}
            settings={settings}
            translator={nullTranslator}
            updateDirtyState={() => void 0}
          />
        );

        let form = component.root.findByType(FormComponent);

        input = document.createElement('input');
        input.id = `jp-SettingsEditor-${id}_toolbar_1_rank`;
        document.body.appendChild(input);
        input.focus();

        const wrapper = component.root.findByProps({
          className: 'jp-SettingsFormWrapper'
        });
        await act(async () => {
          wrapper.props.onFocus();
        });

        await act(async () => {
          form.props.onChange(
            createChangeEvent({
              toolbar: [
                { name: 'itemA', rank: 10 },
                { name: 'itemB', rank: 5 }
              ]
            })
          );
        });

        await act(async () => {
          jest.advanceTimersByTime(500);
          await flushPromises();
        });

        // Press Enter key while IME composition is active
        await act(async () => {
          wrapper.props.onKeyDown({
            key: 'Enter',
            target: input,
            nativeEvent: { isComposing: true },
            keyCode: 229
          });
          await flushPromises();
        });

        // Items must NOT have reordered because IME was composing
        form = component.root.findByType(FormComponent);
        expect((form.props.formData.toolbar as any[])[0].name).toBe('itemA');
        expect((form.props.formData.toolbar as any[])[1].name).toBe('itemB');
      } finally {
        if (input?.parentNode) {
          input.parentNode.removeChild(input);
        }
        component?.unmount();
        await testConnector.clear();
        jest.useRealTimers();
      }
    });

    it('should not save invalid values on blur', async () => {
      const id = 'alpha';
      const testConnector = new RecordingConnector();
      const testRegistry = new SettingRegistry({ connector: testConnector });
      let component: renderer.ReactTestRenderer | null = null;
      let hasErrorCalled = false;

      try {
        testConnector.schemas[id] = {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              minimum: 0,
              default: 10
            }
          }
        };

        settings = (await testRegistry.load(id)) as Settings;
        const saveSpy = jest.spyOn(settings, 'save');

        component = renderer.create(
          <SettingsFormEditor
            filteredValues={{ kind: 'all' }}
            hasError={err => {
              hasErrorCalled = err;
            }}
            onSelect={() => void 0}
            renderers={{}}
            settings={settings}
            translator={nullTranslator}
            updateDirtyState={() => void 0}
          />
        );

        let form = component.root.findByType(FormComponent);
        const wrapper = component.root.findByProps({
          className: 'jp-SettingsFormWrapper'
        });

        // Focus inside the form
        await act(async () => {
          wrapper.props.onFocus();
        });

        // Type invalid value -5 with validation error
        await act(async () => {
          form.props.onChange(
            createChangeEvent({ count: -5 }, [
              {
                message: 'should be >= 0',
                name: 'minimum',
                params: {},
                property: '.count',
                schemaPath: '#/properties/count/minimum',
                stack: ''
              }
            ])
          );
        });

        expect(hasErrorCalled).toBe(true);

        // Blur input (focus leaves the form)
        await act(async () => {
          wrapper.props.onBlur({
            currentTarget: { contains: () => false },
            relatedTarget: null
          });
          await flushPromises();
        });

        // Should NOT have called settings.save on blur with invalid data
        expect(saveSpy).not.toHaveBeenCalled();
      } finally {
        component?.unmount();
        await testConnector.clear();
      }
    });

    it('should not commit or sync on Enter when form has validation errors', async () => {
      const id = 'alpha';
      const testConnector = new RecordingConnector();
      const testRegistry = new SettingRegistry({ connector: testConnector });
      let component: renderer.ReactTestRenderer | null = null;
      let input: HTMLInputElement | null = null;

      try {
        testConnector.schemas[id] = {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              minimum: 0,
              default: 10
            }
          }
        };

        settings = (await testRegistry.load(id)) as Settings;
        const saveSpy = jest.spyOn(settings, 'save');

        component = renderer.create(
          <SettingsFormEditor
            filteredValues={{ kind: 'all' }}
            hasError={() => void 0}
            onSelect={() => void 0}
            renderers={{}}
            settings={settings}
            translator={nullTranslator}
            updateDirtyState={() => void 0}
          />
        );

        let form = component.root.findByType(FormComponent);
        const wrapper = component.root.findByProps({
          className: 'jp-SettingsFormWrapper'
        });

        input = document.createElement('input');
        input.id = `jp-SettingsEditor-${id}_count`;
        document.body.appendChild(input);
        input.focus();

        await act(async () => {
          wrapper.props.onFocus();
        });

        // Type invalid value -5 with validation error
        await act(async () => {
          form.props.onChange(
            createChangeEvent({ count: -5 }, [
              {
                message: 'should be >= 0',
                name: 'minimum',
                params: {},
                property: '.count',
                schemaPath: '#/properties/count/minimum',
                stack: ''
              }
            ])
          );
        });

        // Press Enter on the input while it has errors
        await act(async () => {
          wrapper.props.onKeyDown({
            key: 'Enter',
            target: input,
            nativeEvent: { isComposing: false },
            keyCode: 13
          });
          await flushPromises();
        });

        // Should NOT have saved and settings should remain unchanged
        expect(saveSpy).not.toHaveBeenCalled();
        expect((settings.composite as any).count).toBe(10);
      } finally {
        if (input?.parentNode) {
          input.parentNode.removeChild(input);
        }
        component?.unmount();
        await testConnector.clear();
      }
    });
  });
});
