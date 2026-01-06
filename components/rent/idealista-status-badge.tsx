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
          className: 'border-gray-300 text-gray-700',
        };
      case 'publishing':
        return {
          label: 'Publicando...',
          variant: 'secondary' as const,
          className: 'bg-blue-100 text-blue-800 border-blue-300',
        };
      case 'published':
        return {
          label: 'Publicada',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-300',
        };
      case 'paused':
        return {
          label: 'Pausada',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        };
      case 'error':
        return {
          label: 'Error',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-300',
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















