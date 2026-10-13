"use client";

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useDismissOnOutsidePointer } from "./useDismissOnOutsidePointer";
import styles from "./dropdown-select.module.css";
import listboxStyles from "./listbox.module.css";

type Props = {
  id: string;
  name: string;
  label: string;
  options: readonly string[];
  defaultValue: string;
  maxLength?: number;
  placeholder?: string;
};

export function EventNameCombobox({
  id,
  name,
  label,
  options,
  defaultValue,
  maxLength,
  placeholder,
}: Props) {
  const listboxId = `${id}-options`;
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setValue(defaultValue), [defaultValue]);

  useDismissOnOutsidePointer(open, containerRef, setOpen);

  const query = value.trim().toLocaleLowerCase();
  const filteredOptions = options
    .filter((option) => option.toLocaleLowerCase().includes(query))
    .slice(0, 8);
  const hasOptions = open && filteredOptions.length > 0;
  const safeActiveIndex = Math.min(activeIndex, filteredOptions.length - 1);

  function chooseOption(option: string) {
    setValue(option);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setValue(event.currentTarget.value);
    setActiveIndex(0);
    setOpen(true);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && filteredOptions.length > 0) {
      event.preventDefault();
      if (!hasOptions) {
        setActiveIndex(0);
        setOpen(true);
      } else {
        setActiveIndex((current) => (current + 1) % filteredOptions.length);
      }
      return;
    }

    if (event.key === "ArrowUp" && filteredOptions.length > 0) {
      event.preventDefault();
      if (!hasOptions) {
        setActiveIndex(filteredOptions.length - 1);
        setOpen(true);
      } else {
        setActiveIndex(
          (current) => (current - 1 + filteredOptions.length) % filteredOptions.length,
        );
      }
      return;
    }

    if (event.key === "Enter" && hasOptions && safeActiveIndex >= 0) {
      event.preventDefault();
      chooseOption(filteredOptions[safeActiveIndex] ?? value);
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "Tab") setOpen(false);
  }

  return (
    <span className={styles.control} ref={containerRef}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={hasOptions}
        aria-controls={listboxId}
        aria-activedescendant={hasOptions ? `${listboxId}-option-${safeActiveIndex}` : undefined}
        autoComplete="off"
        maxLength={maxLength}
        placeholder={placeholder}
        value={value}
        className={styles.comboboxInput}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
      />
      <div
        id={listboxId}
        role="listbox"
        aria-label={`${label} suggestions`}
        className={`${styles.options} ${listboxStyles.menu}`}
        hidden={!hasOptions}
      >
        {filteredOptions.map((option, index) => (
          <button
            id={`${listboxId}-option-${index}`}
            key={option}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={option === value}
            data-active={index === safeActiveIndex || undefined}
            className={listboxStyles.option}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => chooseOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </span>
  );
}
