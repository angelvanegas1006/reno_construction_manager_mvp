import { ChecklistData } from '@/lib/checklist-storage';

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
  if (!section) {
    // Si no hay traducción, capitalizar y formatear el ID
    const words = itemId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return words.join(' ');
  }

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
  if (!section) {
    const words = questionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
    return words.join(' ');
  }

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

  const words = questionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(' ');
}

/**
 * Helper para obtener el label de un upload zone
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
 * Helper para obtener las clases CSS del badge según el estado
 */
function getStatusBadgeClasses(status: string | undefined): string {
  if (!status) {
    return 'bg-status-good-bg text-status-good-text ring-status-good-border';
  }
  
  const statusClasses: Record<string, string> = {
    buen_estado: 'bg-status-good-bg text-status-good-text ring-status-good-border',
    necesita_reparacion: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
    necesita_reemplazo: 'bg-red-50 text-red-800 ring-red-200',
    no_aplica: 'bg-gray-50 text-gray-800 ring-gray-200',
  };

  return statusClasses[status] || statusClasses.buen_estado;
}

/**
 * Helper para escapar HTML
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Genera HTML estático del checklist completo con diseño exacto del HTML proporcionado
 */
export async function generateChecklistHTML(
  checklist: ChecklistData,
  propertyInfo: {
    address: string;
    propertyId: string;
    renovatorName?: string;
  },
  translations: any
): Promise<string> {
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

  // Mapeo de títulos de sección
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

  // Mapeo de iconos Material Symbols
  const sectionIcons: Record<string, string> = {
    'entorno-zonas-comunes': 'apartment',
    'estado-general': 'info',
    'entrada-pasillos': 'door_front',
    'habitaciones': 'bed',
    'salon': 'living',
    'banos': 'bathtub',
    'cocina': 'kitchen',
    'exteriores': 'home',
  };

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

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<title>Informe de Propiedad - Checklist Detallado</title>
<link href="https://fonts.googleapis.com" rel="preconnect"/>
<link crossorigin="" href="https://fonts.gstatic.com" rel="preconnect"/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,typography"></script>
<script>
tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#0F172A",
                accent: "#3B82F6",
                "background-light": "#F8FAFC",
                "background-dark": "#0B1120", 
                "card-light": "#FFFFFF",
                "card-dark": "#1E293B",
                "status-good-bg": "#ECFDF5",
                "status-good-text": "#065F46",
                "status-good-border": "#A7F3D0",
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Inter', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: "0.5rem",
            },
        },
    },
};
</script>
</head>
<body class="bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-sans transition-colors duration-200 antialiased">
<header class="bg-primary w-full py-10 px-6 border-b border-slate-800 shadow-xl relative overflow-hidden">
<div class="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800 opacity-90"></div>
<div class="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
<div>
<h1 class="text-3xl font-bold text-white tracking-tight">Informe de Propiedad</h1>
<p class="text-slate-400 text-sm mt-1 uppercase tracking-widest font-medium">Checklist de Inspección</p>
</div>
<div class="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 backdrop-blur-sm">
<span class="material-symbols-outlined text-accent">verified</span>
<span class="text-white font-medium">Revisión Finalizada</span>
</div>
</div>
</header>
<main class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
<section class="bg-card-light dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
<div class="flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
<span class="material-symbols-outlined text-slate-400">info</span>
<h2 class="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Información General</h2>
</div>
<div class="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
<div class="flex flex-col gap-1">
<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dirección</span>
<span class="text-lg font-medium text-slate-800 dark:text-slate-200">${escapeHtml(propertyInfo.address)}</span>
</div>
<div class="flex flex-col gap-1">
<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">ID Propiedad</span>
<span class="font-mono text-base text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded w-fit">${escapeHtml(propertyInfo.propertyId)}</span>
</div>
<div class="flex flex-col gap-1 md:col-span-2">
<span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fecha de Inspección</span>
<span class="text-base text-slate-700 dark:text-slate-300">${escapeHtml(completedDate)}</span>
</div>
</div>
</section>`;

  // Generar secciones
  for (const sectionId of sectionOrder) {
    const section = checklist.sections[sectionId];
    if (!section) continue;

    const sectionTitle = sectionTitleMap[sectionId] || sectionId;
    const icon = sectionIcons[sectionId] || 'info';

    html += `
