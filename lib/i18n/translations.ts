export type Language = "es" | "en";

export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    continue: string;
    back: string;
    search: string;
    filter: string;
    loading: string;
    error: string;
    success: string;
  };
  
  // Navigation
  nav: {
    home: string;
    properties: string;
    notifications: string;
    help: string;
    logout: string;
  };
  
  // Theme
  theme: {
    light: string;
    dark: string;
    auto: string;
    system: string;
  };
  
  // Language
  language: {
    spanish: string;
    english: string;
  };
  
  // User Menu
  userMenu: {
    theme: string;
    language: string;
    settings: string;
  };
  
  // Property
  property: {
    title: string;
    management: string;
    addNew: string;
    edit: string;
    delete: string;
    save: string;
    submitReview: string;
    sections: {
      basicInfo: string;
      economicInfo: string;
      legalStatus: string;
      documentation: string;
      sellerData: string;
      sellerDataDescription: string;
      tenantData: string;
      tenantDataDescription: string;
      nextSection: string;
    };
  };
  
  // Kanban
  kanban: {
    draft: string;
    review: string;
    needsCorrection: string;
    negotiation: string;
    pendingArras: string;
    settlement: string;
    sold: string;
    rejected: string;
    searchPlaceholder: string;
    addProperty: string;
    filterProperties: string;
    // Reno Construction Manager phases
    initialCheck: string;
    upcoming: string;
    renoInProgress: string;
    furnishingCleaning: string;
    finalCheck: string;
    renoFixes: string;
    done: string;
  };
  
  // Messages
  messages: {
    loading: string;
    notFound: string;
    error: string;
    saveSuccess: string;
    saveError: string;
    submitSuccess: string;
    submitError: string;
    deleteConfirm: string;
    deleteConfirmDescription: string;
    completeRequiredFields: string;
    backToKanban: string;
  };
  
  // Section Info
  sectionInfo: {
    requiredFields: string;
    requiredFieldsDescription: string;
  };
  
  // UI Labels
  labels: {
    completed: string;
  };
  
  // Sidebar Groups
  sidebar: {
    basicData: string;
    ownerOccupation: string;
    statusCharacteristics: string;
    platform: string;
    settings: string;
    configuration: string;
    // Section names
    entrance: string;
    distribution: string;
    rooms: string;
    livingRoom: string;
    bathrooms: string;
    kitchen: string;
    exterior: string;
    soon: string;
    user: string;
  };
  
  // Section messages
  sectionMessages: {
    tenantSectionUnavailable: string;
    sectionInDevelopment: string;
  };
  
  // Partner Dashboard
  dashboard: {
    // KPIs
    activeProperties: string;
    activePropertiesDescription: string;
    conversionRate: string;
    conversionRateDescription: string;
    averageTime: string;
    averageTimeDescription: string;
    // Tasks
    pendingTasks: string;
    pendingTasksDescription: string;
    priority: string;
    normal: string;
    dueToday: string;
    criticalBlocker: string;
    // Appointments
    upcomingAppointments: string;
    upcomingAppointmentsDescription: string;
    addAppointment: string;
    // Recent Properties
    recentProperties: string;
    recentPropertiesDescription: string;
    // Portfolio
    portfolio: string;
    portfolioDescription: string;
    totalPortfolioValue: string;
  };
}

