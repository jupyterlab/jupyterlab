// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CustomEnvWidget,
} from '@jupyterlab/ui-components';
import { framePromise, JupyterServer } from '@jupyterlab/testing';
import { PartialJSONObject, ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';
import {
  nullTranslator,
} from '@jupyterlab/translation';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/ui-components', () => {
  describe('Custom env vars Widget', () => {
  let envConfiguration: PartialJSONObject = {};
  let translator =  nullTranslator;

    it('should render a widget', async () => {
      const widget = new CustomEnvWidget(
        envConfiguration,
        {},
        formData => {
          envConfiguration = formData as PartialJSONObject;
          document.body.setAttribute(
            'data-custom-env-vars',
            JSON.stringify(envConfiguration)
          );
        },
        true,
        translator
      );
  
      Widget.attach(widget, document.body);
      await framePromise();
      let form = widget.node.getElementsByClassName('js-Dialog-form-custom-env').item(0);
      expect(form).not.toBeNull();
    });

    it('should render a checkbox for opening a widget', async () => {
      const widget = new CustomEnvWidget(
        envConfiguration,
        {},
        formData => {
          envConfiguration = formData as PartialJSONObject;
          document.body.setAttribute(
            'data-custom-env-vars',
            JSON.stringify(envConfiguration)
          );
        },
        false,
        translator
      );
  

      Widget.attach(widget, document.body);
      await framePromise();
      await widget.renderPromise;
      let checkbox = widget.node.getElementsByClassName('jp-custom-env-vars-checkbox').item(0);
      simulate(checkbox as HTMLInputElement, 'change');
      let form = widget.node.getElementsByClassName('js-Dialog-form-custom-env').item(0);
      expect(form).not.toBeNull();
    });

    it('should add more fields for setuping custom env variables', async () => {
      const widget = new CustomEnvWidget(
        envConfiguration,
        {},
        formData => {
          envConfiguration = formData as PartialJSONObject;
          document.body.setAttribute(
            'data-custom-env-vars',
            JSON.stringify(envConfiguration)
          );
        },
        true,
        translator
      );
  

      Widget.attach(widget, document.body);
      await framePromise();
      await widget.renderPromise;
      let button = widget.node.getElementsByClassName('js-custom-env').item(0);
      if (button) {
        simulate(button as HTMLElement, 'click');
      } else {
        throw new Error("There is no button");
      }
      let form = widget.node.getElementsByClassName('js-Dialog-form-custom-env').item(0) as HTMLElement | null;
      if (!form) {
        throw new Error("There is no form for setuping custom env variables");
      } else {
        const envNames = form.querySelectorAll('[data-name="env_name"]');
        expect(envNames.length).toBe(2);
      }
    });
  });
});
