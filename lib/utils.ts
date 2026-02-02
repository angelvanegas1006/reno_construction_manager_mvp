import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formatea un error para logging; evita ver "{}" en consola. */
export function formatErrorForLog(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err === "string") return err;
  const e = err as { message?: string; code?: string; name?: string; cause?: unknown };
  const parts = [e.message ?? e.name ?? "Error"];
  if (e.code) parts.push(`code: ${e.code}`);
  if (e.cause != null) parts.push(`cause: ${formatErrorForLog(e.cause)}`);
  return parts.join(" | ");
}
