import { ReactWidget } from '@jupyterlab/ui-components';
import { PartialJSONObject } from '@lumino/coreutils';
import React, { ChangeEvent, ChangeEventHandler, useEffect, useState } from 'react';

interface EnvProps {
  updateFormData: (formData: PartialJSONObject)=>void;
}

interface EnvBlockProps {
  handleChange:(event: ChangeEvent)=>void;
  id: string;
}

function EnvBlock({handleChange, id}:EnvBlockProps ){
  let dataEnvName = `env_name_${id}`;
  let dataEnvValue = `env_value_${id}`;

return (
  <div id={id}>
  <label>
    Name:
    <input
      type="text"
      name="env_name"
      data-name= {dataEnvName}
      value=""
      onChange={handleChange}
    />
  </label>
  <br />
  <label>
    Value:
    <input
      type="text"
      name="env_value"
      data-name={dataEnvValue}
      value=""
      onChange={handleChange}
    />
  </label>
  </div>)
}


function CustomEnv({updateFormData }: EnvProps) {
  const [formData, setInputs] = useState<PartialJSONObject>({});
  const [countEnvBlock, setCountEnvBlock] = useState(1);

  useEffect(()=>{
    updateFormData(formData);
  },[formData]);

  const addMoreEnvVariables = ()=>{
    let newCountEnvBlock = countEnvBlock +1;
    setCountEnvBlock(newCountEnvBlock);
  }

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setInputs({
      ...formData,
      [name]: value
    });
  };



  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
  };

  let envBlock = [];

  for(let index=0; index< countEnvBlock; index++) {
    envBlock.push(<EnvBlock id={`${index}`} handleChange={handleChange}/>)
  }
 
  return (
    <div>
      <h1>Setup custom env variables <span><button onClick={addMoreEnvVariables}>Add more env variables</button></span></h1>
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
  /**
   * Constructs a new FormWidget.
   */
  constructor(
    envConfiguration: PartialJSONObject,
    updateFormData: (formData: PartialJSONObject) => void
  ) {
    super();
    this.envConfiguration = envConfiguration;
    this.updateFormData = updateFormData;
  }

  getValue(): PartialJSONObject {
    return this.envConfiguration;
  }

  render(): JSX.Element {
    return (
      <CustomEnv
        updateFormData={this.updateFormData}
      />
    );
  }
}