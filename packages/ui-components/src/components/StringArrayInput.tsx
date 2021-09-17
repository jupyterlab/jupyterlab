/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { useCallback, useEffect, useRef, useState } from 'react';
import { FormComponentRegistry } from '../FormComponentRegistry';

import produce from 'immer';
import React from 'react';

import { JSONExt } from '@lumino/coreutils';

import { editIcon, trashIcon } from '../icon';

interface IListItemProps {
  defaultValue?: any;
  isEditing?: boolean;
  placeholder?: string;
  multiline?: boolean;
  onSubmit?: (value: string) => any;
  onCancel?: () => any;
  onDelete?: () => any;
  onEdit?: () => any;
}

export const reducer = produce((draft: string[], action) => {
  const { type, payload } = action;
  switch (type) {
    case 'DELETE_ITEM': {
      const { index } = payload;
      if (index !== undefined && index < draft.length) {
        draft.splice(index, 1);
      }
      break;
    }
    case 'UPSERT_ITEM': {
      const { index } = payload;
      if (index !== undefined && index < draft.length) {
        // If the item is empty remove it.
        if (payload.value.trim() === '') {
          draft.splice(index, 1);
        } else {
          draft[index] = payload.value;
        }
      } else if (payload.value.trim() !== '') {
        draft.push(payload.value);
      }
      break;
    }
    case 'UPSERT_ITEMS': {
      const { index } = payload;
      if (
        index !== undefined &&
        index < draft.length &&
        payload.items.length > 0
      ) {
        // Update value of the selected input with the first value in the array.
        draft[index] = payload.items[0];

        // Insert the remaining items.
        draft.splice(index + 1, 0, ...payload.items.slice(1));
      } else {
        draft.push(...payload.items);
      }
      break;
    }
  }
});

export function ArrayListItem({
  defaultValue,
  isEditing,
  placeholder,
  multiline,
  onSubmit,
  onCancel,
  onDelete,
  onEdit
}: IListItemProps) {
  const [value, setValue] = React.useState(
    multiline ? JSON.stringify(defaultValue, null, '\t') : defaultValue
  );

  const inputRef = useRef<any>(null);

  useEffect(() => {
    // We want this to be called anytime isEditing becomes true.
    if (isEditing) {
      inputRef.current!.focus();
      inputRef.current!.select();
    }
  }, [isEditing]);

  React.useEffect(() => {
    setValue(
      multiline ? JSON.stringify(defaultValue, null, '\t') : defaultValue
    );
  }, [defaultValue]);

  if (isEditing) {
    return (
      <div className="jp-StringArray-entry">
        {multiline ? (
          <textarea
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            onKeyDown={e => {
              if (e.code === 'Enter') {
                onSubmit?.(inputRef.current!.value);
                return;
              }
              if (e.code === 'Escape') {
                onCancel?.();
                setValue(defaultValue);
                return;
              }
            }}
            onChange={event => {
              const newValue = event.target.value;
              setValue(
                multiline ? JSON.stringify(newValue, null, '\t') : newValue
              );
            }}
          />
        ) : (
          <input
            ref={inputRef}
            value={value}
            placeholder={placeholder}
            onKeyDown={e => {
              if (e.code === 'Enter') {
                onSubmit?.(inputRef.current!.value);
                return;
              }
              if (e.code === 'Escape') {
                onCancel?.();
                setValue(defaultValue);
                return;
              }
            }}
            onChange={event => {
              const newValue = event.target.value;
              setValue(
                multiline ? JSON.stringify(newValue, null, '\t') : newValue
              );
            }}
          />
        )}
        <div className="jp-StringArray-buttonGroup">
          <button
            onClick={() => {
              onSubmit?.(inputRef.current!.value);
            }}
          >
            OK
          </button>
          <button
            onClick={() => {
              onCancel?.();
              setValue(defaultValue);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div
      onDoubleClick={() => {
        onEdit?.();
      }}
      className="jp-StringArray-entry"
    >
      <input
        style={{ whiteSpace: 'pre' }}
        className="jp-StringArray-entry"
        value={value}
        readOnly
      />
      <div className="jp-StringArray-buttonGroup">
        <button
          aria-label="edit button"
          onClick={(): void => {
            onEdit?.();
          }}
        >
          {<editIcon.react />}
        </button>
        <button
          aria-label="delete button"
          onClick={(): void => {
            onDelete?.();
          }}
        >
          {<trashIcon.react />}
        </button>
      </div>
    </div>
  );
}

export const ArrayInput: React.FC<FormComponentRegistry.IRendererProps> = ({
  value,
  handleChange,
  uihints: { placeholder, defaultValue, label }
}) => {
  const [items, setItems] = React.useState(value ?? []);

  const [editingIndex, setEditingIndex] = useState<number | 'new'>();

  const handleAction = useCallback(
    action => {
      const newItems = reducer(items, action);
      setItems(newItems);
      handleChange(newItems);
    },
    [items, setItems]
  );

  React.useEffect(() => {
    setItems(value ?? []);
  }, [value]);

  return (
    <div className="jp-FormComponent jp-StringArrayInput">
      {!JSONExt.deepEqual(defaultValue, value) ? (
        <div className="jp-modifiedIndicator" />
      ) : undefined}
      <div style={{ width: '100%' }}>
        <h3> {label} </h3>
        {items.length === 0 ? (
          <p> No items defined for this field. </p>
        ) : (
          <ul>
            {items.map((item: string, index: number) => (
              <ArrayListItem
                key={index}
                defaultValue={item}
                placeholder={placeholder}
                multiline={typeof item !== 'string' && !!item}
                isEditing={index === editingIndex}
                onSubmit={value => {
                  setEditingIndex(undefined);
                  handleAction({
                    type: 'UPSERT_ITEM',
                    payload: { index, value }
                  });
                }}
                onCancel={() => {
                  setEditingIndex(undefined);
                }}
                onDelete={() => {
                  handleAction({
                    type: 'DELETE_ITEM',
                    payload: { index }
                  });
                }}
                onEdit={() => {
                  setEditingIndex(index);
                }}
              />
            ))}
            {editingIndex === 'new' && (
              <ArrayListItem
                placeholder={placeholder}
                isEditing
                onSubmit={value => {
                  setEditingIndex(undefined);
                  handleAction({
                    type: 'UPSERT_ITEM',
                    payload: { value }
                  });
                }}
                onCancel={() => {
                  setEditingIndex(undefined);
                }}
              />
            )}
          </ul>
        )}
        {editingIndex !== 'new' && (
          <button
            onClick={() => {
              setEditingIndex('new');
            }}
            className="jp-StringArray-addItem"
          >
            Add Item
          </button>
        )}
      </div>
    </div>
  );
};