<section>
<div class="flex items-center gap-3 mb-6">
<div class="p-2 bg-accent/10 rounded-lg">
<span class="material-symbols-outlined text-accent">${icon}</span>
</div>
<h3 class="text-2xl font-bold text-slate-900 dark:text-white">${escapeHtml(sectionTitle)}</h3>
</div>
<div class="space-y-6">`;

    // Upload Zones
    if (section.uploadZones && section.uploadZones.length > 0) {
      for (const uploadZone of section.uploadZones) {
        const zoneLabel = getUploadZoneLabel(translations, sectionId, uploadZone.id);
        // Upload zones no tienen status, siempre se muestran como "Buen Estado"
        const zoneStatus: ChecklistStatus = 'buen_estado';
        const zoneStatusLabel = getStatusLabel(zoneStatus, translations);
        const zoneStatusClasses = getStatusBadgeClasses(zoneStatus);
        html += `
<div class="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
<div class="flex items-center gap-3">
<span class="material-symbols-outlined text-slate-400">door_front</span>
<h4 class="text-xl font-semibold text-slate-900 dark:text-white">${escapeHtml(zoneLabel)}</h4>
</div>
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${zoneStatusClasses}">
<span class="material-symbols-outlined text-sm">check_circle</span>
${escapeHtml(zoneStatusLabel)}
</span>
</div>`;

        if (uploadZone.photos && uploadZone.photos.length > 0) {
          html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
          for (const photo of uploadZone.photos.slice(0, 2)) {
            if (photo.data) {
              html += `<div class="relative group overflow-hidden rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 aspect-[4/3]">
<img alt="${escapeHtml(zoneLabel)}" class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" src="${escapeHtml(photo.data)}"/>
</div>`;
            }
          }
          html += `</div>`;
        } else {
          html += `<div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
<span class="material-symbols-outlined text-lg">image_not_supported</span>
<span>Sin imágenes adjuntas</span>
</div>`;
        }

        html += `</div>`;
      }
    }

    // Items con cantidad (Carpintería, Climatización, etc.)
    const itemCategories = [
      { key: 'carpentryItems', label: 'Carpintería', icon: 'door_sliding' },
      { key: 'climatizationItems', label: 'Climatización', icon: 'ac_unit' },
      { key: 'storageItems', label: 'Almacenamiento', icon: 'inventory_2' },
      { key: 'appliancesItems', label: 'Electrodomésticos', icon: 'kitchen' },
      { key: 'securityItems', label: 'Seguridad', icon: 'lock' },
      { key: 'systemsItems', label: 'Sistemas', icon: 'settings' },
    ];

    for (const category of itemCategories) {
      const items = (section as any)[category.key];
      if (!items || items.length === 0) continue;

      html += `
<div class="flex items-center gap-3 mb-6">
<div class="p-2 bg-accent/10 rounded-lg">
<span class="material-symbols-outlined text-accent">${category.icon}</span>
</div>
<h3 class="text-xl font-bold text-slate-900 dark:text-white">${escapeHtml(category.label)}</h3>
</div>
<div class="grid grid-cols-1 gap-6">`;

      for (const item of items) {
        if (!item.cantidad || item.cantidad === 0) continue;

        const itemLabel = getTranslatedLabel(translations, sectionId, category.key.replace('Items', ''), item.id);
        const status = item.estado || (item.units && item.units[0]?.estado) || 'buen_estado';
        const statusLabel = getStatusLabel(status, translations);
        const statusClasses = getStatusBadgeClasses(status);

        html += `
