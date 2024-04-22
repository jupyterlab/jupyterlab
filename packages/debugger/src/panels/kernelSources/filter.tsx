// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { UseSignal } from '@jupyterlab/ui-components';

import React from 'react';

import { IDebugger } from '../../tokens';

import { Search } from '@jupyter/react-components';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;

  /**
   * The application language translator
   */
  translator?: ITranslator;
}

const FilterBox = (props: IFilterBoxProps) => {
  const trans = (props.translator ?? nullTranslator).load('jupyterlab');
  const onFilterChange = (e: any) => {
    const filter = (e.target as HTMLInputElement).value;
    props.model.filter = filter;
  };
  return (
    <Search
      onChange={onFilterChange}
      placeholder={trans.__('Filter the kernel sources')}
      value={props.model.filter}
    />
  );
};

/**
 * A widget which hosts a input textbox to filter on file names.
 */
export const KernelSourcesFilter = (props: IFilterBoxProps) => {
  return (
    <UseSignal
      signal={props.model.filterChanged}
      initialArgs={props.model.filter}
    >
      {model => <FilterBox model={props.model} />}
    </UseSignal>
  );
};
