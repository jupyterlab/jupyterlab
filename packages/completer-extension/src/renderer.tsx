/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import type { FieldProps } from '@rjsf/utils';
import React, { useState } from 'react';

const AVAILABLE_PROVIDERS = 'availableProviders';

/**
 * Custom setting renderer for provider rank.
 */
export function renderAvailableProviders(props: FieldProps): JSX.Element {
  const { schema } = props;
  const title = schema.title;
  const desc = schema.description;
  const settings: ISettingRegistry.ISettings = props.formContext.settings;
  const userData = settings.get(AVAILABLE_PROVIDERS).user as
    | ReadonlyPartialJSONObject
    | undefined;

  const items = {
    ...(schema.default as { [key: string]: number })
  };
  if (userData) {
    for (const key of Object.keys(items)) {
      if (key in userData) {
        items[key] = userData[key] as number;
      } else {
        items[key] = -1;
      }
    }
  }

  const [settingValue, setValue] = useState(items);
  const onSettingChange = (
    key: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const newValue = {
      ...settingValue,
      [key]: parseInt(e.target.value)
    };

    settings.set(AVAILABLE_PROVIDERS, newValue).catch(console.error);

    setValue(newValue);
  };
  return (
    //TODO Remove hard coded class names
    <div>
      <fieldset>
        <legend>{title}</legend>
        <p className="field-description">{desc}</p>
        {Object.keys(items).map(key => {
          return (
            <div key={key} className="form-group small-field">
              <div>
                <h3> {key}</h3>
                <div className="inputFieldWrapper">
                  <input
                    className="form-control"
                    type="number"
                    value={settingValue[key]}
                    onChange={e => {
                      onSettingChange(key, e);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </fieldset>
    </div>
  );
}
