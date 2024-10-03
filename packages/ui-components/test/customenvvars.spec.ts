// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { framePromise } from '@jupyterlab/testing';
import { CustomEnvWidget } from '@jupyterlab/ui-components';
import { PartialJSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import { nullTranslator } from '@jupyterlab/translation';

describe('#Custom Env Variables', () => {
  describe('Custom Env Variables', () => {
    let translator = nullTranslator;

    it('should render a custom env vars widget', async () => {
      let envConfiguration: PartialJSONObject = {};
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

      let form = widget.node
        .getElementsByClassName('js-Dialog-form-custom-env')
        .item(0);
      expect(form).not.toBeNull();
    });

    it('should render a checkbox for showing custom env vars widget', async () => {
      let envConfiguration: PartialJSONObject = {};
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
      let checkbox = widget.node
        .getElementsByClassName('jp-Dialog-checkbox')
        .item(0);
      const title = 'Setup custom env variables';
      expect(checkbox?.textContent).toBe(title);
    });
  });
});
