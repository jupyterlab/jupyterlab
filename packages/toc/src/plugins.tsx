import * as React from 'react';
import * as ReactDOM from 'react-dom';

interface DropdownMenuProps {}

interface DropdownMenuState {
  menuOpen: false;
}

export class DropdownMenu extends React.Component<
  DropdownMenuProps,
  DropdownMenuState
> {
  constructor(props: DropdownMenuProps) {
    super(props);
  }
}
