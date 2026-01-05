// @ts-ignore - jspdf puede no estar instalado en todos los entornos
import jsPDF from 'jspdf';
import { ChecklistData } from '@/lib/checklist-storage';

// Intentar importar canvas para Node.js
let Image: any = null;
try {
  if (typeof window === 'undefined') {
    const canvasModule = require('canvas');
    Image = canvasModule.Image;
  } else {
    Image = window.Image;
  }
} catch (e) {
  if (typeof window !== 'undefined') {
    Image = window.Image;
  }
}

// Colores exactos del diseño HTML
const COLORS = {
  primary: [15, 23, 42], // #0F172A
  accent: [59, 130, 246], // #3B82F6
  backgroundLight: [248, 250, 252], // #F8FAFC
  cardLight: [255, 255, 255], // #FFFFFF
  statusGoodBg: [236, 253, 245], // #ECFDF5
  statusGoodText: [6, 95, 70], // #065F46
  statusGoodBorder: [167, 243, 208], // #A7F3D0
  slate50: [248, 250, 252],
  slate100: [241, 245, 249],
  slate200: [226, 232, 240],
  slate300: [203, 213, 225],
  slate400: [148, 163, 184],
  slate500: [100, 116, 139],
  slate600: [71, 85, 105],
  slate700: [51, 65, 85],
  slate800: [30, 41, 59],
  slate900: [15, 23, 42],
  white: [255, 255, 255],
  black: [0, 0, 0],
};

/**
 * Helper para obtener el label traducido de un elemento
 */
function getTranslatedLabel(
  translations: any,
  sectionId: string,
  category: string,
  itemId: string
): string {
  const section = translations.checklist?.sections?.[sectionId];
  if (!section) return itemId;

  const categoryMap: Record<string, string> = {
    carpinteria: 'carpinteria',
    climatizacion: 'climatizacion',
    almacenamiento: 'almacenamiento',
    electrodomesticos: 'electrodomesticos',
    seguridad: 'seguridad',
    sistemas: 'sistemas',
  };

  const categoryPath = categoryMap[category];
  if (categoryPath && section[categoryPath]?.items?.[itemId]) {
    return section[categoryPath].items[itemId];
  }

  if (section[category]?.items?.[itemId]) {
    return section[category].items[itemId];
  }

  // Si no hay traducción, capitalizar y formatear el ID
  const words = itemId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ');
}

/**
 * Helper para obtener el label de una pregunta
 */
function getQuestionLabel(
  translations: any,
  sectionId: string,
  questionId: string
): string {
  const section = translations.checklist?.sections?.[sectionId];
  if (!section) return questionId;

  const questionPaths = [
    section[questionId]?.title,
    section.questions?.[questionId],
    section[questionId],
  ];

  for (const path of questionPaths) {
    if (path) return path;
  }

  if (questionId.includes('acabados') && section.acabados?.title) {
    return section.acabados.title;
  }
  if (questionId.includes('electricidad') && section.electricidad?.title) {
    return section.electricidad.title;
  }

  return questionId;
}

/**
 * Helper para obtener el label de un upload zone (sin prefijos)
 */
function getUploadZoneLabel(
  translations: any,
  sectionId: string,
  zoneId: string
): string {
  // Remover prefijos como "0=", "fotos-", etc.
  let cleanId = zoneId.replace(/^[0-9]+=/, '').replace(/^fotos-/, '').replace(/^video-/, '');
  
  const section = translations.checklist?.sections?.[sectionId];
  if (section?.uploadZones?.[zoneId]) {
    return section.uploadZones[zoneId];
  }

  // Capitalizar primera letra y convertir guiones a espacios
  const words = cleanId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ');
}

/**
 * Helper para obtener el label de estado traducido
 */
function getStatusLabel(status: string | undefined, translations: any): string {
  if (!status) return 'Buen Estado';
  
  const statusMap: Record<string, string> = {
    buen_estado: 'Buen Estado',
    necesita_reparacion: 'Necesita Reparación',
    necesita_reemplazo: 'Necesita Reemplazo',
    no_aplica: 'No Aplica',
  };

  return statusMap[status] || 'Buen Estado';
}

/**
 * Helper para agregar imagen desde URL
 */
