# Script de Migración: localStorage → Supabase

Este script migra las propiedades y checklists desde localStorage a Supabase.

## Uso

```typescript
// scripts/migrate-to-supabase.ts
import { supabaseProperties } from '@/lib/api/supabase-properties';
import { getAllProperties } from '@/lib/property-storage';
import { getChecklist } from '@/lib/checklist-storage';

async function migrateProperties() {
  console.log('🚀 Iniciando migración...');
  
  // Obtener propiedades de localStorage
  const localProperties = getAllProperties();
  console.log(`📦 Encontradas ${localProperties.length} propiedades en localStorage`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const property of localProperties) {
    try {
      // Verificar si ya existe en Supabase
      const existing = await supabaseProperties.getProperty(property.id);
      
      if (existing) {
        console.log(`⏭️  Propiedad ${property.id} ya existe, saltando...`);
        continue;
      }
      
      // Crear en Supabase
      await supabaseProperties.createProperty(property);
      successCount++;
      console.log(`✅ Migrada propiedad ${property.id}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrando propiedad ${property.id}:`, error);
    }
  }
  
  console.log(`\n✨ Migración completada:`);
  console.log(`   ✅ Exitosas: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
}

async function migrateChecklists() {
  console.log('🚀 Iniciando migración de checklists...');
  
  const properties = getAllProperties();
  let successCount = 0;
  let errorCount = 0;
  
  for (const property of properties) {
    try {
      // Intentar migrar checklist de partner
      const partnerChecklist = getChecklist(property.id, 'partner');
      if (partnerChecklist) {
        await supabaseChecklists.saveChecklist(
          property.id,
          'partner',
          partnerChecklist
        );
        successCount++;
      }
      
      // Intentar migrar checklist reno_initial
      const renoInitialChecklist = getChecklist(property.id, 'reno_initial');
      if (renoInitialChecklist) {
        await supabaseChecklists.saveChecklist(
          property.id,
          'reno_initial',
          renoInitialChecklist
        );
        successCount++;
      }
      
      // Intentar migrar checklist reno_final
      const renoFinalChecklist = getChecklist(property.id, 'reno_final');
      if (renoFinalChecklist) {
        await supabaseChecklists.saveChecklist(
          property.id,
          'reno_final',
          renoFinalChecklist
        );
        successCount++;
      }
    } catch (error) {
      errorCount++;
      console.error(`❌ Error migrando checklists de ${property.id}:`, error);
    }
  }
  
  console.log(`\n✨ Migración de checklists completada:`);
  console.log(`   ✅ Exitosas: ${successCount}`);
  console.log(`   ❌ Errores: ${errorCount}`);
}

// Ejecutar migración
async function runMigration() {
  try {
    await migrateProperties();
    await migrateChecklists();
    console.log('\n🎉 Migración completa!');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

// Ejecutar solo si se llama directamente
if (typeof window === 'undefined') {
  runMigration();
}
```

## Uso en Componente React

```typescript
// components/admin/migration-button.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { migrateProperties, migrateChecklists } from '@/scripts/migrate-to-supabase';

export function MigrationButton() {
  const [isMigrating, setIsMigrating] = useState(false);
  const [status, setStatus] = useState<string>('');

  const handleMigration = async () => {
    setIsMigrating(true);
    setStatus('Migrando propiedades...');
    
    try {
      await migrateProperties();
      setStatus('Migrando checklists...');
      await migrateChecklists();
      setStatus('✅ Migración completada!');
    } catch (error) {
      setStatus(`❌ Error: ${error}`);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div>
      <Button 
        onClick={handleMigration} 
        disabled={isMigrating}
      >
        {isMigrating ? 'Migrando...' : 'Migrar a Supabase'}
      </Button>
      {status && <p>{status}</p>}
    </div>
  );
}
```

## Migración Gradual (Recomendado)

En lugar de migrar todo de una vez, puedes hacer una migración gradual:

1. **Modo Híbrido**: Leer de Supabase primero, fallback a localStorage
2. **Escribir siempre en ambos**: Mantener sincronizados durante la transición
3. **Migrar bajo demanda**: Cuando se accede a una propiedad, migrarla si no existe en Supabase

```typescript
// lib/property-storage-hybrid.ts
import { supabaseProperties } from '@/lib/api/supabase-properties';
import { getAllProperties as getLocalProperties, getPropertyById as getLocalProperty } from '@/lib/property-storage';

export async function getAllProperties(): Promise<Property[]> {
  try {
    // Intentar obtener de Supabase primero
    const supabaseProps = await supabaseProperties.getProperties();
    return supabaseProps;
  } catch (error) {
    console.warn('Error fetching from Supabase, using localStorage:', error);
    // Fallback a localStorage
    return getLocalProperties();
  }
}

export async function getPropertyById(id: string): Promise<Property | null> {
  try {
    // Intentar Supabase primero
    const property = await supabaseProperties.getProperty(id);
    if (property) return property;
    
    // Si no existe en Supabase, obtener de localStorage y migrar
    const localProperty = getLocalProperty(id);
    if (localProperty) {
      // Migrar bajo demanda
      await supabaseProperties.createProperty(localProperty);
      return localProperty;
    }
    
    return null;
  } catch (error) {
    console.warn('Error fetching from Supabase, using localStorage:', error);
    return getLocalProperty(id);
  }
}

export async function saveProperty(property: Property): Promise<void> {
  try {
    // Guardar en Supabase
    await supabaseProperties.createProperty(property);
  } catch (error) {
    console.error('Error saving to Supabase:', error);
  }
  
  // También guardar en localStorage como backup
  // (mantener durante la transición)
  savePropertyToLocal(property);
}
```

