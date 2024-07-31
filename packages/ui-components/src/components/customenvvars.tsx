/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ReactWidget } from './vdom';
import { PartialJSONObject } from '@lumino/coreutils';
import React, {
  ChangeEvent,
  ChangeEventHandler,
  useEffect,
  useState
} from 'react';
import { Button } from './button';

interface IEnvProps {
  updateFormData: (formData: PartialJSONObject) => void;
  defaultEnvValues: PartialJSONObject;
  showBlock: boolean;
  translator?: ITranslator | undefined;
}

interface IEnvBlockProps {
  handleChange: (envVars: PartialJSONObject) => void;
  id: string;
  defaultName: string;
  defaultEnvValue: string;
  translator: ITranslator | undefined;
}

function EnvBlock({
  handleChange,
  id,
  defaultName,
  defaultEnvValue,
  translator
}: IEnvBlockProps) {
  const [newEnvName, setEnvName] = useState<string>(defaultName);
  const [newEnvValue, setEnvValue] = useState<string>(defaultEnvValue);
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  useEffect(() => {
    let envVar = {} as PartialJSONObject;
    envVar[id] = {
      name: newEnvName,
      value: newEnvValue
    };
    console.log('envVar');
    console.dir(envVar);
    handleChange(envVar);
  }, [newEnvName, newEnvValue]);

  const onChange: ChangeEventHandler<HTMLInputElement> = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    console.log('name', name);
    console.log('value', value);
    if (name === 'env_name') {
      setEnvName(value);
    } else if (name === 'env_value') {
      setEnvValue(value);
    }
  };

  return (
    <>
      <label>
        <span>{`${trans.__('Name:')}`}</span>
        <input
          type="text"
          name="env_name"
          data-name="env_name"
          value={newEnvName}
          onChange={onChange}
        />
      </label>
      <br />
      <label>
        <span>{`${trans.__('Value:')}`}</span>
        <input
          type="text"
          name="env_value"
          data-name="env_value"
          value={newEnvValue}
          onChange={onChange}
        />
      </label>
      <br />
    </>
  );
}

function CustomEnv({
  updateFormData,
  defaultEnvValues,
  showBlock,
  translator
}: IEnvProps) {
  const [formData, setInputs] = useState<PartialJSONObject>(defaultEnvValues);
  const [isShownBlock, setShowBlock] = useState<boolean>(showBlock);
  const [countEnvBlock, setCountEnvBlock] = useState(
    Object.keys(formData).length
  );

  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  useEffect(() => {
    updateFormData(formData);
  }, [formData]);

  useEffect(() => {
    let count =
      defaultEnvValues && Object.keys(defaultEnvValues).length > 0
        ? Object.keys(defaultEnvValues).length
        : 1;
    setCountEnvBlock(count);
  }, [defaultEnvValues]);

  const addMoreEnvVariables = () => {
    let newCountEnvBlock = countEnvBlock + 1;
    setCountEnvBlock(newCountEnvBlock);
  };

  const handleChange = (envVars: PartialJSONObject) => {
    setInputs({
      ...formData,
      ...envVars
    });
  };

  const showCustomEnvBlock = () => {
    setShowBlock(!isShownBlock);
  };

  let envBlock = [];
  for (let index = 1; index <= countEnvBlock; index++) {
    let envData = formData[`${index}`] as PartialJSONObject | undefined;

    let defaultName = envData && envData.name ? envData.name : '';
    let defaultEnvValue = envData && envData.value ? envData.value : '';

    envBlock.push(
      <EnvBlock
        id={`${index}`}
        key={index}
        handleChange={handleChange}
        defaultName={defaultName as string}
        defaultEnvValue={defaultEnvValue as string}
        translator={translator}
      />
    );
  }

  const header = `${trans.__('Setup custom env variables')}`;
  const addMoreVarLabel = trans.__('Add more');

  const classes = 'jp-Dialog-button jp-mod-accept jp-mod-styled js-custom-env';

  return (
    <div>
      {!showBlock && (
        <label className="jp-Dialog-checkbox" title={header}>
          <input
            type="checkbox"
            checked={isShownBlock}
            onChange={showCustomEnvBlock}
            className="jp-mod-styled"
          />
          {header}
        </label>
      )}
      {showBlock && <div className="jp-Dialog-header">{header}</div>}
      {isShownBlock && (
        <>
          <form className="js-Dialog-form-custom-env">{envBlock}</form>
          <Button
            title={addMoreVarLabel}
            className={classes}
            onClick={addMoreEnvVariables}
            small={true}
          >
            {addMoreVarLabel}
          </Button>
        </>
      )}
    </div>
  );
}

export default CustomEnv;

/**
 * A Dialog Widget that wraps a form component for custom env variables.
 */
export class CustomEnvWidget extends ReactWidget {
  updateFormData: (formData: PartialJSONObject) => void;
  envConfiguration: PartialJSONObject;
  defaultEnvValues: PartialJSONObject;
  showBlock: boolean;
  translator?: ITranslator | undefined;
  /**
   * Constructs a new custom env  variables widget.
   */
  constructor(
    envConfiguration: PartialJSONObject,
    defaultEnvValues: PartialJSONObject,
    updateFormData: (formData: PartialJSONObject) => void,
    showBlock: boolean,
    translator?: ITranslator
  ) {
    super();
    this.envConfiguration = envConfiguration;
    this.updateFormData = updateFormData;
    this.translator = translator;
    this.defaultEnvValues = defaultEnvValues;
    this.showBlock = showBlock;
  }

  getValue(): PartialJSONObject {
    return this.envConfiguration;
  }

  render(): JSX.Element {
    let k = 1;
    let tmp = {} as PartialJSONObject;
    for (let index in this.defaultEnvValues) {
      let envVarsIndex = `${k}`;
      tmp[envVarsIndex] = {
        name: index,
        value: this.defaultEnvValues[index]
      };
      k += 1;
    }
    let showBlock = this.showBlock;
    if (Object.keys(tmp).length > 0) {
      showBlock = true;
    }
    return (
      <CustomEnv
        updateFormData={this.updateFormData}
        defaultEnvValues={tmp}
        showBlock={showBlock}
        translator={this.translator}
      />
    );
  }
}
