/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { combineConfig, Extension, Facet } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Editor customizable styles
 */
export type CustomTheme = {
  /**
   * Font family
   */
  fontFamily: string | null;
  /**
   * Font size
   */
  fontSize: number | null;
  /**
   * Line height
   */
  lineHeight: number | null;
};

/**
 * Custom theme configuration
 *
 * The first non-null value takes precedence
 */
const customThemeConfig = Facet.define<CustomTheme, CustomTheme>({
  combine(configs: CustomTheme[]) {
    return combineConfig(
      configs,
      {
        fontFamily: null,
        fontSize: null,
        lineHeight: null
      },
      {
        fontFamily: (a, b) => a ?? b,
        fontSize: (a, b) => a ?? b,
        lineHeight: (a, b) => a ?? b
      }
    );
  }
});

function setEditorStyle(view: EditorView): Record<string, string> | null {
  const { fontFamily, fontSize, lineHeight } =
    view.state.facet(customThemeConfig);

  let style = '';
  if (fontSize) {
    style += `font-size: ${fontSize}px !important;`;
  }
  if (fontFamily) {
    style += `font-family: ${fontFamily} !important;`;
  }
  if (lineHeight) {
    style += `line-height: ${lineHeight.toString()} !important`;
  }

  return { style: style };
}

/**
 * Get the extension to customize an editor theme.
 *
 * @param config Theme customization
 * @returns Editor extension
 */
export function customTheme(config: CustomTheme): Extension {
  return [
    customThemeConfig.of(config),
    EditorView.editorAttributes.of(setEditorStyle)
  ];
}
