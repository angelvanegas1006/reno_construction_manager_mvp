import { Property, PropertyData, Orientation, VendedorData, InquilinoData } from "./property-storage";

export interface SectionProgress {
  sectionId: string;
  name: string;
  progress: number; // 0-100
  requiredFieldsCount: number;
  completedRequiredFieldsCount: number;
  optionalFieldsCount: number;
  completedOptionalFieldsCount: number;
}

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
}

// Calculate progress for "Información de la propiedad" section
function calculateInfoPropiedadProgress(data?: PropertyData, propertyType?: string): number {
  if (!data && !propertyType) return 0;
  
  // Use propertyType from Property if tipoPropiedad is not in data
  const tipoPropiedad = data?.tipoPropiedad || propertyType;
  
  const requiredFields = [
    tipoPropiedad,
    data?.superficieConstruida,
    data?.anoConstruccion,
    data?.referenciaCatastral,
    data?.orientacion && data.orientacion.length > 0 ? data.orientacion : undefined,
  ];
  const completedRequired = requiredFields.filter(
    (v) => v !== undefined && v !== null && v !== "" && (Array.isArray(v) ? v.length > 0 : true)
  ).length;
  const totalRequired = requiredFields.length;
  
  const optionalFields = [
    data?.superficieUtil,
    data?.habitaciones,
    data?.banos,
    data?.plazasAparcamiento,
    data?.ascensor,
    data?.balconTerraza,
    data?.trastero,
  ];
  const completedOptional = optionalFields.filter(
    (v) => v !== undefined && v !== null
  ).length;
  const totalOptional = optionalFields.length;
  
  // Weighted calculation: required counts more but optional also contributes
  const requiredWeight = 2;
  const optionalWeight = 1;
  
  const totalWeight = totalRequired * requiredWeight + totalOptional * optionalWeight;
  const completedWeight =
    completedRequired * requiredWeight + completedOptional * optionalWeight;
  
  if (totalWeight === 0) return 0;
  return Math.round((completedWeight / totalWeight) * 100);
}

// Calculate progress for "Información económica" section
function calculateInfoEconomicaProgress(data?: PropertyData): number {
  if (!data) return 0;
  
  const requiredFields = [
    data.precioVenta,
    data.gastosComunidad,
    data.confirmacionGastosComunidad,
    data.ibiAnual,
    data.confirmacionIBI,
  ];
  const completedRequired = requiredFields.filter(
    (v) => v !== undefined && v !== null && v !== false
  ).length;
  const totalRequired = requiredFields.length;
  
  if (totalRequired === 0) return 0;
  return Math.round((completedRequired / totalRequired) * 100);
}

