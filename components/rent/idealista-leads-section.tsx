"use client";

import { useState } from "react";
import { IdealistaLead, IdealistaLeadStatus } from "@/lib/rent/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface IdealistaLeadsSectionProps {
  leads: IdealistaLead[];
  onLeadStatusChange?: (leadId: string, newStatus: IdealistaLeadStatus) => void;
}

export function IdealistaLeadsSection({ leads, onLeadStatusChange }: IdealistaLeadsSectionProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const getStatusBadge = (status: IdealistaLeadStatus) => {
    const configs = {
      pending_qualification: {
        label: "Pendiente",
        variant: "outline" as const,
        className: "border-yellow-300 text-yellow-700",
        icon: Clock,
      },
      qualified: {
        label: "Cualificado",
        variant: "default" as const,
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: CheckCircle,
      },
      contacted: {
        label: "Contactado",
        variant: "secondary" as const,
        className: "bg-purple-100 text-purple-800 border-purple-300",
        icon: MessageSquare,
      },
      converted: {
        label: "Convertido",
        variant: "default" as const,
        className: "bg-green-100 text-green-800 border-green-300",
        icon: CheckCircle,
      },
      rejected: {
        label: "Rechazado",
        variant: "destructive" as const,
        className: "bg-red-100 text-red-800 border-red-300",
        icon: XCircle,
      },
    };

    const config = configs[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getScoreColor = (score?: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-600 font-semibold";
    if (score >= 60) return "text-yellow-600 font-semibold";
    return "text-red-600 font-semibold";
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return "-";
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const filteredLeads = statusFilter === "all"
    ? leads
    : leads.filter(lead => lead.status === statusFilter);

  if (leads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No hay leads recibidos para esta propiedad</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending_qualification">Pendientes</SelectItem>
              <SelectItem value="qualified">Cualificados</SelectItem>
              <SelectItem value="contacted">Contactados</SelectItem>
              <SelectItem value="converted">Convertidos</SelectItem>
              <SelectItem value="rejected">Rechazados</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'}
          </p>
        </div>
      </div>

      {/* Tabla de leads */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contacto</TableHead>
              <TableHead>Mensaje</TableHead>
              <TableHead>Datos Cualificados</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{lead.contact_name || "Sin nombre"}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {lead.contact_phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {lead.contact_phone}
                        </div>
                      )}
                      {lead.contact_email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {lead.contact_email}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm max-w-xs truncate" title={lead.original_message || ""}>
                    {lead.original_message || "-"}
                  </p>
                </TableCell>
                <TableCell>
                  {lead.qualification_data ? (
                    <div className="space-y-1 text-sm">
                      {lead.qualification_data.presupuesto && (
                        <p>Presupuesto: {formatCurrency(lead.qualification_data.presupuesto)}</p>
                      )}
                      {lead.qualification_data.fecha_entrada && (
                        <p>Entrada: {format(new Date(lead.qualification_data.fecha_entrada), "dd/MM/yyyy", { locale: es })}</p>
                      )}
                      {lead.qualification_data.duracion && (
                        <p>Duración: {lead.qualification_data.duracion} meses</p>
                      )}
                      {lead.qualification_data.perfil && (
                        <p>Perfil: {lead.qualification_data.perfil}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">Pendiente de cualificación</span>
                  )}
                </TableCell>
                <TableCell>
                  {lead.qualification_data?.score !== null && lead.qualification_data?.score !== undefined ? (
                    <span className={getScoreColor(lead.qualification_data.score)}>
                      {lead.qualification_data.score}/100
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(lead.status)}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <p>{formatDate(lead.received_at)}</p>
                    {lead.qualified_at && (
                      <p className="text-muted-foreground text-xs">
                        Cualificado: {formatDate(lead.qualified_at)}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {lead.status === 'qualified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLeadStatusChange?.(lead.id, 'contacted')}
                      >
                        Marcar como contactado
                      </Button>
                    )}
                    {lead.status === 'contacted' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLeadStatusChange?.(lead.id, 'converted')}
                      >
                        Marcar como convertido
                      </Button>
                    )}
                    {(lead.status === 'qualified' || lead.status === 'contacted') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onLeadStatusChange?.(lead.id, 'rejected')}
                      >
                        Rechazar
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
















