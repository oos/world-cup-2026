import { Link, type LinkProps } from "react-router-dom";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { extractTextFromChildren, slugifyTrackName } from "../ads/buttonTracking";

export type UiButtonVariant = "wc26" | "history" | "matches";

type CommonProps = {
  variant: UiButtonVariant;
  children: ReactNode;
  showArrow?: boolean;
  className?: string;
  trackButton?: string;
};

type UiButtonAsLink = CommonProps &
  Omit<LinkProps, "className" | "children"> & {
    to: LinkProps["to"];
  };

type UiButtonAsAnchor = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "href"> & {
    href: string;
  };

type UiButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "type"> & {
    type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  };

export type UiButtonProps = UiButtonAsLink | UiButtonAsAnchor | UiButtonAsButton;

function buildClassName(variant: UiButtonVariant, className?: string) {
  return ["ui-button", `ui-button--${variant}`, className].filter(Boolean).join(" ");
}

function buildContent(children: ReactNode, showArrow: boolean) {
  return (
    <>
      {children}
      {showArrow ? (
        <>
          {" "}
          <span aria-hidden="true">→</span>
        </>
      ) : null}
    </>
  );
}

function resolveTrackButton(children: ReactNode, trackButton?: string): string {
  if (trackButton) return trackButton;
  const text = extractTextFromChildren(children);
  return slugifyTrackName(text || "ui_button");
}

export function UiButton(props: UiButtonProps) {
  const { variant, children, showArrow = true, className, trackButton, ...rest } = props;
  const classes = buildClassName(variant, className);
  const content = buildContent(children, showArrow);
  const trackProps = { "data-track-button": resolveTrackButton(children, trackButton) };

  if ("to" in rest) {
    const { to, ...linkRest } = rest;
    return (
      <Link to={to} className={classes} {...trackProps} {...linkRest}>
        {content}
      </Link>
    );
  }

  if ("href" in rest) {
    const { href, ...anchorRest } = rest;
    return (
      <a href={href} className={classes} {...trackProps} {...anchorRest}>
        {content}
      </a>
    );
  }

  const { type = "button", ...buttonRest } = rest;
  return (
    <button type={type} className={classes} {...trackProps} {...buttonRest}>
      {content}
    </button>
  );
}
