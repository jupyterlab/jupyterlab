// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, showDialog, ReactWidget } from '@jupyterlab/apputils';

import * as React from 'react';
import { ISaveOption, SaveAction } from '@jupyterlab/notebook';
import { HTMLSelect, FormGroup, Checkbox } from '@jupyterlab/ui-components';

export type saveValues = { [key: string]: SaveAction };

class BodyComponent extends ReactWidget {
  constructor(options: ISaveOption[], values: Map<string, SaveAction>) {
    super();
    this.options = options;

    let defaultActions = options.map<[string, SaveAction]>(k => [
      k.name,
      k.action
    ]);
    this.optionValues = new Map([...defaultActions, ...values]);
  }

  render() {
    const checks = this.options.map((option, index) => (
      <FormGroup
        key={option.name}
        label={option.label}
        helperText={option.help}
      >
        <HTMLSelect
          name={option.name}
          options={['clear', 'previous', 'save']}
          value={this.optionValues.get(option.name)}
          onChange={(event: any) => {
            this.optionValues.set(option.name, event.target.value);
            this.update();
          }}
        />
      </FormGroup>
    ));
    if (checks.length > 0) {
      checks.push(
        <div key="jupyterlab-remember-choices">
          <Checkbox
            label={'Remember my choices'}
            onChange={(event: any) => {
              this.remember = event.target.value;
            }}
          />
        </div>
      );
    }
    return (
      <div>{checks.length ? checks : 'No options available for saving'}</div>
    );
  }

  getValue() {
    return this.remember ? this.optionValues : null;
  }
  options: ISaveOption[];
  optionValues: Map<string, SaveAction>;
  remember: boolean;
}

export async function saveOptionsDialog(
  options: ISaveOption[],
  values: Map<string, SaveAction>
) {
  return showDialog({
    title: 'Save Notebook with Options',
    body: new BodyComponent(options, values),
    buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Save' })]
  });
}
