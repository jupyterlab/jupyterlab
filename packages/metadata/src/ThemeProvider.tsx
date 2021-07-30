/*
 * Copyright 2018-2021 Elyra Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { IThemeManager } from '@jupyterlab/apputils';

import {
  StylesProvider,
  createTheme,
  ThemeProvider as MuiThemeProvider
} from '@material-ui/core';

import React, { useEffect, useState } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/interface-name-prefix
  interface Window {
    ELYRA_generateClassName: any;
    ELYRA_lightTheme: any;
    ELYRA_darkTheme: any;
  }
}

export interface IProps {
  themeManager?: IThemeManager;
}

const pseudoClasses = [
  'checked',
  'disabled',
  'error',
  'focused',
  'focusVisible',
  'required',
  'expanded',
  'selected'
];

// Taken from material-ui and adapted to use custom prefixes for mui components.
const createGenerateClassName = (): any => {
  const elyraPrefix = 'elyra-';

  let ruleCounter = 0;

  const getNextCounterId = (): number => {
    ruleCounter += 1;
    return ruleCounter;
  };

  return (rule: any, styleSheet: any): any => {
    const name = styleSheet.options.name;

    // Is a global static MUI style?
    if (name && name.indexOf('Mui') === 0 && !styleSheet.options.link) {
      // We can use a shorthand class name, we never use the keys to style the components.
      if (pseudoClasses.indexOf(rule.key) !== -1) {
        return `${elyraPrefix}Mui-${rule.key}`;
      }

      const prefix = `${elyraPrefix}${name}-${rule.key}`;

      if (!styleSheet.options.theme[Symbol.for('mui.nested')]) {
        return prefix;
      }

      return `${prefix}-${getNextCounterId()}`;
    }

    return `${elyraPrefix}jss${getNextCounterId()}`;
  };
};

// This should only ever be loaded once, but just in case...
if (window.ELYRA_generateClassName === undefined) {
  window.ELYRA_generateClassName = createGenerateClassName();
}

const overrides = {
  MuiFormControl: {
    root: {
      width: '100%'
    }
  },
  MuiButtonBase: {
    root: {
      padding: '5px 15px'
    }
  }
};

if (window.ELYRA_darkTheme === undefined) {
  window.ELYRA_darkTheme = createTheme({
    palette: {
      type: 'dark'
    },
    overrides
  });
}

if (window.ELYRA_lightTheme === undefined) {
  window.ELYRA_lightTheme = createTheme({
    palette: {
      type: 'light'
    },
    overrides
  });
}

const isLightTheme = (themeManager?: IThemeManager): boolean => {
  // Default to light theme
  return themeManager?.theme ? themeManager.isLight(themeManager.theme) : true;
};

export const ThemeProvider: React.FC<IProps> = ({ themeManager, children }) => {
  const [isLight, setIsLight] = useState(isLightTheme(themeManager));

  useEffect(() => {
    const updateTheme = (): void => {
      setIsLight(isLightTheme(themeManager));
    };

    if (themeManager) {
      themeManager.themeChanged.connect(updateTheme);
    }
    return (): void => {
      themeManager?.themeChanged.disconnect(updateTheme);
    };
  }, [themeManager]);

  return (
    <StylesProvider generateClassName={window.ELYRA_generateClassName}>
      <MuiThemeProvider
        theme={isLight ? window.ELYRA_lightTheme : window.ELYRA_darkTheme}
      >
        {children}
      </MuiThemeProvider>
    </StylesProvider>
  );
};
