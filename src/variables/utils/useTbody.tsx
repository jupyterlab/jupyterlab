import React, { useState } from 'react';

const useTbody = (items: Array<any>, defaultState: any, id: string) => {
  const [state, setState] = useState(defaultState);

  const style = {
    paddingLeft: `${12}px`,
    width: `${25}%`
  };
  const style_2 = {
    paddingLeft: `${12}px`,
    width: `${75}%`
  };

  const List = () => (
    <div style={{ overflowY: 'auto' }}>
      <table>
        <tbody>
          {items.map(item => (
            <tr
              key={item.name}
              onClick={e => setState(item)}
              className={id + (state === item ? ' selected' : '')}
            >
              <td style={style}> {item.name} </td>
              <td style={style_2}> {item.value} </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return [state, List, setState];
};

export default useTbody;
