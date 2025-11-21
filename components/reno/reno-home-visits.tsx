"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";

interface RenoHomeVisitsProps {
  visits: Property[];
  onPropertyClick: (property: Property) => void;
  onAddVisit: () => void;
}

export function RenoHomeVisits({ 
  visits, 
  onPropertyClick,
  onAddVisit 
}: RenoHomeVisitsProps) {
  const { t, language } = useI18n();

  // Sort visits by date (upcoming first)
  // Use estimatedVisitDate for initial-check properties, fallback to proximaActualizacion
  const sortedVisits = [...visits]
    .filter((visit) => {
      const visitDate = visit.estimatedVisitDate || visit.proximaActualizacion;
      if (!visitDate) return false;
      const date = new Date(visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date >= today; // Only future or today visits
    })
    .sort((a, b) => {
      const dateA = new Date(a.estimatedVisitDate || a.proximaActualizacion || "");
      const dateB = new Date(b.estimatedVisitDate || b.proximaActualizacion || "");
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3); // Show only next 3

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate();
    const monthNames = language === "es" 
      ? ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Próximas visitas</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visitas de estado de obra programadas
          </p>
        </div>
        <button
          onClick={onAddVisit}
          className="text-sm font-medium text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] hover:underline"
        >
          Añadir nueva visita
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedVisits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay visitas programadas
            </p>
          ) : (
            sortedVisits.map((visit) => (
              <div
                key={visit.id}
                onClick={() => onPropertyClick(visit)}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[var(--prophero-gray-800)] cursor-pointer transition-colors"
              >
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {visit.fullAddress}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(visit.estimatedVisitDate || visit.proximaActualizacion)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