async function addImageFromUrl(
  doc: jsPDF,
  yPositionRef: { current: number },
  checkPageBreak: (height: number) => void,
  url: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    x?: number;
    y?: number;
  } = {}
): Promise<number> {
  const { maxWidth = 80, maxHeight = 60, x, y } = options;
  
  try {
    let imageData: string;
    let imgWidth: number;
    let imgHeight: number;

    if (url.startsWith('data:')) {
      imageData = url;
      if (Image) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });
        imgWidth = img.width;
        imgHeight = img.height;
      } else {
        imgWidth = maxWidth;
        imgHeight = maxHeight;
      }
    } else if (url.startsWith('http')) {
      const response = await fetch(url);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');
        const mimeType = response.headers.get('content-type') || 'image/jpeg';
        imageData = `data:${mimeType};base64,${base64}`;
        
        if (Image) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageData;
          });
          imgWidth = img.width;
          imgHeight = img.height;
        } else {
          imgWidth = maxWidth;
          imgHeight = maxHeight;
        }
      } else {
        return yPositionRef.current;
      }
    } else {
      return yPositionRef.current;
    }

    const aspectRatio = imgWidth / imgHeight;
    let finalWidth = maxWidth;
    let finalHeight = maxHeight;
    
    if (aspectRatio > 1) {
      finalHeight = maxHeight;
      finalWidth = maxHeight * aspectRatio;
      if (finalWidth > maxWidth) {
        finalWidth = maxWidth;
        finalHeight = maxWidth / aspectRatio;
      }
    } else {
      finalWidth = maxWidth;
      finalHeight = maxWidth / aspectRatio;
      if (finalHeight > maxHeight) {
        finalHeight = maxHeight;
        finalWidth = maxHeight * aspectRatio;
      }
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const currentX = x !== undefined ? x : margin + 5;
    const currentY = y !== undefined ? y : yPositionRef.current;

    checkPageBreak(finalHeight + 2);
    doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(currentX, currentY, finalWidth, finalHeight, 2, 2, 'D');
    doc.addImage(imageData, 'JPEG', currentX, currentY, finalWidth, finalHeight);
    return currentY + finalHeight + 2;
  } catch (error) {
    console.error('Error adding image:', error);
    return yPositionRef.current;
  }
}

/**
 * Genera un PDF del checklist completo con diseño exacto del HTML proporcionado
 */
