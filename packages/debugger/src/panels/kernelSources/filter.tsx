// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { UseSignal } from '@jupyterlab/ui-components';

import React from 'react';

import { IDebugger } from '../../tokens';

import { Search } from '@jupyter/react-components';
import { TranslationBundle } from '@jupyterlab/translation';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  model: IDebugger.Model.IKernelSources;

  /**
   * The language bundle.
   */
  trans: TranslationBundle;
}

const FilterBox = (props: IFilterBoxProps) => {
  const onFilterChange = (e: any) => {
    const filter = (e.target as HTMLInputElement).value;
    props.model.filter = filter;
  };
  return (
    <Search
      onChange={onFilterChange}
      placeholder={props.trans.__('Filter the kernel sources')}
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
      {model => <FilterBox model={props.model} trans={props.trans} />}
    </UseSignal>
  );
};
