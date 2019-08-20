// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';

const useTbody = (items: Array<any>, defaultState: any, id: string) => {
  const [state, setState] = useState(defaultState);

  const List = () => (
    <tbody>
      {items.map(item => (
        <tr
          key={item.name}
          onClick={e => setState(item)}
          className={id + (state === item ? ' selected' : '')}
        >
          <td style={{ paddingLeft: `${12}px`, width: `${25}%` }}>
            {item.name}
          </td>
          <td style={{ paddingLeft: `${12}px`, width: `${75}%` }}>
            {item.value}
          </td>
        </tr>
      ))}
    </tbody>
  );

  return [state, List, setState];
};

export default useTbody;
