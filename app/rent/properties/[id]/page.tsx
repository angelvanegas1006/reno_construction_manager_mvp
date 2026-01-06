"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Pause, Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { IdealistaStatusBadge } from "@/components/rent/idealista-status-badge";
import { IdealistaPublishModal } from "@/components/rent/idealista-publish-modal";
import { IdealistaLeadsSection } from "@/components/rent/idealista-leads-section";
import { RentProperty, IdealistaListing, IdealistaLead, IdealistaLeadStatus } from "@/lib/rent/types";
import {
  getPropertyById,
  getListingByPropertyId,
  getLeadsByPropertyId,
} from "@/lib/rent/dummy-data";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<RentProperty | null>(null);
  const [listing, setListing] = useState<IdealistaListing | null>(null);
  const [leads, setLeads] = useState<IdealistaLead[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    // Cargar datos dummy
    const prop = getPropertyById(propertyId);
    const list = getListingByPropertyId(propertyId);
    const propertyLeads = getLeadsByPropertyId(propertyId);

    setProperty(prop || null);
    setListing(list || null);
    setLeads(propertyLeads);
  }, [propertyId]);

  const handlePublish = async (data: { description?: string; photos: string[] }) => {
    setIsPublishing(true);
    
    // Simular publicación (en producción esto llamaría a la API)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Actualizar estado del listing
    if (listing) {
      setListing({
        ...listing,
        status: 'published',
        published_at: new Date().toISOString(),
        idealista_listing_id: `idealista-${Date.now()}`,
        idealista_url: `https://www.idealista.com/inmueble/${Date.now()}/`,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Crear nuevo listing
      setListing({
        id: `listing-${Date.now()}`,
        property_id: propertyId,
        idealista_listing_id: `idealista-${Date.now()}`,
        status: 'published',
        published_at: new Date().toISOString(),
        paused_at: null,
        idealista_url: `https://www.idealista.com/inmueble/${Date.now()}/`,
        metadata: { photos_count: data.photos.length },
        error_message: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    setIsPublishing(false);
  };

  const handlePauseListing = async () => {
    if (!listing) return;
    
    setListing({
      ...listing,
      status: 'paused',
      paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const handleResumeListing = async () => {
    if (!listing) return;
    
    setListing({
      ...listing,
      status: 'published',
      paused_at: null,
      updated_at: new Date().toISOString(),
    });
  };

  const handleLeadStatusChange = (leadId: string, newStatus: IdealistaLeadStatus) => {
    setLeads(prevLeads =>
      prevLeads.map(lead =>
        lead.id === leadId
          ? { ...lead, status: newStatus, updated_at: new Date().toISOString() }
          : lead
      )
    );
  };

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Propiedad no encontrada</p>
      </div>
    );
  }

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/rent/properties')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{property.address}</h1>
            <p className="text-muted-foreground">
              {property.bedrooms} hab. • {property.bathrooms} baños • {property.square_meters} m²
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={property.status === 'available' ? 'default' : 'secondary'}>
            {property.status === 'available' ? 'Disponible' : property.status}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="idealista">
            Idealista
            {listing && listing.status === 'published' && (
              <span className="ml-2 h-2 w-2 rounded-full bg-green-500" />
            )}
          </TabsTrigger>
          <TabsTrigger value="leads">
            Leads
            {leads.length > 0 && (
              <span className="ml-2 rounded-full bg-primary text-primary-foreground text-xs px-2 py-0.5">
                {leads.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la Propiedad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Alquiler Mensual</p>
                  <p className="text-lg font-semibold">{formatCurrency(property.monthly_rent)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Habitaciones</p>
                  <p className="text-lg font-semibold">{property.bedrooms || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Baños</p>
                  <p className="text-lg font-semibold">{property.bathrooms || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Superficie</p>
                  <p className="text-lg font-semibold">{property.square_meters ? `${property.square_meters} m²` : '-'}</p>
                </div>
              </div>
              {property.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Descripción</p>
                  <p className="text-sm">{property.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Idealista */}
        <TabsContent value="idealista" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Publicación en Idealista</CardTitle>
                  <CardDescription>
                    Gestiona la publicación de esta propiedad en Idealista
                  </CardDescription>
                </div>
                {listing && (
                  <IdealistaStatusBadge status={listing.status} />
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!listing || listing.status === 'draft' || listing.status === 'error' ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Esta propiedad aún no está publicada en Idealista.
                  </p>
                  <Button onClick={() => setIsPublishModalOpen(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Publicar en Idealista
                  </Button>
                  {listing?.status === 'error' && listing.error_message && (
                    <div className="p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-sm">
                      <p className="font-semibold">Error anterior:</p>
                      <p>{listing.error_message}</p>
                    </div>
                  )}
                </div>
              ) : listing.status === 'publishing' ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p>Publicando en Idealista...</p>
                </div>
              ) : listing.status === 'published' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Publicado el</p>
                      <p className="font-medium">
                        {listing.published_at
                          ? format(new Date(listing.published_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })
                          : '-'}
                      </p>
                    </div>
                    {listing.idealista_url && (
                      <div>
                        <p className="text-sm text-muted-foreground">Enlace en Idealista</p>
                        <a
                          href={listing.idealista_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          Ver publicación
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  {listing.metadata && (
                    <div className="grid grid-cols-2 gap-4">
                      {listing.metadata.views && (
                        <div>
                          <p className="text-sm text-muted-foreground">Visualizaciones</p>
                          <p className="font-medium">{listing.metadata.views}</p>
                        </div>
                      )}
                      {listing.metadata.favorites && (
                        <div>
                          <p className="text-sm text-muted-foreground">Favoritos</p>
                          <p className="font-medium">{listing.metadata.favorites}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handlePauseListing}
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      Pausar publicación
                    </Button>
                  </div>
                </div>
              ) : listing.status === 'paused' ? (
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    La publicación está pausada desde el{' '}
                    {listing.paused_at
                      ? format(new Date(listing.paused_at), "dd/MM/yyyy", { locale: es })
                      : '-'}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleResumeListing}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Reanudar publicación
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Leads */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leads de Idealista</CardTitle>
              <CardDescription>
                Leads recibidos para esta propiedad desde Idealista
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IdealistaLeadsSection
                leads={leads}
                onLeadStatusChange={handleLeadStatusChange}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de publicación */}
      <IdealistaPublishModal
        open={isPublishModalOpen}
        onOpenChange={setIsPublishModalOpen}
        property={property}
        onPublish={handlePublish}
      />
    </div>
  );
}

