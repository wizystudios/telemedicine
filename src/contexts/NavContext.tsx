import React, { createContext, useContext, useState } from 'react';

interface NavContextType {
  hideNav: boolean;
  setHideNav: (hide: boolean) => void;
}

const NavContext = createContext<NavContextType>({ hideNav: false, setHideNav: () => {} });

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [hideNav, setHideNav] = useState(false);

  return (
    <NavContext.Provider value={{ hideNav, setHideNav }}>
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
