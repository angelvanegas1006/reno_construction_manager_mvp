"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArchitecturalWireframeBackground } from "@/components/architectural-wireframe-background";
import { useAuth } from "@/lib/auth";
import { UserRole } from "@/lib/auth/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    if (!selectedRole) return;

    login(selectedRole);

    // Redirect based on role
    if (selectedRole === "partner") {
      router.push("/partner");
    } else if (selectedRole === "reno_construction_manager") {
      router.push("/reno/construction-manager");
    } else if (selectedRole === "reno_admin") {
      // TODO: Add reno_admin routes later
      router.push("/reno/construction-manager");
    } else if (selectedRole === "super_admin") {
      router.push("/vistral-vision");
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left column: architectural illustration */}
      <div className="relative">
        <ArchitecturalWireframeBackground />
      </div>

      {/* Right column: login CTA */}
      <div className="relative flex min-h-screen flex-col items-center justify-center p-8 bg-card dark:bg-[var(--prophero-gray-900)]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Inicia sesión o crea una cuenta
            </CardTitle>
            <CardDescription>
              Accede a la plataforma de control de operaciones de PropHero
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Role Selector (Auth0 Simulation) */}
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium text-foreground">
                Selecciona tu rol (Simulación Auth0)
              </label>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="reno_construction_manager">Jefe de Obra</SelectItem>
                  <SelectItem value="reno_admin">Admin Reno (Próximamente)</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={handleLogin}
              disabled={!selectedRole}
            >
              Iniciar sesión de forma segura
            </Button>

            <div className="w-full flex justify-center">
              <button className="text-sm text-foreground/80 underline-offset-4 hover:underline">
                Crear una cuenta
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Footer links */}
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <a className="pointer-events-auto hover:underline" href="#">Soporte</a>
          <a className="pointer-events-auto hover:underline" href="#">Privacidad</a>
          <a className="pointer-events-auto hover:underline" href="#">Términos</a>
        </div>
      </div>
    </div>
  );
}
