import { Link, type LinkProps } from "react-router-dom";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type UiButtonVariant = "wc26" | "history" | "matches";

type CommonProps = {
  variant: UiButtonVariant;
  children: ReactNode;
  showArrow?: boolean;
  className?: string;
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

export function UiButton(props: UiButtonProps) {
  const { variant, children, showArrow = true, className, ...rest } = props;
  const classes = buildClassName(variant, className);
  const content = buildContent(children, showArrow);

  if ("to" in rest) {
    const { to, ...linkRest } = rest;
    return (
      <Link to={to} className={classes} {...linkRest}>
        {content}
      </Link>
    );
  }

  if ("href" in rest) {
    const { href, ...anchorRest } = rest;
    return (
      <a href={href} className={classes} {...anchorRest}>
        {content}
      </a>
    );
  }

  const { type = "button", ...buttonRest } = rest;
  return (
    <button type={type} className={classes} {...buttonRest}>
      {content}
    </button>
  );
}
