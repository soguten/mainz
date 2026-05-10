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

type CodeBlockRootProps = WithClassName & JSX.IntrinsicElements["figure"];

type CodeBlockSectionProps = WithClassName;

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

function CardHeader(props: WithClassName) {
  return (
    <div className={joinClassNames("tc-card-header", props.className)}>
      {props.children}
    </div>
  );
}

function CardTitle(props: WithClassName) {
  return <h2 className={joinClassNames("tc-card-title", props.className)}>{props.children}</h2>;
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
});

function CodeBlockRoot({ className, ...props }: CodeBlockRootProps) {
  return (
    <figure
      {...props}
      className={joinClassNames("tc-code-block", className)}
    />
  );
}

function CodeBlockHeader(props: CodeBlockSectionProps) {
  return (
    <figcaption className={joinClassNames("tc-code-block-header", props.className)}>
      {props.children}
    </figcaption>
  );
}

function CodeBlockLanguage(props: CodeBlockSectionProps) {
  return (
    <span className={joinClassNames("tc-code-block-language", props.className)}>
      {props.children}
    </span>
  );
}

function CodeBlockBody(props: CodeBlockSectionProps) {
  return <pre className={joinClassNames("tc-code-block-body", props.className)}>{props.children}</pre>;
}

export const CodeBlock = Object.assign(CodeBlockRoot, {
  Header: CodeBlockHeader,
  Language: CodeBlockLanguage,
  Body: CodeBlockBody,
});
