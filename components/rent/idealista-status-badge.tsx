"use client";

import { Badge } from "@/components/ui/badge";
import { IdealistaListingStatus } from "@/lib/rent/types";
import { cn } from "@/lib/utils";

interface IdealistaStatusBadgeProps {
  status: IdealistaListingStatus;
  className?: string;
}

export function IdealistaStatusBadge({ status, className }: IdealistaStatusBadgeProps) {
  const getStatusConfig = (status: IdealistaListingStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Borrador',
          variant: 'outline' as const,
          className: 'border-v-gray-300 text-v-gray-700',
        };
      case 'publishing':
        return {
          label: 'Publicando...',
          variant: 'secondary' as const,
          className: 'bg-brand-100 text-brand-800 border-brand-300',
        };
      case 'published':
        return {
          label: 'Publicada',
          variant: 'default' as const,
          className: 'bg-success-bg text-success border-success',
        };
      case 'paused':
        return {
          label: 'Pausada',
          variant: 'secondary' as const,
          className: 'bg-warning-bg text-warning border-warning',
        };
      case 'error':
        return {
          label: 'Error',
          variant: 'destructive' as const,
          className: 'bg-danger-bg text-danger border-danger',
        };
      default:
        return {
          label: status,
          variant: 'secondary' as const,
          className: '',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
















