// Type definitions for react-inspector
// Project: https://github.com/xyc/react-inspector
// Definitions by: vidartf <https://github.com/vidartf>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// From  https://github.com/vidartf/jupyterlab-kernelspy

declare module 'react-inspector' {
  import * as React from 'react';

  export class DOMInspector extends React.Component<DOMInspector.IProperties> {}

  export namespace DOMInspector {
    export interface IProperties {
      data: HTMLElement;
    }
  }

  export class ObjectInspector extends React.Component<
    ObjectInspector.IProperties
  > {}

  export namespace ObjectInspector {
    export interface INodeRendererArgs {
      depth: number;
      name: string;
      data: any;
      isNonenumerable: boolean;
      expanded: boolean;
    }

    export interface IProperties {
      data: any;

      name?: string;

      expandLevel?: number;

      expandPaths?: string | string[];

      showNonenumerable?: boolean;

      sortObjectKeys?: boolean | ((a: string, b: string) => number);

      nodeRenderer?: (args: INodeRendererArgs) => React.ReactElement<any>;

      theme?: string | Partial<ITheme>;
    }
  }

  export class TableInspector extends React.Component<
    ObjectInspector.IProperties,
    ObjectInspector.IState
  > {
    handleIndexTHClick(): void;

    handleTHClick(col: string): void;
  }

  export namespace ObjectInspector {
    export interface IProperties {
      columns?: string[];
      data: any;
      theme?: string | Partial<ITheme>;
    }

    export interface IState {
      sorted: boolean;
      sortIndexColumn: boolean;
      sortColumn: string | undefined;
      sortAscending: boolean;
    }
  }

  export function Inspector(
    props: Partial<Inspector.IProperties>
  ): ObjectInspector | TableInspector | DOMInspector;

  export namespace Inspector {
    export interface IProperties {
      table: boolean;
      data: any;
      [key: string]: any;
    }
  }

  export function ObjectLabel(
    props: Partial<ObjectLabel.IProperties>
  ): React.ReactElement<ObjectLabel.IProperties>;

  export namespace ObjectLabel {
    export interface IProperties {
      name: string;
      data: any;
      isNonenumerable: boolean;
    }
  }

  export function ObjectRootLabel(
    props: Partial<ObjectRootLabel.IProperties>
  ): React.ReactElement<ObjectRootLabel.IProperties>;

  export namespace ObjectRootLabel {
    export interface IProperties {
      name: string;
      data: any;
    }
  }

  export function ObjectName(
    props: Partial<ObjectName.IProperties>,
    contexts: Partial<ObjectName.IContexts>
  ): React.ReactElement<ObjectName.IProperties>;

  export namespace ObjectName {
    export interface IProperties {
      name: string;
      dimmed: boolean;
      styles: React.CSSProperties;
    }

    export interface IContexts {
      theme: ITheme;
    }
  }

  export function ObjectValue(
    props: Partial<ObjectValue.IProperties>,
    contexts: Partial<ObjectValue.IContexts>
  ): React.ReactElement<ObjectValue.IProperties>;

  export namespace ObjectValue {
    export interface IProperties {
      object: any;
      styles: React.CSSProperties;
    }

    export interface IContexts {
      theme: ITheme;
    }
  }

  export interface ITheme {
    ARROW_COLOR: string;
    ARROW_FONT_SIZE: number;
    ARROW_MARGIN_RIGHT: number;
    BASE_BACKGROUND_COLOR: string;
    BASE_COLOR: string;
    BASE_FONT_FAMILY: string;
    BASE_FONT_SIZE: string;
    BASE_LINE_HEIGHT: string;
    HTML_ATTRIBUTE_NAME_COLOR: string;
    HTML_ATTRIBUTE_VALUE_COLOR: string;
    HTML_COMMENT_COLOR: string;
    HTML_DOCTYPE_COLOR: string;
    HTML_TAGNAME_COLOR: string;
    HTML_TAGNAME_TEXT_TRANSFORM: string;
    HTML_TAG_COLOR: string;
    OBJECT_NAME_COLOR: string;
    OBJECT_VALUE_BOOLEAN_COLOR: string;
    OBJECT_VALUE_FUNCTION_KEYWORD_COLOR: string;
    OBJECT_VALUE_NULL_COLOR: string;
    OBJECT_VALUE_NUMBER_COLOR: string;
    OBJECT_VALUE_REGEXP_COLOR: string;
    OBJECT_VALUE_STRING_COLOR: string;
    OBJECT_VALUE_SYMBOL_COLOR: string;
    OBJECT_VALUE_UNDEFINED_COLOR: string;
    TABLE_BORDER_COLOR: string;
    TABLE_DATA_BACKGROUND_IMAGE: string;
    TABLE_DATA_BACKGROUND_SIZE: string;
    TABLE_SORT_ICON_COLOR: string;
    TABLE_TH_BACKGROUND_COLOR: string;
    TABLE_TH_HOVER_COLOR: string;
    TREENODE_FONT_FAMILY: string;
    TREENODE_FONT_SIZE: string;
    TREENODE_LINE_HEIGHT: string;
    TREENODE_PADDING_LEFT: number;
  }

  export const chromeDark: ITheme;

  export const chromeLight: ITheme;
}
