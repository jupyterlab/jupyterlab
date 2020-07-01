// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';

import { InputGroup } from '@jupyterlab/ui-components';

import { ReactWidget } from '@jupyterlab/apputils';

import { Contents } from '@jupyterlab/services';

import { DirListing } from './listing';

/**
 * The class name added to the filebrowser crumbs node.
 */
export interface IFilterBoxProps {
  listing: DirListing;
  placeholder?: string;
}

const FilterBox = (props: IFilterBoxProps) => {
  const [filter, setFilter] = useState('');

  /**
   * Handler for search input changes.
   */
  const handleChange = (e: React.FormEvent<HTMLElement>) => {
    const target = e.target as HTMLInputElement;
    setFilter(target.value);
    props.listing.model.setFilter(
      (value: Contents.IModel) => value.name.indexOf(target.value) !== -1
    );
  };

  return (
    <InputGroup
      type="text"
      rightIcon="ui-components:search"
      placeholder={props.placeholder}
      onChange={handleChange}
      value={filter}
    />
  );
};

/**
 * A widget which hosts a ...
 */
export const FilenameSearcher = (props: IFilterBoxProps) => {
  return ReactWidget.create(
    <FilterBox listing={props.listing} placeholder={props.placeholder} />
  );
};
