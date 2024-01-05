// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { closeIcon } from '@jupyterlab/ui-components';
import { UUID } from '@lumino/coreutils';
import { Debouncer } from '@lumino/polling';
import React, { useRef, useState } from 'react';
import { DOMUtils } from '@jupyterlab/apputils';

import type { FieldProps } from '@rjsf/utils';
type TDict = { [key: string]: any };

interface ISettingPropertyMap {
  [key: string]: ISettingProperty;
}
interface ISettingProperty {
  /**
   * Name of setting property
   */
  property: string;
  /**
   * Type of setting property
   */
  type: 'boolean' | 'string' | 'number';
  /**
   * Value of setting property
   */
  value: any;
}
const SETTING_NAME = 'languageServers';
const SERVER_SETTINGS = 'configuration';

interface ISettingFormProps {
  /**
   * The translation bundle.
   */
  trans: TranslationBundle;

  /**
   * Callback to remove setting item.
   */
  removeSetting: (key: string) => void;

  /**
   * Callback to update the setting item.
   */
  updateSetting: Debouncer<void, any, [hash: string, newSetting: TDict]>;

  /**
   * Hash to differentiate the setting fields.
   */
  serverHash: string;

  /**
   *  Setting value.
   */
  settings: TDict;

  /**
   * Setting schema.
   */
  schema: TDict;
}

/**
 * The React component of the setting field
 */
function BuildSettingForm(props: ISettingFormProps): JSX.Element {
  const { [SERVER_SETTINGS]: serverSettingsSchema, ...otherSettingsSchema } =
    props.schema;
  const {
    [SERVER_SETTINGS]: serverSettings,
    serverName,
    ...otherSettings
  } = props.settings;

  const [currentServerName, setCurrentServerName] =
    useState<string>(serverName);

  /**
   * Callback on server name field change event
   */
  const onServerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.updateSetting
      .invoke(props.serverHash, {
        serverName: e.target.value
      })
      .catch(console.error);
    setCurrentServerName(e.target.value);
  };

  const serverSettingWithType: ISettingPropertyMap = {};
  Object.entries(serverSettings).forEach(([key, value]) => {
    const newProps: ISettingProperty = {
      property: key,
      type: typeof value as 'string' | 'number' | 'boolean',
      value
    };
    serverSettingWithType[UUID.uuid4()] = newProps;
  });

  const [propertyMap, setPropertyMap] = useState<ISettingPropertyMap>(
    serverSettingWithType
  );

  const defaultOtherSettings: TDict = {};

  Object.entries(otherSettingsSchema).forEach(([key, value]) => {
    if (key in otherSettings) {
      defaultOtherSettings[key] = otherSettings[key];
    } else {
      defaultOtherSettings[key] = value['default'];
    }
  });

  const [otherSettingsComposite, setOtherSettingsComposite] =
    useState<TDict>(defaultOtherSettings);

  /**
   * Callback on additional setting field change event
   */
  const onOtherSettingsChange = (
    property: string,
    value: any,
    type: string
  ) => {
    let settingValue = value;
    if (type === 'number') {
      settingValue = parseFloat(value);
    }
    const newProps = {
      ...otherSettingsComposite,
      [property]: settingValue
    };
    props.updateSetting.invoke(props.serverHash, newProps).catch(console.error);
    setOtherSettingsComposite(newProps);
  };

  /**
   * Callback on `Add property` button click event.
   */
  const addProperty = () => {
    const hash = UUID.uuid4();
    const newMap: ISettingPropertyMap = {
      ...propertyMap,
      [hash]: { property: '', type: 'string', value: '' }
    };
    const payload: TDict = {};
    Object.values(newMap).forEach(value => {
      payload[value.property] = value.value;
    });
    props.updateSetting
      .invoke(props.serverHash, {
        [SERVER_SETTINGS]: payload
      })
      .catch(console.error);
    setPropertyMap(newMap);
  };

  /**
   * Callback on `Remove property` button click event.
   */
  const removeProperty = (entryHash: string) => {
    const newMap: ISettingPropertyMap = {};
    Object.entries(propertyMap).forEach(([hash, value]) => {
      if (hash !== entryHash) {
        newMap[hash] = value;
      }
      const payload: TDict = {};
      Object.values(newMap).forEach(value => {
        payload[value.property] = value.value;
      });
      props.updateSetting
        .invoke(props.serverHash, {
          [SERVER_SETTINGS]: payload
        })
        .catch(console.error);
      setPropertyMap(newMap);
    });
  };

  /**
   * Save setting to the setting registry on field change event.
   */
  const setProperty = (hash: string, property: ISettingProperty): void => {
    if (hash in propertyMap) {
      const newMap: ISettingPropertyMap = { ...propertyMap, [hash]: property };
      const payload: TDict = {};
      Object.values(newMap).forEach(value => {
        payload[value.property] = value.value;
      });
      setPropertyMap(newMap);
      props.updateSetting
        .invoke(props.serverHash, {
          [SERVER_SETTINGS]: payload
        })
        .catch(console.error);
    }
  };
  const debouncedSetProperty = new Debouncer<
    void,
    any,
    [hash: string, property: ISettingProperty]
  >(setProperty);
  const textInputId = useRef<string>(
    DOMUtils.createDomID() + '-line-number-input'
  );
  return (
    <div className="array-item">
      <div className="form-group ">
        <div className="jp-FormGroup-content">
          <div className="jp-objectFieldWrapper">
            <fieldset>
              <div className="form-group small-field">
                <div className="jp-modifiedIndicator jp-errorIndicator"></div>
                <div className="jp-FormGroup-content">
                  <label
                    htmlFor={textInputId.current}
                    className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem"
                  >
                    {props.trans.__('Server name:')}
                  </label>
                  <div className="jp-inputFieldWrapper jp-FormGroup-contentItem">
                    <input
                      id={textInputId.current}
                      className="form-control"
                      type="text"
                      required={true}
                      value={currentServerName}
                      onChange={e => {
                        onServerNameChange(e);
                      }}
                    />
                  </div>
                  <div className="validationErrors">
                    <div>
                      <ul className="error-detail bs-callout bs-callout-info">
                        <li className="text-danger">
                          {props.trans.__('is a required property')}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              {Object.entries(otherSettingsSchema).map(
                ([property, value], idx) => {
                  return (
                    <div
                      key={`${idx}-${property}`}
                      className="form-group small-field"
                    >
                      <div className="jp-FormGroup-content">
                        <h3 className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
                          {value.title}
                        </h3>
                        <div className="jp-inputFieldWrapper jp-FormGroup-contentItem">
                          <input
                            className="form-control"
                            placeholder=""
                            type={value.type}
                            value={otherSettingsComposite[property]}
                            onChange={e =>
                              onOtherSettingsChange(
                                property,
                                e.target.value,
                                value.type
                              )
                            }
                          />
                        </div>
                        <div className="jp-FormGroup-description">
                          {value.description}
                        </div>
                        <div className="validationErrors"></div>
                      </div>
                    </div>
                  );
                }
              )}
              <fieldset>
                <legend>{serverSettingsSchema['title']}</legend>
                {Object.entries(propertyMap).map(([hash, property]) => {
                  return (
                    <PropertyFrom
                      key={hash}
                      hash={hash}
                      property={property}
                      removeProperty={removeProperty}
                      setProperty={debouncedSetProperty}
                    />
                  );
                })}
                <span>{serverSettingsSchema['description']}</span>
              </fieldset>
            </fieldset>
          </div>
        </div>
      </div>
      <div className="jp-ArrayOperations">
        <button className="jp-mod-styled jp-mod-reject" onClick={addProperty}>
          {props.trans.__('Add property')}
        </button>
        <button
          className="jp-mod-styled jp-mod-warn jp-FormGroup-removeButton"
          onClick={() => props.removeSetting(props.serverHash)}
        >
          {props.trans.__('Remove server')}
        </button>
      </div>
    </div>
  );
}

