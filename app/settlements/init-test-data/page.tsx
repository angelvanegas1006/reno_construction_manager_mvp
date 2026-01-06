"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initSettlementsTestData } from "@/scripts/init-settlements-test-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function InitSettlementsTestDataPage() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Auto-initialize on mount
    handleInit();
  }, []);

  const handleInit = () => {
    setIsInitializing(true);
    try {
      const settlements = initSettlementsTestData();
      setCount(settlements.length);
      setIsComplete(true);
      setIsInitializing(false);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/settlements/kanban");
      }, 2000);
    } catch (error) {
      console.error("Error initializing test data:", error);
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inicializando Datos de Prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInitializing && (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Creando tarjetas de prueba...</span>
            </div>
          )}
          
          {isComplete && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>¡Datos de prueba creados exitosamente!</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Se crearon {count} escrituraciones de prueba.
              </div>
              <div className="text-sm text-muted-foreground">
                Redirigiendo al kanban...
              </div>
            </div>
          )}

          {!isInitializing && !isComplete && (
            <Button onClick={handleInit} className="w-full">
              Crear Datos de Prueba
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

