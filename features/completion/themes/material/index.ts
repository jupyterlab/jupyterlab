import { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { PLUGIN_ID } from '../../../../tokens';

import alphabetical from '../../../../../style/icons/themes/material/alphabetical.svg';
import sitemap from '../../../../../style/icons/themes/material/sitemap.svg';
import palette from '../../../../../style/icons/themes/material/palette-outline.svg';
import plus_minus from '../../../../../style/icons/themes/material/plus-minus-variant.svg';
import beaker from '../../../../../style/icons/themes/material/beaker-outline.svg';
import module from '../../../../../style/icons/themes/material/package-variant-closed.svg';
import func from '../../../../../style/icons/themes/material/function.svg';
import func_variant from '../../../../../style/icons/themes/material/function-variant.svg';
import connection from '../../../../../style/icons/themes/material/transit-connection-horizontal.svg';
import value from '../../../../../style/icons/themes/material/text.svg';
import list_numbered from '../../../../../style/icons/themes/material/format-list-numbered-rtl.svg';
import variable from '../../../../../style/icons/themes/material/checkbox-blank-outline.svg';
import field from '../../../../../style/icons/themes/material/checkbox-blank-circle-outline.svg';
import hammer_wrench from '../../../../../style/icons/themes/material/hammer-wrench.svg';
import wrench from '../../../../../style/icons/themes/material/wrench.svg';
import file from '../../../../../style/icons/themes/material/file-outline.svg';
import file_replace from '../../../../../style/icons/themes/material/file-replace-outline.svg';
import folder from '../../../../../style/icons/themes/material/folder-outline.svg';
import number from '../../../../../style/icons/themes/material/numeric.svg';
import shield from '../../../../../style/icons/themes/material/shield-outline.svg';
import structure from '../../../../../style/icons/themes/material/file-tree.svg';
import lightning from '../../../../../style/icons/themes/material/flash-outline.svg';
import key from '../../../../../style/icons/themes/material/key.svg';
import snippet from '../../../../../style/icons/themes/material/border-none-variant.svg';
import alpha_t from '../../../../../style/icons/themes/material/alpha-t.svg';
import {
  ICompletionIconSet,
  ICompletionTheme,
  ILSPCompletionThemeManager
} from '../types';

const default_set: ICompletionIconSet = {
  Text: alphabetical,
  Method: func,
  Function: func_variant,
  Constructor: hammer_wrench,
  Field: field,
  Variable: variable,
  Class: structure,
  Interface: connection,
  Module: module,
  Property: wrench,
  Unit: beaker,
  Value: value,
  Enum: list_numbered,
  Keyword: key,
  Snippet: snippet,
  Color: palette,
  File: file,
  Reference: file_replace,
  Folder: folder,
  EnumMember: number,
  Constant: shield,
  Struct: sitemap,
  Event: lightning,
  Operator: plus_minus,
  TypeParameter: alpha_t
};

const completionTheme: ICompletionTheme = {
  id: 'material',
  name: 'Material Design',
  icons: {
    licence: {
      name: 'SIL Open Font License 1.1',
      abbreviation: 'OFL',
      licensor: 'Austin Andrews and Google',
      link: 'https://github.com/Templarian/MaterialDesign/blob/master/LICENSE'
    },
    light: default_set
  }
};

export const COMPLETION_THEME_MATERIAL: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID + ':completion-theme-material',
  requires: [ILSPCompletionThemeManager],
  activate: (app, iconsManager: ILSPCompletionThemeManager) => {
    iconsManager.register_theme(completionTheme);
  },
  autoStart: true
};
