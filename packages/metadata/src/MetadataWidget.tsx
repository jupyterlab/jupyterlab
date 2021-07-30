/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IDictionary, MetadataService } from '@elyra/services';
import {
  ExpandableComponent,
  ThemeProvider,
  JSONComponent,
  RequestErrors,
  trashIcon
} from '@elyra/ui-components';

import { JupyterFrontEnd } from '@jupyterlab/application';
import {
  Dialog,
  IThemeManager,
  ReactWidget,
  showDialog,
  UseSignal
} from '@jupyterlab/apputils';
import { editIcon, LabIcon } from '@jupyterlab/ui-components';
import { Message } from '@lumino/messaging';
import { Signal } from '@lumino/signaling';

import React from 'react';

import { AddMetadataButton } from './AddMetadataButton';
import { FilterTools } from './FilterTools';

/**
 * The CSS class added to metadata widgets.
 */
export const METADATA_CLASS = 'elyra-metadata';
export const METADATA_HEADER_CLASS = 'elyra-metadataHeader';
export const METADATA_ITEM = 'elyra-metadata-item';
const METADATA_JSON_CLASS = 'jp-RenderedJSON CodeMirror cm-s-jupyter';

const commands = {
  OPEN_METADATA_EDITOR: 'elyra-metadata-editor:open'
};

export interface IMetadata {
  name: string;
  display_name: string;
  metadata: IDictionary<any>;
  schema_name: string;
}

export interface IMetadataActionButton {
  title: string;
  icon: LabIcon;
  feedback?: string;
  onClick: () => void;
}

/**
 * MetadataDisplay props.
 */
export interface IMetadataDisplayProps {
  metadata: IMetadata[];
  openMetadataEditor: (args: any) => void;
  updateMetadata: () => void;
  namespace: string;
  sortMetadata: boolean;
  className: string;
  // Optional string to append to a schema display name
  schemaType?: string;
  labelName?: (args: any) => string;
}

/**
 * MetadataDisplay state.
 */
export interface IMetadataDisplayState {
  metadata: IMetadata[];
  searchValue: string;
  filterTags: string[];
  matchesSearch: (searchValue: string, metadata: IMetadata) => boolean;
  matchesTags: (filterTags: Set<string>, metadata: IMetadata) => boolean;
}

/**
 * A React Component for displaying a list of metadata
 */
export class MetadataDisplay<
  T extends IMetadataDisplayProps,
  U extends IMetadataDisplayState
