"use client";

import { Button } from "@/components/ui/button";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { Calendar, CalendarCheck, Loader2, RefreshCw, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GoogleCalendarConnect() {
  const { isConnected, isLoading, isSyncing, lastSyncAt, connect, disconnect, sync, canConnect, isConfigured } = useGoogleCalendar();

  // Don't show if user can't connect or if Google Calendar is not configured
  if (!canConnect || !isConfigured) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincroniza eventos de propiedades con tu Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CalendarCheck className="h-4 w-4" />
              <span>Conectado</span>
            </div>
            
            {lastSyncAt && (
              <div className="text-xs text-muted-foreground">
                Última sincronización: {new Date(lastSyncAt).toLocaleString()}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={sync}
                disabled={isSyncing}
                variant="outline"
                size="sm"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar ahora
                  </>
                )}
              </Button>
              <Button
                onClick={disconnect}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <Button onClick={connect} className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Conectar Google Calendar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

