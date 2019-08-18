// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import React, { useState } from 'react';

const useTbody = (items: Array<any>, defaultState: any, id: string) => {
  const [state, setState] = useState(defaultState);

  const leftStyle = {
    paddingLeft: `${12}px`,
    width: `${25}%`
  };
  const rightStyle = {
    paddingLeft: `${12}px`,
    width: `${75}%`
  };

  const List = () => (
    <tbody>
      {items.map(item => (
        <tr
          key={item.name}
          onClick={e => setState(item)}
          className={id + (state === item ? ' selected' : '')}
        >
          <td style={leftStyle}> {item.name} </td>
          <td style={rightStyle}> {item.value} </td>
        </tr>
      ))}
    </tbody>
  );

  return [state, List, setState];
};

export default useTbody;
