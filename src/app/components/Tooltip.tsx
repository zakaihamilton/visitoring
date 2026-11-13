"use client";

import { Tooltip as PanelTooltip } from "panel-frame-ui";

type Props = {
  content: string;
  label: string;
  children?: React.ReactNode;
  targetElement?: "span" | "div";
  targetClassName?: string;
  targetRole?: "img";
  targetAriaLabel?: string;
  targetTabIndex?: number;
};

export function Tooltip({ targetElement = "span", ...props }: Props) {
  return <PanelTooltip {...props} targetElement={targetElement} />;
}
