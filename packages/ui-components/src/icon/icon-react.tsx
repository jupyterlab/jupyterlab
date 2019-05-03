// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// import React, { ComponentType, HTMLAttributes } from 'react';
import React from 'react';

import { classes, style } from 'typestyle/lib';

// import { IconRegistry, defaultIconRegistry } from './icon';
import { defaultIconRegistry } from './icon';
import icon from '../style/icon';

// functions for setting up icons

type SvgPropsX = { name: string; tag?: 'div' | 'span' } & React.HTMLAttributes<
  HTMLDivElement
>; //& React.HTMLAttributes<SVGElement>;

export function SvgX(props: SvgPropsX): React.ReactElement {
  const { name, tag, ...rest } = props;
  const Tag = tag || 'div';
  return (
    <Tag
      {...rest}
      dangerouslySetInnerHTML={{ __html: defaultIconRegistry.svg(name) }}
    />
  );
}

export function IconX(
  props: { left?: number; top?: number } & SvgPropsX
): React.ReactElement {
  const { className, left, top, ...rest } = props;
  return (
    <SvgX
      className={classes(className, style(icon({ left, top })))}
      {...rest}
    />
  );
}
