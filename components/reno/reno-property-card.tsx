"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { isPropertyExpired } from "@/lib/property-sorting";
import { useI18n } from "@/lib/i18n";

type RenoStage = "upcoming-settlements" | "initial-check" | "reno-budget" | "reno-in-progress" | "furnishing-cleaning" | "final-check" | "reno-fixes" | "done";

interface RenoPropertyCardProps {
  property: Property;
  stage: RenoStage;
  onClick?: () => void;
  disabled?: boolean;
  isHighlighted?: boolean;
  showRenoDetails?: boolean; // Show reno-specific info (renovador, fechas, etc.)
}

export function RenoPropertyCard({
  property,
  stage,
  onClick,
  disabled = false,
  isHighlighted = false,
  showRenoDetails = true,
}: RenoPropertyCardProps) {
  const { t, language } = useI18n();
  const isExpired = isPropertyExpired(property);

  const needsUpdateToday = property.proximaActualizacion
    ? new Date(property.proximaActualizacion).toDateString() === new Date().toDateString()
    : false;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const locale = language === "es" ? "es-ES" : "en-US";
    return date.toLocaleDateString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  // Calculate time in current phase - use updated_at if available, otherwise use created_at
  // This is an approximation - ideally we'd have a phase_entered_at field
  const calculateTimeInPhase = () => {
    // Try to use updated_at if available (when phase changed), otherwise use created_at
    const phaseDate = property.ultimaActualizacion 
      ? new Date(property.ultimaActualizacion)
      : new Date(property.createdAt);
    
    const now = new Date();
    const diffMs = now.getTime() - phaseDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins < 60) {
      return t.propertyCard.lessThanHour;
    }
    if (diffHours < 24) {
      return language === "es" 
        ? `Hace ${diffHours} ${diffHours === 1 ? t.propertyCard.hour : t.propertyCard.hours}`
        : `${diffHours} ${diffHours === 1 ? t.propertyCard.hour : t.propertyCard.hours} ago`;
    }
    if (diffDays === 0) {
      return t.propertyCard.today;
    }
    if (diffDays === 1) {
      return language === "es" ? `Hace 1 ${t.propertyCard.day}` : `1 ${t.propertyCard.day} ago`;
    }
    return language === "es"
      ? `Hace ${diffDays} ${diffDays === 1 ? t.propertyCard.day : t.propertyCard.days}`
      : `${diffDays} ${diffDays === 1 ? t.propertyCard.day : t.propertyCard.days} ago`;
  };

  const timeInPhase = calculateTimeInPhase();

  return (
    <div 
      data-property-id={property.id}
      className={cn(
        "rounded-lg border-2 border-border bg-card dark:bg-[var(--prophero-gray-900)] p-4 shadow-sm w-full",
        "transition-shadow duration-500 ease-out",
        disabled 
          ? "cursor-not-allowed opacity-60" 
          : "cursor-pointer hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)]",
        isHighlighted 
          ? "ring-2 ring-[var(--prophero-blue-500)] shadow-lg border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/30" 
          : "",
        isExpired && "border-l-4 border-l-red-100 dark:border-l-red-900/30"
      )}
      onClick={disabled ? undefined : onClick}
    >
      {/* ID and Expired tag aligned at top */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-muted-foreground">
          ID {property.uniqueIdFromEngagements || property.id}
        </div>
        {isExpired && (
          <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 flex-shrink-0">
            {t.propertyCard.expired}
          </span>
        )}
      </div>
      
      {/* Address with region integrated */}
      <div className="mb-2 min-w-0">
        <div className="text-sm font-medium text-foreground break-words line-clamp-2">
          {property.fullAddress}
          {property.region && showRenoDetails && (
            <span className="text-xs text-muted-foreground ml-1">({property.region})</span>
          )}
        </div>
      </div>

      {/* Tags */}
      {showRenoDetails && property.renoType && (() => {
        // Función para obtener los estilos del badge según el tipo de renovación
        // Todos usan la paleta de azules de Vistral con diferentes tonos:
        // - Light Reno: azul más clarito (blue-50)
        // - Medium Reno: azul medio (blue-100)
        // - Major Reno: azul más oscuro (blue-200)
        const getRenoTypeBadgeStyles = (renoType?: string) => {
          if (!renoType) return null;
          
          const typeLower = renoType.toLowerCase();
          
          // Light Reno: azul más clarito
          if (typeLower.includes('light')) {
            return {
              bg: 'bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/20',
              text: 'text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-300)]',
              border: 'border-[var(--prophero-blue-200)] dark:border-[var(--prophero-blue-800)]/30'
            };
          }
          
          // Medium Reno: azul medio
          if (typeLower.includes('medium')) {
            return {
              bg: 'bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/20',
              text: 'text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-400)]',
              border: 'border-[var(--prophero-blue-300)] dark:border-[var(--prophero-blue-700)]/30'
            };
          }
          
          // Major Reno: azul más oscuro
          if (typeLower.includes('major')) {
            return {
              bg: 'bg-[var(--prophero-blue-200)] dark:bg-[var(--prophero-blue-800)]/20',
              text: 'text-[var(--prophero-blue-800)] dark:text-[var(--prophero-blue-200)]',
              border: 'border-[var(--prophero-blue-400)] dark:border-[var(--prophero-blue-600)]/30'
            };
          }
          
          // Default: azul medio (por si acaso)
          return {
            bg: 'bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]/20',
            text: 'text-[var(--prophero-blue-700)] dark:text-[var(--prophero-blue-400)]',
            border: 'border-[var(--prophero-blue-300)] dark:border-[var(--prophero-blue-700)]/30'
          };
        };

        const badgeStyles = getRenoTypeBadgeStyles(property.renoType);
        if (!badgeStyles) return null;
        
        return (
          <div className="flex flex-wrap gap-2 mb-3">
            <Badge 
              variant="secondary" 
              className={`${badgeStyles.bg} ${badgeStyles.text} border ${badgeStyles.border} font-medium`}
            >
              {property.renoType}
            </Badge>
          </div>
        );
      })()}

      {/* Stage-specific content */}
      {stage === "initial-check" ? (
        <div className="space-y-2">
          {property.region && (
            <div className="text-xs text-muted-foreground">
              {t.propertyCard.region}: {property.region}
            </div>
          )}
          {property.realSettlementDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>{t.propertyCard.signing}: {formatDate(property.realSettlementDate)}</span>
            </div>
          )}
          {property.estimatedVisitDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>{t.propertyCard.estimatedVisit}: {formatDate(property.estimatedVisitDate)}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{timeInPhase}</div>
        </div>
      ) : stage === "final-check" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          {showRenoDetails && property.proximaActualizacion && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                {t.propertyCard.next}: {formatDate(property.proximaActualizacion)}
                {needsUpdateToday && (
                  <span className="ml-1 text-[var(--prophero-blue-600)] font-medium">({t.propertyCard.today})</span>
                )}
              </span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{timeInPhase}</div>
        </div>
      ) : stage === "reno-in-progress" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          {showRenoDetails && property.proximaActualizacion && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                {t.propertyCard.next}: {formatDate(property.proximaActualizacion)}
                {needsUpdateToday && (
                  <span className="ml-1 text-[var(--prophero-blue-600)] font-medium">({t.propertyCard.today})</span>
                )}
              </span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{t.propertyCard.workInProgress} {timeInPhase}</div>
        </div>
      ) : stage === "furnishing-cleaning" || stage === "reno-fixes" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {stage === "furnishing-cleaning" && `${t.propertyCard.cleaningFurnishing} `}
            {stage === "reno-fixes" && `${t.propertyCard.repairs} `}
            {timeInPhase}
          </div>
        </div>
      ) : stage === "reno-budget" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)]">
                <span className="text-xs font-semibold text-foreground">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{timeInPhase}</div>
        </div>
      ) : stage === "done" ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t.propertyCard.completed} {timeInPhase}</div>
        </div>
      ) : null}
    </div>
  );
}
