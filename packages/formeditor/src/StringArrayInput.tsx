import { useCallback, useEffect, useRef, useState } from 'react';

import produce from 'immer';
import React from 'react';
import {
  Button,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  TextField
} from '@material-ui/core';
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
  const inputRef = useRef<HTMLInputElement>(null);

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
        <TextField
          inputProps={{ ref: inputRef }}
          className="jp-StringArray-entry"
          variant="outlined"
          defaultValue={
            typeof value === 'string'
              ? value ?? ''
              : JSON.stringify(value, null, '\t')
          }
          multiline={typeof value !== 'string'}
          maxRows={15}
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
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Button
                  onClick={() => {
                    onSubmit?.(inputRef.current!.value);
                  }}
                >
                  OK
                </Button>
                <Button
                  onClick={() => {
                    onCancel?.();
                  }}
                >
                  Cancel
                </Button>
              </InputAdornment>
            )
          }}
        />
      </div>
    );
  }
  return (
    <ListItem
      onDoubleClick={() => {
        onEdit?.();
      }}
    >
      <TextField
        style={{ whiteSpace: 'pre' }}
        className="jp-StringArray-entry"
        variant="outlined"
        value={
          typeof value === 'string'
            ? value ?? ''
            : JSON.stringify(value, null, '\t')
        }
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="edit button"
                onClick={(): void => {
                  onEdit?.();
                }}
                edge="end"
              >
                {<editIcon.react />}
              </IconButton>
              <IconButton
                aria-label="delete button"
                onClick={(): void => {
                  onDelete?.();
                }}
                edge="end"
              >
                {<trashIcon.react />}
              </IconButton>
            </InputAdornment>
          )
        }}
      />
    </ListItem>
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
    <div>
      <List>
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
      </List>

      {editingIndex !== 'new' && (
        <Button
          onClick={() => {
            setEditingIndex('new');
          }}
        >
          Add Item
        </Button>
      )}
    </div>
  );
}
