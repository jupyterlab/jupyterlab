import { Token } from '@lumino/coreutils';
import { PLUGIN_ID } from '../../../tokens';
import { LabIcon } from '@jupyterlab/ui-components';
import { CompletionItemKindStrings } from '../../../lsp';

export type SvgString = string;

type requiredIcons = {
  [key in CompletionItemKindStrings]: SvgString;
};

export interface ICompletionIconSet extends requiredIcons {
  Kernel?: SvgString;
}

export interface ILicenseInfo {
  /**
   * Licence name.
   */
  name: string;
  /**
   * Abbreviation of the licence name;
   */
  abbreviation: string;
  /**
   * The copyright holder/owner name.
   */
  licensor: string;
  /**
   * Link to the full licence text.
   */
  link: string;
}

export interface ICompletionTheme {
  /**
   * Theme identifier (which can be part of a valid HTML class name).
   */
  id: string;
  /**
   * Name of the theme.
   */
  name: string;
  /**
   * Provides object mapping completion item kind name to a string with an SVG icon,
   * as well as icons options and metadata.
   */
  icons: {
    /**
     * Short name of the license of the icons included.
     */
    licence: ILicenseInfo;
    /**
     * The version to be used in the light mode.
     */
    light: ICompletionIconSet;
    /**
     * The version to be used in the dark mode.
     */
    dark?: ICompletionIconSet;
    /**
     * Icon properties to be set on each of the icons.
     * NOTE: setting className here will not work, as
     * it would be overwritten in the completer.
     * In order to style the icons use:
     * `.lsp-completer-theme-{id} .jp-Completer-icon svg`
     * instead, where {id} is the identifier of your theme.
     */
    options?: LabIcon.IProps;
  };
}

export interface ILSPCompletionThemeManager {
  get_icon(type: string): LabIcon | null;

  set_theme(theme_id: string | null): void;

  register_theme(theme: ICompletionTheme): void;

  get_icons_set(
    theme: ICompletionTheme
  ): Map<keyof ICompletionIconSet, LabIcon>;
}

export const ILSPCompletionThemeManager = new Token<ILSPCompletionThemeManager>(
  PLUGIN_ID + ':ILSPCompletionThemeManager'
);