export async function generateChecklistPDF(
  checklist: ChecklistData,
  propertyInfo: {
    address: string;
    propertyId: string;
    renovatorName?: string;
  },
  translations: any
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPosition = 0;

  // Función para verificar salto de página
  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - 20) {
      doc.addPage();
      yPosition = 0;
    }
  };

  // ========== HEADER AZUL OSCURO ==========
  const headerHeight = 35;
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, headerHeight, 'F');
  
  // Título principal "Informe de Propiedad"
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Informe de Propiedad', margin, 18);
  
  // Subtítulo "CHECKLIST DE INSPECCIÓN"
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
  doc.text('CHECKLIST DE INSPECCIÓN', margin, 25);
  
  // Badge "Revisión Finalizada" a la derecha
  const badgeText = 'Revisión Finalizada';
  const badgeTextWidth = doc.getTextWidth(badgeText);
  const badgePadding = 4;
  const badgeWidth = badgeTextWidth + badgePadding * 2 + 6; // +6 para el icono
  const badgeHeight = 8;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = 12;
  
  doc.setFillColor(COLORS.slate800[0], COLORS.slate800[1], COLORS.slate800[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  // Usar círculo azul en lugar de checkmark
  doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
  doc.circle(badgeX + 3, badgeY + 4, 1.5, 'F');
  doc.setTextColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
  doc.setFont('helvetica', 'normal');
  doc.text(badgeText, badgeX + 6, badgeY + 5.5);

  yPosition = headerHeight + 15;

  // ========== SECCIÓN INFORMACIÓN GENERAL ==========
  checkPageBreak(35);
  
  // Card blanca con borde
  const infoCardHeight = 30;
  doc.setFillColor(COLORS.cardLight[0], COLORS.cardLight[1], COLORS.cardLight[2]);
  doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPosition, contentWidth, infoCardHeight, 3, 3, 'FD');
  
  const infoCardY = yPosition;
  yPosition += 5;
  
  // Icono "i" y título "INFORMACIÓN GENERAL"
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
  doc.text('i', margin + 2, yPosition);
  doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
  doc.setFontSize(11);
  doc.text('INFORMACIÓN GENERAL', margin + 6, yPosition);
  
  // Línea separadora
  yPosition += 4;
  doc.setDrawColor(COLORS.slate100[0], COLORS.slate100[1], COLORS.slate100[2]);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, yPosition, margin + contentWidth - 2, yPosition);
  yPosition += 5;
  
  // Grid de información (2 columnas)
  const gridCol1X = margin + 2;
  const gridCol2X = margin + contentWidth / 2;
  
  // Dirección
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
  doc.text('DIRECCIÓN', gridCol1X, yPosition);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate800[0], COLORS.slate800[1], COLORS.slate800[2]);
  doc.text(propertyInfo.address, gridCol1X, yPosition + 4);
  
  // ID Propiedad
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
  doc.text('ID PROPIEDAD', gridCol2X, yPosition);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate600[0], COLORS.slate600[1], COLORS.slate600[2]);
  doc.setFillColor(COLORS.slate100[0], COLORS.slate100[1], COLORS.slate100[2]);
  const idWidth = doc.getTextWidth(propertyInfo.propertyId) + 4;
  doc.roundedRect(gridCol2X, yPosition + 1, idWidth, 4, 1, 1, 'F');
  doc.text(propertyInfo.propertyId, gridCol2X + 2, yPosition + 4);
  
  // Fecha de Inspección (ocupa 2 columnas)
  yPosition += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
  doc.text('FECHA DE INSPECCIÓN', gridCol1X, yPosition);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate700[0], COLORS.slate700[1], COLORS.slate700[2]);
  const completedDate = checklist.completedAt
    ? new Date(checklist.completedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
  doc.text(completedDate, gridCol1X, yPosition + 4);

  yPosition = infoCardY + infoCardHeight + 15;

  // ========== SECCIONES PRINCIPALES ==========
  const sectionOrder = [
    'entorno-zonas-comunes',
    'estado-general',
    'entrada-pasillos',
    'habitaciones',
    'salon',
    'banos',
    'cocina',
    'exteriores',
  ];

  // Mapeo de títulos de sección (usar IDs como en el HTML)
  const sectionTitleMap: Record<string, string> = {
    'entorno-zonas-comunes': 'Entorno y Zonas Comunes',
    'estado-general': 'Estado General',
    'entrada-pasillos': 'Entrada y Pasillos',
    'habitaciones': 'Habitaciones',
    'salon': 'Salón',
    'banos': 'Baños',
    'cocina': 'Cocina',
    'exteriores': 'Exteriores de la Vivienda',
  };

  for (const sectionId of sectionOrder) {
    const section = checklist.sections[sectionId];
    if (!section) continue;

    checkPageBreak(20);
    yPosition += 5;
    
    // Título de sección (usar el ID o título mapeado)
    const sectionTitle = sectionTitleMap[sectionId] || sectionId;
    
    // Fondo azul claro para icono (cuadrado pequeño) - sin emoji, solo fondo
    const iconSize = 8;
    doc.setFillColor(COLORS.accent[0] * 0.1, COLORS.accent[1] * 0.1, COLORS.accent[2] * 0.1);
    doc.roundedRect(margin, yPosition - 2, iconSize, iconSize, 2, 2, 'F');
    
    // Título grande (text-2xl en HTML = 24px ≈ 20pt para PDF)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
    doc.text(sectionTitle, margin + 12, yPosition + 5);
    
    yPosition += 15;

    // Upload Zones - Cards individuales
    if (section.uploadZones && section.uploadZones.length > 0) {
      for (const uploadZone of section.uploadZones) {
        checkPageBreak(50);
        
        // Card blanca con borde
        const cardPadding = 6;
        let cardHeight = 35;
        doc.setFillColor(COLORS.cardLight[0], COLORS.cardLight[1], COLORS.cardLight[2]);
        doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPosition, contentWidth, cardHeight, 3, 3, 'FD');
        
        const cardY = yPosition;
        yPosition += cardPadding;
        
        // Título del upload zone (ej: "Portal") - text-xl en HTML = 20px ≈ 16pt
        const zoneLabel = getUploadZoneLabel(translations, sectionId, uploadZone.id);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
        doc.text(zoneLabel, margin + cardPadding, yPosition);
        
        // Badge de estado "BUEN ESTADO" a la derecha
        const statusText = 'Buen Estado';
        const statusBadgeWidth = doc.getTextWidth(statusText) + 10;
        const statusBadgeX = pageWidth - margin - statusBadgeWidth - cardPadding;
        
        doc.setFillColor(COLORS.statusGoodBg[0], COLORS.statusGoodBg[1], COLORS.statusGoodBg[2]);
        doc.setDrawColor(COLORS.statusGoodBorder[0], COLORS.statusGoodBorder[1], COLORS.statusGoodBorder[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(statusBadgeX, cardY + 3, statusBadgeWidth, 6, 3, 3, 'FD');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
        // Usar círculo verde en lugar de checkmark
        doc.setFillColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
        doc.circle(statusBadgeX + 2, cardY + cardPadding + 3, 1, 'F');
        doc.text(statusText.toUpperCase(), statusBadgeX + 4.5, cardY + cardPadding + 4.5);
        
        yPosition += 8;
        
        // Imágenes en grid de 2 columnas (gap-6 en HTML = 24px ≈ 6mm)
        if (uploadZone.photos && uploadZone.photos.length > 0) {
          const gap = 6; // gap-6 en HTML
          const imageWidth = (contentWidth - cardPadding * 2 - gap) / 2;
          const imageHeight = 30; // Aumentado para mejor visualización
          let photoIndex = 0;
          let maxRowY = yPosition;
          
          for (let row = 0; row < Math.ceil(uploadZone.photos.length / 2); row++) {
            checkPageBreak(imageHeight + gap);
            const rowStartY = yPosition;
            
            for (let col = 0; col < 2 && photoIndex < uploadZone.photos.length; col++) {
              const photo = uploadZone.photos[photoIndex];
              if (photo.data) {
                const xPos = margin + cardPadding + col * (imageWidth + gap);
                const newY = await addImageFromUrl(doc, { current: yPosition }, checkPageBreak, photo.data, {
                  maxWidth: imageWidth,
                  maxHeight: imageHeight,
                  x: xPos,
                  y: rowStartY,
                });
                maxRowY = Math.max(maxRowY, newY);
              }
              photoIndex++;
            }
            
            yPosition = maxRowY + gap;
          }
          
          cardHeight = yPosition - cardY + cardPadding;
        } else {
          // Placeholder "Sin imágenes adjuntas"
          checkPageBreak(8);
          doc.setFillColor(COLORS.slate50[0], COLORS.slate50[1], COLORS.slate50[2]);
          doc.setDrawColor(COLORS.slate100[0], COLORS.slate100[1], COLORS.slate100[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin + cardPadding, yPosition, contentWidth - cardPadding * 2, 8, 2, 2, 'FD');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
          // Icono simple (círculo) en lugar de emoji que no se renderiza bien
          doc.setFillColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
          doc.circle(margin + cardPadding + 2, yPosition + 4, 1, 'F');
          doc.text('Sin imágenes adjuntas', margin + cardPadding + 6, yPosition + 5);
          // NO agregar guiones antes del texto
          yPosition += 10;
        }
        
        yPosition = cardY + cardHeight + 8;
      }
    }

    // Items con cantidad (Carpintería, Climatización, etc.)
    const itemCategories = [
      { key: 'carpentryItems', label: 'Carpintería' },
      { key: 'climatizationItems', label: 'Climatización' },
      { key: 'storageItems', label: 'Almacenamiento' },
      { key: 'appliancesItems', label: 'Electrodomésticos' },
      { key: 'securityItems', label: 'Seguridad' },
      { key: 'systemsItems', label: 'Sistemas' },
    ];

    for (const category of itemCategories) {
      const items = (section as any)[category.key];
      if (!items || items.length === 0) continue;

      checkPageBreak(15);
      yPosition += 5;
      
      // Título de categoría con fondo azul claro (sin emoji)
      const iconSize = 8;
      doc.setFillColor(COLORS.accent[0] * 0.1, COLORS.accent[1] * 0.1, COLORS.accent[2] * 0.1);
      doc.roundedRect(margin, yPosition - 2, iconSize, iconSize, 2, 2, 'F');
      
      // Título de categoría (text-xl en HTML = 20px ≈ 18pt para mejor legibilidad)
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
      doc.text(category.label, margin + 12, yPosition + 5);
      yPosition += 12;

      // Cards individuales para cada item
      for (const item of items) {
        if (!item.cantidad || item.cantidad === 0) continue;
        
        checkPageBreak(40);
        
        // Card blanca
        const cardPadding = 6;
        let itemCardHeight = 30;
        doc.setFillColor(COLORS.cardLight[0], COLORS.cardLight[1], COLORS.cardLight[2]);
        doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPosition, contentWidth, itemCardHeight, 3, 3, 'FD');
        
        const itemCardY = yPosition;
        yPosition += cardPadding;
        
        // Título del item y badge de cantidad en la misma línea (como en el HTML)
        const itemLabel = getTranslatedLabel(translations, sectionId, category.key.replace('Items', ''), item.id);
        doc.setFontSize(14); // text-lg en HTML = 18px ≈ 14pt
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
        const itemLabelX = margin + cardPadding;
        const itemLabelWidth = doc.getTextWidth(itemLabel);
        doc.text(itemLabel, itemLabelX, yPosition);
        
        // Badge de cantidad inmediatamente después del título (text-xs px-2 py-0.5 en HTML)
        // Espacio mínimo entre título y badge
        doc.setFillColor(COLORS.slate100[0], COLORS.slate100[1], COLORS.slate100[2]);
        const cantidadText = `${item.cantidad} ud.`;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(COLORS.slate500[0], COLORS.slate500[1], COLORS.slate500[2]);
        const cantidadTextWidth = doc.getTextWidth(cantidadText);
        const cantidadBadgeWidth = cantidadTextWidth + 4;
        const cantidadBadgeX = itemLabelX + itemLabelWidth + 2; // Menos espacio para que esté más cerca
        doc.roundedRect(cantidadBadgeX, yPosition - 3, cantidadBadgeWidth, 5, 2, 2, 'F');
        doc.text(cantidadText, cantidadBadgeX + 2, yPosition - 0.5);
        
        // Badge de estado a la derecha (en la misma línea que el título)
        const status = item.estado || (item.units && item.units[0]?.estado) || 'buen_estado';
        const statusLabel = getStatusLabel(status, translations);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        const statusTextWidth = doc.getTextWidth(statusLabel.toUpperCase());
        const statusBadgeWidth = statusTextWidth + 10;
        const statusBadgeX = pageWidth - margin - statusBadgeWidth - cardPadding;
        
        doc.setFillColor(COLORS.statusGoodBg[0], COLORS.statusGoodBg[1], COLORS.statusGoodBg[2]);
        doc.setDrawColor(COLORS.statusGoodBorder[0], COLORS.statusGoodBorder[1], COLORS.statusGoodBorder[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(statusBadgeX, itemCardY + cardPadding, statusBadgeWidth, 6, 3, 3, 'FD');
        
        doc.setTextColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
        // Usar círculo verde en lugar de checkmark que puede no renderizarse bien
        doc.setFillColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
        doc.circle(statusBadgeX + 2, itemCardY + cardPadding + 3, 1, 'F');
        doc.text(statusLabel.toUpperCase(), statusBadgeX + 4.5, itemCardY + cardPadding + 4.5);
        
        yPosition += 8;
        
        // Imágenes o placeholder en grid de 2 columnas
        const photos = item.photos || (item.units && item.units[0]?.photos) || [];
        if (photos.length > 0) {
          const gap = 6; // gap-6 en HTML
          const imageWidth = (contentWidth - cardPadding * 2 - gap) / 2;
          const imageHeight = 25; // Aumentado para mejor visualización
          let photoIndex = 0;
          let maxRowY = yPosition;
          
          for (let row = 0; row < Math.ceil(photos.length / 2); row++) {
            checkPageBreak(imageHeight + gap);
            const rowStartY = yPosition;
            
            for (let col = 0; col < 2 && photoIndex < photos.length; col++) {
              const photo = photos[photoIndex];
              if (photo.data) {
                const xPos = margin + cardPadding + col * (imageWidth + gap);
                const newY = await addImageFromUrl(doc, { current: yPosition }, checkPageBreak, photo.data, {
                  maxWidth: imageWidth,
                  maxHeight: imageHeight,
                  x: xPos,
                  y: rowStartY,
                });
                maxRowY = Math.max(maxRowY, newY);
              }
              photoIndex++;
            }
            
            yPosition = maxRowY + gap;
          }
          
          itemCardHeight = yPosition - itemCardY + cardPadding;
        } else {
          // Placeholder
          checkPageBreak(8);
          doc.setFillColor(COLORS.slate50[0], COLORS.slate50[1], COLORS.slate50[2]);
          doc.setDrawColor(COLORS.slate100[0], COLORS.slate100[1], COLORS.slate100[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin + cardPadding, yPosition, contentWidth - cardPadding * 2, 8, 2, 2, 'FD');
          
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
          // Icono simple (círculo) en lugar de emoji que no se renderiza bien
          doc.setFillColor(COLORS.slate400[0], COLORS.slate400[1], COLORS.slate400[2]);
          doc.circle(margin + cardPadding + 2, yPosition + 4, 1, 'F');
          doc.text('Sin imágenes adjuntas', margin + cardPadding + 6, yPosition + 5);
          // NO agregar guiones antes del texto
          yPosition += 10;
        }
        
        yPosition = itemCardY + itemCardHeight + 8;
      }
    }

    // Questions
    if (section.questions && section.questions.length > 0) {
      const questionsToShow = section.questions.filter(q => q.status || q.notes || (q.photos && q.photos.length > 0));
      
      if (questionsToShow.length > 0) {
        for (const question of questionsToShow) {
          checkPageBreak(30);
          
          const questionLabel = getQuestionLabel(translations, sectionId, question.id);
          
          // Card blanca
          const cardPadding = 6;
          const questionCardHeight = 25;
          doc.setFillColor(COLORS.cardLight[0], COLORS.cardLight[1], COLORS.cardLight[2]);
          doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(margin, yPosition, contentWidth, questionCardHeight, 3, 3, 'FD');
          
          const questionCardY = yPosition;
          yPosition += cardPadding;
          
          // Título (capitalizar si es necesario)
          let formattedQuestionLabel = questionLabel;
          if (questionLabel.includes('-')) {
            const words = questionLabel.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
            formattedQuestionLabel = words.join(' ');
          } else if (questionLabel === questionLabel.toLowerCase()) {
            formattedQuestionLabel = questionLabel.charAt(0).toUpperCase() + questionLabel.slice(1);
          }
          
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
          doc.text(formattedQuestionLabel, margin + cardPadding, yPosition);
          
          // Badge de estado a la derecha
          const statusLabel = getStatusLabel(question.status, translations);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          const statusTextWidth = doc.getTextWidth(statusLabel.toUpperCase());
          const statusBadgeWidth = statusTextWidth + 10;
          const statusBadgeX = pageWidth - margin - statusBadgeWidth - cardPadding;
          
          doc.setFillColor(COLORS.statusGoodBg[0], COLORS.statusGoodBg[1], COLORS.statusGoodBg[2]);
          doc.setDrawColor(COLORS.statusGoodBorder[0], COLORS.statusGoodBorder[1], COLORS.statusGoodBorder[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(statusBadgeX, questionCardY + cardPadding, statusBadgeWidth, 6, 3, 3, 'FD');
          
          doc.setTextColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
          // Usar círculo verde en lugar de checkmark
          doc.setFillColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
          doc.circle(statusBadgeX + 2, questionCardY + cardPadding + 3, 1, 'F');
          doc.text(statusLabel.toUpperCase(), statusBadgeX + 4.5, questionCardY + cardPadding + 4.5);
          
          yPosition = questionCardY + questionCardHeight + 8;
        }
      }
    }

    // Dynamic Items (Habitaciones, Baños)
    if (section.dynamicItems && section.dynamicItems.length > 0) {
      for (const dynamicItem of section.dynamicItems) {
        checkPageBreak(50);
        yPosition += 5;
        
        const itemNumber = dynamicItem.id.match(/\d+/)?.[0] || '';
        const itemLabel = sectionId === 'habitaciones'
          ? `${translations.checklist?.sections?.habitaciones?.bedroom || 'Habitación'} ${itemNumber}`
          : sectionId === 'banos'
          ? `${translations.checklist?.sections?.banos?.bathroom || 'Baño'} ${itemNumber}`
          : dynamicItem.id;
        
        // Card para dynamic item
        const cardPadding = 6;
        let dynamicCardHeight = 35;
        doc.setFillColor(COLORS.cardLight[0], COLORS.cardLight[1], COLORS.cardLight[2]);
        doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, yPosition, contentWidth, dynamicCardHeight, 3, 3, 'FD');
        
        const dynamicCardY = yPosition;
        yPosition += cardPadding;
        
        // Título
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.slate900[0], COLORS.slate900[1], COLORS.slate900[2]);
        doc.text(itemLabel, margin + cardPadding, yPosition);
        
        // Dynamic items no tienen cantidad, se identifican por su número en el título
        
        // Badge de estado
        const statusBadgeWidth = doc.getTextWidth('Buen Estado') + 10;
        const statusBadgeX = pageWidth - margin - statusBadgeWidth - cardPadding;
        doc.setFillColor(COLORS.statusGoodBg[0], COLORS.statusGoodBg[1], COLORS.statusGoodBg[2]);
        doc.setDrawColor(COLORS.statusGoodBorder[0], COLORS.statusGoodBorder[1], COLORS.statusGoodBorder[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(statusBadgeX, dynamicCardY + 3, statusBadgeWidth, 6, 3, 3, 'FD');
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
        // Usar círculo verde en lugar de checkmark
        doc.setFillColor(COLORS.statusGoodText[0], COLORS.statusGoodText[1], COLORS.statusGoodText[2]);
        doc.circle(statusBadgeX + 2, dynamicCardY + cardPadding + 3, 1, 'F');
        doc.text('BUEN ESTADO', statusBadgeX + 4.5, dynamicCardY + cardPadding + 4.5);
        
        yPosition += 8;
        
        // Imágenes del upload zone
        if (dynamicItem.uploadZone?.photos && dynamicItem.uploadZone.photos.length > 0) {
          const imageWidth = (contentWidth - cardPadding * 3) / 2;
          const imageHeight = 20;
          let photoIndex = 0;
          let maxRowY = yPosition;
          
          for (let row = 0; row < Math.ceil(dynamicItem.uploadZone.photos.length / 2); row++) {
            checkPageBreak(imageHeight + 5);
            const rowStartY = yPosition;
            
            for (let col = 0; col < 2 && photoIndex < dynamicItem.uploadZone.photos.length; col++) {
              const photo = dynamicItem.uploadZone.photos[photoIndex];
              if (photo.data) {
                const xPos = margin + cardPadding + col * (imageWidth + cardPadding);
                const newY = await addImageFromUrl(doc, { current: yPosition }, checkPageBreak, photo.data, {
                  maxWidth: imageWidth,
                  maxHeight: imageHeight,
                  x: xPos,
                  y: rowStartY,
                });
                maxRowY = Math.max(maxRowY, newY);
              }
              photoIndex++;
            }
            
            yPosition = maxRowY + 5;
          }
          
          dynamicCardHeight = yPosition - dynamicCardY + cardPadding;
        }
        
        yPosition = dynamicCardY + dynamicCardHeight + 8;
      }
    }
  }

  // ========== FOOTER ==========
  const footerY = pageHeight - 15;
  doc.setDrawColor(COLORS.slate200[0], COLORS.slate200[1], COLORS.slate200[2]);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.slate500[0], COLORS.slate500[1], COLORS.slate500[2]);
  doc.text('© 2025 PropHero. Todos los derechos reservados.', pageWidth / 2, footerY, { align: 'center' });

  return doc.output('blob');
}
