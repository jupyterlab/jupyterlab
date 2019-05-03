// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React from 'react';

import { classes, style } from 'typestyle/lib';

import { defaultIconRegistry } from './icon';
import icon from '../style/icon';

type SvgPropsX = { name: string; tag?: 'div' | 'span' } & React.HTMLAttributes<
  HTMLDivElement
>;

// functions that return an icon in the form of a React element

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
