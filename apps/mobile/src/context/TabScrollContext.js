import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';

const TabScrollContext = createContext({
  registerScrollRef: () => () => {},
  resetTabScroll: () => {},
  isScrolled: false,
  setTabScrolled: () => {},
});

export function TabScrollProvider({ children }) {
  const scrollRefs = useRef(new Map());
  const [isScrolled, setIsScrolled] = useState(false);

  const registerScrollRef = useCallback((tabName, ref) => {
    scrollRefs.current.set(tabName, ref);
    return () => {
      if (scrollRefs.current.get(tabName) === ref) {
        scrollRefs.current.delete(tabName);
      }
    };
  }, []);

  const resetTabScroll = useCallback((tabName) => {
    const ref = scrollRefs.current.get(tabName);
    if (!ref || !ref.current) return;

    if (typeof ref.current.scrollTo === 'function') {
      ref.current.scrollTo({ y: 0, animated: true });
    } else if (typeof ref.current.scrollToOffset === 'function') {
      ref.current.scrollToOffset({ offset: 0, animated: true });
    }
    setIsScrolled(false);
  }, []);

  const setTabScrolled = useCallback((scrolled) => {
    setIsScrolled((prev) => (prev !== scrolled ? scrolled : prev));
  }, []);

  return (
    <TabScrollContext.Provider
      value={{
        registerScrollRef,
        resetTabScroll,
        isScrolled,
        setTabScrolled,
      }}
    >
      {children}
    </TabScrollContext.Provider>
  );
}

export function useTabScroll(tabName, scrollRef) {
  const { registerScrollRef } = useContext(TabScrollContext);

  useEffect(() => {
    if (tabName && scrollRef) {
      return registerScrollRef(tabName, scrollRef);
    }
  }, [tabName, scrollRef, registerScrollRef]);
}

export function useTabScrollResetTrigger() {
  const { resetTabScroll } = useContext(TabScrollContext);
  return resetTabScroll;
}

export function useTabScrolledState() {
  const { isScrolled, setTabScrolled } = useContext(TabScrollContext);
  return { isScrolled, setTabScrolled };
}

export function useTabScrollReporter(threshold = 20) {
  const { setTabScrolled } = useContext(TabScrollContext);

  const onScroll = useCallback(
    (event) => {
      const y = event.nativeEvent?.contentOffset?.y ?? 0;
      setTabScrolled(y > threshold);
    },
    [threshold, setTabScrolled]
  );

  return onScroll;
}

export default TabScrollContext;
