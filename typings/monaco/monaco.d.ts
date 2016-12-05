/// <reference path='../../node_modules/monaco-editor-core/monaco.d.ts'/>

declare module monaco.editor {

  export interface IEditableTextModel {
    undo(): Selection[];
    redo(): Selection[];
    setEditableRange(range: monaco.IRange): void;
    hasEditableRange(): boolean;
    getEditableRange(): Range;
  }

  export interface IContextKeyService {
    getContextKeyValue<T>(key: string): T;
  }

  export interface ICommonCodeEditor extends IEditor {
    readonly _contextKeyService: IContextKeyService;
  }

}