export const translations: Record<Language, Translations> = {
  es: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      edit: "Editar",
      continue: "Continuar",
      back: "Volver",
      search: "Buscar",
      filter: "Filtrar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
    },
    nav: {
      home: "Inicio",
      properties: "Gestión de propiedades",
      notifications: "Notificaciones",
      help: "Ayuda",
      logout: "Cerrar sesión",
    },
    theme: {
      light: "Claro",
      dark: "Oscuro",
      auto: "Automático",
      system: "Sistema",
    },
    language: {
      spanish: "Español",
      english: "Inglés",
    },
    userMenu: {
      theme: "Tema",
      language: "Idioma",
      settings: "Configuración",
    },
    property: {
      title: "Propiedad",
      management: "Gestión de propiedades",
      addNew: "Agregar nueva propiedad",
      edit: "Editar propiedad",
      delete: "Eliminar propiedad",
      save: "Guardar cambios",
      submitReview: "Enviar a revisión",
      sections: {
        basicInfo: "Información de la propiedad",
        economicInfo: "Información económica",
        legalStatus: "Estado legal y de comunidad",
        documentation: "Documentación mínima",
        sellerData: "Datos del vendedor",
        sellerDataDescription: "Información de contacto directa del propietario de la vivienda o de la persona autorizada para representarle en la operación de venta.",
        tenantData: "Datos del inquilino",
        tenantDataDescription: "Información necesaria para evaluar la situación contractual y legal de la vivienda. Incluya la fecha de finalización del contrato vigente.",
        nextSection: "Siguiente sección",
      },
    },
    kanban: {
      draft: "Borradores",
      review: "En Revisión",
      needsCorrection: "Necesita Corrección",
      negotiation: "Negociación",
      pendingArras: "Pendiente Arras",
      settlement: "Liquidación",
      sold: "Vendido",
      rejected: "Rechazado",
      searchPlaceholder: "Buscar por ID, Calle o Precio",
      addProperty: "Añadir propiedad",
      filterProperties: "Filtrar propiedades",
      // Reno Construction Manager phases
      initialCheck: "Check inicial",
      upcoming: "Próximas propiedades",
      renoInProgress: "Obras en proceso",
      furnishingCleaning: "Limpieza y amoblamiento",
      finalCheck: "Check final",
      renoFixes: "Reparaciones reno",
      done: "Finalizadas",
    },
    messages: {
      loading: "Cargando...",
      notFound: "Propiedad no encontrada",
      error: "Error",
      saveSuccess: "Los datos se han guardado correctamente",
      saveError: "Error al guardar los datos",
      submitSuccess: "La propiedad se ha enviado a revisión correctamente",
      submitError: "Error al enviar a revisión",
      deleteConfirm: "Eliminar propiedad",
      deleteConfirmDescription: "¿Estás seguro de que quieres eliminar esta propiedad? Esta acción no se puede deshacer.",
      completeRequiredFields: "Completa todos los campos obligatorios antes de enviar",
      backToKanban: "Volver al Kanban",
    },
    sectionInfo: {
      requiredFields: "Campos requeridos para la revisión inicial",
      requiredFieldsDescription: "Todos los campos de esta sección son obligatorios para poder enviar la propiedad a revisión.",
    },
    labels: {
      completed: "Completado",
    },
    sidebar: {
      basicData: "Datos básicos del inmueble",
      ownerOccupation: "Datos del propietario y ocupación",
      statusCharacteristics: "Estado y características del inmueble",
      platform: "Plataforma",
      settings: "Ajustes",
      configuration: "Configuración",
      entrance: "Entrada y distribución",
      distribution: "Distribución",
      rooms: "Habitaciones",
      livingRoom: "Salón",
      bathrooms: "Baños",
      kitchen: "Cocina",
      exterior: "Exterior",
      soon: "Pronto",
      user: "Usuario",
    },
    sectionMessages: {
      tenantSectionUnavailable: "Esta sección solo está disponible cuando la propiedad está marcada como alquilada.",
      sectionInDevelopment: "Sección en desarrollo",
    },
    dashboard: {
      activeProperties: "Propiedades activas",
      activePropertiesDescription: "En proceso actualmente",
      conversionRate: "Tasa de conversión",
      conversionRateDescription: "De draft a ventas",
      averageTime: "Tiempo promedio",
      averageTimeDescription: "De procesamiento",
      pendingTasks: "Tareas pendientes",
      pendingTasksDescription: "Acciones requeridas para avanzar tus propiedades",
      priority: "Prioritarias",
      normal: "Normales",
      dueToday: "Vence Hoy",
      criticalBlocker: "Bloqueador crítico",
      upcomingAppointments: "Próximas citas",
      upcomingAppointmentsDescription: "Citas añadidas en tu calendario",
      addAppointment: "Añadir",
      recentProperties: "Propiedades recientes",
      recentPropertiesDescription: "Últimas actualizaciones de tus propiedades",
      portfolio: "Portfolio",
      portfolioDescription: "Distribución de propiedades por fase",
      totalPortfolioValue: "Valor total del portfolio",
    },
  },
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      continue: "Continue",
      back: "Back",
      search: "Search",
      filter: "Filter",
      loading: "Loading...",
      error: "Error",
      success: "Success",
    },
    nav: {
      home: "Home",
      properties: "Property Management",
      notifications: "Notifications",
      help: "Help",
      logout: "Logout",
    },
    theme: {
      light: "Light",
      dark: "Dark",
      auto: "Auto",
      system: "System",
    },
    language: {
      spanish: "Spanish",
      english: "English",
    },
    userMenu: {
      theme: "Theme",
      language: "Language",
      settings: "Settings",
    },
    property: {
      title: "Property",
      management: "Property Management",
      addNew: "Add New Property",
      edit: "Edit Property",
      delete: "Delete Property",
      save: "Save Changes",
      submitReview: "Submit for Review",
      sections: {
        basicInfo: "Property Information",
        economicInfo: "Economic Information",
        legalStatus: "Legal and Community Status",
        documentation: "Documentation",
        sellerData: "Seller Data",
        sellerDataDescription: "Direct contact information of the property owner or the person authorized to represent them in the sale transaction.",
        tenantData: "Tenant Data",
        tenantDataDescription: "Information necessary to evaluate the contractual and legal situation of the property. Include the expiration date of the current contract.",
        nextSection: "Next Section",
      },
    },
    kanban: {
      draft: "Drafts",
      review: "In Review",
      needsCorrection: "Needs Correction",
      negotiation: "Negotiation",
      pendingArras: "Pending Arras",
      settlement: "Settlement",
      sold: "Sold",
      rejected: "Rejected",
      searchPlaceholder: "Search by ID, Street or Price",
      addProperty: "Add Property",
      filterProperties: "Filter Properties",
      // Reno Construction Manager phases
      initialCheck: "Initial Check",
      upcoming: "Upcoming",
      renoInProgress: "Reno in Progress",
      furnishingCleaning: "Furnishing/Cleaning",
      finalCheck: "Final Check",
      renoFixes: "Reno Fixes",
      done: "Done",
    },
    messages: {
      loading: "Loading...",
      notFound: "Property not found",
      error: "Error",
      saveSuccess: "Data saved successfully",
      saveError: "Error saving data",
      submitSuccess: "Property submitted for review successfully",
      submitError: "Error submitting for review",
      deleteConfirm: "Delete Property",
      deleteConfirmDescription: "Are you sure you want to delete this property? This action cannot be undone.",
      completeRequiredFields: "Complete all required fields before submitting",
      backToKanban: "Back to Kanban",
    },
    sectionInfo: {
      requiredFields: "Required fields for initial review",
      requiredFieldsDescription: "All fields in this section are mandatory to submit the property for review.",
    },
    labels: {
      completed: "Completed",
    },
    sidebar: {
      basicData: "Basic Property Data",
      ownerOccupation: "Owner and Occupation Data",
      statusCharacteristics: "Property Status and Characteristics",
      platform: "Platform",
      settings: "Settings",
      configuration: "Configuration",
      entrance: "Entrance and Distribution",
      distribution: "Distribution",
      rooms: "Rooms",
      livingRoom: "Living Room",
      bathrooms: "Bathrooms",
      kitchen: "Kitchen",
      exterior: "Exterior",
      soon: "Soon",
      user: "User",
    },
    sectionMessages: {
      tenantSectionUnavailable: "This section is only available when the property is marked as rented.",
      sectionInDevelopment: "Section in development",
    },
    dashboard: {
      activeProperties: "Active Properties",
      activePropertiesDescription: "Currently in process",
      conversionRate: "Conversion Rate",
      conversionRateDescription: "From draft to sales",
      averageTime: "Average Time",
      averageTimeDescription: "Of processing",
      pendingTasks: "Pending Tasks",
      pendingTasksDescription: "Actions required to advance your properties",
      priority: "Priority",
      normal: "Normal",
      dueToday: "Due Today",
      criticalBlocker: "Critical Blocker",
      upcomingAppointments: "Upcoming Appointments",
      upcomingAppointmentsDescription: "Appointments added to your calendar",
      addAppointment: "Add",
      recentProperties: "Recent Properties",
      recentPropertiesDescription: "Latest updates on your properties",
      portfolio: "Portfolio",
      portfolioDescription: "Distribution of properties by phase",
      totalPortfolioValue: "Total portfolio value",
    },
  },
};

