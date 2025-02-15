/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { FieldProps } from '@rjsf/utils';
import { INotebookTracker } from '@jupyterlab/notebook';
import { addIcon, checkIcon, LabIcon } from '@jupyterlab/ui-components';
import { reduce } from '@lumino/algorithm';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

/**
 * The class name added to the cell-tags field.
 */
const CELL_TAGS_WIDGET_CLASS = 'jp-CellTags';
/**
 * The class name added to each tag element.
 */
const CELL_TAGS_ELEMENT_CLASS = 'jp-CellTags-Tag';
/**
 * The class name added to each applied tag element.
 */
const CELL_TAGS_ELEMENT_APPLIED_CLASS = 'jp-CellTags-Applied';
/**
 * The class name added to each unapplied tag element.
 */
const CELL_TAGS_ELEMENT_UNAPPLIED_CLASS = 'jp-CellTags-Unapplied';
/**
 * The class name added to the tag holder.
 */
const CELL_TAGS_HOLDER_CLASS = 'jp-CellTags-Holder';
/**
 * The class name added to the add-tag input.
 */
const CELL_TAGS_ADD_CLASS = 'jp-CellTags-Add';
/**
 * The class name added to an empty input.
 */
const CELL_TAGS_EMPTY_CLASS = 'jp-CellTags-Empty';

export class CellTagField {
  constructor(tracker: INotebookTracker, translator?: ITranslator) {
    this._tracker = tracker;
    this._translator = translator || nullTranslator;
    this._trans = this._translator.load('jupyterlab');
    this._editing = false;
  }

  addTag(props: FieldProps, tag: string) {
    const data = props.formData;
    if (tag && !data.includes(tag)) {
      data.push(tag);
      props.formContext.updateMetadata({ [props.name]: data }, true);
    }
  }

  /**
   * Pull from cell metadata all the tags used in the notebook and update the
   * stored tag list.
   */
  pullTags(): string[] {
    const notebook = this._tracker?.currentWidget;
    const cells = notebook?.model?.cells;
    if (cells === undefined) {
      return [];
    }
    const allTags = reduce(
      cells,
      (allTags: string[], cell) => {
        const tags: string[] = (cell.getMetadata('tags') as string[]) ?? [];
        return [...allTags, ...tags];
      },
      []
    );
    return [...new Set(allTags)].filter(tag => tag !== '');
  }

  private _emptyAddTag(target: HTMLInputElement) {
    target.value = '';
    target.style.width = '';
    target.classList.add(CELL_TAGS_EMPTY_CLASS);
  }

  private _onAddTagKeyDown(
    props: FieldProps,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    const input = event.target as HTMLInputElement;

    if (event.ctrlKey) return;

    if (event.key === 'Enter') {
      this.addTag(props, input.value);
    } else if (event.key === 'Escape') {
      this._emptyAddTag(input);
    }
  }

  private _onAddTagFocus(event: React.FocusEvent<HTMLInputElement>) {
    if (!this._editing) {
      (event.target as HTMLInputElement).blur();
    }
  }

  private _onAddTagBlur(input: HTMLInputElement) {
    if (this._editing) {
      this._editing = false;
      this._emptyAddTag(input);
    }
  }

  private _onChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.value) {
      this._emptyAddTag(event.target);
    } else {
      event.target.classList.remove(CELL_TAGS_EMPTY_CLASS);
      const tmp = document.createElement('span');
      tmp.className = CELL_TAGS_ADD_CLASS;
      tmp.textContent = event.target.value;
      // set width to the pixel length of the text
      document.body.appendChild(tmp);
      event.target.style.setProperty(
        'width',
        `calc(${
          tmp.getBoundingClientRect().width
        }px + var(--jp-add-tag-extra-width))`
      );
      document.body.removeChild(tmp);
    }
  }

  private _onAddTagClick(
    props: FieldProps,
    event: React.MouseEvent<HTMLElement>
  ) {
    const elem = (event.target as HTMLElement).closest('div');
    const input = elem?.childNodes[0] as HTMLInputElement;
    if (!this._editing) {
      this._editing = true;
      input.value = '';
      input.focus();
    } else if (event.target !== input) {
      this.addTag(props, input.value);
    }
    event.preventDefault();
  }

  private _onTagClick(props: FieldProps, tag: string) {
    const data = props.formData;
    if (data.includes(tag)) {
      data.splice(data.indexOf(tag), 1);
    } else {
      data.push(tag);
    }

    props.formContext.updateMetadata({ [props.name]: data }, true);
  }

  render(props: FieldProps): JSX.Element {
    const allTags: string[] = this.pullTags();

    return (
      <div className={CELL_TAGS_WIDGET_CLASS}>
        <div className="jp-FormGroup-fieldLabel jp-FormGroup-contentItem">
          Cell Tags
        </div>
        {allTags &&
          allTags.map((tag: string, i: number) => (
            <div
              key={i}
              className={`${CELL_TAGS_ELEMENT_CLASS} ${
                props.formData.includes(tag)
                  ? CELL_TAGS_ELEMENT_APPLIED_CLASS
                  : CELL_TAGS_ELEMENT_UNAPPLIED_CLASS
              }`}
              onClick={() => this._onTagClick(props, tag)}
            >
              <div className={CELL_TAGS_HOLDER_CLASS}>
                <span>{tag}</span>
                {props.formData.includes(tag) && (
                  <LabIcon.resolveReact
                    icon={checkIcon}
                    tag="span"
                    elementPosition="center"
                    height="18px"
                    width="18px"
                    marginLeft="5px"
                    marginRight="-3px"
                  />
                )}
              </div>
            </div>
          ))}
        <div
          className={`${CELL_TAGS_ELEMENT_CLASS} ${CELL_TAGS_ELEMENT_UNAPPLIED_CLASS}`}
        >
          <div
            className={CELL_TAGS_HOLDER_CLASS}
            onMouseDown={(e: React.MouseEvent<HTMLElement>) =>
              this._onAddTagClick(props, e)
            }
          >
            <input
              className={`${CELL_TAGS_ADD_CLASS} ${CELL_TAGS_EMPTY_CLASS}`}
              type="text"
              placeholder={this._trans.__('Add Tag')}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                this._onAddTagKeyDown(props, e)
              }
              onFocus={(e: React.FocusEvent<HTMLInputElement>) =>
                this._onAddTagFocus(e)
              }
              onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                this._onAddTagBlur(e.target)
              }
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                this._onChange(e);
              }}
            />
            <LabIcon.resolveReact
              icon={addIcon}
              tag="span"
              height="18px"
              width="18px"
              className={CELL_TAGS_HOLDER_CLASS}
            />
          </div>
        </div>
      </div>
    );
  }

  private _tracker: INotebookTracker;
  private _translator: ITranslator;
  private _trans: TranslationBundle;
  private _editing: boolean;
}
