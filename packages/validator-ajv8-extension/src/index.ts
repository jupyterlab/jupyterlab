// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module ui-validator-ajv8-extension
 */

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IFormValidator } from '@jupyterlab/ui-components';

import type validatorAjv8 from '@rjsf/validator-ajv8';

/**
 * Provide `@rjsf/validator-ajv8` as the form validator.
 *
 * An alternate implementation would disable this built-in plugin.
 */
const formValidatorPlugin: JupyterFrontEndPlugin<IFormValidator> = {
  id: '@jupyterlab/validator-ajv8-extension:form-validator',
  autoStart: true,
  provides: IFormValidator,
  activate: (app: JupyterFrontEnd): IFormValidator => {
    return {
      getValidator: async () => {
        const validator: typeof validatorAjv8 = (
          await import('@rjsf/validator-ajv8')
        ).default;
        return validator;
      }
    };
  }
};

export default [formValidatorPlugin];
