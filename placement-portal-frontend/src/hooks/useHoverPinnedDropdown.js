import { useState, useRef, useEffect, useCallback } from "react";

export function useHoverPinnedDropdown(options = {}) {
  const { openDelay = 180, closeDelay = 260 } = options;

  const [isPinned, setIsPinned] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const wrapperRef = useRef(null);
  const hoverOpenTimeoutRef = useRef(null);
  const hoverCloseTimeoutRef = useRef(null);

  const isOpen = isPinned || isHovering;

  const clearHoverOpenTimeout = useCallback(() => {
    if (hoverOpenTimeoutRef.current) {
      clearTimeout(hoverOpenTimeoutRef.current);
      hoverOpenTimeoutRef.current = null;
    }
  }, []);

  const clearHoverCloseTimeout = useCallback(() => {
    if (hoverCloseTimeoutRef.current) {
      clearTimeout(hoverCloseTimeoutRef.current);
      hoverCloseTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearHoverCloseTimeout();
    if (isPinned) return;

    clearHoverOpenTimeout();
    hoverOpenTimeoutRef.current = setTimeout(() => {
      setIsHovering(true);
    }, openDelay);
  }, [isPinned, openDelay, clearHoverCloseTimeout, clearHoverOpenTimeout]);

  const handleMouseLeave = useCallback(() => {
    clearHoverOpenTimeout();
    if (isPinned) return;

    clearHoverCloseTimeout();
    hoverCloseTimeoutRef.current = setTimeout(() => {
      setIsHovering(false);
    }, closeDelay);
  }, [isPinned, closeDelay, clearHoverOpenTimeout, clearHoverCloseTimeout]);

  const handleTogglePin = useCallback(() => {
    clearHoverOpenTimeout();
    clearHoverCloseTimeout();

    if (isPinned) {
      setIsPinned(false);
      setIsHovering(false);
    } else {
      setIsPinned(true);
    }
  }, [isPinned, clearHoverOpenTimeout, clearHoverCloseTimeout]);

  const closeDropdown = useCallback(() => {
    clearHoverOpenTimeout();
    clearHoverCloseTimeout();
    setIsPinned(false);
    setIsHovering(false);
  }, [clearHoverOpenTimeout, clearHoverCloseTimeout]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!isPinned) return;
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsPinned(false);
        setIsHovering(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isPinned]);

  useEffect(() => {
    return () => {
      clearHoverOpenTimeout();
      clearHoverCloseTimeout();
    };
  }, [clearHoverOpenTimeout, clearHoverCloseTimeout]);

  return {
    isOpen,
    isPinned,
    isHovering,
    wrapperRef,
    handleMouseEnter,
    handleMouseLeave,
    handleTogglePin,
    closeDropdown,
  };
}

export default useHoverPinnedDropdown;