function PropertyFrom(props: {
  hash: string;
  property: ISettingProperty;
  removeProperty: (hash: string) => void;
  setProperty: Debouncer<void, any, [hash: string, property: ISettingProperty]>;
}): JSX.Element {
  const [state, setState] = useState<{
    property: string;
    type: 'boolean' | 'string' | 'number';
    value: any;
  }>({ ...props.property });
  const TYPE_MAP = { string: 'text', number: 'number', boolean: 'checkbox' };

  const removeItem = () => {
    props.removeProperty(props.hash);
  };

  const changeName = (newName: string) => {
    const newState = { ...state, property: newName };
    props.setProperty.invoke(props.hash, newState).catch(console.error);
    setState(newState);
  };

  const changeValue = (
    newValue: any,
    type: 'string' | 'boolean' | 'number'
  ) => {
    let value = newValue;
    if (type === 'number') {
      value = parseFloat(newValue);
    }
    const newState = { ...state, value };
    props.setProperty.invoke(props.hash, newState).catch(console.error);
    setState(newState);
  };

  const changeType = (newType: 'boolean' | 'string' | 'number') => {
    let value: string | boolean | number;
    if (newType === 'boolean') {
      value = false;
    } else if (newType === 'number') {
      value = 0;
    } else {
      value = '';
    }
    const newState = { ...state, type: newType, value };
    setState(newState);
    props.setProperty.invoke(props.hash, newState).catch(console.error);
  };

  return (
    <div key={props.hash} className="form-group small-field">
      <div className="jp-FormGroup-content jp-LSPExtension-FormGroup-content">
        <input
          className="form-control"
          type="text"
          required={true}
          placeholder={'Property name'}
          value={state.property}
          onChange={e => {
            changeName(e.target.value);
          }}
        />
        <select
          className="form-control"
          value={state.type}
          onChange={e =>
            changeType(e.target.value as 'boolean' | 'string' | 'number')
          }
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
        </select>
        <input
          className="form-control"
          type={TYPE_MAP[state.type]}
          required={false}
          placeholder={'Property value'}
          value={state.type !== 'boolean' ? state.value : undefined}
          checked={state.type === 'boolean' ? state.value : undefined}
          onChange={
            state.type !== 'boolean'
              ? e => changeValue(e.target.value, state.type)
              : e => changeValue(e.target.checked, state.type)
          }
        />
        <button className="jp-mod-minimal jp-Button" onClick={removeItem}>
          <closeIcon.react />
        </button>
      </div>
    </div>
  );
}

