// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Loader } from '@mathjax/src/mjs/components/loader.js';

import '@mathjax/src/mjs/input/tex/base/BaseConfiguration.js';
import '@mathjax/src/mjs/input/tex/action/ActionConfiguration.js';
import '@mathjax/src/mjs/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/mjs/input/tex/amscd/AmsCdConfiguration.js';
import '@mathjax/src/mjs/input/tex/bbox/BboxConfiguration.js';
import '@mathjax/src/mjs/input/tex/boldsymbol/BoldsymbolConfiguration.js';
import '@mathjax/src/mjs/input/tex/braket/BraketConfiguration.js';
import '@mathjax/src/mjs/input/tex/bussproofs/BussproofsConfiguration.js';
import '@mathjax/src/mjs/input/tex/cancel/CancelConfiguration.js';
import '@mathjax/src/mjs/input/tex/cases/CasesConfiguration.js';
import '@mathjax/src/mjs/input/tex/centernot/CenternotConfiguration.js';
import '@mathjax/src/mjs/input/tex/color/ColorConfiguration.js';
import '@mathjax/src/mjs/input/tex/colorv2/ColorV2Configuration.js';
import '@mathjax/src/mjs/input/tex/colortbl/ColortblConfiguration.js';
import '@mathjax/src/mjs/input/tex/configmacros/ConfigMacrosConfiguration.js';
import '@mathjax/src/mjs/input/tex/empheq/EmpheqConfiguration.js';
import '@mathjax/src/mjs/input/tex/enclose/EncloseConfiguration.js';
import '@mathjax/src/mjs/input/tex/extpfeil/ExtpfeilConfiguration.js';
import '@mathjax/src/mjs/input/tex/gensymb/GensymbConfiguration.js';
import '@mathjax/src/mjs/input/tex/html/HtmlConfiguration.js';
import '@mathjax/src/mjs/input/tex/mathtools/MathtoolsConfiguration.js';
import '@mathjax/src/mjs/input/tex/mhchem/MhchemConfiguration.js';
import '@mathjax/src/mjs/input/tex/newcommand/NewcommandConfiguration.js';
import '@mathjax/src/mjs/input/tex/noerrors/NoErrorsConfiguration.js';
import '@mathjax/src/mjs/input/tex/noundefined/NoUndefinedConfiguration.js';
import '@mathjax/src/mjs/input/tex/physics/PhysicsConfiguration.js';
import '@mathjax/src/mjs/input/tex/setoptions/SetOptionsConfiguration.js';
import '@mathjax/src/mjs/input/tex/tagformat/TagFormatConfiguration.js';
import '@mathjax/src/mjs/input/tex/textcomp/TextcompConfiguration.js';
import '@mathjax/src/mjs/input/tex/textmacros/TextMacrosConfiguration.js';
import '@mathjax/src/mjs/input/tex/upgreek/UpgreekConfiguration.js';
import '@mathjax/src/mjs/input/tex/unicode/UnicodeConfiguration.js';
import '@mathjax/src/mjs/input/tex/verb/VerbConfiguration.js';
import '@mathjax/src/mjs/input/tex/require/RequireConfiguration.js';

/**
 * The TeX packages enabled by default in JupyterLab.
 */
export const TEX_PACKAGES = [
  'base',
  'action',
  'ams',
  'amscd',
  'bbox',
  'boldsymbol',
  'braket',
  'bussproofs',
  'cancel',
  'cases',
  'centernot',
  'color',
  'colortbl',
  'empheq',
  'enclose',
  'extpfeil',
  'gensymb',
  'html',
  'mathtools',
  'mhchem',
  'newcommand',
  'noerrors',
  'noundefined',
  'upgreek',
  'unicode',
  'verb',
  'configmacros',
  'tagformat',
  'textcomp',
  'textmacros',
  'require'
];

Loader.preLoaded(
  ...TEX_PACKAGES.concat('colorv2', 'physics', 'setoptions').map(
    name => `[tex]/${name}`
  )
);
