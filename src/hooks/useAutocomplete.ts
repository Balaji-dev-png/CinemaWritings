import { useState, useCallback } from "react";

export type AutocompleteOption = {
  id: string;
  label?: string;
  shortcut?: string;
  type?: string;
  icon?: string;
  description?: string;
};

export const useAutocomplete = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const open = useCallback((options: AutocompleteOption[], coords: { top: number; left: number }) => {
    setFilteredOptions(options);
    setPosition(coords);
    setIsOpen(true);
    setActiveIndex(0); // Reset selection
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setFilteredOptions([]);
  }, []);

  const selectNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
  }, [filteredOptions.length]);

  const selectPrevious = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
  }, [filteredOptions.length]);

  return {
    isOpen,
    position,
    filteredOptions,
    activeIndex,
    setActiveIndex,
    open,
    close,
    selectNext,
    selectPrevious,
  };
};
