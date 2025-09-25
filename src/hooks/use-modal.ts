"use client";

import { useState, useCallback } from "react";

interface UseModalOptions {
  defaultOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

interface UseModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
}

export const useModal = (options: UseModalOptions = {}): UseModalReturn => {
  const { defaultOpen = false, onClose, onOpen } = options;
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const open = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const setModalOpen = useCallback(
    (open: boolean) => {
      if (open) {
        setIsOpen(true);
        onOpen?.();
      } else {
        setIsOpen(false);
        onClose?.();
      }
    },
    [onOpen, onClose]
  );

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen: setModalOpen,
  };
};
