"use client";

import { useTestSupabase } from '@/hooks/useTestSupabase';
import { Card } from '@/components/ui/card';

export function SupabaseTest() {
  const { properties, propertyActivities, propertyImages, propertyInspections, loading, error } = useTestSupabase();

  if (loading) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <p className="text-center text-muted-foreground">Cargando datos de Supabase...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="p-6 border-red-500">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error de conexión</h2>
          <p className="text-red-500">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">Prueba de Conexión con Supabase</h1>
        <p className="text-muted-foreground mb-6">
          Datos leídos desde Supabase (solo lectura, sin modificar nada)
        </p>
      </div>

      {/* Properties */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Properties ({properties.length})
        </h2>
        {properties.length === 0 ? (
          <p className="text-muted-foreground">No hay properties en la base de datos</p>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{property.name || property.address || 'Sin nombre'}</h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {property.id}
                    </p>
                    {property.address && (
                      <p className="text-sm text-muted-foreground">📍 {property.address}</p>
                    )}
                    {property.status && (
                      <p className="text-sm">
                        Estado: <span className="font-medium">{property.status}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    {property.bedrooms && <p>{property.bedrooms} hab.</p>}
                    {property.bathrooms && <p>{property.bathrooms} baños</p>}
                    {property.square_meters && <p>{property.square_meters} m²</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Property Activities */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Property Activities ({propertyActivities.length})
        </h2>
        {propertyActivities.length === 0 ? (
          <p className="text-muted-foreground">No hay activities en la base de datos</p>
        ) : (
          <div className="space-y-2">
            {propertyActivities.map((activity) => (
              <div key={activity.id} className="border-b pb-2 last:border-0">
                <p className="font-medium">{activity.name}</p>
                {activity.property_id && (
                  <p className="text-sm text-muted-foreground">Property ID: {activity.property_id}</p>
                )}
                {activity.percentage !== null && (
                  <p className="text-sm text-muted-foreground">Progreso: {activity.percentage}%</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Property Images */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Property Images ({propertyImages.length})
        </h2>
        {propertyImages.length === 0 ? (
          <p className="text-muted-foreground">No hay imágenes en la base de datos</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {propertyImages.map((image) => (
              <div key={image.id} className="space-y-2">
                {image.url && (
                  <img
                    src={image.url}
                    alt={image.filename || 'Property image'}
                    className="w-full h-32 object-cover rounded"
                  />
                )}
                <p className="text-xs text-muted-foreground truncate">
                  {image.filename || image.id}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Property Inspections */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          Property Inspections ({propertyInspections.length})
        </h2>
        {propertyInspections.length === 0 ? (
          <p className="text-muted-foreground">No hay inspecciones en la base de datos</p>
        ) : (
          <div className="space-y-4">
            {propertyInspections.map((inspection) => (
              <div key={inspection.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">Inspection ID: {inspection.id}</p>
                    {inspection.property_id && (
                      <p className="text-sm text-muted-foreground">Property ID: {inspection.property_id}</p>
                    )}
                    {inspection.inspection_status && (
                      <p className="text-sm">
                        Estado: <span className="font-medium">{inspection.inspection_status}</span>
                      </p>
                    )}
                    {inspection.created_at && (
                      <p className="text-sm text-muted-foreground">
                        Creada: {new Date(inspection.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {inspection.has_elevator && (
                    <span className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                      Tiene ascensor
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Summary */}
      <Card className="p-6 bg-green-50 dark:bg-green-950">
        <h2 className="text-xl font-bold mb-2">✅ Conexión exitosa</h2>
        <p className="text-sm text-muted-foreground">
          Se leyeron datos de Supabase correctamente. Total de registros:
        </p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>• Properties: {properties.length}</li>
          <li>• Activities: {propertyActivities.length}</li>
          <li>• Images: {propertyImages.length}</li>
          <li>• Inspections: {propertyInspections.length}</li>
        </ul>
      </Card>
    </div>
  );
}