/**
 * Internal state of the setting component
 */
interface IState {
  /**
   * Title of the setting section
   */
  title?: string;
  /**
   * Description of the setting section
   */
  desc?: string;
  /**
   * Items of setting section
   */
  items: TDict;
}
interface IProps extends FieldProps {
  translator: ITranslator;
}

/**
 * React setting component
 */
class SettingRenderer extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this._setting = props.formContext.settings;
    this._trans = props.translator.load('jupyterlab');

    const schema = this._setting.schema['definitions'] as TDict;

    this._defaultSetting = schema['languageServer']['default'];
    this._schema = schema['languageServer']['properties'];
    const title = props.schema.title;
    const desc = props.schema.description;
    const settings: ISettingRegistry.ISettings = props.formContext.settings;
    const compositeData = settings.get(SETTING_NAME).composite as TDict;

    let items: TDict = {};
    if (compositeData) {
      Object.entries(compositeData).forEach(([key, value]) => {
        if (value) {
          const hash = UUID.uuid4();
          items[hash] = { serverName: key, ...value };
        }
      });
    }
    this.state = { title, desc, items };
    this._debouncedUpdateSetting = new Debouncer(this.updateSetting.bind(this));
  }

  /**
   * Remove a setting item by its hash
   *
   * @param hash - hash of the item to be removed.
   */
  removeSetting = (hash: string): void => {
    if (hash in this.state.items) {
      const items: TDict = {};
      for (const key in this.state.items) {
        if (key !== hash) {
          items[key] = this.state.items[key];
        }
      }
      this.setState(
        old => {
          return { ...old, items };
        },
        () => {
          this.saveServerSetting();
        }
      );
    }
  };

  /**
   * Update a setting item by its hash
   *
   * @param hash - hash of the item to be updated.
   * @param newSetting - new setting value.
   */
  updateSetting = (hash: string, newSetting: TDict): void => {
    if (hash in this.state.items) {
      const items: TDict = {};
      for (const key in this.state.items) {
        if (key === hash) {
          items[key] = { ...this.state.items[key], ...newSetting };
        } else {
          items[key] = this.state.items[key];
        }
      }
      this.setState(
        old => {
          return { ...old, items };
        },
        () => {
          this.saveServerSetting();
        }
      );
    }
  };

  /**
   * Add setting item to the setting component.
   */
  addServerSetting = (): void => {
    let index = 0;
    let key = 'newKey';
    while (
      Object.values(this.state.items)
        .map(val => val.serverName)
        .includes(key)
    ) {
      index += 1;
      key = `newKey-${index}`;
    }
    this.setState(
      old => ({
        ...old,
        items: {
          ...old.items,
          [UUID.uuid4()]: { ...this._defaultSetting, serverName: key }
        }
      }),
      () => {
        this.saveServerSetting();
      }
    );
  };

  /**
   * Save the value of setting items to the setting registry.
   */
  saveServerSetting = () => {
    const settings: TDict = {};
    Object.values(this.state.items).forEach(item => {
      const { serverName, ...setting } = item;
      settings[serverName] = setting;
    });
    this._setting.set(SETTING_NAME, settings).catch(console.error);
  };
  render(): JSX.Element {
    return (
      <div>
        <fieldset>
          <legend>{this.state.title}</legend>
          <p className="field-description">{this.state.desc}</p>
          <div className="field field-array field-array-of-object">
            {Object.entries(this.state.items).map(([hash, value], idx) => {
              return (
                <BuildSettingForm
                  key={`${idx}-${hash}`}
                  trans={this._trans}
                  removeSetting={this.removeSetting}
                  updateSetting={this._debouncedUpdateSetting}
                  serverHash={hash}
                  settings={value}
                  schema={this._schema}
                />
              );
            })}
          </div>
          <div>
            <button
              style={{ margin: 2 }}
              className="jp-mod-styled jp-mod-reject"
              onClick={this.addServerSetting}
            >
              {this._trans.__('Add server')}
            </button>
          </div>
        </fieldset>
      </div>
    );
  }

  /**
   * The setting registry.
   */
  private _setting: ISettingRegistry.ISettings;

  /**
   * The translation bundle.
   */
  private _trans: TranslationBundle;

  /**
   * Default setting value.
   */
  private _defaultSetting: TDict;

  /**
   * The setting schema.
   */
  private _schema: TDict;

  private _debouncedUpdateSetting: Debouncer<
    void,
    any,
    [hash: string, newSetting: TDict]
  >;
}

/**
 * Custom setting renderer for language server extension.
 */
export function renderServerSetting(
  props: FieldProps,
  translator: ITranslator
): JSX.Element {
  return <SettingRenderer {...props} translator={translator} />;
}
