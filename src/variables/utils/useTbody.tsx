import React, { useState } from 'react';

const useTbody = (items: Array<any>, defaultState: any, id: string) => {
  const [state, setState] = useState(defaultState);

  const style = {
    paddingLeft: `${10}px`,
    width: `${30}%`
  };
  const style_2 = {
    paddingLeft: `${10}px`,
    width: `${70}%`
  };

  const expandToggle = (e: React.MouseEvent) => {
    console.log(e);
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
              <td style={style}>
                {item.value === 'class' ? (
                  <span
                    className={`expand-toggle-collapsed`}
                    onClick={e => expandToggle(e)}
                  ></span>
                ) : null}
                <span></span>
                {item.name}
              </td>
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
