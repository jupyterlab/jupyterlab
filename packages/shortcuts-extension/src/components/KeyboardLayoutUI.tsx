/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { map } from '@lumino/algorithm';
import { JSONArray, JSONExt } from '@lumino/coreutils';
import { getDefaultRegistry } from '@rjsf/core';
import type { FieldProps, WidgetProps } from '@rjsf/utils';
import { KeyboardCapture } from './KeyboardCapture';
import { IKeyboardLayoutRegistry, IKeyboardLayoutSettings } from '../types';

const SelectWidget = getDefaultRegistry().widgets['SelectWidget'];

/**
 * Renderer for a manually captured keyboard layout.
 */
function Layout({
  layout,
  onRemove
}: {
  layout: IKeyboardLayoutSettings;
  onRemove: (name: string) => void;
}): React.ReactElement {
  return (
    <details className="jp-Keyboard-layoutDetails">
      <summary>
        {layout.name}
        <button onClick={() => onRemove(layout.name)}>Delete</button>
      </summary>
      <h4>Keys:</h4>
      <ul className="jp-Keyboard-List">
        {Object.keys(layout.codeMap).some(a => a)
          ? [
              ...Object.entries(layout.codeMap).map(([code, key]) => (
                <li key={code} className="jp-Keyboard-Entry">
                  <span key="key">
                    <kbd>{key === ' ' ? 'Space' : key}</kbd>
                  </span>
                  <span key="code">{code}</span>
                </li>
              ))
            ]
          : 'No keys registered'}
      </ul>
      <h4>Modifiers:</h4>
      <ul className="jp-Keyboard-ModifierList">
        {layout.modifiers.length > 0
          ? [
              ...map(layout.modifiers, modifier => (
                <li key={modifier} className="jp-Keyboard-Entry">
                  <span>
                    <kbd>{modifier}</kbd>
                  </span>
                </li>
              ))
            ]
          : 'No modifiers registered'}
      </ul>
    </details>
  );
}

/**
 * Snapshot of the available layouts in the registry.
 */
type RegistrySnapshot = {
  custom: [string, IKeyboardLayoutSettings][];
  fixed: string[];
};

/**
 * Hook for using the layouts in the registry in react.
 */
function useRegistry(registry: IKeyboardLayoutRegistry): RegistrySnapshot {
  const cache = React.useRef<{ fixed: string[]; custom: JSONArray }>({
    custom: [],
    fixed: []
  });

  const subscribe = React.useCallback(
    (callback: () => void) => {
      registry.changed.connect(callback);
      return () => registry.changed.disconnect(callback);
    },
    [registry]
  );

  const getSnapshot = React.useCallback(() => {
    const withRaw = registry.names.map(
      name =>
        [name, registry.getRaw(name)] as [
          string,
          IKeyboardLayoutSettings | undefined
        ]
    );
    const custom = withRaw.filter(([name, raw]) => raw) as JSONArray;
    const fixed = withRaw.filter(([name, raw]) => !raw).map(([name]) => name);
    if (
      !JSONExt.deepEqual(
        [fixed, custom],
        [cache.current.fixed, cache.current.custom]
      )
    ) {
      const value = { custom, fixed };
      cache.current = value;
    }
    return cache.current as RegistrySnapshot;
  }, [registry]);

  return React.useSyncExternalStore(subscribe, getSnapshot);
}

/** Props for ShortcutUI component */
export type KeyboardLayoutUIProps = FieldProps & {
  layoutRegistry: IKeyboardLayoutRegistry;
};

/**
 * Render the layout settings UI.
 * @param param0
 * @returns
 */
export function KeyboardLayoutUI({
  layoutRegistry
}: KeyboardLayoutUIProps): React.ReactElement {
  const { custom, fixed } = useRegistry(layoutRegistry);
  return (
    <>
      {fixed.length > 0 && (
        <div className="jp-FormGroup-contentNormal">
          <h3 className="jp-FormGroup-contentItem jp-FormGroup-fieldLabel">
            Built-in maps
          </h3>
          <div className="jp-FormGroup-contentItem">{fixed.join(', ')}</div>
          <div className="jp-FormGroup-description">
            The keyboard layouts included in the build. Informational only.
          </div>
        </div>
      )}
      <div className="jp-FormGroup-contentNormal">
        <h3 className="jp-FormGroup-contentItem jp-FormGroup-fieldLabel">
          Custom maps
        </h3>
        {custom.length > 0 && (
          <>
            <div className="jp-FormGroup-description">
              Maps added by the user:
            </div>
            <ul
              style={{
                listStyleType: 'none',
                paddingInlineStart: '20px',
                width: '100%'
              }}
            >
              {custom.map(([name, raw]) => (
                <li key={name}>
                  <Layout
                    layout={raw}
                    onRemove={name => layoutRegistry.remove(name)}
                  />
                </li>
              ))}
            </ul>
          </>
        )}
        <KeyboardCapture
          onAdd={data => {
            layoutRegistry.add(data);
          }}
        />
      </div>
    </>
  );
}

/**
 * Custom render for dropdown to inject our options as enum options.
 */
export function LayoutDropdownWidget(
  props: WidgetProps & { layoutRegistry: IKeyboardLayoutRegistry }
): React.ReactElement {
  const { layoutRegistry, options, ...rest } = props;
  const { custom, fixed } = useRegistry(layoutRegistry);

  const newOptions = React.useMemo(() => {
    const values = Array.from(
      new Set([...fixed, ...custom.map(b => b[0])])
    ).sort();
    return {
      ...options,
      enumOptions: values.map(v => ({ label: v, value: v }))
    };
  }, [custom, fixed]);

  return <SelectWidget {...rest} options={newOptions} />;
}
