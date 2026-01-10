"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Search, User, Clock, CheckCircle2, X, ChevronDown, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Property } from "@/lib/property-storage";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { usePropertyTracking } from "@/hooks/usePropertyTracking";
import { getTechnicalConstructionNamesFromForemanEmail } from "@/lib/supabase/user-name-utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface RenoHomeUpdateRequestsProps {
  propertiesByPhase?: Record<string, Property[]>;
  selectedForemanEmails?: string[];
}

interface PropertyWithTracking extends Property {
  needsTracking?: boolean;
  technicalConstruction?: string;
  startDate?: string;
  lastUpdate?: string;
  nextUpdate?: string;
  daysInProgress?: number;
  renoType?: string;
}

export function RenoHomeUpdateRequests({
  propertiesByPhase,
  selectedForemanEmails = [],
}: RenoHomeUpdateRequestsProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { role } = useAppAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForemanFilter, setSelectedForemanFilter] = useState<string>("all");
  const [updatingProperties, setUpdatingProperties] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [initialized, setInitialized] = useState(false);
  const { updateTracking } = usePropertyTracking({
    onSuccess: () => {
      // Refrescar después de actualizar
      setTimeout(() => {
        window.location.reload();
      }, 500);
    },
  });

  // Solo mostrar para construction_manager o admin
  if (role !== "construction_manager" && role !== "admin") {
    return null;
  }

  // Obtener todas las propiedades en reno-in-progress
  const renoInProgressProperties = useMemo(() => {
    if (!propertiesByPhase || !propertiesByPhase["reno-in-progress"]) {
      return [];
    }

    return propertiesByPhase["reno-in-progress"].map((prop) => {
      const supabaseProp = (prop as any).supabaseProperty || {};
      const technicalConstruction = supabaseProp["Technical construction"] || "";
      const startDate = supabaseProp.start_date || prop.inicio;
      const lastUpdate = supabaseProp.last_update || prop.ultimaActualizacion;
      const nextUpdate = supabaseProp.next_update || prop.proximaActualizacion;
      const renoType = supabaseProp.renovation_type || prop.renoType;
      const needsTracking = supabaseProp.needs_foreman_notification || false;

      // Calcular días en progreso
      let daysInProgress: number | undefined;
      if (startDate) {
        const start = new Date(startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - start.getTime();
        daysInProgress = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      return {
        ...prop,
        needsTracking,
        technicalConstruction,
        startDate,
        lastUpdate,
        nextUpdate,
        renoType,
        daysInProgress,
      } as PropertyWithTracking;
    });
  }, [propertiesByPhase]);

  // Filtrar por jefe de obra seleccionado (si hay filtro activo)
  const filteredByForeman = useMemo(() => {
    if (selectedForemanEmails.length === 0) {
      return renoInProgressProperties;
    }

    return renoInProgressProperties.filter((prop) => {
      if (!prop.technicalConstruction) return false;

      return selectedForemanEmails.some((email) => {
        const names = getTechnicalConstructionNamesFromForemanEmail(email);
        return names.some(
          (name) =>
            prop.technicalConstruction === name ||
            (typeof prop.technicalConstruction === "string" &&
              prop.technicalConstruction.includes(name))
        );
      });
    });
  }, [renoInProgressProperties, selectedForemanEmails]);

  // Agrupar por jefe de obra
  const groupedByForeman = useMemo(() => {
    const groups: Record<string, PropertyWithTracking[]> = {};

    filteredByForeman.forEach((prop) => {
      const foreman = prop.technicalConstruction || "Sin asignar";
      if (!groups[foreman]) {
        groups[foreman] = [];
      }
      groups[foreman].push(prop);
    });

    // Ordenar cada grupo por fecha de inicio (más recientes primero)
    Object.keys(groups).forEach((foreman) => {
      groups[foreman].sort((a, b) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });
    });

    return groups;
  }, [filteredByForeman]);

  // Filtrar por búsqueda y jefe de obra seleccionado
  const filteredAndSearched = useMemo(() => {
    let filtered = Object.entries(groupedByForeman);

    // Filtrar por jefe de obra si hay selección
    if (selectedForemanFilter !== "all") {
      filtered = filtered.filter(([foreman]) => foreman === selectedForemanFilter);
    }

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(([foreman, props]) => {
        const matchingProps = props.filter(
          (prop) =>
            prop.fullAddress?.toLowerCase().includes(query) ||
            prop.address?.toLowerCase().includes(query) ||
            prop.id?.toLowerCase().includes(query)
        );
        return [foreman, matchingProps] as [string, PropertyWithTracking[]];
      });
    }

    return filtered.filter(([, props]) => props.length > 0);
  }, [groupedByForeman, searchQuery, selectedForemanFilter]);

  // Obtener lista única de jefes de obra para el filtro
  const foremanList = useMemo(() => {
    const foremen = new Set<string>();
    filteredByForeman.forEach((prop) => {
      if (prop.technicalConstruction) {
        foremen.add(prop.technicalConstruction);
      }
    });
    return Array.from(foremen).sort();
  }, [filteredByForeman]);

  // Inicializar todos los grupos como colapsados por defecto
  useEffect(() => {
    if (!initialized && filteredAndSearched.length > 0) {
      const allForemen = new Set(filteredAndSearched.map(([foreman]) => foreman));
      setCollapsedGroups(allForemen);
      setInitialized(true);
    }
  }, [filteredAndSearched, initialized]);

  const handleToggleTracking = async (propertyId: string, currentValue: boolean) => {
    setUpdatingProperties((prev) => new Set(prev).add(propertyId));
    try {
      await updateTracking(propertyId, !currentValue);
    } catch (error) {
      console.error("Error updating tracking:", error);
      toast.error("Error al actualizar seguimiento");
    } finally {
      setUpdatingProperties((prev) => {
        const next = new Set(prev);
        next.delete(propertyId);
        return next;
      });
    }
  };

  const toggleGroup = (foreman: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(foreman)) {
        next.delete(foreman);
      } else {
        next.add(foreman);
      }
      return next;
    });
  };

  const handleBulkToggle = async (foreman: string, enable: boolean) => {
    const properties = groupedByForeman[foreman] || [];
    const propertiesToUpdate = properties.filter(
      (prop) => prop.needsTracking !== enable
    );

    if (propertiesToUpdate.length === 0) {
      toast.info(
        enable
          ? "Todas las propiedades ya tienen seguimiento activado"
          : "Todas las propiedades ya tienen seguimiento desactivado"
      );
      return;
    }

    setUpdatingProperties(
      new Set(propertiesToUpdate.map((p) => p.id))
    );

    try {
      await Promise.all(
        propertiesToUpdate.map((prop) =>
          updateTracking(prop.id, enable)
        )
      );
      toast.success(
        `${propertiesToUpdate.length} propiedad(es) actualizada(s) correctamente`
      );
    } catch (error) {
      console.error("Error en actualización en lote:", error);
      toast.error("Error al actualizar algunas propiedades");
    } finally {
      setUpdatingProperties(new Set());
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (renoInProgressProperties.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">
              {t.dashboard?.updateRequests?.title ||
                "Solicitar Actualizaciones de Obra"}
            </CardTitle>
          </div>
          <Badge variant="secondary">
            {filteredAndSearched.reduce(
              (sum, [, props]) => sum + props.length,
              0
            )}{" "}
            {t.dashboard?.updateRequests?.properties || "propiedades"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {t.dashboard?.updateRequests?.description ||
            "Marca las propiedades que necesitan seguimiento de obra por parte de los jefes de obra asignados"}
        </p>
      </CardHeader>
      <CardContent>
        {/* Filtros y búsqueda */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={
                  t.dashboard?.updateRequests?.searchPlaceholder ||
                  "Buscar por dirección o ID..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-64">
            <select
              value={selectedForemanFilter}
              onChange={(e) => setSelectedForemanFilter(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">
                {t.dashboard?.updateRequests?.allForemen ||
                  "Todos los jefes de obra"}
              </option>
              {foremanList.map((foreman) => (
                <option key={foreman} value={foreman}>
                  {foreman}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla agrupada por jefe de obra */}
        {filteredAndSearched.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>
              {t.dashboard?.updateRequests?.noProperties ||
                "No se encontraron propiedades"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredAndSearched.map(([foreman, properties]) => (
              <div key={foreman} className="space-y-3">
                {/* Encabezado del grupo */}
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleGroup(foreman)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      {collapsedGroups.has(foreman) ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    <User className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">{foreman}</h3>
                    <Badge variant="outline" className="ml-2">
                      {properties.length}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkToggle(foreman, true)}
                      disabled={
                        updatingProperties.size > 0 ||
                        properties.every((p) => p.needsTracking)
                      }
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Activar todas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkToggle(foreman, false)}
                      disabled={
                        updatingProperties.size > 0 ||
                        properties.every((p) => !p.needsTracking)
                      }
                    >
                      <X className="h-3 w-3 mr-1" />
                      Desactivar todas
                    </Button>
                  </div>
                </div>

                {/* Tabla de propiedades */}
                {!collapsedGroups.has(foreman) && (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">
                          {t.dashboard?.updateRequests?.address || "Dirección"}
                        </TableHead>
                        <TableHead className="w-[120px]">
                          {t.dashboard?.updateRequests?.startDate ||
                            "Fecha Inicio"}
                        </TableHead>
                        <TableHead className="w-[120px]">
                          {t.dashboard?.updateRequests?.daysInProgress ||
                            "Días en Progreso"}
                        </TableHead>
                        <TableHead className="w-[150px]">
                          {t.dashboard?.updateRequests?.lastUpdate ||
                            "Último Update"}
                        </TableHead>
                        <TableHead className="w-[150px]">
                          {t.dashboard?.updateRequests?.nextUpdate ||
                            "Próximo Update"}
                        </TableHead>
                        <TableHead className="w-[120px]">
                          {t.dashboard?.updateRequests?.renoType ||
                            "Tipo de Renovación"}
                        </TableHead>
                        <TableHead className="w-[100px] text-center">
                          {t.dashboard?.updateRequests?.action || "Acción"}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {properties.map((property) => {
                        const isUpdating = updatingProperties.has(property.id);
                        return (
                          <TableRow
                            key={property.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() =>
                              router.push(
                                `/reno/construction-manager/property/${property.id}`
                              )
                            }
                          >
                            <TableCell className="font-medium">
                              {property.fullAddress || property.address || property.id}
                            </TableCell>
                            <TableCell>
                              {formatDate(property.startDate)}
                            </TableCell>
                            <TableCell>
                              {property.daysInProgress !== undefined ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span>{property.daysInProgress} días</span>
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {formatDate(property.lastUpdate)}
                            </TableCell>
                            <TableCell>
                              {formatDate(property.nextUpdate)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {property.renoType || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Switch
                                checked={property.needsTracking || false}
                                onCheckedChange={() =>
                                  handleToggleTracking(
                                    property.id,
                                    property.needsTracking || false
                                  )
                                }
                                disabled={isUpdating}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
