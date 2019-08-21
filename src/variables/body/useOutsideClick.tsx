import { useEffect } from 'react';

const useOutsideClick = (ref: any, callback: any) => {
  const handleClickOutside = (e: Event) => {
    if (ref.current && !ref.current.contains(e.target)) {
      callback();
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      //unbind
      document.removeEventListener('mousedown', handleClickOutside);
    };
  });
};

export default useOutsideClick;