> extends React.Component<T, IMetadataDisplayState> {
  constructor(props: T) {
    super(props);
    this.state = {
      metadata: props.metadata,
      searchValue: '',
      filterTags: [],
      matchesSearch: this.matchesSearch.bind(this),
      matchesTags: this.matchesTags.bind(this)
    };
  }

  deleteMetadata = (metadata: IMetadata): Promise<void> => {
    return showDialog({
      title: `Delete ${
        this.props.labelName ? this.props.labelName(metadata) : ''
      } '${metadata.display_name}'?`,
      buttons: [Dialog.cancelButton(), Dialog.okButton()]
    }).then((result: any) => {
      // Do nothing if the cancel button is pressed
      if (result.button.accept) {
        MetadataService.deleteMetadata(
          this.props.namespace,
          metadata.name
        ).catch(error => RequestErrors.serverError(error));
      }
    });
  };

  actionButtons = (metadata: IMetadata): IMetadataActionButton[] => {
    return [
      {
        title: 'Edit',
        icon: editIcon,
        onClick: (): void => {
          this.props.openMetadataEditor({
            onSave: this.props.updateMetadata,
            namespace: this.props.namespace,
            schema: metadata.schema_name,
            name: metadata.name
          });
        }
      },
      {
        title: 'Delete',
        icon: trashIcon,
        onClick: (): void => {
          this.deleteMetadata(metadata).then((response: any): void => {
            this.props.updateMetadata();
          });
        }
      }
    ];
  };

  /**
   * Classes that extend MetadataWidget should override this
   */
  renderExpandableContent(metadata: IDictionary<any>): JSX.Element {
    const metadataWithoutTags = metadata.metadata;
    delete metadataWithoutTags.tags;
    return (
      <div className={METADATA_JSON_CLASS}>
        <JSONComponent json={metadataWithoutTags} />
      </div>
    );
  }

  // Render display of metadata list
  renderMetadata = (metadata: IMetadata): JSX.Element => {
    return (
      <div
        key={metadata.name}
        className={METADATA_ITEM}
        style={
          this.state.metadata.includes(metadata) ? {} : { display: 'none' }
        }
      >
        <ExpandableComponent
          displayName={metadata.display_name}
          tooltip={metadata.metadata.description}
          actionButtons={this.actionButtons(metadata)}
        >
          <div id={metadata.name}>{this.renderExpandableContent(metadata)}</div>
        </ExpandableComponent>
      </div>
    );
  };

  /**
   * A function called when the `sortMetadata` property is `true`, sorts the
   * `metadata` property alphabetically by `metadata.display_name` by default.
   * Can be overridden if a different or more intensive sorting is desired.
   */
  sortMetadata(): void {
    this.props.metadata.sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  }

  filteredMetadata = (searchValue: string, filterTags: string[]): void => {
    // filter with search
    let filteredMetadata = this.props.metadata.filter(
      (metadata: IMetadata, index: number, array: IMetadata[]): boolean => {
        return (
          metadata.name.toLowerCase().includes(searchValue.toLowerCase()) ||
          metadata.display_name
            .toLowerCase()
            .includes(searchValue.toLowerCase())
        );
      }
    );

    // filter with tags
    if (filterTags.length !== 0) {
      filteredMetadata = filteredMetadata.filter(metadata => {
        return filterTags.some(tag => {
          if (metadata.metadata.tags) {
            return metadata.metadata.tags.includes(tag);
          }
          return false;
        });
      });
    }

    this.setState({
      metadata: filteredMetadata,
      searchValue: searchValue,
      filterTags: filterTags
    });
  };

  getActiveTags(): string[] {
    const tags: string[] = [];
    for (const metadata of this.props.metadata) {
      if (metadata.metadata.tags) {
        for (const tag of metadata.metadata.tags) {
          if (!tags.includes(tag)) {
            tags.push(tag);
          }
        }
      }
    }
    return tags;
  }

  matchesTags(filterTags: Set<string>, metadata: IMetadata): boolean {
    // True if there are no tags selected or if there are tags that match
    // tags of metadata
    return (
      filterTags.size === 0 ||
      (metadata.metadata.tags &&
        metadata.metadata.tags.some((tag: string) => filterTags.has(tag)))
    );
  }

  matchesSearch(searchValue: string, metadata: IMetadata): boolean {
    searchValue = searchValue.toLowerCase();
    // True if search string is in name or display_name,
    // or if the search string is empty
    return (
      metadata.name.toLowerCase().includes(searchValue) ||
      metadata.display_name.toLowerCase().includes(searchValue)
    );
  }

  static getDerivedStateFromProps(
    props: IMetadataDisplayProps,
    state: IMetadataDisplayState
  ): IMetadataDisplayState {
    if (state.searchValue === '' && state.filterTags.length === 0) {
      return {
        metadata: props.metadata,
        searchValue: '',
        filterTags: [],
        matchesSearch: state.matchesSearch,
        matchesTags: state.matchesTags
      };
    }

    if (state.searchValue !== '' || state.filterTags.length !== 0) {
      const filterTags = new Set(state.filterTags);
      const searchValue = state.searchValue.toLowerCase().trim();

      const newMetadata = props.metadata.filter(
        metadata =>
          state.matchesSearch(searchValue, metadata) &&
          state.matchesTags(filterTags, metadata)
      );
      return {
        metadata: newMetadata,
        searchValue: state.searchValue,
        filterTags: state.filterTags,
        matchesSearch: state.matchesSearch,
        matchesTags: state.matchesTags
      };
    }
    return state;
  }

  render(): React.ReactElement {
    if (this.props.sortMetadata) {
      this.sortMetadata();
    }
    return (
      <div id="elyra-metadata" className={this.props.className}>
        <FilterTools
          onFilter={this.filteredMetadata}
          tags={this.getActiveTags()}
          namespaceId={`${this.props.namespace}`}
        />
        <div>{this.props.metadata.map(this.renderMetadata)}</div>
      </div>
    );
  }
}

