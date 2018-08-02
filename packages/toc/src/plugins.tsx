import * as React from 'react';

export interface DropdownItem {
  props: any;
  type: any;
}

interface DropdownMenuProps {
  buttonTitle: string;
}

interface DropdownMenuState {
  menuOpen: boolean;
}

export function createDropdownMenu(items: DropdownItem[]) {
  return class extends React.Component<DropdownMenuProps, DropdownMenuState> {
    constructor(props: DropdownMenuProps) {
      super(props);
      this.state = { menuOpen: false };
    }

    render() {
      const { menuOpen } = this.state;
      const { buttonTitle } = this.props;
      const handleClick = () => {
        if (!menuOpen) {
          document.addEventListener('click', handleOutsideClick, false);
        } else {
          document.removeEventListener('click', handleOutsideClick, false);
        }
      };
      const openMenu = () => {
        handleClick();
        if (menuOpen) {
          this.setState({ menuOpen: false });
        } else {
          this.setState({ menuOpen: true });
        }
      };
      const handleOutsideClick = (event: any) => {
        if (event.target && this.node) {
          if (this.node.contains(event.target)) {
            return;
          }
        }
        this.setState({ menuOpen: false });
      };
      return (
        <div className={'dropdown-menu'} ref={node => (this.node = node)}>
          <div className={'dropdown-menu-button'} onClick={() => openMenu()}>
            {buttonTitle}
          </div>
          {menuOpen && (
            <ul className={'dropdown-menu-list'}>
              {items.map(item => {
                const ItemType = item.type;
                const itemProps = item.props;
                return (
                  <li>
                    <ItemType {...itemProps} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    }

    node: HTMLDivElement | null;
  };
}

interface TagTypeDropdownItemProps {
  title: string;
  selectedByDefault: boolean;
  onClickHandler: (component: React.Component) => void;
}

interface TagTypeDropdownState {
  selected: boolean;
}

export class TagTypeDropdownItem extends React.Component<
  TagTypeDropdownItemProps,
  TagTypeDropdownState
> {
  constructor(props: TagTypeDropdownItemProps) {
    super(props);
    this.state = { selected: props.selectedByDefault };
  }

  render() {
    const { title, onClickHandler } = this.props;
    return (
      <div
        onClick={() => {
          onClickHandler(this);
        }}
      >
        {title} {this.state.selected && ' --SELECTED'}
      </div>
    );
  }
}
