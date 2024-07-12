// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { nullTranslator } from '@jupyterlab/translation';
import { SettingsFormEditor } from '../src/SettingsFormEditor';
import React from 'react';
import renderer from 'react-test-renderer';
import { StateDB } from '@jupyterlab/statedb';
import {
  ISettingRegistry,
  SettingRegistry,
  Settings
} from '@jupyterlab/settingregistry';
import { FormComponent } from '@jupyterlab/ui-components';

class TestConnector extends StateDB {
  schemas: { [key: string]: ISettingRegistry.ISchema } = {};

  async fetch(id: string): Promise<ISettingRegistry.IPlugin | undefined> {
    const fetched = await super.fetch(id);
    if (!fetched && !this.schemas[id]) {
      return undefined;
    }

    const schema: ISettingRegistry.ISchema = this.schemas[id] || {
      type: 'object'
    };
    const composite = {};
    const user = {};
    const raw = (fetched as string) || '{ }';
    const version = 'test';
    return { id, data: { composite, user }, raw, schema, version };
  }

  async list(): Promise<any> {
    return Promise.reject('list method not implemented');
  }
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
          filteredValues={null}
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
  });
});
