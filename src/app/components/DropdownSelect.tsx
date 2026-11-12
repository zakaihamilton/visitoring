"use client";

import { Select } from "panel-frame-ui";

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
  compact?: boolean;
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
  compact = false,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <Select
      aria-label={ariaLabel}
      defaultValue={defaultValue}
      disabled={disabled}
      id={id}
      name={name}
      onValueChange={onValueChange}
      options={options}
      value={value}
      variant={compact ? "compact" : "default"}
    />
  );
}
