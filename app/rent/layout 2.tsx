"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RentSidebar } from "@/components/rent/rent-sidebar";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { Loader2 } from "lucide-react";

export default function RentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { role, isLoading } = useAppAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Si el usuario tiene rol de rent, permitir acceso
      if (role && ["rent_manager", "rent_agent", "tenant", "admin"].includes(role)) {
        // Usuario tiene permisos, puede acceder
        return;
      } else if (role && !["rent_manager", "rent_agent", "tenant", "admin"].includes(role)) {
        // Usuario no tiene permisos para rent, redirigir según su rol
        if (role === "foreman") {
          router.push("/reno/construction-manager");
        } else if (role === "construction_manager") {
          router.push("/reno/construction-manager/kanban");
        } else {
          router.push("/login");
        }
      } else if (!role) {
        // Usuario no autenticado
        router.push("/login");
      }
    }
  }, [role, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Si el usuario no tiene permisos, no mostrar nada (la redirección se está procesando)
  if (role && !["rent_manager", "rent_agent", "tenant", "admin"].includes(role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <RentSidebar 
        isMobileOpen={isMobileMenuOpen} 
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
      />
      <main className="flex-1 overflow-y-auto md:ml-16">
        <div className="container mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

