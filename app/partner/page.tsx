"use client";

import { useState, useEffect, useMemo } from "react";
import { PartnerSidebar } from "@/components/partner/sidebar";
import { PartnerHomeIndicators } from "@/components/partner/partner-home-indicators";
import { PartnerHomeTasks } from "@/components/partner/partner-home-tasks";
import { PartnerHomeAppointments } from "@/components/partner/partner-home-appointments";
import { PartnerHomeRecentProperties } from "@/components/partner/partner-home-recent-properties";
import { PartnerHomePortfolio } from "@/components/partner/partner-home-portfolio";
import { getAllProperties, Property, PropertyStage } from "@/lib/property-storage";
import { 
  getAllAppointments, 
  getAllTasks, 
  saveAppointment,
  saveTask,
  createAutomaticAppointment,
  createTaskFromProperty,
  Appointment,
  Task
} from "@/lib/appointments-storage";
import { validateForSubmission } from "@/lib/property-validation";
import { useRouter } from "next/navigation";

// Active stages (excluding sold and rejected)
const ACTIVE_STAGES: PropertyStage[] = [
  "draft",
  "review",
  "needs-correction",
  "negotiation",
  "pending-arras",
  "settlement",
];

export default function PartnerHomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const router = useRouter();

  // Load data on mount
  useEffect(() => {
    const loadData = () => {
      const allProps = getAllProperties();
      setProperties(allProps);

      // Generate automatic appointments for properties in pending-arras and settlement
      const allAppointments = getAllAppointments();
      const newAppointments: Appointment[] = [];

      allProps.forEach((prop) => {
        if (prop.currentStage === "pending-arras" || prop.currentStage === "settlement") {
          const existing = allAppointments.find(
            (apt) => apt.propertyId === prop.id && apt.isAutomatic
          );
          if (!existing) {
            const autoApt = createAutomaticAppointment(
              prop.id,
              prop.currentStage,
              prop.address || prop.fullAddress
            );
            if (autoApt) {
              saveAppointment(autoApt);
              newAppointments.push(autoApt);
            }
          }
        }
      });

      // Generate tasks for properties in needs-correction and negotiation
      const allTasks = getAllTasks();
      const newTasks: Task[] = [];

      allProps.forEach((prop) => {
        if (
          (prop.currentStage === "needs-correction" || prop.currentStage === "negotiation") &&
          prop.data
        ) {
          const validation = validateForSubmission(prop.data);
          if (!validation.isValid && validation.missingFields && validation.missingFields.length > 0) {
            const existing = allTasks.find((t) => t.propertyId === prop.id);
            if (!existing) {
              const task = createTaskFromProperty(
                prop.id,
                prop.address || prop.fullAddress,
                prop.currentStage as "needs-correction" | "negotiation",
                validation.missingFields
              );
              saveTask(task);
              newTasks.push(task);
            }
          }
        }
      });

      // Update state with all appointments and tasks (reload from storage to get saved ones)
      setAppointments(getAllAppointments());
      setTasks(getAllTasks());
    };

    loadData();
    
    // Refresh data periodically
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const activeProps = properties.filter((p) => ACTIVE_STAGES.includes(p.currentStage));
    const soldProps = properties.filter((p) => p.currentStage === "sold");
    const draftProps = properties.filter((p) => p.currentStage === "draft");
    
    // Active properties count
    const activeCount = activeProps.length;
    
    // Conversion rate: sold / (draft + sold) * 100
    const totalProcessed = draftProps.length + soldProps.length;
    const conversionRate = totalProcessed > 0 
      ? Math.round((soldProps.length / totalProcessed) * 100)
      : 0;
    
    // Average time: from review to sold (in days)
    // For demo, calculate from review date to now for sold properties
    // Or use a fixed average for demo
    const averageTime = 45; // Dummy value for demo
    
    // MoM deltas (dummy values for demo)
    const activeDelta = { value: 12, isPositive: true };
    const conversionDelta = { value: 5, isPositive: true };
    const timeDelta = { value: 3, isPositive: false };
    
    return {
      activeCount,
      conversionRate,
      averageTime,
      activeDelta,
      conversionDelta,
      timeDelta,
    };
  }, [properties]);

  // Filter properties for recent (last 5)
  const recentProperties = useMemo(() => {
    return properties.filter((p) => p.lastSaved).slice(0, 5);
  }, [properties]);

  const handleTaskClick = (task: Task) => {
    router.push(`/partner/property/${task.propertyId}/edit`);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    router.push(`/partner/property/${appointment.propertyId}`);
  };

  const handleAddAppointment = () => {
    // TODO: Open modal to add appointment
    console.log("Add appointment - Coming soon");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <PartnerSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[var(--prophero-gray-50)] dark:bg-[var(--prophero-gray-950)]">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* KPIs */}
            <PartnerHomeIndicators
              activeProperties={kpis.activeCount}
              conversionRate={kpis.conversionRate}
              averageTime={kpis.averageTime}
              activePropertiesDelta={kpis.activeDelta}
              conversionRateDelta={kpis.conversionDelta}
              averageTimeDelta={kpis.timeDelta}
            />

            {/* Tasks and Appointments Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <PartnerHomeTasks 
                tasks={tasks}
                onTaskClick={handleTaskClick}
              />
              <PartnerHomeAppointments
                appointments={appointments}
                onAppointmentClick={handleAppointmentClick}
                onAddAppointment={handleAddAppointment}
              />
            </div>

            {/* Recent Properties and Portfolio Row */}
            <div className="grid gap-6 md:grid-cols-2">
              <PartnerHomeRecentProperties properties={properties} />
              <PartnerHomePortfolio properties={properties} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
