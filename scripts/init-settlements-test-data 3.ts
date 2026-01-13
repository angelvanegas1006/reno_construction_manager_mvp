// Script to initialize test data for settlements
// Run this in browser console or create a page that calls it

import { 
  createSettlementProperty, 
  saveSettlementProperty,
  getAllSettlementProperties 
} from "@/lib/settlements-storage";

export function initSettlementsTestData() {
  // Don't clear existing data, just add if empty
  const existing = getAllSettlementProperties();
  if (existing.length > 0) {
    console.log(`✅ Already have ${existing.length} settlements. Skipping initialization.`);
    return existing;
  }

  const testSettlements = [
    {
      propertyId: "prop-001",
      fullAddress: "Calle Gran Vía 45, 3º B, Madrid",
      address: "Calle Gran Vía 45, 3º B, Madrid",
      currentStage: "verificacion-documentacion" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: false,
        notaSimple: true,
        certificadoEnergetico: false,
        otros: false,
      },
      notes: "Pendiente de recibir escritura y certificado energético",
    },
    {
      propertyId: "prop-002",
      fullAddress: "Avenida Diagonal 123, 5º 2ª, Barcelona",
      address: "Avenida Diagonal 123, 5º 2ª, Barcelona",
      currentStage: "aprobacion-hipoteca" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: true,
        notaSimple: true,
        certificadoEnergetico: true,
        otros: true,
      },
      notes: "Documentación completa. Esperando aprobación del banco",
      estimatedSigningDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      propertyId: "prop-003",
      fullAddress: "Plaza Mayor 8, 1º A, Valencia",
      address: "Plaza Mayor 8, 1º A, Valencia",
      currentStage: "coordinacion-firma-escritura" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: true,
        notaSimple: true,
        certificadoEnergetico: true,
        otros: true,
      },
      notes: "Hipoteca aprobada. Coordinando fecha con notaría",
      notaryName: "Notaría García",
      estimatedSigningDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      propertyId: "prop-004",
      fullAddress: "Calle Serrano 78, 4º D, Madrid",
      address: "Calle Serrano 78, 4º D, Madrid",
      currentStage: "aguardando-firma-compraventa" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: true,
        notaSimple: true,
        certificadoEnergetico: true,
        otros: true,
      },
      notes: "Todo listo. Esperando firma de compraventa",
      notaryName: "Notaría López",
      estimatedSigningDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      propertyId: "prop-005",
      fullAddress: "Paseo de Gracia 92, 2º 1ª, Barcelona",
      address: "Paseo de Gracia 92, 2º 1ª, Barcelona",
      currentStage: "finalizadas" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: true,
        notaSimple: true,
        certificadoEnergetico: true,
        otros: true,
      },
      notes: "Escrituración completada exitosamente",
      notaryName: "Notaría Martínez",
      signingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      propertyId: "prop-006",
      fullAddress: "Calle Colón 12, 3º C, Valencia",
      address: "Calle Colón 12, 3º C, Valencia",
      currentStage: "canceladas" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: false,
        notaSimple: true,
        certificadoEnergetico: false,
        otros: false,
      },
      notes: "Cancelada por decisión del comprador",
    },
    {
      propertyId: "prop-007",
      fullAddress: "Avenida de la Constitución 34, 1º B, Sevilla",
      address: "Avenida de la Constitución 34, 1º B, Sevilla",
      currentStage: "verificacion-documentacion" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: false,
        notaSimple: false,
        certificadoEnergetico: false,
        otros: false,
      },
      notes: "Recién iniciada. Pendiente de recibir toda la documentación",
    },
    {
      propertyId: "prop-008",
      fullAddress: "Calle Preciados 56, 5º A, Madrid",
      address: "Calle Preciados 56, 5º A, Madrid",
      currentStage: "aprobacion-hipoteca" as const,
      analyst: "Santiago Figueiredo",
      documentsStatus: {
        escritura: true,
        notaSimple: true,
        certificadoEnergetico: true,
        otros: false,
      },
      notes: "Documentación verificada. En proceso de aprobación bancaria",
    },
  ];

  testSettlements.forEach((settlementData) => {
    const settlement = createSettlementProperty(
      settlementData.propertyId,
      settlementData.fullAddress,
      settlementData.address
    );
    
    // Update with additional data
    Object.assign(settlement, {
      currentStage: settlementData.currentStage,
      analyst: settlementData.analyst,
      documentsStatus: settlementData.documentsStatus,
      notes: settlementData.notes,
      notaryName: settlementData.notaryName,
      estimatedSigningDate: settlementData.estimatedSigningDate,
      signingDate: settlementData.signingDate,
      timeInStage: settlementData.currentStage === "finalizadas" 
        ? "5 días" 
        : settlementData.currentStage === "canceladas"
        ? "10 días"
        : `${Math.floor(Math.random() * 15) + 1} días`,
    });

    saveSettlementProperty(settlement);
  });

  console.log(`✅ Created ${testSettlements.length} test settlements`);
  return getAllSettlementProperties();
}

