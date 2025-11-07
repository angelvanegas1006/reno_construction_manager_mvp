"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { Appointment } from "@/lib/appointments-storage";
import { useI18n } from "@/lib/i18n";
// Simple date formatting without date-fns

interface PartnerHomeAppointmentsProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onAddAppointment: () => void;
}

export function PartnerHomeAppointments({ 
  appointments, 
  onAppointmentClick,
  onAddAppointment 
}: PartnerHomeAppointmentsProps) {
  const { t, language } = useI18n();

  // Sort appointments by date (upcoming first)
  const sortedAppointments = [...appointments]
    .filter((apt) => {
      const aptDate = new Date(apt.date);
      return aptDate >= new Date(); // Only future appointments
    })
    .sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3); // Show only next 3

  const formatDate = (dateString: string) => {
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
          <CardTitle className="text-lg font-semibold">{t.dashboard.upcomingAppointments}</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t.dashboard.upcomingAppointmentsDescription}
          </p>
        </div>
        <button
          onClick={onAddAppointment}
          className="text-sm font-medium text-[var(--prophero-blue-600)] dark:text-[var(--prophero-blue-400)] hover:underline"
        >
          {t.dashboard.addAppointment}
        </button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay citas programadas
            </p>
          ) : (
            sortedAppointments.map((appointment) => (
              <div
                key={appointment.id}
                onClick={() => onAppointmentClick(appointment)}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-[var(--prophero-gray-50)] dark:hover:bg-[var(--prophero-gray-800)] cursor-pointer transition-colors"
              >
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {appointment.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(appointment.date)}
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

