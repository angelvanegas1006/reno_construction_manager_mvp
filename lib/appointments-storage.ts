/**
 * Appointments and Tasks storage for Partner Dashboard
 */

export type AppointmentType = 
  | "pago-arras"
  | "firma-contrato"
  | "escrituracion"
  | "visita-propiedad"
  | "otro";

export interface Appointment {
  id: string;
  propertyId: string;
  type: AppointmentType;
  title: string;
  date: string; // ISO date string
  description?: string;
  createdAt: string;
  isAutomatic: boolean; // true if generated automatically by stage
}

export interface Task {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  dueDate?: string; // ISO date string - when task is due
  isCritical: boolean; // true if it's a blocker
  isPriority: boolean; // true if due today
  stage: "needs-correction" | "negotiation";
  missingFields: string[]; // List of missing field names
  createdAt: string;
}

const APPOINTMENTS_STORAGE_KEY = "vistral_appointments";
const TASKS_STORAGE_KEY = "vistral_tasks";

// Appointments functions
export function getAllAppointments(): Appointment[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveAppointment(appointment: Appointment): void {
  if (typeof window === "undefined") return;
  
  const appointments = getAllAppointments();
  const index = appointments.findIndex((a) => a.id === appointment.id);
  
  if (index >= 0) {
    appointments[index] = appointment;
  } else {
    appointments.push(appointment);
  }
  
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
}

export function deleteAppointment(id: string): void {
  if (typeof window === "undefined") return;
  
  const appointments = getAllAppointments();
  const filtered = appointments.filter((a) => a.id !== id);
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(filtered));
}

export function getAppointmentsByProperty(propertyId: string): Appointment[] {
  return getAllAppointments().filter((a) => a.propertyId === propertyId);
}

// Tasks functions
export function getAllTasks(): Task[] {
  if (typeof window === "undefined") return [];
  
  const stored = localStorage.getItem(TASKS_STORAGE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveTask(task: Task): void {
  if (typeof window === "undefined") return;
  
  const tasks = getAllTasks();
  const index = tasks.findIndex((t) => t.id === task.id);
  
  if (index >= 0) {
    tasks[index] = task;
  } else {
    tasks.push(task);
  }
  
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function deleteTask(id: string): void {
  if (typeof window === "undefined") return;
  
  const tasks = getAllTasks();
  const filtered = tasks.filter((t) => t.id !== id);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filtered));
}

export function getTasksByProperty(propertyId: string): Task[] {
  return getAllTasks().filter((t) => t.propertyId === propertyId);
}

// Generate appointment ID
function generateAppointmentId(): string {
  const appointments = getAllAppointments();
  if (appointments.length === 0) return "1";
  
  const maxId = Math.max(...appointments.map((a) => parseInt(a.id) || 0));
  return (maxId + 1).toString();
}

// Generate task ID
function generateTaskId(): string {
  const tasks = getAllTasks();
  if (tasks.length === 0) return "1";
  
  const maxId = Math.max(...tasks.map((t) => parseInt(t.id) || 0));
  return (maxId + 1).toString();
}

// Create automatic appointment based on property stage
export function createAutomaticAppointment(
  propertyId: string,
  stage: string,
  propertyAddress: string
): Appointment | null {
  let type: AppointmentType | null = null;
  let title = "";
  
  if (stage === "pending-arras") {
    type = "pago-arras";
    title = "Pago de arras";
  } else if (stage === "settlement") {
    type = "escrituracion";
    title = "Fecha de escrituración";
  }
  
  if (!type) return null;
  
  // Generate date (7 days from now for demo)
  const date = new Date();
  date.setDate(date.getDate() + 7);
  
  return {
    id: generateAppointmentId(),
    propertyId,
    type,
    title: `${title} - ${propertyAddress}`,
    date: date.toISOString(),
    createdAt: new Date().toISOString(),
    isAutomatic: true,
  };
}

// Create task from property validation
export function createTaskFromProperty(
  propertyId: string,
  propertyAddress: string,
  stage: "needs-correction" | "negotiation",
  missingFields: string[]
): Task {
  const today = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate()); // Due today for demo
  
  // Create a more generic title based on missing fields
  const titleSuffix = missingFields.length > 3 
    ? `${missingFields.length} campos requeridos`
    : missingFields.slice(0, 2).join(", ");
  
  return {
    id: generateTaskId(),
    propertyId,
    title: `Completar información - ${propertyAddress}`,
    description: `Faltan campos requeridos: ${titleSuffix}${missingFields.length > 2 ? "..." : ""}`,
    dueDate: dueDate.toISOString(),
    isCritical: true,
    isPriority: true, // Due today
    stage,
    missingFields,
    createdAt: new Date().toISOString(),
  };
}

