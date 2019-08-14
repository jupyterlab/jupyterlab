import React, { useState } from 'react';

const useSearch = (defaultState: string) => {
  const [state, setState] = useState(defaultState);

  const List = () => (
    <div>
      <input
        placeholder="Search..."
        className="jp-DebuggerSidebarVariable-Search-input"
        value={state}
        onChange={e => {
          setState(e.target.value);
        }}
      />
    </div>
  );

  return [List];
};

export default useSearch;