/**
 * MetadataWidget props.
 */
export interface IMetadataWidgetProps {
  app: JupyterFrontEnd;
  themeManager?: IThemeManager;
  display_name: string;
  namespace: string;
  icon: LabIcon;
  // Optional string to append after schema display name
  schemaType?: string;
}

/**
 * A abstract widget for viewing metadata.
 */
export class MetadataWidget extends ReactWidget {
  renderSignal: Signal<this, any>;
  props: IMetadataWidgetProps;
  schemas?: IDictionary<any>[];
  schemaType?: string;

  constructor(props: IMetadataWidgetProps) {
    super();
    this.addClass('elyra-metadata');

    this.props = props;
    this.renderSignal = new Signal<this, any>(this);
    this.schemaType = props.schemaType;

    this.fetchMetadata = this.fetchMetadata.bind(this);
    this.updateMetadata = this.updateMetadata.bind(this);
    this.openMetadataEditor = this.openMetadataEditor.bind(this);
    this.renderDisplay = this.renderDisplay.bind(this);
    this.addMetadata = this.addMetadata.bind(this);

    this.getSchemas();
  }

  async getSchemas(): Promise<void> {
    try {
      this.schemas = await MetadataService.getSchema(this.props.namespace);
      this.update();
    } catch (error) {
      RequestErrors.serverError(error);
    }
  }

  addMetadata(schema: string): void {
    this.openMetadataEditor({
      onSave: this.updateMetadata,
      namespace: this.props.namespace,
      schema: schema
    });
  }

  /**
   * Request metadata from server and format it as expected by the
   * instance of `MetadataDisplay` rendered in `renderDisplay`
   *
   * Classes that extend MetadataWidget should override this
   *
   * @returns metadata in the format expected by `renderDisplay`
   */
  async fetchMetadata(): Promise<any> {
    try {
      return await MetadataService.getMetadata(this.props.namespace);
    } catch (error) {
      return RequestErrors.serverError(error);
    }
  }

  updateMetadata(): void {
    this.fetchMetadata().then((metadata: any[]) => {
      this.renderSignal.emit(metadata);
    });
  }

  // Triggered when the widget button on side panel is clicked
  onAfterShow(msg: Message): void {
    this.updateMetadata();
  }

  openMetadataEditor = (args: any): void => {
    this.props.app.commands.execute(commands.OPEN_METADATA_EDITOR, args);
  };

  /**
   * Classes that extend MetadataWidget should override this
   *
   * @returns a rendered instance of `MetadataDisplay`
   */
  renderDisplay(metadata: IMetadata[]): React.ReactElement {
    return (
      <MetadataDisplay
        metadata={metadata}
        updateMetadata={this.updateMetadata}
        openMetadataEditor={this.openMetadataEditor}
        namespace={this.props.namespace}
        sortMetadata={true}
        className={`${METADATA_CLASS}-${this.props.namespace}`}
      />
    );
  }

  render(): React.ReactElement {
    return (
      <ThemeProvider themeManager={this.props.themeManager}>
        <div className={METADATA_CLASS}>
          <header className={METADATA_HEADER_CLASS}>
            <div style={{ display: 'flex' }}>
              <this.props.icon.react
                tag="span"
                width="auto"
                height="24px"
                verticalAlign="middle"
                marginRight="5px"
              />
              <p> {this.props.display_name} </p>
            </div>
            <AddMetadataButton
              schemas={this.schemas}
              addMetadata={this.addMetadata}
              schemaType={this.schemaType}
            />
          </header>
          <UseSignal signal={this.renderSignal} initialArgs={[]}>
            {(_, metadata): React.ReactElement => this.renderDisplay(metadata)}
          </UseSignal>
        </div>
      </ThemeProvider>
    );
  }
}