<div class="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
<div class="flex items-center gap-3">
<h4 class="text-lg font-semibold text-slate-900 dark:text-white">${escapeHtml(itemLabel)}</h4>
<span class="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">${item.cantidad} ud.</span>
</div>
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${statusClasses}">
<span class="material-symbols-outlined text-sm">check_circle</span>
${escapeHtml(statusLabel)}
</span>
</div>`;

        const photos = item.photos || (item.units && item.units[0]?.photos) || [];
        if (photos.length > 0) {
          html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
          for (const photo of photos.slice(0, 2)) {
            if (photo.data) {
              html += `<div class="relative group overflow-hidden rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 aspect-[3/4] md:aspect-video">
<img alt="${escapeHtml(itemLabel)}" class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" src="${escapeHtml(photo.data)}"/>
</div>`;
            }
          }
          html += `</div>`;
        } else {
          html += `<div class="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700/50 flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-sm">
<span class="material-symbols-outlined text-lg">image_not_supported</span>
<span>Sin imágenes adjuntas</span>
</div>`;
        }

        html += `</div>`;
      }

      html += `</div>`;
    }

    // Questions
    if (section.questions && section.questions.length > 0) {
      const questionsToShow = section.questions.filter(q => q.status || q.notes || (q.photos && q.photos.length > 0));
      
      if (questionsToShow.length > 0) {
        for (const question of questionsToShow) {
          const questionLabel = getQuestionLabel(translations, sectionId, question.id);
          const statusLabel = getStatusLabel(question.status, translations);
          const statusClasses = getStatusBadgeClasses(question.status);

          html += `
<div class="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
<div class="flex items-center gap-3">
<h4 class="text-lg font-semibold text-slate-900 dark:text-white">${escapeHtml(questionLabel)}</h4>
</div>
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ring-1 ring-inset ${statusClasses}">
<span class="material-symbols-outlined text-sm">check_circle</span>
${escapeHtml(statusLabel)}
</span>
</div>
</div>`;
        }
      }
    }

    // Dynamic Items (Habitaciones, Baños)
    if (section.dynamicItems && section.dynamicItems.length > 0) {
      for (const dynamicItem of section.dynamicItems) {
        const itemNumber = dynamicItem.id.match(/\d+/)?.[0] || '';
        const itemLabel = sectionId === 'habitaciones'
          ? `${translations.checklist?.sections?.habitaciones?.bedroom || 'Habitación'} ${itemNumber}`
          : sectionId === 'banos'
          ? `${translations.checklist?.sections?.banos?.bathroom || 'Baño'} ${itemNumber}`
          : dynamicItem.id;

        html += `
<div class="bg-card-light dark:bg-card-dark border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
<div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
<div class="flex items-center gap-3">
<h4 class="text-xl font-semibold text-slate-900 dark:text-white">${escapeHtml(itemLabel)}</h4>`;

        if (dynamicItem.cantidad) {
          html += `<span class="bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">${dynamicItem.cantidad} ud.</span>`;
        }

        html += `</div>
<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-status-good-bg text-status-good-text ring-1 ring-inset ring-status-good-border">
<span class="material-symbols-outlined text-sm">check_circle</span>
Buen Estado
</span>
</div>`;

        if (dynamicItem.uploadZone?.photos && dynamicItem.uploadZone.photos.length > 0) {
          html += `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
          for (const photo of dynamicItem.uploadZone.photos.slice(0, 2)) {
            if (photo.data) {
              html += `<div class="relative group overflow-hidden rounded-lg shadow-sm border border-slate-100 dark:border-slate-800 aspect-[3/4]">
<img alt="${escapeHtml(itemLabel)}" class="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105" src="${escapeHtml(photo.data)}"/>
</div>`;
            }
          }
          html += `</div>`;
        }

        html += `</div>`;
      }
    }

    html += `</div>
</section>`;
  }

  html += `
</main>
<footer class="bg-card-light dark:bg-card-dark border-t border-slate-200 dark:border-slate-800 py-10 mt-16">
<div class="max-w-6xl mx-auto px-4 text-center">
<p class="text-sm text-slate-500 dark:text-slate-400 font-medium">© 2025 PropHero. Todos los derechos reservados.</p>
</div>
</footer>
</body>
</html>`;

  return html;
}

