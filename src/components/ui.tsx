import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { forwardRef } from "react";

export function cn(...classes: (string | boolean | null | undefined | number)[]) {
  return classes.filter((c): c is string => typeof c === "string" && c.length > 0).join(" ");
}

/* ===== Button ===== */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-sm hover:shadow",
  secondary: "bg-white text-navy-900 border border-slate-200 hover:border-navy-300 hover:bg-slate-50",
  ghost: "text-navy-700 hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-navy-200 text-navy-800 hover:bg-navy-50",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2.5",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-lg transition-all",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      <span>{children}</span>
      {rightIcon && !isLoading && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
}

/* ===== Card ===== */
export function Card({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const paddings = {
    none: "",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(16,24,40,0.04)]",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-navy-950">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ===== Input ===== */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy-800 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-navy-950 text-sm",
              "placeholder:text-slate-400",
              "focus:outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100",
              error && "border-red-500 focus:border-red-500 focus:ring-red-100",
              leftIcon ? "pl-10" : "",
              rightIcon ? "pr-10" : "",
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</div>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

/* ===== Textarea ===== */
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy-800 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white text-navy-950 text-sm",
            "placeholder:text-slate-400",
            "focus:outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100",
            error && "border-red-500 focus:border-red-500 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

/* ===== Select ===== */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-navy-800 mb-1.5">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-navy-950 text-sm",
            "focus:outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100",
            error && "border-red-500",
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

/* ===== Badge ===== */
export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "navy";
  className?: string;
}) {
  const variants: Record<string, string> = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    warning: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    danger: "bg-red-50 text-red-700 ring-1 ring-red-200",
    info: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    navy: "bg-navy-50 text-navy-800 ring-1 ring-navy-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ===== Status Badge for Complaints ===== */
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" | "navy" }> = {
    submitted: { label: "Submitted", variant: "info" },
    under_review: { label: "Under Review", variant: "info" },
    assigned: { label: "Assigned", variant: "navy" },
    in_progress: { label: "In Progress", variant: "warning" },
    resolved: { label: "Resolved", variant: "success" },
    closed: { label: "Closed", variant: "default" },
    rejected: { label: "Rejected", variant: "danger" },
  };
  const m = map[status] || { label: status, variant: "default" };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

/* ===== Priority Badge ===== */
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" | "navy" }> = {
    low: { label: "Low", variant: "default" },
    medium: { label: "Medium", variant: "info" },
    high: { label: "High", variant: "warning" },
    urgent: { label: "Urgent", variant: "danger" },
  };
  const m = map[priority] || { label: priority, variant: "default" };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

/* ===== Stat Card ===== */
export function StatCard({
  label,
  value,
  change,
  icon,
  accent = "navy",
}: {
  label: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  accent?: "navy" | "cyan" | "emerald" | "amber" | "red";
}) {
  const accents: Record<string, string> = {
    navy: "from-navy-600 to-navy-900",
    cyan: "from-cyan-500 to-cyan-700",
    emerald: "from-emerald-500 to-emerald-700",
    amber: "from-amber-500 to-amber-700",
    red: "from-red-500 to-red-700",
  };
  return (
    <Card padding="md" className="relative overflow-hidden">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-10 blur-2xl", accents[accent])} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-navy-950">{value}</p>
          {change && <p className="mt-1 text-xs text-emerald-600 font-medium">{change}</p>}
        </div>
        {icon && (
          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br", accents[accent])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ===== Empty State ===== */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-navy-950">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-md">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ===== Modal ===== */
export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto", sizes[maxWidth])}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100"
              aria-label="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ===== Page header ===== */
export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span>/</span>}
                {b.href ? (
                  <a href={b.href} className="hover:text-navy-700">{b.label}</a>
                ) : (
                  <span>{b.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-semibold text-navy-950 tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600 max-w-2xl">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
