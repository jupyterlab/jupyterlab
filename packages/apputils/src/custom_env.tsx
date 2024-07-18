import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { ReactWidget } from '@jupyterlab/ui-components';
import { PartialJSONObject } from '@lumino/coreutils';
import React, { ChangeEvent, ChangeEventHandler, useEffect, useState } from 'react';

interface EnvProps {
  updateFormData: (formData: PartialJSONObject)=>void;
  defaultEnvValues: PartialJSONObject;
  translator?:ITranslator | undefined;
}

interface EnvBlockProps {
  handleChange:(envVars: PartialJSONObject)=>void;
  id: string;
  envData: PartialJSONObject;
}

function EnvBlock({handleChange, id, envData}:EnvBlockProps ){
  const [newEnvName, setEnvName] = useState<string>(envData.name as string);
  const [newEnvValue, setEnvValue] = useState<string>(envData.value as string);

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
  <div id={id} style={{marginBottom: 10}}>
  <label>
    Name:
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
    Value:
    <input
      type="text"
      name="env_value"
      data-name="env_value"
      value={newEnvValue}
      onChange={onChange}
    />
  </label>
  <br />
  </div>)
}


function CustomEnv({updateFormData, defaultEnvValues, translator }: EnvProps) {
  const [formData, setInputs] = useState<PartialJSONObject>(defaultEnvValues);
  const [countEnvBlock, setCountEnvBlock] = useState(Object.keys(formData).length);

  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  useEffect(()=>{
    updateFormData(formData);
  },[formData]);

  useEffect(()=>{
    let count = defaultEnvValues && Object.keys(defaultEnvValues).length>0? Object.keys(this.defaultEnvValues).length : 1;
    setCountEnvBlock(count);
  },[defaultEnvValues])

  const addMoreEnvVariables = ()=>{
    let newCountEnvBlock = countEnvBlock +1;
    setCountEnvBlock(newCountEnvBlock);
  }

  const handleChange = (envVars: PartialJSONObject) => {
    console.log('envVars');
    console.dir(envVars);
    setInputs({
      ...formData,
      ...envVars
    });
  };



  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
  };

  let envBlock = [];
  for(let index=0; index<countEnvBlock; index++) {
    let envData = formData[`${index}`];
    envBlock.push(<EnvBlock id={`${index}`} key={index} handleChange={handleChange}/>)
  }

  let header = `${trans.__('Setup custom env variables:')}`
 
  return (
    <div>
      <h4>{header}</h4>
      <div><button onClick={addMoreEnvVariables}>Add more env variables</button></div>
      <form onSubmit={handleSubmit}>
       {envBlock}
      </form>
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
    console.log('default obj');
    console.dir(tmp);
    return (
      <CustomEnv
        updateFormData={this.updateFormData} defaultEnvValues={tmp} translator={this.translator}
      />
    );
  }
}