// Calculate progress for "Estado legal y de comunidad" section
function calculateEstadoLegalProgress(data?: PropertyData): number {
  if (!data) return 0;
  
  const required = [
    data.comunidadPropietariosConstituida !== undefined,
    data.edificioSeguroActivo !== undefined,
    data.comercializaExclusiva !== undefined,
    data.edificioITEfavorable !== undefined,
    data.propiedadAlquilada !== undefined,
  ].filter((v) => v === true).length;
  
  // If propiedadAlquilada is true and situacionInquilinos is set
  let conditionalFields = 0;
  if (data.propiedadAlquilada === true && data.situacionInquilinos) {
    conditionalFields = 1;
  }
  
  const total = 5 + conditionalFields;
  const completed = required + conditionalFields;
  
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Calculate progress for "Documentación mínima" section
function calculateDocumentacionProgress(data?: PropertyData): number {
  if (!data) return 0;
  
  const required = data.videoGeneral && data.videoGeneral.length > 0 ? 1 : 0;
  const optional = [
    data.notaSimpleRegistro && data.notaSimpleRegistro.length > 0,
    data.certificadoEnergetico && data.certificadoEnergetico.length > 0,
  ].filter((v) => v === true).length;
  
  const total = 1 + 2; // 1 required + 2 optional
  const completed = required + optional;
  
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Calculate progress for "Datos del Vendedor" section
function calculateDatosVendedorProgress(data?: PropertyData): number {
  if (!data || !data.vendedores || data.vendedores.length === 0) return 0;
  
  // All fields are required for each vendedor
  const requiredFieldsPerVendedor = 6; // nombreCompleto, dniNifCif, email, telefonoPais, telefonoNumero, dniAdjunto
  let totalCompleted = 0;
  let totalRequired = 0;
  
  data.vendedores.forEach((vendedor) => {
    totalRequired += requiredFieldsPerVendedor;
    let completed = 0;
    
    if (vendedor.nombreCompleto) completed++;
    if (vendedor.dniNifCif) completed++;
    if (vendedor.email) completed++;
    if (vendedor.telefonoPais) completed++;
    if (vendedor.telefonoNumero) completed++;
    if (vendedor.dniAdjunto && vendedor.dniAdjunto.length > 0) completed++;
    
    totalCompleted += completed;
  });
  
  if (totalRequired === 0) return 0;
  return Math.round((totalCompleted / totalRequired) * 100);
}

// Calculate progress for "Datos del Inquilino" section
function calculateDatosInquilinoProgress(data?: PropertyData): number {
  if (!data || !data.inquilino) return 0;
  
  const inquilino = data.inquilino;
  const requiredFields = [
    inquilino.nombreCompleto,
    inquilino.email,
    inquilino.telefonoPais,
    inquilino.telefonoNumero,
    inquilino.dniNie && inquilino.dniNie.length > 0,
    inquilino.contratoArrendamiento && inquilino.contratoArrendamiento.length > 0,
    inquilino.fechaFinalizacionContrato,
    inquilino.periodoPreaviso !== undefined,
    inquilino.subrogacionContrato,
    inquilino.importeAlquilerTransferir,
    inquilino.ultimaActualizacionAlquiler,
    inquilino.justificantesPago && inquilino.justificantesPago.length > 0,
    inquilino.fechaUltimoRecibo,
    inquilino.comprobanteTransferenciaVendedor && inquilino.comprobanteTransferenciaVendedor.length > 0,
    inquilino.justificanteDeposito && inquilino.justificanteDeposito.length > 0,
    inquilino.fechaVencimientoSeguroAlquiler,
    inquilino.estadoSeguroAlquiler,
    inquilino.proveedorSeguroAlquiler,
  ];
  
  const completed = requiredFields.filter((v) => v !== undefined && v !== null && v !== "" && v !== false).length;
  const total = requiredFields.length;
  
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Calculate overall progress - average of all sections
export function calculateOverallProgress(data?: PropertyData, showInquilino?: boolean, propertyType?: string): number {
  if (!data && !propertyType) return 0;
  
  const sections = [
    calculateInfoPropiedadProgress(data, propertyType),
    calculateInfoEconomicaProgress(data),
    calculateEstadoLegalProgress(data),
    calculateDocumentacionProgress(data),
    calculateDatosVendedorProgress(data),
    ...(showInquilino ? [calculateDatosInquilinoProgress(data)] : []),
  ];
  
  // Filter out 0% sections if they don't have any fields visited
  const activeSections = sections.filter((prog) => prog > 0);
  
  if (activeSections.length === 0) return 0;
  
  const average = activeSections.reduce((sum, prog) => sum + prog, 0) / sections.length;
  return Math.round(average);
}

// Get progress for all sections
export function getAllSectionsProgress(
  data?: PropertyData, 
  showInquilino?: boolean, 
  propertyType?: string,
  translations?: { property: { sections: Record<string, string> }, sidebar: Record<string, string> }
): SectionProgress[] {
  const tipoPropiedad = data?.tipoPropiedad || propertyType;
  
  const sections: SectionProgress[] = [
    {
      sectionId: "info-propiedad",
      name: translations?.property.sections.basicInfo || "Información de la propiedad",
      progress: calculateInfoPropiedadProgress(data, propertyType),
      requiredFieldsCount: 5,
      completedRequiredFieldsCount: data || propertyType ? [
        tipoPropiedad,
        data?.superficieConstruida,
        data?.anoConstruccion,
        data?.referenciaCatastral,
        data?.orientacion,
      ].filter((v) => v !== undefined && v !== null && v !== "").length : 0,
      optionalFieldsCount: 7,
      completedOptionalFieldsCount: data ? [
        data.superficieUtil,
        data.habitaciones,
        data.banos,
        data.plazasAparcamiento,
        data.ascensor,
        data.balconTerraza,
        data.trastero,
      ].filter((v) => v !== undefined && v !== null).length : 0,
    },
    {
      sectionId: "info-economica",
      name: translations?.property.sections.economicInfo || "Información económica",
      progress: calculateInfoEconomicaProgress(data),
      requiredFieldsCount: 5,
      completedRequiredFieldsCount: data ? [
        data.precioVenta,
        data.gastosComunidad,
        data.confirmacionGastosComunidad,
        data.ibiAnual,
        data.confirmacionIBI,
      ].filter((v) => v !== undefined && v !== null && v !== false).length : 0,
      optionalFieldsCount: 0,
      completedOptionalFieldsCount: 0,
    },
    {
      sectionId: "estado-legal",
      name: translations?.property.sections.legalStatus || "Estado legal y de comunidad",
      progress: calculateEstadoLegalProgress(data),
      requiredFieldsCount: data?.propiedadAlquilada ? 6 : 5,
      completedRequiredFieldsCount: data ? [
        data.comunidadPropietariosConstituida !== undefined,
        data.edificioSeguroActivo !== undefined,
        data.comercializaExclusiva !== undefined,
        data.edificioITEfavorable !== undefined,
        data.propiedadAlquilada !== undefined,
        data.propiedadAlquilada === true && data.situacionInquilinos !== undefined,
      ].filter((v) => v === true).length : 0,
      optionalFieldsCount: 0,
      completedOptionalFieldsCount: 0,
    },
    {
      sectionId: "documentacion",
      name: translations?.property.sections.documentation || "Documentación mínima",
      progress: calculateDocumentacionProgress(data),
      requiredFieldsCount: 1,
      completedRequiredFieldsCount: data?.videoGeneral && data.videoGeneral.length > 0 ? 1 : 0,
      optionalFieldsCount: 2,
      completedOptionalFieldsCount: data ? [
        data.notaSimpleRegistro && data.notaSimpleRegistro.length > 0,
        data.certificadoEnergetico && data.certificadoEnergetico.length > 0,
      ].filter((v) => v === true).length : 0,
    },
  ];

  // Add Datos del Vendedor section
  const vendedorProgress = calculateDatosVendedorProgress(data);
  const vendedores = data?.vendedores || [];
  const vendedorRequiredFields = vendedores.length * 6; // 6 fields per vendedor
  let vendedorCompletedFields = 0;
  vendedores.forEach((v) => {
    if (v.nombreCompleto) vendedorCompletedFields++;
    if (v.dniNifCif) vendedorCompletedFields++;
    if (v.email) vendedorCompletedFields++;
    if (v.telefonoPais) vendedorCompletedFields++;
    if (v.telefonoNumero) vendedorCompletedFields++;
    if (v.dniAdjunto && v.dniAdjunto.length > 0) vendedorCompletedFields++;
  });
  
  sections.push({
    sectionId: "datos-vendedor",
    name: translations?.property.sections.sellerData || "Datos del vendedor",
    progress: vendedorProgress,
    requiredFieldsCount: Math.max(6, vendedorRequiredFields), // At least 1 vendedor (6 fields)
    completedRequiredFieldsCount: Math.max(0, vendedorCompletedFields),
    optionalFieldsCount: 0,
    completedOptionalFieldsCount: 0,
  });

  // Add inquilino section if needed
  if (showInquilino) {
    const inquilinoProgress = calculateDatosInquilinoProgress(data);
    const inquilino = data?.inquilino;
    const inquilinoRequiredFields = 18;
    let inquilinoCompletedFields = 0;
    if (inquilino) {
      if (inquilino.nombreCompleto) inquilinoCompletedFields++;
      if (inquilino.email) inquilinoCompletedFields++;
      if (inquilino.telefonoPais) inquilinoCompletedFields++;
      if (inquilino.telefonoNumero) inquilinoCompletedFields++;
      if (inquilino.dniNie && inquilino.dniNie.length > 0) inquilinoCompletedFields++;
      if (inquilino.contratoArrendamiento && inquilino.contratoArrendamiento.length > 0) inquilinoCompletedFields++;
      if (inquilino.fechaFinalizacionContrato) inquilinoCompletedFields++;
      if (inquilino.periodoPreaviso !== undefined) inquilinoCompletedFields++;
      if (inquilino.subrogacionContrato) inquilinoCompletedFields++;
      if (inquilino.importeAlquilerTransferir) inquilinoCompletedFields++;
      if (inquilino.ultimaActualizacionAlquiler) inquilinoCompletedFields++;
      if (inquilino.justificantesPago && inquilino.justificantesPago.length > 0) inquilinoCompletedFields++;
      if (inquilino.fechaUltimoRecibo) inquilinoCompletedFields++;
      if (inquilino.comprobanteTransferenciaVendedor && inquilino.comprobanteTransferenciaVendedor.length > 0) inquilinoCompletedFields++;
      if (inquilino.justificanteDeposito && inquilino.justificanteDeposito.length > 0) inquilinoCompletedFields++;
      if (inquilino.fechaVencimientoSeguroAlquiler) inquilinoCompletedFields++;
      if (inquilino.estadoSeguroAlquiler) inquilinoCompletedFields++;
      if (inquilino.proveedorSeguroAlquiler) inquilinoCompletedFields++;
    }
    
    sections.push({
      sectionId: "datos-inquilino",
      name: translations?.property.sections.tenantData || "Datos del inquilino",
      progress: inquilinoProgress,
      requiredFieldsCount: inquilinoRequiredFields,
      completedRequiredFieldsCount: inquilinoCompletedFields,
      optionalFieldsCount: 0,
      completedOptionalFieldsCount: 0,
    });
  }

  // Add other sections that will be implemented later (all 0% for now)
  const otherSections = [
    { id: "entrada", name: translations?.sidebar.entrance || "Entrada y distribución" },
    { id: "distribucion", name: translations?.sidebar.distribution || "Distribución" },
    { id: "habitaciones", name: translations?.sidebar.rooms || "Habitaciones" },
    { id: "salon", name: translations?.sidebar.livingRoom || "Salón" },
    { id: "banos", name: translations?.sidebar.bathrooms || "Baños" },
    { id: "cocina", name: translations?.sidebar.kitchen || "Cocina" },
    { id: "exterior", name: translations?.sidebar.exterior || "Exterior" },
  ];

  otherSections.forEach((section) => {
    if (!sections.find((s) => s.sectionId === section.id)) {
      sections.push({
        sectionId: section.id,
        name: section.name,
        progress: 0,
        requiredFieldsCount: 0,
        completedRequiredFieldsCount: 0,
        optionalFieldsCount: 0,
        completedOptionalFieldsCount: 0,
      });
    }
  });

  return sections;
}

// Validate if property can be submitted for review
export function validateForSubmission(data?: PropertyData, showInquilino?: boolean): ValidationResult {
  if (!data) {
    return {
      isValid: false,
      missingFields: ["Datos de la propiedad no encontrados"],
    };
  }
  
  const missing: string[] = [];
  
  // Información de la propiedad - required fields
  if (!data.tipoPropiedad) missing.push("Tipo de propiedad");
  if (!data.superficieConstruida) missing.push("Superficie construida");
  if (!data.anoConstruccion) missing.push("Año de construcción");
  if (!data.referenciaCatastral) missing.push("Referencia Catastral");
  if (!data.orientacion || data.orientacion.length === 0) missing.push("Orientación");
  
  // Información económica - required fields
  if (!data.precioVenta) missing.push("Precio de venta");
  if (!data.gastosComunidad) missing.push("Gastos de comunidad mensuales");
  if (!data.confirmacionGastosComunidad) missing.push("Confirmación de gastos de comunidad");
  if (!data.ibiAnual) missing.push("IBI Anual");
  if (!data.confirmacionIBI) missing.push("Confirmación de IBI");
  
  // Estado legal y de comunidad - required fields
  if (data.comunidadPropietariosConstituida === undefined) {
    missing.push("Comunidad de propietarios constituida");
  }
  if (data.edificioSeguroActivo === undefined) {
    missing.push("El edificio tiene seguro activo");
  }
  if (data.comercializaExclusiva === undefined) {
    missing.push("PropHero se comercializa en exclusiva");
  }
  if (data.edificioITEfavorable === undefined) {
    missing.push("El edificio tiene una ITE favorable en vigor");
  }
  if (data.propiedadAlquilada === undefined) {
    missing.push("La propiedad está actualmente alquilada");
  }
  if (data.propiedadAlquilada === true && !data.situacionInquilinos) {
    missing.push("Situación de los inquilinos tras la compra");
  }
  
  // Documentación mínima - required fields
  if (!data.videoGeneral || data.videoGeneral.length === 0) {
    missing.push("Video general de la propiedad");
  }
  
  // Datos del Vendedor - required fields (at least one vendedor with all fields)
  if (!data.vendedores || data.vendedores.length === 0) {
    missing.push("Al menos un vendedor");
  } else {
    data.vendedores.forEach((vendedor, index) => {
      if (!vendedor.nombreCompleto) missing.push(`Vendedor ${index + 1}: Nombre completo`);
      if (!vendedor.dniNifCif) missing.push(`Vendedor ${index + 1}: DNI/NIF/CIF`);
      if (!vendedor.email) missing.push(`Vendedor ${index + 1}: Email`);
      if (!vendedor.telefonoPais) missing.push(`Vendedor ${index + 1}: Teléfono (país)`);
      if (!vendedor.telefonoNumero) missing.push(`Vendedor ${index + 1}: Teléfono (número)`);
      if (!vendedor.dniAdjunto || vendedor.dniAdjunto.length === 0) {
        missing.push(`Vendedor ${index + 1}: Adjunto DNI`);
      }
    });
  }
  
  // Datos del Inquilino - required fields (only if propiedadAlquilada is true)
  if (data.propiedadAlquilada === true && showInquilino) {
    const inquilino = data.inquilino;
    if (!inquilino) {
      missing.push("Datos del inquilino");
    } else {
      if (!inquilino.nombreCompleto) missing.push("Inquilino: Nombre completo");
      if (!inquilino.email) missing.push("Inquilino: Email");
      if (!inquilino.telefonoPais) missing.push("Inquilino: Teléfono (país)");
      if (!inquilino.telefonoNumero) missing.push("Inquilino: Teléfono (número)");
      if (!inquilino.dniNie || inquilino.dniNie.length === 0) missing.push("Inquilino: DNI/NIE");
      if (!inquilino.contratoArrendamiento || inquilino.contratoArrendamiento.length === 0) {
        missing.push("Inquilino: Contrato de arrendamiento");
      }
      if (!inquilino.fechaFinalizacionContrato) missing.push("Inquilino: Fecha de finalización del contrato");
      if (inquilino.periodoPreaviso === undefined) missing.push("Inquilino: Periodo de preaviso");
      if (!inquilino.subrogacionContrato) missing.push("Inquilino: Subrogación del contrato");
      if (!inquilino.importeAlquilerTransferir) missing.push("Inquilino: Importe del alquiler a transferir");
      if (!inquilino.ultimaActualizacionAlquiler) missing.push("Inquilino: Última actualización del alquiler");
      if (!inquilino.justificantesPago || inquilino.justificantesPago.length === 0) {
        missing.push("Inquilino: Justificantes de pago");
      }
      if (!inquilino.fechaUltimoRecibo) missing.push("Inquilino: Fecha del último recibo");
      if (!inquilino.comprobanteTransferenciaVendedor || inquilino.comprobanteTransferenciaVendedor.length === 0) {
        missing.push("Inquilino: Comprobante de transferencia del alquiler (del vendedor)");
      }
      if (!inquilino.justificanteDeposito || inquilino.justificanteDeposito.length === 0) {
        missing.push("Inquilino: Justificante del depósito");
      }
      if (!inquilino.fechaVencimientoSeguroAlquiler) missing.push("Inquilino: Fecha de vencimiento del seguro");
      if (!inquilino.estadoSeguroAlquiler) missing.push("Inquilino: Estado del seguro de alquiler");
      if (!inquilino.proveedorSeguroAlquiler) missing.push("Inquilino: Proveedor del seguro de alquiler");
    }
  }
  
  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

