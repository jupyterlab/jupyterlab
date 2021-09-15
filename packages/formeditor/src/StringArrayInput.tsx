/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { useCallback, useEffect, useRef, useState } from 'react';

import produce from 'immer';
import React from 'react';

import { editIcon, trashIcon } from '@jupyterlab/ui-components';

interface IProps {
  placeholder?: string;
  values?: string[];
  onChange: (values: string[]) => void;
}

interface IListItemProps {
  value?: any;
  isEditing?: boolean;
  placeholder?: string;
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
  value,
  isEditing,
  placeholder,
  onSubmit,
  onCancel,
  onDelete,
  onEdit
}: IListItemProps) {
  const inputRef = useRef<any>(null);

  useEffect(() => {
    // We want this to be called anytime isEditing becomes true.
    if (isEditing) {
      inputRef.current!.focus();
      inputRef.current!.select();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div>
        {typeof value !== 'string' ? (
          <textarea
            ref={inputRef}
            className="jp-StringArray-entry"
            value={
              typeof value === 'string'
                ? value ?? ''
                : JSON.stringify(value, null, '\t')
            }
            placeholder={placeholder}
            onKeyDown={e => {
              if (e.code === 'Enter') {
                onSubmit?.(inputRef.current!.value);
                return;
              }
              if (e.code === 'Escape') {
                onCancel?.();
                return;
              }
            }}
          />
        ) : (
          <input
            ref={inputRef}
            className="jp-StringArray-entry"
            value={
              typeof value === 'string'
                ? value ?? ''
                : JSON.stringify(value, null, '\t')
            }
            placeholder={placeholder}
            onKeyDown={e => {
              if (e.code === 'Enter') {
                onSubmit?.(inputRef.current!.value);
                return;
              }
              if (e.code === 'Escape') {
                onCancel?.();
                return;
              }
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
    >
      <input
        style={{ whiteSpace: 'pre' }}
        className="jp-StringArray-entry"
        value={
          typeof value === 'string'
            ? value ?? ''
            : JSON.stringify(value, null, '\t')
        }
        readOnly
      />
      <div>
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

export function ArrayInput({ placeholder, onChange, values }: IProps) {
  const [items, setItems] = React.useState(values ?? []);

  const [editingIndex, setEditingIndex] = useState<number | 'new'>();

  const handleAction = useCallback(
    action => {
      const newItems = reducer(items, action);
      setItems(newItems);
      onChange(newItems);
    },
    [items, setItems]
  );

  return (
    <ul>
      {items.map((item: string, index: number) => (
        <ArrayListItem
          key={index}
          value={item}
          placeholder={placeholder}
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
      {editingIndex !== 'new' && (
        <button
          onClick={() => {
            setEditingIndex('new');
          }}
        >
          Add Item
        </button>
      )}
    </ul>
  );
}
