/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { KeycodeLayout } from '@lumino/keyboard';
import { IKeyboardLayoutSettings } from '../types';

type CaptureData = { key: string; code?: string; type: 'modifier' | 'code' };

function LayoutCaptureArea({
  onCapture
}: {
  onCapture: (data: CaptureData) => void;
}): React.ReactElement {
  return (
    <div
      tabIndex={0}
      className="jp-Keyboard-captureArea"
      style={{
        minWidth: '200px',
        border: '3px dashed',
        borderRadius: '5px',
        padding: '6px',
        margin: '6px',
        maxWidth: '500px',
        minHeight: '2lh',
        display: 'flex',
        alignItems: 'center',
        textAlign: 'center'
      }}
      onKeyDown={event => {
        event.stopPropagation();
        event.preventDefault();
        if (event.getModifierState(event.key as any)) {
          onCapture({ key: event.key, type: 'modifier' });
        }
      }}
      onKeyUp={event => {
        event.stopPropagation();
        event.preventDefault();
        if (event.getModifierState(event.key as any)) {
          onCapture({ key: event.key, type: 'modifier' });
          return;
        }
        let { key, code } = event;
        if (key === 'Dead') {
          console.log('Dead key', event);
        } else if (!code || code === 'Unidentified') {
          console.log('Unidentified code', event);
        } else {
          onCapture({ key, code, type: 'code' });
        }
      }}
    >
      Focus me and hit each key on your keyboard without any modifiers <br />
      (click the modifiers separately)
    </div>
  );
}

function renderCaptureData({
  type,
  code,
  key
}: CaptureData): React.ReactElement {
  return (
    <div className="jp-Keyboard-captureAreaOutput">
      Added {type}: {code ? `${code} →` : ''}{' '}
      <kbd>{key.charAt(0).toUpperCase() + key.slice(1)}</kbd>
    </div>
  );
}

function exportData({
  name,
  codeMap,
  modifiers
}: IKeyboardLayoutSettings): IKeyboardLayoutSettings {
  return {
    name,
    modifiers: modifiers.sort(),
    codeMap: Object.keys(codeMap)
      .sort()
      .reduce<{ [code: string]: string }>((acc, k) => {
        acc[k] = codeMap[k].charAt(0).toUpperCase() + codeMap[k].slice(1);
        return acc;
      }, {})
  };
}

export function KeyboardCapture({
  onAdd
}: {
  onAdd: (data: IKeyboardLayoutSettings) => void;
}): React.ReactElement {
  const [codeMap, setCodeMap] = React.useState<KeycodeLayout.ModernCodeMap>({});
  const [modifiers, setModifiers] = React.useState([] as string[]);
  const [name, setName] = React.useState('');
  const [latestAction, setLatestAction] = React.useState<CaptureData | null>(
    null
  );

  const canAdd = name && Object.keys(codeMap).length > 0;

  return (
    <div className="jp-Keyboard-captureContainer">
      <b>Build your own map:</b>
      <LayoutCaptureArea
        onCapture={({ key, code, type }) => {
          if (type === 'modifier') {
            if (!modifiers.includes(key)) {
              setModifiers([...modifiers, key]);
            }
          } else {
            setCodeMap({ ...codeMap, [code!]: key });
          }
          setLatestAction({ key, code, type });
        }}
      />
      {latestAction ? (
        renderCaptureData(latestAction)
      ) : (
        <div className="jp-Keyboard-captureAreaOutput">No keys added</div>
      )}
      <div className="jp-Keyboard-captureActions">
        <label>
          Name:
          <input
            title="The name to use for the new keyboard layout"
            value={name}
            onChange={event => {
              setName(event.target.value);
            }}
          />
        </label>
        <button
          disabled={!canAdd}
          title={
            canAdd
              ? 'Add the captured map as the specified name'
              : 'Enter a name and capture some keys to add the captured map'
          }
          onClick={() => {
            onAdd(exportData({ codeMap, modifiers, name }));
            setModifiers([]);
            setCodeMap({});
            setName('');
          }}
        >
          Add
        </button>
        <button
          title="Clear the in-progress captured keyboard data"
          onClick={() => {
            setModifiers([]);
            setCodeMap({});
            setName('');
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
}
