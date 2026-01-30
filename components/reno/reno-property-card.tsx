"use client";

import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CircularProgress } from "@/components/ui/circular-progress";
import { Calendar, CheckCircle2, FileSignature } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { isPropertyExpired } from "@/lib/property-sorting";
import { useI18n } from "@/lib/i18n";
import { useMixpanel } from "@/hooks/useMixpanel";
import { needsUpdate, calculateNextUpdateDate, needsUpdateThisWeek } from "@/lib/reno/update-calculator";
import { useDynamicCategories } from "@/hooks/useDynamicCategories";
import { useMemo } from "react";

type RenoStage = "upcoming-settlements" | "initial-check" | "reno-budget-renovator" | "reno-budget-client" | "reno-budget-start" | "reno-budget" | "upcoming" | "reno-in-progress" | "furnishing" | "final-check" | "cleaning" | "furnishing-cleaning" | "reno-fixes" | "done" | "orphaned";

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
  const { track } = useMixpanel();
  const isExpired = isPropertyExpired(property);
  
  // Get dynamic categories progress for reno-in-progress phase
  const { categories: dynamicCategories } = useDynamicCategories(
    stage === "reno-in-progress" ? property.id : null
  );
  
  // Calculate average progress from dynamic categories
  const renoProgress = useMemo(() => {
    if (stage !== "reno-in-progress" || dynamicCategories.length === 0) {
      return null;
    }
    const total = dynamicCategories.reduce((sum, cat) => sum + (cat.percentage || 0), 0);
    return Math.round(total / dynamicCategories.length);
  }, [stage, dynamicCategories]);

  // Calculate proximaActualizacion for reno-in-progress phase
  // RESET ÚNICO: Siempre calcular desde mañana, ignorando cualquier fecha antigua de la BD
  const renoStartDate = property.inicio || (property as any).supabaseProperty?.["Reno Start Date"] || (property as any).supabaseProperty?.start_date;
  // Para reno-in-progress, siempre calcular desde mañana (reset único)
  // Para otras fases, usar la fecha de la BD si existe
  const proximaActualizacionCalculada = stage === "reno-in-progress" 
    ? calculateNextUpdateDate(null, property.renoType, renoStartDate) // Siempre calcular desde mañana
    : (property.proximaActualizacion || null); // Para otras fases, usar BD si existe

  const needsUpdateToday = proximaActualizacionCalculada
    ? new Date(proximaActualizacionCalculada).toDateString() === new Date().toDateString()
    : false;

  // Check if property needs an update (for reno-in-progress phase)
  // Show badge ONLY if the property needs update (today or in the past)
  // Blue badge if this week, red badge if overdue (past week or earlier)
  // Con el reset, todas las fechas están en el futuro, por lo que no debería mostrar badges inicialmente
  const needsUpdateNow = stage === "reno-in-progress" && proximaActualizacionCalculada && 
    needsUpdate(proximaActualizacionCalculada, property.renoType, renoStartDate);
  const needsUpdateThisWeekFlag = needsUpdateNow && needsUpdateThisWeek(proximaActualizacionCalculada);
  // Solo mostrar "vencida" si realmente necesita actualización pero no está en esta semana
  const isOverdue = needsUpdateNow && !needsUpdateThisWeekFlag;
  
  // Debug log for all reno-in-progress properties to understand the issue
  if (stage === "reno-in-progress") {
    const daysSinceStart = renoStartDate ? Math.floor((new Date().getTime() - new Date(renoStartDate).getTime()) / (1000 * 60 * 60 * 24)) : null;
    const intervalDays = property.renoType?.toLowerCase().includes('light') ? 7 : 
                        property.renoType?.toLowerCase().includes('medium') ? 14 : 
                        property.renoType?.toLowerCase().includes('major') ? 30 : 7;
    
    // Debug log removed for production
  }

  // Check if property exceeds duration limit based on reno type (for reno-in-progress)
  const exceedsDurationLimit = (() => {
    if (stage !== "reno-in-progress" || !property.renoDuration || !property.renoType) {
      return false;
    }
    
    const renoTypeLower = property.renoType.toLowerCase();
    const duration = property.renoDuration;
    
    if (renoTypeLower.includes('light')) {
      return duration > 30;
    } else if (renoTypeLower.includes('medium')) {
      return duration > 60;
    } else if (renoTypeLower.includes('major')) {
      return duration > 120;
    }
    
    return false;
  })();

  // Check if property exceeds Days to Start Reno limit (for budget phases)
  const exceedsDaysToStartLimit = (() => {
    const budgetPhases = ["reno-budget-renovator", "reno-budget-client", "reno-budget-start"];
    if (!budgetPhases.includes(stage) || !property.daysToStartRenoSinceRSD) {
      return false;
    }
    
    return property.daysToStartRenoSinceRSD > 25;
  })();

  // Check if property exceeds Days to Visit limit (for initial-check and upcoming-settlements phases)
  const exceedsDaysToVisitLimit = (() => {
    if ((stage !== "initial-check" && stage !== "upcoming-settlements") || !property.daysToVisit) {
      return false;
    }
    
    return property.daysToVisit > 5;
  })();

  // Check if property exceeds Days to Property Ready limit (for furnishing, cleaning, final-check, and furnishing-cleaning phases)
  const exceedsDaysToPropertyReadyLimit = (() => {
    if ((stage !== "furnishing" && stage !== "cleaning" && stage !== "final-check" && stage !== "furnishing-cleaning") || !property.daysToPropertyReady) {
      return false;
    }
    
    return property.daysToPropertyReady > 25;
  })();

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
        "rounded-lg border-2 border-border bg-card p-4 shadow-sm w-full relative",
        "transition-all duration-300 ease-out",
        disabled 
          ? "cursor-not-allowed opacity-60" 
          : cn(
              "cursor-pointer hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.15)]",
              "dark:hover:bg-[#1a1a1a] dark:hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.6)]"
            ),
        isHighlighted 
          ? "ring-2 ring-[var(--prophero-blue-500)] shadow-lg border-[var(--prophero-blue-500)] bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)]/30" 
          : "",
        isExpired && "border-l-4 border-l-red-100 dark:border-l-red-900/30",
        exceedsDurationLimit && stage === "reno-in-progress" && "border-l-4 border-l-red-500",
        exceedsDaysToStartLimit && "border-l-4 border-l-red-500", // Red left border for budget phases
        exceedsDaysToVisitLimit && "border-l-4 border-l-red-500", // Red left border for initial-check phase
        exceedsDaysToPropertyReadyLimit && (stage === "furnishing" || stage === "cleaning" || stage === "final-check" || stage === "furnishing-cleaning") && "border-l-4 border-l-red-500" // Red left border for furnishing/cleaning/final-check phases
      )}
      onClick={disabled ? undefined : () => {
        track("Property Card Clicked", {
          property_id: property.id,
          property_phase: stage,
          property_type: property.propertyType,
          renovation_type: property.renoType,
          is_expired: isExpired,
        });
        onClick?.();
      }}
    >
      {/* Icono de Firmada - arriba a la derecha (solo para upcoming-settlements e initial-check) */}
      {(stage === "upcoming-settlements" || stage === "initial-check") && (() => {
        const realSettlementDate = property.realSettlementDate || 
                                  (property as any)?.supabaseProperty?.['Real Settlement Date'];
        
        if (realSettlementDate) {
          try {
            const settlementDate = new Date(realSettlementDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            settlementDate.setHours(0, 0, 0, 0);
            
            // Solo mostrar si la fecha es anterior a hoy
            if (settlementDate < today) {
              return (
                <div 
                  className="absolute top-2 right-2 z-10 group"
                  onClick={(e) => e.stopPropagation()} // Evitar que el click en el icono active el onClick del card
                  onMouseEnter={(e) => e.stopPropagation()} // Evitar que el hover active otros eventos
                >
                  <FileSignature 
                    className="h-5 w-5 text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] cursor-help" 
                  />
                  {/* Tooltip personalizado */}
                  <div className="absolute right-0 top-full mt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                    <div className="relative bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-md px-2 py-1.5 whitespace-nowrap shadow-lg">
                      Esta vivienda ya está firmada
                      {/* Flecha del tooltip */}
                      <div className="absolute -top-1 right-3 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
                    </div>
                  </div>
                </div>
              );
            }
          } catch (e) {
            // Si hay error parseando la fecha, no mostrar nada
          }
        }
        return null;
      })()}
      
      {/* ID and Expired tag aligned at top */}
      <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Circular progress for reno-in-progress */}
          {stage === "reno-in-progress" && renoProgress !== null && (
            <CircularProgress 
              percentage={renoProgress} 
              size={40}
              strokeWidth={3}
              className="flex-shrink-0"
            />
          )}
          <div className="text-xs font-semibold text-muted-foreground truncate min-w-0">
            ID {property.uniqueIdFromEngagements || property.id}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Solo mostrar badges de actualización en fase reno-in-progress cuando necesita actualización a cliente */}
          {stage === "reno-in-progress" && needsUpdateThisWeekFlag && (
            <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
              {language === "es" ? "Necesita actualización" : "Need Update"}
            </Badge>
          )}
          {stage === "reno-in-progress" && isOverdue && (
            <Badge variant="outline" className="text-xs border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30">
              {language === "es" ? "Vencida" : "Overdue"}
            </Badge>
          )}
          {/* Solo mostrar expired si NO está en reno-in-progress (para evitar duplicados) */}
          {stage !== "reno-in-progress" && isExpired && (
            <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 flex-shrink-0 whitespace-nowrap">
              {t.propertyCard.expired}
            </span>
          )}
        </div>
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

      {/* Tags: reno type + type (Unit/Building) desde Supabase */}
      {showRenoDetails && (() => {
        // Badge tipo propiedad (Unit = azul oscuro, Building = azul claro)
        const propertyTypeRaw = (property as any).propertyType ?? (property as any).type ?? '';
        const propertyTypeNormalized = typeof propertyTypeRaw === 'string' ? propertyTypeRaw.trim() : '';
        const isUnit = propertyTypeNormalized.toLowerCase() === 'unit';
        const isBuilding = propertyTypeNormalized.toLowerCase() === 'building';
        const showTypeTag = isUnit || isBuilding;

        const getTypeTagStyles = () => {
          if (isUnit) {
            return 'bg-blue-700 dark:bg-blue-800 text-white dark:text-white';
          }
          if (isBuilding) {
            return 'bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800/50';
          }
          return '';
        };

        // Función para obtener los estilos del badge según el tipo de renovación
        const getRenoTypeBadgeStyles = (renoType?: string) => {
          if (!renoType) return null;
          const typeLower = renoType.toLowerCase();
          if (typeLower.includes('light')) {
            return { bg: 'bg-green-600 dark:bg-green-600', text: 'text-white dark:text-white', border: 'border-0', hover: '' };
          }
          if (typeLower.includes('medium')) {
            return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border border-green-200 dark:border-green-800/30', hover: '' };
          }
          if (typeLower.includes('major')) {
            return { bg: 'bg-yellow-200 dark:bg-yellow-900/30', text: 'text-yellow-900 dark:text-yellow-200', border: 'border border-yellow-300 dark:border-yellow-800/30', hover: '' };
          }
          return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', border: 'border border-green-200 dark:border-green-800/30', hover: '' };
        };

        const badgeStyles = property.renoType ? getRenoTypeBadgeStyles(property.renoType) : null;
        if (!badgeStyles && !showTypeTag) return null;

        return (
          <div className="flex flex-wrap gap-2 mb-3">
            {property.renoType && badgeStyles && (
              <span
                className={cn(
                  badgeStyles.bg,
                  badgeStyles.text,
                  badgeStyles.border,
                  badgeStyles.hover,
                  "inline-flex items-center rounded-full text-xs font-medium px-2 py-1"
                )}
              >
                {property.renoType}
              </span>
            )}
            {showTypeTag && (
              <span
                className={cn(
                  getTypeTagStyles(),
                  "inline-flex items-center rounded-full text-xs font-medium px-2 py-1"
                )}
              >
                {propertyTypeNormalized}
              </span>
            )}
          </div>
        );
      })()}

      {/* Stage-specific content */}
      {stage === "upcoming-settlements" ? (
        <div className="space-y-2">
          {property.region && (
            <div className="text-xs text-muted-foreground">
              {t.propertyCard.region}: {property.region}
            </div>
          )}
          {property.realSettlementDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Fecha de escrituración: {formatDate(property.realSettlementDate)}</span>
            </div>
          )}
          {/* Días para visitar - only show if filled */}
          {property.daysToVisit !== null && property.daysToVisit !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Días para visitar:</span> {property.daysToVisit} días
            </div>
          )}
          {/* Ocultar timeInPhase para upcoming-settlements */}
        </div>
      ) : stage === "initial-check" ? (
        <div className="space-y-2">
          {property.region && (
            <div className="text-xs text-muted-foreground">
              {t.propertyCard.region}: {property.region}
            </div>
          )}
          {property.realSettlementDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Fecha de escrituración: {formatDate(property.realSettlementDate)}</span>
            </div>
          )}
          {property.estimatedVisitDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>{t.propertyCard.estimatedVisit}: {formatDate(property.estimatedVisitDate)}</span>
            </div>
          )}
          {/* Días para visitar - only show if filled */}
          {property.daysToVisit !== null && property.daysToVisit !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Días para visitar:</span> {property.daysToVisit} días
            </div>
          )}
          {/* Ocultar timeInPhase para initial-check */}
        </div>
      ) : stage === "final-check" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] overflow-hidden">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate min-w-0">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          {showRenoDetails && proximaActualizacionCalculada && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>
                {t.propertyCard.next}: {formatDate(proximaActualizacionCalculada)}
                {needsUpdateToday && (
                  <span className="ml-1 text-[var(--prophero-blue-600)] font-medium">({t.propertyCard.today})</span>
                )}
              </span>
            </div>
          )}
          {property.daysToPropertyReady !== null && property.daysToPropertyReady !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{t.propertyCard.daysLabel}</span> {property.daysToPropertyReady} {t.propertyCard.days}
            </div>
          )}
          {/* Ocultar timeInPhase para final-check */}
        </div>
      ) : stage === "reno-in-progress" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] overflow-hidden">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate min-w-0">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          {property.renoDuration !== null && property.renoDuration !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Duración de la obra:</span> {property.renoDuration} días
            </div>
          )}
        </div>
      ) : stage === "furnishing" || stage === "cleaning" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] overflow-hidden">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate min-w-0">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          {/* Días para propiedad lista - only show if filled */}
          {property.daysToPropertyReady !== null && property.daysToPropertyReady !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{t.propertyCard.daysLabel}</span> {property.daysToPropertyReady} {t.propertyCard.days}
            </div>
          )}
        </div>
      ) : stage === "furnishing-cleaning" ? (
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
          {/* Días para propiedad lista - only show if filled */}
          {property.daysToPropertyReady !== null && property.daysToPropertyReady !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Días para propiedad lista:</span> {property.daysToPropertyReady} días
            </div>
          )}
          {/* Ocultar timeInPhase para furnishing-cleaning */}
        </div>
      ) : stage === "reno-fixes" ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] overflow-hidden">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate min-w-0">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            {t.propertyCard.repairs} {timeInPhase}
          </div>
        </div>
      ) : (stage === "reno-budget" || stage === "reno-budget-renovator" || stage === "reno-budget-client" || stage === "reno-budget-start") ? (
        <div className="space-y-2">
          {showRenoDetails && property.renovador && (
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--prophero-gray-200)] dark:bg-[var(--prophero-gray-700)] overflow-hidden">
                <span className="text-xs font-semibold text-foreground leading-none">
                  {property.renovador.length > 2 ? property.renovador.substring(0, 2).toUpperCase() : property.renovador.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-muted-foreground truncate min-w-0">{property.renovador || t.propertyCard.siteManager}</span>
            </div>
          )}
          {/* Days and duration fields - only show if filled */}
          {property.daysToStartRenoSinceRSD !== null && property.daysToStartRenoSinceRSD !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Días Para empezar la reno desde firma:</span> {property.daysToStartRenoSinceRSD} días
            </div>
          )}
          {property.renoDuration !== null && property.renoDuration !== undefined && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Duración de la reno:</span> {property.renoDuration} días
            </div>
          )}
          {/* Ocultar timeInPhase para las nuevas fases de budget */}
          {(stage === "reno-budget-renovator" || stage === "reno-budget-client" || stage === "reno-budget-start") ? null : (
            <div className="text-xs text-muted-foreground">{timeInPhase}</div>
          )}
        </div>
      ) : stage === "done" ? (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t.propertyCard.completed} {timeInPhase}</div>
        </div>
      ) : null}
    </div>
  );
}
