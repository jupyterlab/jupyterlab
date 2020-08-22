import { CompletionItemKindStrings } from '../../lsp';
import { LabIcon } from '@jupyterlab/ui-components';
import { IThemeManager } from '@jupyterlab/apputils';
import { Token } from '@lumino/coreutils';
import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PLUGIN_ID } from '../../tokens';

export type SvgString = string;

type requiredIcons = {
  [key in CompletionItemKindStrings]: SvgString;
};

export interface ICompletionIconSet extends requiredIcons {
  Kernel: SvgString;
}

interface ILicenseInfo {
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

export interface ICompletionIconTheme {
  /**
   * Name of the icons theme.
   */
  name: string;
  /**
   * Short name of the license of the icons included.
   */
  licence: ILicenseInfo;
  /**
   * An object mapping completion item kind name to a string with an SVG icon.
   */
  icons: {
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
     */
    options?: LabIcon.IProps;
  };
}

export interface ILSPCompletionIconsManager {
  get_icon(type: string): LabIcon | null;
  set_icon_theme(name: string | null): void;
  register_theme(theme: ICompletionIconTheme): void;
}

export const ILSPCompletionIconsManager = new Token<ILSPCompletionIconsManager>(
  PLUGIN_ID + ':ILSPCompletionIconsManager'
);

export class CompletionIconManager implements ILSPCompletionIconsManager {
  protected current_icons: Map<string, LabIcon>;
  protected themes: Map<string, ICompletionIconTheme>;
  private current_theme_name: string;

  constructor(protected themeManager: IThemeManager) {
    this.themes = new Map();
    themeManager.themeChanged.connect(this.update_icons_set, this);
  }

  protected is_theme_light() {
    const current = this.themeManager.theme;
    if (!current) {
      // assume true by default
      return true;
    }
    return this.themeManager.isLight(current);
  }

  protected create_icons(icon_set: ICompletionIconSet): Map<string, LabIcon> {
    const icons: Map<string, LabIcon> = new Map();
    const mode = this.is_theme_light() ? 'light' : 'dark';
    for (let [completion_kind, svg] of Object.entries(icon_set)) {
      let name =
        'lsp:' + this.current_theme_name + '-' + completion_kind + '-' + mode;
      icons.set(
        completion_kind,
        new LabIcon({
          name: name,
          svgstr: svg
        })
      );
    }
    return icons;
  }

  protected update_icons_set() {
    if (this.current_theme === null) {
      return;
    }
    const icons_sets = this.current_theme.icons;
    const dark_mode_and_dark_supported =
      !this.is_theme_light() && typeof icons_sets.dark !== 'undefined';
    const set: ICompletionIconSet = dark_mode_and_dark_supported
      ? icons_sets.dark
      : icons_sets.light;
    this.current_icons = this.create_icons(set);
  }

  get_icon(type: string): LabIcon {
    if (this.current_theme === null) {
      return null;
    }
    let options = this.current_theme.icons.options || {};
    if (this.current_icons.has(type)) {
      return this.current_icons.get(type).bindprops(options);
    }
    return null;
  }

  set_icon_theme(name: string | null) {
    if (!this.themes.has(name)) {
      console.warn(
        `[LSP][Completer] Icons theme ${name} cannot be set yet (it may be loaded later).`
      );
    }
    this.current_theme_name = name;
    this.update_icons_set();
  }

  protected get current_theme(): ICompletionIconTheme | null {
    if (this.themes.has(this.current_theme_name)) {
      return this.themes.get(this.current_theme_name);
    }
    return null;
  }

  register_theme(theme: ICompletionIconTheme) {
    if (this.themes.has(theme.name)) {
      console.warn(
        'Theme with name',
        theme.name,
        'was already registered, overwriting.'
      );
    }
    this.themes.set(theme.name, theme);
    this.update_icons_set();
  }
}

export const COMPLETION_ICONS_MANAGER: JupyterFrontEndPlugin<ILSPCompletionIconsManager> = {
  id: PLUGIN_ID + ':ILSPCompletionIconsManager',
  requires: [IThemeManager],
  activate: (app, themeManager: IThemeManager) => {
    return new CompletionIconManager(themeManager);
  },
  provides: ILSPCompletionIconsManager,
  autoStart: true
};
