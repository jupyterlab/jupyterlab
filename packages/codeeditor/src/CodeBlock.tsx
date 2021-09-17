/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import React from 'react';
import { CodeEditor } from './editor';

import { JSONExt } from '@lumino/coreutils';

import { FormComponentRegistry } from '@jupyterlab/ui-components';

interface ICodeBlockRendererProps extends FormComponentRegistry.IRendererProps {
  uihints: {
    editorFactory: CodeEditor.Factory;
    defaultValue: string;
    language: string;
    label: string;
    error?: string;
  };
}

export const CodeBlock: React.FC<ICodeBlockRendererProps> = ({
  value,
  handleChange,
  uihints: { editorFactory, defaultValue, language, label, error }
}) => {
  const codeBlockRef = React.useRef<HTMLDivElement>(null);
  const editorRef = React.useRef<CodeEditor.IEditor>();

  React.useEffect(() => {
    if (codeBlockRef.current !== null) {
      console.log(editorFactory);
      editorRef.current = editorFactory?.({
        host: codeBlockRef.current,
        model: new CodeEditor.Model({
          value: defaultValue,
          mimeType: 'application/json'
        })
      });
      editorRef.current?.model.value.changed.connect(handleChange);
    }

    return (): void => {
      editorRef.current?.model.value.changed.disconnect(handleChange);
    };
  }, []);

  React.useEffect(() => {
    if (editorRef.current !== undefined) {
      editorRef.current.model.mimeType = 'application/json';
    }
  }, [language]);

  return (
    <div
      className={`jp-FormComponent ${error ? 'jp-SettingEditor-error' : ''}`}
    >
      {!JSONExt.deepEqual(defaultValue, value) ? (
        <div className="jp-modifiedIndicator" />
      ) : undefined}
      <div>
        <h3> {label} </h3>
        <div ref={codeBlockRef} className="elyra-form-code" />
        {!!error && <p className="jp-SettingEditor-errorMessage">{error}</p>}
      </div>
    </div>
  );
};
