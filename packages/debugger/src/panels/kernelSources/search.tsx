// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { InputGroup, ReactWidget } from '@jupyterlab/ui-components';

import React, { useState } from 'react';

import { IDebugger } from '../../tokens';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;
  filter: string;
}

const FilterBox = (props: IFilterBoxProps) => {
  const [filter, setFilter] = useState(props.filter);

  console.log('---', filter);

  /**
   * Handler for search input changes.
   */
  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    setFilter(target.value);
    props.model.filter = target.value;
  };

  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      onChange={handleChange}
      value={filter}
    />
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const FilenameSearcher = (props: IFilterBoxProps): ReactWidget => {
  return ReactWidget.create(
    <FilterBox model={props.model} filter={props.filter} />
  );
};
