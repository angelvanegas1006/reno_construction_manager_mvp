"use client";

import { Partida } from '@/lib/parsers/parse-activities-text';

interface PartidaItemProps {
  partida: Partida;
}

export function PartidaItem({ partida }: PartidaItemProps) {
  // Formatear áreas afectadas como "Baño 1 · Baño 2 · Habitación 1"
  const areasText = partida.areas && partida.areas.length > 0
    ? partida.areas.join(' · ')
    : null;

  // Formatear cantidad y precio unitario como "3 ud · 12,15€/ud"
  let quantityPriceText: string | null = null;
  if (partida.quantity && partida.unitPrice) {
    // Limpiar el precio unitario para que tenga formato consistente
    const cleanUnitPrice = partida.unitPrice.replace(/\/ud$/, '').replace(/€/g, '').trim();
    quantityPriceText = `${partida.quantity} ud · ${cleanUnitPrice}€/ud`;
  } else if (partida.quantity) {
    quantityPriceText = `${partida.quantity} ud`;
  } else if (partida.unitPrice) {
    const cleanUnitPrice = partida.unitPrice.replace(/\/ud$/, '').replace(/€/g, '').trim();
    quantityPriceText = `${cleanUnitPrice}€/ud`;
  }

  // Determinar qué precio mostrar (prioridad: totalPrice > unitPrice)
  const displayPrice = partida.totalPrice || partida.unitPrice;
  const formattedPrice = displayPrice 
    ? (displayPrice.includes('€') ? displayPrice : `${displayPrice}€`)
    : null;

  return (
    <div className="bg-muted/30 dark:bg-[#1a1a1a] rounded-lg p-4">
      {/* Título con precio alineado */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <h4 className="font-medium text-foreground flex-1">
          {partida.title}
        </h4>
        {formattedPrice && (
          <span className="text-primary font-semibold text-base whitespace-nowrap flex-shrink-0">
            {formattedPrice}
          </span>
        )}
      </div>

      {/* Áreas afectadas */}
      {areasText && (
        <p className="text-sm text-muted-foreground mb-2">
          {areasText}
        </p>
      )}

      {/* Descripción */}
      {partida.description && (
        <p className="text-sm text-muted-foreground">
          {partida.description}
        </p>
      )}
    </div>
  );
}

