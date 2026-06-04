import * as React from "react";
import { cn } from "../../lib/utils";

type SelectProps = {
  value?: string;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
};

function collectOptions(children: React.ReactNode): React.ReactElement[] {
  const options: React.ReactElement[] = [];

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    const props = child.props as any;

    if (props.value !== undefined) {
      options.push(child);
      return;
    }

    if (props.children) {
      options.push(...collectOptions(props.children));
    }
  });

  return options;
}

function findTriggerClassName(children: React.ReactNode): string {
  let result = "";

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;

    const type = child.type as any;
    const props = child.props as any;

    if (type?.displayName === "SelectTrigger") {
      result = props.className || "";
    }

    if (!result && props.children) {
      result = findTriggerClassName(props.children);
    }
  });

  return result;
}

export function Select({ value, disabled, onValueChange, children }: SelectProps) {
  const options = collectOptions(children);
  const triggerClassName = findTriggerClassName(children);

  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange?.(e.target.value)}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50",
        triggerClassName
      )}
    >
      {options.map((option, index) => {
        const props = option.props as any;
        return (
          <option key={`${props.value}-${index}`} value={props.value}>
            {props.children}
          </option>
        );
      })}
    </select>
  );
}

export function SelectTrigger({ children }: React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>;
}

SelectTrigger.displayName = "SelectTrigger";

export function SelectContent({ children }: React.HTMLAttributes<HTMLDivElement>) {
  return <>{children}</>;
}

export function SelectItem({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return <option value={value}>{children}</option>;
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <>{placeholder}</>;
}
