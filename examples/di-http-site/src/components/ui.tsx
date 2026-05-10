type WithClassName = {
  className?: string;
  children?: unknown;
};

type ButtonProps = WithClassName & JSX.IntrinsicElements["button"] & {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary";
};

type TextProps = WithClassName & {
  as?: keyof JSX.IntrinsicElements;
  tone?: "muted" | "default";
  weight?: "regular" | "semibold" | "bold";
};

type CardProps = WithClassName & JSX.IntrinsicElements["div"] & {
  variant?: "subtle";
};

function joinClassNames(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

export function ExampleRoot(props: WithClassName) {
  return <div className={props.className}>{props.children}</div>;
}

export function Button(
  { className, size = "md", variant = "primary", type, ...props }: ButtonProps,
) {
  return (
    <button
      {...props}
      type={type ?? "button"}
      className={joinClassNames("tc-button", className)}
      data-size={size}
      data-variant={variant}
    />
  );
}

export function Text(
  { as = "span", className, tone = "default", weight = "regular", ...props }:
    TextProps,
) {
  const textProps = {
    ...props,
    className: joinClassNames("tc-text", className),
    "data-tone": tone,
    "data-weight": weight,
  };

  if (as === "p") {
    return <p {...textProps} />;
  }

  if (as === "div") {
    return <div {...textProps} />;
  }

  if (as === "strong") {
    return <strong {...textProps} />;
  }

  return (
    <span {...textProps} />
  );
}

function CardRoot({ className, variant, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={joinClassNames("tc-card", className)}
      data-variant={variant}
    />
  );
}

function CardTitle(props: WithClassName) {
  return <h2 className={joinClassNames("tc-card-title", props.className)}>{props.children}</h2>;
}

export const Card = Object.assign(CardRoot, {
  Title: CardTitle,
});
