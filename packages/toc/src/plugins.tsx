import * as React from 'react';

export interface DropdownItem {
  id: number;
  props: any;
  type: any;
}

interface DropdownMenuProps {
  className: string | null;
  buttonTitle: JSX.Element;
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
      const { buttonTitle, className } = this.props;
      const handleClick = () => {
        if (!menuOpen) {
          document.addEventListener('click', handleOutsideClick, false);
        } else {
          document.removeEventListener('click', handleOutsideClick, false);
        }
      };
      const openMenu = () => {
        handleClick();
        console.log(menuOpen);
        if (menuOpen) {
          this.setState({ menuOpen: false });
        } else {
          this.setState({ menuOpen: true });
        }
      };
      const handleOutsideClick = (event: any) => {
        if (event.target.className === 'dropdown-menu-inner-clickable') {
          return;
        }
        document.removeEventListener('click', handleOutsideClick, false);
        this.setState({ menuOpen: false });
      };
      const classNameForComponent = className === null ? '' : className + ' ';
      return (
        <div
          className={classNameForComponent + 'dropdown-menu'}
          ref={node => (this.node = node)}
        >
          <div className={'dropdown-menu-button'} onClick={() => openMenu()}>
            {buttonTitle}
          </div>
          <ul className={'dropdown-menu-list'} hidden={!menuOpen}>
            {items.map(item => {
              const ItemType = item.type;
              const itemProps = item.props;
              const id = item.id;
              return (
                <li className={'dropdown-menu-li'} key={'dropdown-item-' + id}>
                  <ItemType {...itemProps} />
                </li>
              );
            })}
          </ul>
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
    let checked = this.state.selected ? (
      <span className={'menu-check-div'}>
        <img className={'check-image'} src={require('../static/check.svg')} />
      </span>
    ) : (
      <span className={'menu-check-div'}> </span>
    );
    return (
      <div
        className={'dropdown-menu-inner-clickable'}
        onClick={() => {
          onClickHandler(this);
        }}
      >
        {checked} {title}
      </div>
    );
  }
}
