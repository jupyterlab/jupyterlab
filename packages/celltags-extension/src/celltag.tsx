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

export class CustomCellTag {
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
      props.formContext.metadataFormWidget.updateMetadata(
        { [props.name]: data },
        true
      );
    }
  }

  /**
   * Pull from cell metadata all the tags used in the notebook and update the
   * stored tag list.
   */
  pullTags(): string[] {
    const notebook = this._tracker?.currentWidget;
    const cells = notebook?.model?.cells ?? [];
    const allTags = reduce(
      cells,
      (allTags: string[], cell) => {
        const tags: string[] = (cell.metadata.get('tags') as string[]) ?? [];
        return [...allTags, ...tags];
      },
      []
    );
    return [...new Set(allTags)].filter(tag => tag !== '');
  }

  private _onAddTagKeyDown(
    props: FieldProps,
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Enter') {
      this.addTag(props, input.value);
    } else if (event.key === 'Escape') {
      input.value = '';
      input.style.width = '49px';
    } else {
      const tmp = document.createElement('span');
      tmp.className = 'add-tag';
      tmp.innerHTML = input.value;
      // set width to the pixel length of the text
      document.body.appendChild(tmp);
      input.style.width = tmp.getBoundingClientRect().width + 8 + 'px';
      document.body.removeChild(tmp);
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
      input.value = '';
      input.style.width = '49px';
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

    props.formContext.metadataFormWidget.updateMetadata(
      { [props.name]: data },
      true
    );
  }

  render(props: FieldProps): JSX.Element {
    const allTags: string[] = this.pullTags();

    return (
      <div className="cell-tags">
        {allTags &&
          allTags.map((tag: string, i: number) => (
            <div
              key={i}
              className={`tag ${
                props.formData.includes(tag) ? 'applied-tag' : 'unapplied-tag'
              }`}
              onClick={() => this._onTagClick(props, tag)}
            >
              <div className="tag-holder">
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
        <div className="tag unapplied-tag">
          <div
            className="tag-holder"
            onMouseDown={(e: React.MouseEvent<HTMLElement>) =>
              this._onAddTagClick(props, e)
            }
          >
            <input
              className="add-tag"
              type="text"
              style={{ width: '49px' }}
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
            />
            <LabIcon.resolveReact
              icon={addIcon}
              tag="span"
              height="18px"
              width="18px"
              marginLeft="5px"
              marginRight="-3px"
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
