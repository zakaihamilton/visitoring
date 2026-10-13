"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useDismissOnOutsidePointer } from "./useDismissOnOutsidePointer";
import styles from "./dropdown-select.module.css";
import listboxStyles from "./listbox.module.css";

type DropdownOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  id: string;
  name: string;
  options: readonly DropdownOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function DropdownSelect({
  id,
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  "aria-label": ariaLabel,
}: Props) {
  const listboxId = `${id}-options`;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? options[0]?.value ?? "",
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const previousDefaultValueRef = useRef(defaultValue);
  const typeaheadRef = useRef({ value: "", timestamp: 0 });

  useEffect(() => {
    const defaultValueChanged = previousDefaultValueRef.current !== defaultValue;
    previousDefaultValueRef.current = defaultValue;

    if (
      value === undefined &&
      (defaultValueChanged || !options.some((option) => option.value === uncontrolledValue))
    ) {
      setUncontrolledValue(defaultValue ?? options[0]?.value ?? "");
    }
  }, [defaultValue, options, uncontrolledValue, value]);

  useDismissOnOutsidePointer(open, containerRef, setOpen);

  useEffect(() => {
    if (!open) return;
    listboxRef.current?.children.item(activeIndex)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const selectedValue = value ?? uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];
  const resolvedValue = selectedOption?.value ?? "";
  const selectedIndex = options.findIndex((option) => option.value === resolvedValue);
  const isDisabled = disabled || options.length === 0 || options.every((option) => option.disabled);

  function findEnabledIndex(start: number, direction: 1 | -1): number {
    for (let offset = 0; offset < options.length; offset += 1) {
      const index = (start + offset * direction + options.length) % options.length;
      if (!options[index]?.disabled) return index;
    }
    return -1;
  }

  function openAt(index = selectedIndex >= 0 ? selectedIndex : 0) {
    const enabledIndex = findEnabledIndex(index, 1);
    if (enabledIndex < 0) return;
    setActiveIndex(enabledIndex);
    setOpen(true);
  }

  function chooseOption(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;

    if (value === undefined) setUncontrolledValue(option.value);
    onValueChange?.(option.value);
    setActiveIndex(index);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isDisabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) openAt();
      else setActiveIndex((current) => findEnabledIndex(current + 1, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) openAt(selectedIndex >= 0 ? selectedIndex : options.length - 1);
      else setActiveIndex((current) => findEnabledIndex(current - 1, -1));
      return;
    }

    if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const start = event.key === "Home" ? 0 : options.length - 1;
      const direction = event.key === "Home" ? 1 : -1;
      const index = findEnabledIndex(start, direction);
      if (index >= 0) {
        setActiveIndex(index);
        setOpen(true);
      }
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) chooseOption(activeIndex);
      else openAt();
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      return;
    }

    if (event.key === "Tab") {
      setOpen(false);
      return;
    }

    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now();
      const previous = typeaheadRef.current;
      const key = event.key.toLocaleLowerCase();
      const previousValue = now - previous.timestamp > 700 ? "" : previous.value;
      const repeatsSameCharacter =
        previousValue.length > 0 && [...previousValue].every((character) => character === key);
      const prefix = repeatsSameCharacter ? key : previousValue + key;
      typeaheadRef.current = { value: prefix, timestamp: now };
      const startIndex = open ? activeIndex : Math.max(selectedIndex, -1);

      for (let offset = 1; offset <= options.length; offset += 1) {
        const index = (startIndex + offset + options.length) % options.length;
        const option = options[index];
        if (!option?.disabled && option.label.toLocaleLowerCase().startsWith(prefix)) {
          event.preventDefault();
          setActiveIndex(index);
          setOpen(true);
          return;
        }
      }
    }
  }

  return (
    <span className={styles.control} ref={containerRef}>
      <input type="hidden" name={name} value={resolvedValue} />
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open ? `${listboxId}-option-${activeIndex}` : undefined}
        disabled={isDisabled}
        className={styles.trigger}
        onClick={() => {
          if (open) setOpen(false);
          else openAt();
        }}
        onKeyDown={handleKeyDown}
      >
        <span className={styles.value}>{selectedOption?.label ?? "Choose an option"}</span>
        <svg className={styles.chevron} aria-hidden="true" viewBox="0 0 12 12" fill="none">
          <path
            d="m3 4.5 3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <div
        id={listboxId}
        ref={listboxRef}
        role="listbox"
        aria-label={ariaLabel ? `${ariaLabel} options` : "Options"}
        className={`${styles.options} ${listboxStyles.menu}`}
        hidden={!open}
      >
        {options.map((option, index) => (
          <button
            id={`${listboxId}-option-${index}`}
            key={option.value}
            type="button"
            role="option"
            tabIndex={-1}
            disabled={option.disabled}
            aria-selected={option.value === resolvedValue}
            aria-disabled={option.disabled || undefined}
            data-active={index === activeIndex || undefined}
            className={listboxStyles.option}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => {
              if (!option.disabled) setActiveIndex(index);
            }}
            onClick={() => chooseOption(index)}
          >
            <span>{option.label}</span>
            {option.value === resolvedValue ? <span aria-hidden="true">✓</span> : null}
          </button>
        ))}
      </div>
    </span>
  );
}
