import { ReactNode } from "react";

export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-2 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon: Icon, title, description, action,
}: { icon?: React.ComponentType<{ className?: string }>; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16 px-6 rounded-lg border border-dashed border-border bg-card/50">
      {Icon && <Icon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />}
      <h3 className="font-display text-lg font-medium text-foreground">{title}</h3>
      {description && <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
