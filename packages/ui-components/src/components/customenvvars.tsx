import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ReactWidget } from './vdom';
import { PartialJSONObject } from '@lumino/coreutils';
import React, { ChangeEvent, ChangeEventHandler, useEffect, useState } from 'react';

interface IEnvProps {
  updateFormData: (formData: PartialJSONObject)=>void;
  defaultEnvValues: PartialJSONObject;
  translator?: ITranslator | undefined;
}

interface IEnvBlockProps {
  handleChange:(envVars: PartialJSONObject)=>void;
  id: string;
  defaultName: string;
  defaultEnvValue: string;
  translator: ITranslator | undefined;
}

function EnvBlock({handleChange, id, defaultName,defaultEnvValue, translator }:IEnvBlockProps ){
  const [newEnvName, setEnvName] = useState<string>(defaultName);
  const [newEnvValue, setEnvValue] = useState<string>(defaultEnvValue);
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  useEffect(()=>{
    let envVar = {} as PartialJSONObject;
    envVar[id] = {
      name:newEnvName,
      value:newEnvValue
    };
    console.log('envVar');
    console.dir(envVar);
    handleChange(envVar);
  },[newEnvName, newEnvValue]);

  const onChange: ChangeEventHandler<HTMLInputElement> = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    console.log('name', name);
    console.log('value', value);
    if (name === "env_name") {
      setEnvName(value);
    } else if (name === "env_value") {
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
      data-name= "env_name"
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
</>)
}


function CustomEnv({updateFormData, defaultEnvValues, translator }: IEnvProps) {
  const [formData, setInputs] = useState<PartialJSONObject>(defaultEnvValues);
  const [countEnvBlock, setCountEnvBlock] = useState(Object.keys(formData).length);

  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  useEffect(()=>{
    updateFormData(formData);
  },[formData]);

  useEffect(()=>{
    let count = defaultEnvValues && Object.keys(defaultEnvValues).length>0? Object.keys(defaultEnvValues).length : 1;
    setCountEnvBlock(count);
  },[defaultEnvValues])

  const addMoreEnvVariables = ()=>{
    let newCountEnvBlock = countEnvBlock +1;
    setCountEnvBlock(newCountEnvBlock);
  }

  const handleChange = (envVars: PartialJSONObject) => {

    setInputs({
      ...formData,
      ...envVars
    });
  };



  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
  };

  let envBlock = [];
  for(let index=1; index<=countEnvBlock; index++) {
    let envData = formData[`${index}`] as PartialJSONObject | undefined;

    let defaultName = envData && envData.name? envData.name: '';
    let defaultEnvValue = envData && envData.value? envData.value: '';

    envBlock.push(<EnvBlock id={`${index}`} key={index} handleChange={handleChange} defaultName={defaultName as string} defaultEnvValue={defaultEnvValue as string} translator={translator}/>)
  }

  const header = `${trans.__('Setup custom env variables:')}`;
  const addMoreVarLabel= trans.__('Add more');
 
  return (
    <div>
      <div className="jp-Dialog-header">{header}</div>
      <form className="js-Dialog-form-custom-env" onSubmit={handleSubmit}>
       {envBlock}
      </form>
      <button onClick={addMoreEnvVariables} className="jp-Dialog-button jp-mod-accept jp-mod-styled js-custom-env"><div className="jp-Dialog-buttonIcon"></div><div className="jp-Dialog-buttonLabel" title="" aria-label={addMoreVarLabel}>{addMoreVarLabel}</div></button>
    </div>
  );
}

export default CustomEnv;

/**
 * A Dialog Widget that wraps a FormComponent.
 */
export class CustomEnvWidget extends ReactWidget {
  updateFormData: (formData: PartialJSONObject) => void;
  envConfiguration: PartialJSONObject;
  defaultEnvValues: PartialJSONObject;
  translator?: ITranslator | undefined;
  /**
   * Constructs a new FormWidget.
   */
  constructor(
    envConfiguration: PartialJSONObject,
    defaultEnvValues:PartialJSONObject, 
    updateFormData: (formData: PartialJSONObject) => void,
    translator?: ITranslator,
  ) {
    super();
    this.envConfiguration = envConfiguration;
    this.updateFormData = updateFormData;
    this.translator = translator;
    this.defaultEnvValues = defaultEnvValues;
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
        'name': index,
        'value':this.defaultEnvValues[index]
      };
      k+=1;
    }
    return (
      <CustomEnv
        updateFormData={this.updateFormData} defaultEnvValues={tmp} translator={this.translator}
      />
    );
  }
}