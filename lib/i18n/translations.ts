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
    renoManagement: string;
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
  
  // Login
  login: {
    title: string;
    subtitle: string;
    secureLoginButton: string;
    createAccount: string;
    email: string;
    password: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    loginButton: string;
    loggingIn: string;
    forgotPassword: string;
    support: string;
    privacy: string;
    terms: string;
    copyright: string;
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
    fullAddress: string;
    propertyType: string;
    renovationType: string;
    gallery: string;
    viewAll: string;
    noImagesAvailable: string;
    couldNotLoadImage: string;
    photo: string;
    photos: string;
    saveSuccess: string;
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
    filters: string;
    filtersDescription: string;
    renovatorName: string;
    searchRenovator: string;
    technicalConstructor: string;
    areaCluster: string;
    searchAreaCluster: string;
    noValuesAvailable: string;
    clearAll: string;
    applyFilters: string;
      // Reno Construction Manager phases
      upcomingSettlements: string;
      initialCheck: string;
      upcoming: string;
      renoBudgetRenovator: string;
      renoBudgetClient: string;
      renoBudgetStart: string;
      renoBudget: string; // Legacy
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
    propertyInformation: string;
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
  
  // Upcoming Settlements phase
  upcomingSettlements: {
    estimatedVisitDate: string;
    estimatedVisitDateDescription: string;
    setupStatusNotes: string;
    setupStatusNotesDescription: string;
    setupStatusNotesPlaceholder: string;
    propertyInformation: string;
    editableFields: string;
    dateMustBeFuture: string;
    autoVisitNote: string;
  };
  
  // Initial Check phase
    initialCheck: {
      realSettlementDate: string;
      estimatedVisitDate: string;
      propertyInformation: string;
    };
    finalCheck: {
      realCompletionDate: string;
      estimatedFinalVisitDate: string;
      propertyInformation: string;
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
    activeWorksByRenovator: string;
    activeWorksByRenovatorDescription: string;
    viewMore: string;
    fullRanking: string;
    back: string;
    worksByPartner: string;
    // Portfolio
    portfolio: string;
    portfolioDescription: string;
    totalPortfolioValue: string;
    // Reno Construction Manager Dashboard
    activeWorks: string;
    activeWorksDescription: string;
    visitsToday: string;
    visitsTodayDescription: string;
    totalVisitsMonth: string;
    totalVisitsMonthDescription: string;
    checksForToday: string;
    checksForTodayDescription: string;
    workStatusVisitsToday: string;
    workStatusVisitsTodayDescription: string;
    upcomingVisits: string;
    upcomingVisitsDescription: string;
    addNewVisit: string;
    noChecksScheduled: string;
    noVisitsScheduled: string;
    checks: string;
    visits: string;
  };
  
  // Calendar, Visits & Reminders
  calendar: {
    title: string;
    subtitle: string;
    day: string;
    week: string;
    today: string;
    create: string;
    createVisit: string;
    createReminder: string;
    visitType: string;
    property: string;
    selectProperty: string;
    dateTime: string;
    notes: string;
    notesPlaceholder: string;
    dateTimePlaceholder: string;
    dateTimeError: string;
    cancel: string;
    creating: string;
    visitCreated: string;
    reminderCreated: string;
    visitCreateError: string;
    selectPropertyAndDate: string;
    noPropertiesAssigned: string;
    noPropertiesAvailable: string;
    address: string;
    lastComment: string;
    close: string;
    goToTask: string;
    noVisits: string;
    loading: string;
    edit: string;
    delete: string;
    save: string;
    saving: string;
    visitUpdated: string;
    reminderUpdated: string;
    visitDeleted: string;
    reminderDeleted: string;
    visitUpdateError: string;
    visitDeleteError: string;
    deleteVisitConfirm: string;
    deleteReminderConfirm: string;
    visitTypes: {
      initialCheck: string;
      finalCheck: string;
      obraSeguimiento: string;
      reminder: string;
      visit: string;
    };
  };
  
  // Comments
  comments: {
    placeholder: string;
    addReminder: string;
    reminder: string;
    reminderDateTime: string;
    reminderDateTimePlaceholder: string;
    reminderDateTimeError: string;
    saving: string;
    createReminder: string;
    add: string;
    history: string;
    loading: string;
    noComments: string;
    remindAt: string;
    syncedToAirtable: string;
    deleteConfirm: string;
  };
  
  // Property Tabs
  propertyTabs: {
    tasks: string;
    summary: string;
    propertyStatus: string;
    renovationBudget: string;
    comments: string;
  };
  
  // Property Sidebar
  propertySidebar: {
    createdOn: string;
    dataCompleted: string;
    pending: string;
    completeInitialChecklist: string;
    completeFinalChecklist: string;
    completeNewSettlementsInfo: string;
    technicalConstructor: string;
    siteManager: string;
    reminders: string;
    comments: string;
    checklistInProgress: string;
    continueChecklist: string;
    noChecklistStarted: string;
    openChecklist: string;
    startChecklist: string;
    propertyCreatedOn: string;
    noPendingReminders: string;
  };
  
  // Property Action Tab
    propertyAction: {
      preparationStatus: string;
      nextRenoSteps: string;
      renovator: string;
      renovationDates: string;
      workDates: string;
      startDate: string;
      estimatedEndDate: string;
      estimatedVisitDate: string;
      openInitialChecklist: string;
      openFinalChecklist: string;
      completeInitialChecklist: string;
      completeFinalChecklist: string;
      initialCheckDescription: string;
      finalCheckDescription: string;
    };
  
  // Property Page
  propertyPage: {
    property: string;
    reportProblem: string;
    propertyNotFound: string;
    backToKanban: string;
    loadingProperty: string;
    renovationBudget: string;
    comingSoon: string;
    currentDate: string;
    modifyDate: string;
    saving: string;
    save: string;
  };
  
  // Property Status Tab
  propertyStatusTab: {
    loadingHistory: string;
    noChecklistsYet: string;
    completed: string;
    inProgress: string;
    created: string;
    completedOn: string;
    createdBy: string;
    viewDetails: string;
  };
  
  // Property Card
    propertyCard: {
      expired: string;
      region: string;
      signing: string;
      estimatedVisit: string;
      next: string;
      today: string;
      workInProgress: string;
      cleaningFurnishing: string;
      repairs: string;
      completed: string;
      ago: string;
      days: string;
      day: string;
      hours: string;
      hour: string;
      lessThanHour: string;
      siteManager: string;
    };
  
  // Partner
  partner: {
    management: string;
    navProperties: string;
  };
  
  // Checklist
  checklist: {
    title: string;
    buenEstado: string;
    necesitaReparacion: string;
    necesitaReemplazo: string;
    noAplica: string;
    notes: string;
    submitChecklist: string;
    submitChecklistDescription: string;
    photos: string;
    videos: string;
    whatElementsBadCondition: string;
    observationsPlaceholder: string;
    addPhotos: string;
    dragDropFiles?: string; // Optional drag and drop text
    clickToBrowse?: string; // Optional click to browse text
    elements?: any; // Optional elements translations
    sections: {
      entornoZonasComunes: any;
      estadoGeneral: any;
      entradaPasillos: any;
      habitaciones: any;
      salon: any;
      banos: any;
      cocina: any;
      exteriores: any;
    };
  };
  
  // Help Modal
  help: {
    title: string;
    description: string;
    selectErrorType: string;
    propertyError: string;
    propertyErrorDescription: string;
    generalError: string;
    generalErrorDescription: string;
    selectProperty: string;
    selectPropertyRequired: string;
    describeProblem: string;
    describeProblemRequired: string;
    propertyPlaceholder: string;
    propertyErrorPlaceholder: string;
    generalErrorPlaceholder: string;
    back: string;
    cancel: string;
    send: string;
    sending: string;
    messageSent: string;
    messageSentDescription: string;
    errorSending: string;
    pleaseWriteMessage: string;
    pleaseSelectProperty: string;
    notAuthenticated: string;
    errorSavingConversation: string;
    couldNotCreateConversation: string;
    unknownUser: string;
  };
  
  // Notifications
  notifications: {
    title: string;
    description: string;
    loadingConversations: string;
    noConversations: string;
    noConversationsDescription: string;
    propertyError: string;
    generalError: string;
    new: string;
    property: string;
    yourMessage: string;
    teamResponse: string;
    waitingForResponse: string;
    conversationDetails: string;
    propertyLabel: string;
    close: string;
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
      renoManagement: "Gestión de Reno",
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
    login: {
      title: "Inicia sesión o crea una cuenta",
      subtitle: "Accede a la plataforma de control de operaciones de PropHero",
      secureLoginButton: "Iniciar sesión de forma segura",
      createAccount: "Crear una cuenta",
      email: "Email",
      password: "Contraseña",
      emailPlaceholder: "tu@email.com",
      passwordPlaceholder: "••••••••",
      loginButton: "Iniciar sesión",
      loggingIn: "Iniciando sesión...",
      forgotPassword: "¿Olvidaste tu contraseña?",
      support: "Soporte",
      privacy: "Privacidad",
      terms: "Términos",
      copyright: "© 2025 PropHero - Todos los derechos reservados",
    },
    property: {
      title: "Propiedad",
      management: "Gestión de propiedades",
      addNew: "Agregar nueva propiedad",
      edit: "Editar propiedad",
      delete: "Eliminar propiedad",
      save: "Guardar cambios",
      submitReview: "Enviar a revisión",
      fullAddress: "Dirección completa",
      propertyType: "Tipo de propiedad",
      renovationType: "Tipo de renovación",
      gallery: "Galería de imágenes",
      viewAll: "Ver todas",
      noImagesAvailable: "No hay imágenes disponibles",
      couldNotLoadImage: "No se pudo cargar la imagen",
      photo: "foto",
      photos: "fotos",
      saveSuccess: "Los datos se han guardado correctamente",
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
      filters: "Filtros",
      filtersDescription: "Selecciona uno o más valores para filtrar las propiedades. Los filtros se combinan con OR (cualquiera de los seleccionados).",
      renovatorName: "Renovator Name",
      searchRenovator: "Buscar renovador...",
      technicalConstructor: "Jefe de Obra",
      areaCluster: "Area Cluster",
      searchAreaCluster: "Buscar área...",
      noValuesAvailable: "No hay valores disponibles",
      clearAll: "Limpiar todos",
      applyFilters: "Aplicar filtros",
      // Reno Construction Manager phases
      upcomingSettlements: "Upcoming Reno",
      initialCheck: "Check inicial",
      upcoming: "Próximas propiedades",
      renoBudgetRenovator: "Pendiente Presupuesto (Renovador)",
      renoBudgetClient: "Pendiente Presupuesto (Cliente)",
      renoBudgetStart: "Obra a Empezar",
      renoBudget: "Reno Budget", // Legacy
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
      propertyInformation: "Información de la Propiedad",
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
    upcomingSettlements: {
      estimatedVisitDate: "Fecha estimada de visita",
      estimatedVisitDateDescription: "Fecha en la que el Jefe de Obra estima realizar la visita técnica después de la escrituración",
      setupStatusNotes: "Notas de estado de preparación",
      setupStatusNotesDescription: "Notas sobre el estado de preparación de la propiedad para la escrituración (ej: \"Reparaciones finales completadas\", \"Pendiente inspección de servicios\", \"Lista para entrega\")",
      setupStatusNotesPlaceholder: "Escribe tus notas aquí",
      propertyInformation: "Información de la Propiedad",
      editableFields: "Campos editables",
      dateMustBeFuture: "La fecha debe ser futura",
      autoVisitNote: "Visita técnica inicial agendada automáticamente al guardar la fecha de visita estimada.",
    },
    initialCheck: {
      realSettlementDate: "Fecha real firma",
      estimatedVisitDate: "Fecha estimada de visita",
      propertyInformation: "Información de la Propiedad",
    },
    finalCheck: {
      realCompletionDate: "Fecha real de finalización",
      estimatedFinalVisitDate: "Fecha estimada de visita",
      propertyInformation: "Información de la Propiedad",
    },
    checklist: {
      title: "Checklist",
      buenEstado: "Buen estado",
      necesitaReparacion: "Necesita reparación",
      necesitaReemplazo: "Necesita reemplazo",
      noAplica: "No aplica",
      notes: "Observaciones",
      submitChecklist: "Enviar checklist",
      submitChecklistDescription: "Finalizar y enviar el checklist completado",
      photos: "Fotos",
      videos: "Videos",
      whatElementsBadCondition: "¿Qué elementos están en mal estado?",
      observationsPlaceholder: "Escribe los detalles a tener en cuenta por el equipo de analistas y reformistas",
      elements: {
        accesoPrincipal: {
          puertaEntrada: "Puerta de entrada al edificio",
          cerradura: "Cerradura",
          bombin: "Bombín",
        },
        acabados: {
          paredes: "Paredes",
          techos: "Techos",
          suelo: "Suelo",
          rodapies: "Rodapiés",
        },
        comunicaciones: {
          telefonillo: "Telefonillo",
          timbre: "Timbre",
          buzon: "Buzón",
        },
        electricidad: {
          luces: "Luces",
          interruptores: "Interruptores",
          tomasCorriente: "Tomas de corriente",
          tomaTelevision: "Toma de Televisión",
        },
        carpinteria: {
          puertasInteriores: "Puertas interiores",
        },
      },
      addPhotos: "Añade varias fotos y al menos un video de esta sección para que podamos verlo con detalle",
      dragDropFiles: "Arrastra y suelta archivos aquí",
      clickToBrowse: "O haz clic para explorar (máx. 10 archivos, 5MB cada uno)",
      sections: {
        entornoZonasComunes: {
          title: "Entorno y zonas comunes de la vivienda",
          description: "Evalúe el contexto de la propiedad: la comunidad, accesos exteriores y su estado general. Su valoración aquí ayuda a contextualizar la inversión.",
          portal: "Portal de la vivienda",
          fachada: "Fachada del edificio",
          entorno: "Entorno del edificio",
          accesoPrincipal: {
            title: "Acceso principal",
            description: "Evalúa la puerta de entrada al edificio, el estado de las cerraduras y el bombín",
            elements: {
              puertaEntrada: "Puerta de entrada al edificio",
              cerradura: "Cerradura",
              bombin: "Bombín",
            },
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          comunicaciones: {
            title: "Comunicaciones",
            description: "Revisa el telefonillo, el timbre y el buzón para ver si hay problemas o si no están funcionando bien.",
            elements: {
              telefonillo: "Telefonillo",
              timbre: "Timbre",
              buzon: "Buzón",
            },
          },
          electricidad: {
            title: "Electricidad",
            description: "Evalúa las luces, los interruptores y las tomas de corriente de la estancia.",
            elements: {
              luces: "Luces",
              interruptores: "Interruptores",
              tomasCorriente: "Tomas de corriente",
              tomaTelevision: "Toma de Televisión",
            },
          },
          carpinteria: {
            title: "Carpintería",
            description: "Revisa el estado de la carpintería del las puertas interiores de la comunidad.",
            elements: {
              puertasInteriores: "Puertas interiores",
            },
          },
        },
        estadoGeneral: {
          title: "Estado General de la Vivienda",
          description: "Score único para elementos repetidos en toda la casa. Marcar 'Mal estado' requiere justificación.",
          fotosPerspectivaGeneral: {
            title: "Fotos: perspectiva general de la vivienda",
            description: "Sube mínimo 1 foto que represente el estado dominante de paredes, suelos y carpintería en la vivienda (ej. pasillo, salón, una habitación).",
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          climatizacion: {
            title: "Climatización",
            description: "Indica si hay radiadores o unidades de aire acondicionado y si están en buen estado.",
            items: {
              radiadores: "Radiadores",
              splitAc: "Split Unit de A/C",
              calentadorAgua: "Calentador de agua",
              calefaccionConductos: "Calefacción por conductos",
            },
          },
          electricidad: {
            title: "Electricidad",
            description: "Evalúa las luces, los interruptores y las tomas de corriente de la estancia.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              luces: "Luces",
              interruptores: "Interruptores",
              tomasCorriente: "Tomas de corriente",
              tomaTelevision: "Toma de Televisión",
            },
          },
        },
        entradaPasillos: {
          title: "Entrada y pasillos de la vivienda",
          description: "Detalle el acceso principal y la instalación eléctrica crítica. Incluye las fotos obligatorias del cuadro general de protección para validar la instalación.",
          cuadroGeneralElectrico: {
            title: "Cuadro general eléctrico",
            description: "Fotografía clara y frontal donde se vean todos los interruptores magnetotérmicos y diferenciales. Esta imagen es clave para estimar el coste de la reforma eléctrica.",
          },
          entradaViviendaPasillos: {
            title: "Entrada a la vivienda y pasillos",
            description: "Fotografía y video nítidos de la puerta de acceso a la vivienda, de la entrada desde el rellano y de los pasillos. Asegure que se vea claramente el estado del marco, la cerradura y el bombín.",
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          carpinteria: {
            title: "Carpintería",
            description: "Revisa el estado y funcionamiento de ventanas, persianas, armarios empotrados y puerta de paso.",
            items: {
              ventanas: "Ventanas",
              persianas: "Persianas",
              armarios: "Armarios",
            },
          },
          electricidad: {
            title: "Electricidad",
            description: "Evalúa luces, interruptores y tomas de corriente. Comprueba si funcionan correctamente.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              luces: "Luces",
              interruptores: "Interruptores",
              tomasCorriente: "Tomas de corriente",
              tomaTelevision: "Toma de Televisión",
            },
          },
          climatizacion: {
            title: "Climatización",
            description: "Indica si hay radiadores o unidades de aire acondicionado y si están en buen estado.",
            items: {
              radiadores: "Radiadores",
              splitAc: "Split Unit de A/C",
            },
          },
          mobiliario: {
            title: "Mobiliario",
            existeMobiliario: "Existe mobiliario",
            elementoPuntuar: "Elemento a puntuar",
          },
        },
        habitaciones: {
          title: "Habitaciones",
          bedroom: "Habitación",
          habitaciones: "Habitaciones",
          description: "Documentación visual de las habitaciones. Recuerde: La evaluación de suelos, paredes y carpintería ya fue completada en el estado general. Utilice las notas para destacar anomalías específicas.",
          numeroHabitaciones: "Número de habitaciones de la vivienda",
          fotosVideoHabitacion: {
            title: "Fotos y video de la habitación",
            description: "El video debe mostrar una panorámica completa de la habitación. Priorice la iluminación y asegúrese de incluir todas las paredes, la ventana y el armario empotrado (si existe).",
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          carpinteria: {
            title: "Carpintería",
            description: "Revisa el estado y funcionamiento de ventanas, persianas, armarios empotrados y puerta de paso.",
            items: {
              ventanas: "Ventanas",
              persianas: "Persianas",
              armarios: "Armarios",
            },
            puertaEntrada: "Puerta de entrada",
          },
          electricidad: {
            title: "Electricidad",
            description: "Evalúa luces, interruptores y tomas de corriente. Comprueba si funcionan correctamente.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              luces: "Luces",
              interruptores: "Interruptores",
              tomasCorriente: "Tomas de corriente",
              tomaTelevision: "Toma de Televisión",
            },
          },
          climatizacion: {
            title: "Climatización",
            description: "Indica si hay radiadores o unidades de aire acondicionado y si están en buen estado.",
            items: {
              radiadores: "Radiadores",
              splitAc: "Split Unit de A/C",
            },
          },
          mobiliario: {
            title: "Mobiliario",
            existeMobiliario: "Existe mobiliario",
          },
        },
        salon: {
          title: "Salón",
          description: "Documentación visual del Salón. El vídeo debe ofrecer una visión completa de la distribución del espacio principal.",
          fotosVideoSalon: {
            title: "Fotos y vídeo del salón",
            description: "Video que muestre el flujo y la distribución del Salón. La fotografía debe capturar la mayor amplitud posible del espacio.",
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          carpinteria: {
            title: "Carpintería",
            description: "Revisa el estado y funcionamiento de ventanas, persianas, armarios empotrados y puerta de paso.",
            items: {
              ventanas: "Ventanas",
              persianas: "Persianas",
              armarios: "Armarios",
            },
            puertaEntrada: "Puerta de entrada",
          },
          electricidad: {
            title: "Electricidad",
            description: "Evalúa luces, interruptores y tomas de corriente. Comprueba si funcionan correctamente.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              luces: "Luces",
              interruptores: "Interruptores",
              tomasCorriente: "Tomas de corriente",
              tomaTelevision: "Toma de Televisión",
            },
          },
          climatizacion: {
            title: "Climatización",
            description: "Indica si hay radiadores o unidades de aire acondicionado y si están en buen estado.",
            items: {
              radiadores: "Radiadores",
              splitAc: "Split Unit de A/C",
            },
          },
          mobiliario: {
            existeMobiliario: "Existe mobiliario",
            elementoPuntuar: "Elemento a puntuar",
          },
        },
        banos: {
          title: "Baños",
          bathroom: "Baño",
          description: "Inspección detallada de las zonas húmedas. Esta evaluación se centra en el estado de la fontanería, el drenaje y los sanitarios. La valoración de cada baño es independiente.",
          fotosVideoBano: {
            title: "Fotos y vídeo del baño",
            description: "Video centrado en el estado de los sanitarios, grifería y ducha/bañera. Incluye una foto de los azulejos y las juntas si se ha detectado moho, humedad o algún desperfecto.",
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          aguaDrenaje: {
            title: "Agua y drenaje",
            description: "Revisa los puntos de agua fría y caliente, así como los sistemas de desagües.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              puntosAgua: "Puntos de agua fría y caliente",
              desagues: "Desagües",
            },
          },
          sanitarios: {
            title: "Sanitarios",
            description: "Revisa que el inodoro, lavabo y ducha o bañera estén en buen estado, sin fugas ni desperfectos.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              platoDuchaBanera: "Plato de ducha / Bañera",
              inodoro: "Inodoro (Víter)",
              lavabo: "Lavabo (Roca)",
            },
          },
          griferiaDucha: {
            title: "Grifería y ducha o bañera",
            description: "Verifica el estado de los grifos y mampara o cortina de ducha.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              grifos: "Grifos",
              mamparaCortina: "Mampara de ducha / Cortina",
            },
          },
          carpinteria: {
            title: "Carpintería",
            description: "Revisa el estado y funcionamiento de ventanas, persianas, armarios empotrados y puerta de paso.",
            items: {
              ventanas: "Ventanas",
              persianas: "Persianas",
            },
            puertaEntrada: "Puerta de entrada",
          },
          mobiliario: {
            title: "Mobiliario",
            description: "Revisa el estado del mueble de lavabo, espejo y accesorios como el toallero o portapapeles.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              muebleLavabo: "Mueble de lavabo",
              espejo: "Espejo",
              toalleroPortapapeles: "Toallero / Portapapeles",
            },
          },
          ventilacion: {
            title: "Ventilación",
            description: "Indica si el baño cuenta con ventana o sistema de ventilación forzada (extracción) y evalúa su estado.",
          },
        },
        cocina: {
          title: "Cocina",
          description: "Inspección detallada del mobiliario fijo, agua y electrodomésticos. Por favor, asegure la máxima precisión en el estado de los módulos y la encimera.",
          fotosVideoCocina: {
            title: "Fotos y vídeo de la cocina",
            description: "Video que muestre el mobiliario fijo (módulos, encimera) y los electrodomésticos en su contexto. La foto debe capturar el estado general de la encimera y los frontales.",
          },
          acabados: {
            title: "Acabados",
            description: "Evalúa el estado de las paredes, los techos, el suelo y los rodapiés. Busca marcas, desgaste y humedades.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          mobiliarioFijo: {
            title: "Mobiliario Fijo",
            description: "Revisa el estado de los módulos bajos y altos, la encimera y el zócalo. Comprueba que estén bien sujetos y sin daños visibles.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              modulosBajos: "Módulos bajos",
              modulosAltos: "Módulos altos",
              encimera: "Encimera",
              zocalo: "Zócalo",
            },
          },
          aguaDrenaje: {
            title: "Agua y drenaje",
            description: "Verifica el estado del fregadero y el grifo. Asegúrate de que no haya fugas y que el desagüe funcione correctamente.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              grifo: "Grifo",
              fregadero: "Fregadero",
            },
          },
          carpinteria: {
            title: "Carpintería",
            description: "Revisa el estado y funcionamiento de ventanas, persianas, armarios empotrados y puerta de paso.",
            items: {
              ventanas: "Ventanas",
              persianas: "Persianas",
            },
            puertaEntrada: "Puerta de entrada",
          },
          almacenamiento: {
            title: "Almacenamiento",
            items: {
              armariosDespensa: "Armarios Despensa",
              cuartoLavado: "Cuarto de lavado",
            },
          },
          electrodomesticos: {
            title: "Electrodomésticos",
            items: {
              placaGas: "Placa de cocina - gas",
              placaVitroInduccion: "Placa de cocina - Vitro o Inducción",
              campanaExtractora: "Campana extractora",
              horno: "Horno",
              nevera: "Nevera",
              lavadora: "Lavadora",
              lavavajillas: "Lavavajillas",
              microondas: "Microondas",
            },
          },
        },
        exteriores: {
          title: "Exteriores de la Vivienda",
          description: "Evalúe los elementos de la propiedad con acceso al exterior (balcones, terrazas, tendederos). Priorice la seguridad (barandillas y rejas) y los acabados exteriores.",
          fotosVideoExterior: {
            title: "Fotos y vídeo del exterior (terraza, balcón o patio)",
            description: "Documente las vistas, el estado del pavimento y la seguridad (barandillas, rejas). Indique si el acceso está habilitado y si aplica para la propiedad.",
          },
          seguridad: {
            title: "Seguridad",
            items: {
              barandillas: "Barandillas",
              rejas: "Rejas",
            },
          },
          sistemas: {
            title: "Sistemas",
            items: {
              tendederoExterior: "Tendedero exterior",
              toldos: "Toldos",
            },
          },
          acabadosExteriores: {
            title: "Acabados exteriores",
            description: "Evalúa el estado de paredes, techos, suelo y rodapiés. Revisa si hay desgaste, daños o signos de humedad.",
            whatElementsBadCondition: "¿Qué elementos están en mal estado?",
            elements: {
              paredes: "Paredes",
              techos: "Techos",
              suelo: "Suelo",
              rodapies: "Rodapiés",
            },
          },
          observaciones: {
            title: "Observaciones",
            placeholder: "Escribe los detalles a tener en cuenta por el equipo de analistas y reformistas",
          },
        },
      },
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
      recentProperties: "Obras Activas",
      recentPropertiesDescription: "Obras activas agrupadas por renovator",
      activeWorksByRenovator: "Obras Activas",
      activeWorksByRenovatorDescription: "Obras activas agrupadas por renovator",
      viewMore: "Ver más",
      fullRanking: "Ranking Completo",
      back: "Volver",
      worksByPartner: "Obras de",
      portfolio: "Portfolio",
      portfolioDescription: "Distribución de propiedades por fase",
      totalPortfolioValue: "Valor total del portfolio",
      // Reno Construction Manager Dashboard
      activeWorks: "Obras Activas",
      activeWorksDescription: "Propiedades en fase de renovación",
      visitsToday: "Visitas para Hoy",
      visitsTodayDescription: "Actualizaciones o checks programados",
      totalVisitsMonth: "Total de visitas hechas en el mes",
      totalVisitsMonthDescription: "Visitas completadas este mes",
      checksForToday: "Checks para ejecutar hoy",
      checksForTodayDescription: "Checks iniciales y finales programados para hoy",
      workStatusVisitsToday: "Visitas de estado de obra hoy",
      workStatusVisitsTodayDescription: "Visitas de estado de obra programadas para hoy",
      upcomingVisits: "Próximas visitas",
      upcomingVisitsDescription: "Visitas de estado de obra programadas",
      addNewVisit: "Añadir nueva visita",
      noChecksScheduled: "No hay checks programados para hoy",
      noVisitsScheduled: "No hay visitas programadas",
      checks: "Checks",
      visits: "Visitas",
    },
    calendar: {
      title: "Calendario de Visitas",
      subtitle: "Checklist inicial, final y seguimiento de obra",
      day: "Día",
      week: "Semana",
      today: "Hoy",
      create: "Crear",
      createVisit: "Crear Visita",
      createReminder: "Crear Recordatorio",
      visitType: "Tipo de Visita",
      property: "Propiedad",
      selectProperty: "Selecciona una propiedad",
      dateTime: "Fecha y hora",
      notes: "Notas (opcional)",
      notesPlaceholder: "Agregar notas sobre la visita...",
      dateTimePlaceholder: "DD/MM/YYYY HH:mm",
      dateTimeError: "La fecha y hora deben ser futuras",
      cancel: "Cancelar",
      creating: "Creando...",
      visitCreated: "Visita creada correctamente",
      reminderCreated: "Recordatorio creado correctamente",
      visitCreateError: "Error al crear la visita",
      selectPropertyAndDate: "Debes seleccionar una propiedad y una fecha",
      noPropertiesAssigned: "No hay propiedades asignadas a tu rol",
      noPropertiesAvailable: "No hay propiedades disponibles para este tipo de visita",
      address: "Dirección",
      lastComment: "Último comentario",
      close: "Cerrar",
      goToTask: "Ir a la tarea",
      noVisits: "Sin visitas",
      loading: "Cargando...",
      edit: "Editar",
      delete: "Eliminar",
      save: "Guardar",
      saving: "Guardando...",
      visitUpdated: "Visita actualizada correctamente",
      reminderUpdated: "Recordatorio actualizado correctamente",
      visitDeleted: "Visita eliminada correctamente",
      reminderDeleted: "Recordatorio eliminado correctamente",
      visitUpdateError: "Error al actualizar la visita",
      visitDeleteError: "Error al eliminar la visita",
      deleteVisitConfirm: "¿Estás seguro de que quieres eliminar esta visita?",
      deleteReminderConfirm: "¿Estás seguro de que quieres eliminar este recordatorio?",
      visitTypes: {
        initialCheck: "Check Inicial",
        finalCheck: "Check Final",
        obraSeguimiento: "Seguimiento de Obra",
        reminder: "Recordatorio",
        visit: "Visita",
      },
    },
    comments: {
      placeholder: "Escribe un comentario... Usa @ para mencionar usuarios",
      addReminder: "Agregar recordatorio",
      reminder: "Recordatorio",
      reminderDateTime: "Fecha y hora del recordatorio",
      reminderDateTimePlaceholder: "DD/MM/YYYY HH:mm",
      reminderDateTimeError: "La fecha y hora deben ser futuras",
      saving: "Guardando...",
      createReminder: "Crear Recordatorio",
      add: "Agregar",
      history: "Historial de Comentarios",
      loading: "Cargando...",
      noComments: "No hay comentarios aún",
      remindAt: "Recordar",
      syncedToAirtable: "Sincronizado con Airtable",
      deleteConfirm: "¿Estás seguro de que quieres eliminar este comentario?",
    },
    propertyTabs: {
      tasks: "Tareas",
      summary: "Resumen",
      propertyStatus: "Estado de la propiedad",
      renovationBudget: "Presupuesto de reforma",
      comments: "Comentarios y Recordatorios",
    },
    propertySidebar: {
      createdOn: "Creada el",
      dataCompleted: "Datos completados",
      pending: "Pendiente",
      completeInitialChecklist: "Completar checklist inicial",
      completeFinalChecklist: "Completar checklist final",
      completeNewSettlementsInfo: "Completar información de upcoming reno",
      technicalConstructor: "Jefe de Obra",
      siteManager: "Responsable",
      reminders: "Recordatorios",
      comments: "Comentarios",
      checklistInProgress: "Checklist en progreso",
      continueChecklist: "Continuar checklist",
      noChecklistStarted: "No hay checklist iniciado aún",
      openChecklist: "Abrir Checklist",
      startChecklist: "Iniciar Checklist",
      propertyCreatedOn: "Propiedad creada el",
      noPendingReminders: "No hay recordatorios pendientes",
    },
    propertyAction: {
      preparationStatus: "Estado de Preparación",
      nextRenoSteps: "Próximos Pasos de Reforma",
      renovator: "Reformador",
      renovationDates: "Fechas de Reforma",
      workDates: "Fechas de obra",
      startDate: "Fecha de Inicio",
      estimatedEndDate: "Fecha Estimada de Finalización",
      estimatedVisitDate: "Fecha Estimada de Visita",
      openInitialChecklist: "Abrir Checklist Inicial",
      openFinalChecklist: "Abrir Checklist Final",
      completeInitialChecklist: "Completa el checklist inicial para evaluar el estado de la propiedad antes de comenzar las obras.",
      completeFinalChecklist: "Completa el checklist final para verificar que todas las obras se han realizado correctamente.",
      initialCheckDescription: "Completa el checklist inicial para evaluar el estado de la propiedad antes de comenzar las obras.",
      finalCheckDescription: "Completa el checklist final para verificar que todas las obras se han realizado correctamente.",
    },
    help: {
      title: "Ayuda",
      description: "¿Sobre qué necesitas ayuda?",
      selectErrorType: "¿Sobre qué necesitas ayuda?",
      propertyError: "Error relacionado con una propiedad",
      propertyErrorDescription: "Problemas específicos de una propiedad del kanban",
      generalError: "Error general de la aplicación",
      generalErrorDescription: "Problemas generales con la aplicación o funcionalidades",
      selectProperty: "Selecciona la propiedad y describe el problema.",
      selectPropertyRequired: "Propiedad",
      describeProblem: "Describe el problema",
      describeProblemRequired: "Describe el problema",
      propertyPlaceholder: "Buscar propiedad por dirección o ID...",
      propertyErrorPlaceholder: "Cuéntanos qué problema has encontrado con esta propiedad...",
      generalErrorPlaceholder: "Cuéntanos tu problema...",
      back: "Atrás",
      cancel: "Cancelar",
      send: "Enviar",
      sending: "Enviando...",
      messageSent: "Mensaje enviado",
      messageSentDescription: "Tu mensaje ha sido enviado correctamente. Te responderemos pronto.",
      errorSending: "Error al enviar",
      pleaseWriteMessage: "Por favor, escribe tu mensaje",
      pleaseSelectProperty: "Por favor, selecciona una propiedad",
      notAuthenticated: "No estás autenticado. Por favor, inicia sesión.",
      errorSavingConversation: "Error al guardar la conversación. Por favor, intenta de nuevo.",
      couldNotCreateConversation: "No se pudo crear la conversación.",
      unknownUser: "Usuario desconocido",
    },
    notifications: {
      title: "Notificaciones",
      description: "Tus conversaciones de ayuda con el equipo de soporte",
      loadingConversations: "Cargando conversaciones...",
      noConversations: "No hay conversaciones",
      noConversationsDescription: "Cuando envíes un mensaje de ayuda, aparecerá aquí junto con la respuesta del equipo.",
      propertyError: "Error relacionado con propiedad",
      generalError: "Error general de la aplicación",
      new: "Nuevo",
      property: "Propiedad",
      yourMessage: "Tu mensaje:",
      teamResponse: "Respuesta del equipo:",
      waitingForResponse: "Esperando respuesta del equipo...",
      conversationDetails: "Detalles de la Conversación",
      propertyLabel: "Propiedad:",
      close: "Cerrar",
    },
    propertyPage: {
      property: "Propiedad",
      reportProblem: "Reportar Problema",
      propertyNotFound: "Propiedad no encontrada",
      backToKanban: "Volver al kanban",
      loadingProperty: "Cargando propiedad...",
      renovationBudget: "Presupuesto de reforma",
      comingSoon: "Coming soon",
      currentDate: "Fecha actual",
      modifyDate: "Modificar fecha",
      saving: "Guardando...",
      save: "Guardar",
    },
    propertyStatusTab: {
      loadingHistory: "Cargando historial...",
      noChecklistsYet: "No hay checklists realizados aún",
      completed: "Completado",
      inProgress: "En progreso",
      created: "Creado",
      completedOn: "Completado",
      createdBy: "Creado por",
      viewDetails: "Ver detalles",
    },
    propertyCard: {
      expired: "Vencida",
      region: "Región",
      signing: "Firma",
      estimatedVisit: "Visita est.",
      next: "Próxima",
      today: "Hoy",
      workInProgress: "Obra en proceso hace",
      cleaningFurnishing: "Limpieza y amoblamiento hace",
      repairs: "Reparaciones hace",
      completed: "Finalizada hace",
      ago: "Hace",
      days: "días",
      day: "día",
      hours: "horas",
      hour: "hora",
      lessThanHour: "Hace menos de 1 hora",
      siteManager: "Jefe de Obra",
    },
    partner: {
      management: "Property Selling",
      navProperties: "Property Selling",
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
      properties: "Renovation Management",
      renoManagement: "Reno Management",
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
    login: {
      title: "Log in or create an account",
      subtitle: "Access the PropHero operations control platform",
      secureLoginButton: "Log in securely",
      createAccount: "Create an account",
      email: "Email",
      password: "Password",
      emailPlaceholder: "your@email.com",
      passwordPlaceholder: "••••••••",
      loginButton: "Log in",
      loggingIn: "Logging in...",
      forgotPassword: "Forgot your password?",
      support: "Support",
      privacy: "Privacy",
      terms: "Terms",
      copyright: "© 2025 PropHero - All rights reserved",
    },
    property: {
      title: "Property",
      management: "Renovation Management",
      addNew: "Add New Property",
      edit: "Edit Property",
      delete: "Delete Property",
      save: "Save Changes",
      submitReview: "Submit for Review",
      fullAddress: "Full Address",
      propertyType: "Property Type",
      renovationType: "Renovation Type",
      gallery: "Image Gallery",
      viewAll: "View All",
      noImagesAvailable: "No images available",
      couldNotLoadImage: "Could not load image",
      photo: "photo",
      photos: "photos",
      saveSuccess: "Data saved successfully",
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
      filters: "Filters",
      filtersDescription: "Select one or more values to filter properties. Filters are combined with OR (any of the selected).",
      renovatorName: "Renovator Name",
      searchRenovator: "Search renovator...",
      technicalConstructor: "Site Manager",
      areaCluster: "Area Cluster",
      searchAreaCluster: "Search area...",
      noValuesAvailable: "No values available",
      clearAll: "Clear All",
      applyFilters: "Apply Filters",
      // Reno Construction Manager phases
      upcomingSettlements: "Upcoming Reno",
      initialCheck: "Initial Check",
      upcoming: "Upcoming Properties",
      renoBudgetRenovator: "Pending Budget (Renovator)",
      renoBudgetClient: "Pending Budget (Client)",
      renoBudgetStart: "Reno to Start",
      renoBudget: "Reno Budget", // Legacy
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
      propertyInformation: "Property Information",
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
    upcomingSettlements: {
      estimatedVisitDate: "Estimated Visit Date",
      estimatedVisitDateDescription: "Date the Technical Constructor estimates they will perform the technical visit/inspection after the settlement",
      setupStatusNotes: "Set Up Status Notes",
      setupStatusNotesDescription: "Free-text field for critical notes regarding the status of the property's preparation for closing (e.g., \"Final repairs completed,\" \"Pending utility inspection,\" \"Ready for handover\")",
      setupStatusNotesPlaceholder: "Write your notes here",
      propertyInformation: "Property Information",
      editableFields: "Editable Fields",
      dateMustBeFuture: "Date must be in the future",
      autoVisitNote: "Initial technical visit automatically scheduled when saving the estimated visit date.",
    },
    initialCheck: {
      realSettlementDate: "Real Settlement Date",
      estimatedVisitDate: "Estimated Visit Date",
      propertyInformation: "Property Information",
    },
    finalCheck: {
      realCompletionDate: "Real Completion Date",
      estimatedFinalVisitDate: "Estimated Final Visit Date",
      propertyInformation: "Property Information",
    },
    checklist: {
      title: "Checklist",
      buenEstado: "Good condition",
      necesitaReparacion: "Needs repair",
      necesitaReemplazo: "Needs replacement",
      noAplica: "Not applicable",
      notes: "Observations",
      submitChecklist: "Submit Checklist",
      submitChecklistDescription: "Finalize and submit the completed checklist",
      photos: "Photos",
      videos: "Videos",
      whatElementsBadCondition: "What elements are in bad condition?",
      observationsPlaceholder: "Write down the details to be considered by the team of analysts and reformers",
      elements: {
        accesoPrincipal: {
          puertaEntrada: "Building entrance door",
          cerradura: "Lock",
          bombin: "Cylinder",
        },
        acabados: {
          paredes: "Walls",
          techos: "Ceilings",
          suelo: "Floor",
          rodapies: "Baseboards",
        },
        comunicaciones: {
          telefonillo: "Intercom",
          timbre: "Doorbell",
          buzon: "Mailbox",
        },
        electricidad: {
          luces: "Lights",
          interruptores: "Switches",
          tomasCorriente: "Power outlets",
          tomaTelevision: "TV outlet",
        },
        carpinteria: {
          puertasInteriores: "Interior doors",
        },
      },
      addPhotos: "Please add several photos and at least one video of this section so we can see it in detail",
      dragDropFiles: "Drag and drop files here",
      clickToBrowse: "Or click to browse (max. 10 files, 5MB each)",
      sections: {
        entornoZonasComunes: {
          title: "Surroundings and Common Areas",
          description: "Evaluate the property's context: the community, exterior accesses, and its general state. Your valuation here helps contextualize the investment.",
          portal: "Property entrance/portal",
          fachada: "Building facade",
          entorno: "Building surroundings",
          accesoPrincipal: {
            title: "Main access",
            description: "Evaluate the building's entrance door, the state of the locks and the cylinder",
            elements: {
              puertaEntrada: "Building entrance door",
              cerradura: "Lock",
              bombin: "Cylinder",
            },
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the state of the walls, ceilings, floor, and baseboards. Look for marks, wear, and humidity.",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          comunicaciones: {
            title: "Communications",
            description: "Check the intercom, doorbell, and mailbox to see if there are problems or if they are not working well.",
            elements: {
              telefonillo: "Intercom",
              timbre: "Doorbell",
              buzon: "Mailbox",
            },
          },
          electricidad: {
            title: "Electricity",
            description: "Evaluate the lights, switches, and power outlets of the room.",
            elements: {
              luces: "Lights",
              interruptores: "Switches",
              tomasCorriente: "Power outlets",
              tomaTelevision: "TV outlet",
            },
          },
          carpinteria: {
            title: "Carpentry",
            description: "Check the state of the carpentry of the community's interior doors.",
            elements: {
              puertasInteriores: "Interior doors",
            },
          },
        },
        estadoGeneral: {
          title: "General State of the Property",
          description: "Unique score for elements repeated throughout the house. Marking 'Bad condition' requires justification.",
          fotosPerspectivaGeneral: {
            title: "Photos: general perspective of the property",
            description: "Upload at least 1 photo that represents the dominant state of walls, floors, and carpentry in the property (e.g., hallway, living room, a room).",
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the condition of the walls, ceilings, floor, and baseboards. Look for marks, wear, and dampness.",
            whatElementsBadCondition: "Which elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          climatizacion: {
            title: "Climate Control",
            description: "Indicate if there are radiators or air conditioning units and if they are in good condition.",
            items: {
              radiadores: "Radiators",
              splitAc: "Split A/C Unit",
              calentadorAgua: "Water heater",
              calefaccionConductos: "Ducted heating",
            },
          },
          electricidad: {
            title: "Electricity",
            description: "Evaluate the lights, switches, and power outlets in the room.",
            whatElementsBadCondition: "Which elements are in bad condition?",
            elements: {
              luces: "Lights",
              interruptores: "Switches",
              tomasCorriente: "Power outlets",
              tomaTelevision: "TV outlet",
            },
          },
        },
        entradaPasillos: {
          title: "Entrance and hallways of the dwelling",
          description: "Detail the main access and critical electrical installation. Includes mandatory photos of the general protection panel to validate the installation.",
          cuadroGeneralElectrico: {
            title: "General electrical panel",
            description: "Clear and frontal photograph showing all magnetothermal and differential switches. This image is key to estimating the cost of the electrical renovation.",
          },
          entradaViviendaPasillos: {
            title: "Entrance to the dwelling and hallways",
            description: "Clear photographs and videos of the access door to the dwelling, of the entrance from the landing and of the hallways. Ensure that the condition of the frame, the lock and the cylinder are clearly visible.",
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the condition of the walls, ceilings, floor and baseboards. Look for marks, wear and humidity.",
            whatElementsBadCondition: "Which elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          carpinteria: {
            title: "Carpentry",
            description: "Review the condition and operation of windows, blinds, built-in wardrobes and passage doors.",
            items: {
              ventanas: "Windows",
              persianas: "Blinds",
              armarios: "Wardrobes",
            },
          },
          electricidad: {
            title: "Electricity",
            description: "Evaluate lights, switches and power outlets. Check if they work correctly.",
            whatElementsBadCondition: "Which elements are in bad condition?",
            elements: {
              luces: "Lights",
              interruptores: "Switches",
              tomasCorriente: "Power outlets",
              tomaTelevision: "TV outlet",
            },
          },
          climatizacion: {
            title: "Climate Control",
            description: "Indicate if there are radiators or air conditioning units and if they are in good condition.",
            items: {
              radiadores: "Radiators",
              splitAc: "Split A/C Unit",
            },
          },
          mobiliario: {
            title: "Furniture",
            existeMobiliario: "Furniture exists",
            elementoPuntuar: "Item to rate",
          },
        },
        habitaciones: {
          title: "Bedrooms",
          bedroom: "Bedroom",
          description: "Visual documentation of the bedrooms. Remember: The evaluation of floors, walls and carpentry has already been completed in the general status. Use the notes to highlight specific anomalies.",
          numeroHabitaciones: "Number of bedrooms in the dwelling",
          fotosVideoHabitacion: {
            title: "Photos and video of the bedroom",
            description: "The video should show a complete panoramic view of the bedroom. Prioritize lighting and make sure to include all walls, the window, and the built-in wardrobe (if it exists).",
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the condition of the walls, ceilings, floor and baseboards. Look for marks, wear and humidity.",
            whatElementsBadCondition: "Which elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          carpinteria: {
            title: "Carpentry",
            description: "Review the condition and operation of windows, blinds, built-in wardrobes and passage doors.",
            items: {
              ventanas: "Windows",
              persianas: "Blinds",
              armarios: "Wardrobes",
            },
            puertaEntrada: "Entrance door",
          },
          electricidad: {
            title: "Electricity",
            description: "Evaluate lights, switches and power outlets. Check if they work correctly.",
            whatElementsBadCondition: "Which elements are in bad condition?",
            elements: {
              luces: "Lights",
              interruptores: "Switches",
              tomasCorriente: "Power outlets",
              tomaTelevision: "TV outlet",
            },
          },
          climatizacion: {
            title: "Climate Control",
            description: "Indicate if there are radiators or air conditioning units and if they are in good condition.",
            items: {
              radiadores: "Radiators",
              splitAc: "Split A/C Unit",
            },
          },
          mobiliario: {
            title: "Furniture",
            existeMobiliario: "Furniture exists",
          },
        },
        salon: {
          title: "Living Room",
          description: "Visual documentation of the Living Room. The video should provide a complete view of the main space layout.",
          fotosVideoSalon: {
            title: "Living room photos and video",
            description: "Video showing the flow and layout of the Living Room. The photo should capture the maximum breadth of the space.",
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the condition of walls, ceilings, floors, and baseboards. Look for marks, wear, and humidity.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          carpinteria: {
            title: "Carpentry",
            description: "Review the condition and operation of windows, blinds, built-in wardrobes, and passage door.",
            items: {
              ventanas: "Windows",
              persianas: "Blinds",
              armarios: "Wardrobes",
            },
            puertaEntrada: "Entrance door",
          },
          electricidad: {
            title: "Electricity",
            description: "Evaluate lights, switches, and power outlets. Check if they work correctly.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              luces: "Lights",
              interruptores: "Switches",
              tomasCorriente: "Power outlets",
              tomaTelevision: "TV outlet",
            },
          },
          climatizacion: {
            title: "Climate Control",
            description: "Indicate if there are radiators or air conditioning units and if they are in good condition.",
            items: {
              radiadores: "Radiators",
              splitAc: "Split A/C Unit",
            },
          },
          mobiliario: {
            existeMobiliario: "Furniture exists",
            elementoPuntuar: "Element to rate",
          },
        },
        banos: {
          title: "Bathrooms",
          bathroom: "Bathroom",
          description: "Detailed inspection of wet areas. This evaluation focuses on the condition of plumbing, drainage, and sanitary fixtures. The assessment of each bathroom is independent.",
          fotosVideoBano: {
            title: "Bathroom photos and video",
            description: "Video focused on the condition of sanitary fixtures, faucets, and shower/bathtub. Include a photo of tiles and grout if mold, humidity, or any damage has been detected.",
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the condition of walls, ceilings, floors, and baseboards. Look for marks, wear, and humidity.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          aguaDrenaje: {
            title: "Water and drainage",
            description: "Review cold and hot water points, as well as drainage systems.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              puntosAgua: "Cold and hot water points",
              desagues: "Drains",
            },
          },
          sanitarios: {
            title: "Sanitary fixtures",
            description: "Check that the toilet, sink, and shower or bathtub are in good condition, without leaks or damage.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              platoDuchaBanera: "Shower tray / Bathtub",
              inodoro: "Toilet (Viter)",
              lavabo: "Sink (Roca)",
            },
          },
          griferiaDucha: {
            title: "Faucets and shower or bathtub",
            description: "Verify the condition of faucets and shower screen or curtain.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              grifos: "Faucets",
              mamparaCortina: "Shower screen / Curtain",
            },
          },
          carpinteria: {
            title: "Carpentry",
            description: "Review the condition and operation of windows, blinds, built-in wardrobes, and passage door.",
            items: {
              ventanas: "Windows",
              persianas: "Blinds",
            },
            puertaEntrada: "Entrance door",
          },
          mobiliario: {
            title: "Furniture",
            description: "Review the condition of the sink cabinet, mirror, and accessories like the towel rack or toilet paper holder.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              muebleLavabo: "Sink cabinet",
              espejo: "Mirror",
              toalleroPortapapeles: "Towel rack / Toilet paper holder",
            },
          },
          ventilacion: {
            title: "Ventilation",
            description: "Indicate if the bathroom has a window or a forced ventilation system (extraction) and evaluate its condition.",
          },
        },
        cocina: {
          title: "Kitchen",
          description: "Detailed inspection of fixed furniture, water, and appliances. Please ensure maximum precision in the state of the modules and the countertop.",
          fotosVideoCocina: {
            title: "Kitchen photos and video",
            description: "Video showing fixed furniture (modules, countertop) and appliances in context. The photo must capture the general state of the countertop and fronts.",
          },
          acabados: {
            title: "Finishes",
            description: "Evaluate the condition of walls, ceilings, floors, and baseboards. Look for marks, wear, and humidity.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          mobiliarioFijo: {
            title: "Fixed Furniture",
            description: "Review the state of the base and wall units, the countertop, and the plinth. Check that they are well-secured and without visible damage.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              modulosBajos: "Base units",
              modulosAltos: "Wall units",
              encimera: "Countertop",
              zocalo: "Plinth",
            },
          },
          aguaDrenaje: {
            title: "Water and drainage",
            description: "Verify the state of the sink and faucet. Make sure there are no leaks and that the drain works correctly.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              grifo: "Faucet",
              fregadero: "Sink",
            },
          },
          carpinteria: {
            title: "Carpentry",
            description: "Review the state and functioning of windows, blinds, built-in wardrobes, and interior doors.",
            items: {
              ventanas: "Windows",
              persianas: "Blinds",
            },
            puertaEntrada: "Entrance door",
          },
          almacenamiento: {
            title: "Storage",
            items: {
              armariosDespensa: "Pantry cupboards",
              cuartoLavado: "Laundry room",
            },
          },
          electrodomesticos: {
            title: "Appliances",
            items: {
              placaGas: "Gas hob",
              placaVitroInduccion: "Ceramic or Induction hob",
              campanaExtractora: "Extractor hood",
              horno: "Oven",
              nevera: "Refrigerator",
              lavadora: "Washing machine",
              lavavajillas: "Dishwasher",
              microondas: "Microwave",
            },
          },
        },
        exteriores: {
          title: "Property Exteriors",
          description: "Evaluate the elements of the property with exterior access (balconies, terraces, clotheslines). Prioritize safety (railings and grilles) and exterior finishes.",
          fotosVideoExterior: {
            title: "Exterior photos and video (terrace, balcony or patio)",
            description: "Document the views, the condition of the pavement and safety (railings, grilles). Indicate if access is enabled and if it applies to the property.",
          },
          seguridad: {
            title: "Security",
            items: {
              barandillas: "Railings",
              rejas: "Grilles",
            },
          },
          sistemas: {
            title: "Systems",
            items: {
              tendederoExterior: "Exterior clothesline",
              toldos: "Awnings",
            },
          },
          acabadosExteriores: {
            title: "Exterior finishes",
            description: "Evaluate the condition of walls, ceilings, floors and baseboards. Check for wear, damage or signs of humidity.",
            whatElementsBadCondition: "What elements are in bad condition?",
            elements: {
              paredes: "Walls",
              techos: "Ceilings",
              suelo: "Floor",
              rodapies: "Baseboards",
            },
          },
          observaciones: {
            title: "Observations",
            placeholder: "Write down the details to be considered by the team of analysts and reformers",
          },
        },
      },
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
      recentProperties: "Active Works",
      recentPropertiesDescription: "Active works grouped by renovator",
      activeWorksByRenovator: "Active Works",
      activeWorksByRenovatorDescription: "Active works grouped by renovator",
      viewMore: "View more",
      fullRanking: "Full Ranking",
      back: "Back",
      worksByPartner: "Works by",
      portfolio: "Portfolio",
      portfolioDescription: "Distribution of properties by phase",
      totalPortfolioValue: "Total portfolio value",
      // Reno Construction Manager Dashboard
      activeWorks: "Active Works",
      activeWorksDescription: "Properties in renovation phase",
      visitsToday: "Visits for Today",
      visitsTodayDescription: "Scheduled updates or checks",
      totalVisitsMonth: "Total visits made in the month",
      totalVisitsMonthDescription: "Visits completed this month",
      checksForToday: "Checks to execute today",
      checksForTodayDescription: "Initial and final checks scheduled for today",
      workStatusVisitsToday: "Work status visits today",
      workStatusVisitsTodayDescription: "Work status visits scheduled for today",
      upcomingVisits: "Upcoming Visits",
      upcomingVisitsDescription: "Scheduled work status visits",
      addNewVisit: "Add new visit",
      noChecksScheduled: "No checks scheduled for today",
      noVisitsScheduled: "No visits scheduled",
      checks: "Checks",
      visits: "Visits",
    },
    calendar: {
      title: "Visits Calendar",
      subtitle: "Initial checklist, final checklist and work follow-up",
      day: "Day",
      week: "Week",
      today: "Today",
      create: "Create",
      createVisit: "Create Visit",
      createReminder: "Create Reminder",
      visitType: "Visit Type",
      property: "Property",
      selectProperty: "Select a property",
      dateTime: "Date and time",
      notes: "Notes (optional)",
      notesPlaceholder: "Add notes about the visit...",
      dateTimePlaceholder: "DD/MM/YYYY HH:mm",
      dateTimeError: "Date and time must be in the future",
      cancel: "Cancel",
      creating: "Creating...",
      visitCreated: "Visit created successfully",
      reminderCreated: "Reminder created successfully",
      visitCreateError: "Error creating visit",
      selectPropertyAndDate: "You must select a property and a date",
      noPropertiesAssigned: "No properties assigned to your role",
      noPropertiesAvailable: "No properties available for this type of visit",
      address: "Address",
      lastComment: "Last comment",
      close: "Close",
      goToTask: "Go to task",
      noVisits: "No visits",
      loading: "Loading...",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      saving: "Saving...",
      visitUpdated: "Visit updated successfully",
      reminderUpdated: "Reminder updated successfully",
      visitDeleted: "Visit deleted successfully",
      reminderDeleted: "Reminder deleted successfully",
      visitUpdateError: "Error updating visit",
      visitDeleteError: "Error deleting visit",
      deleteVisitConfirm: "Are you sure you want to delete this visit?",
      deleteReminderConfirm: "Are you sure you want to delete this reminder?",
      visitTypes: {
        initialCheck: "Initial Check",
        finalCheck: "Final Check",
        obraSeguimiento: "Work Follow-up",
        reminder: "Reminder",
        visit: "Visit",
      },
    },
    comments: {
      placeholder: "Write a comment... Use @ to mention users",
      addReminder: "Add reminder",
      reminder: "Reminder",
      reminderDateTime: "Reminder date and time",
      reminderDateTimePlaceholder: "DD/MM/YYYY HH:mm",
      reminderDateTimeError: "Date and time must be in the future",
      saving: "Saving...",
      createReminder: "Create Reminder",
      add: "Add",
      history: "Comments History",
      loading: "Loading...",
      noComments: "No comments yet",
      remindAt: "Remind at",
      syncedToAirtable: "Synced to Airtable",
      deleteConfirm: "Are you sure you want to delete this comment?",
    },
    propertyTabs: {
      tasks: "Tasks",
      summary: "Summary",
      propertyStatus: "Property Status",
      renovationBudget: "Renovation Budget",
      comments: "Comments & Reminders",
    },
    propertySidebar: {
      createdOn: "Created on",
      dataCompleted: "Data completed",
      pending: "Pending",
      completeInitialChecklist: "Complete initial checklist",
      completeFinalChecklist: "Complete final checklist",
      completeNewSettlementsInfo: "Complete new settlements information",
      technicalConstructor: "Site Manager",
      siteManager: "Responsible Owner",
      reminders: "Reminders",
      comments: "Comments",
      checklistInProgress: "Checklist in progress",
      continueChecklist: "Continue checklist",
      noChecklistStarted: "No checklist started yet",
      openChecklist: "Open Checklist",
      startChecklist: "Start Checklist",
      propertyCreatedOn: "Property created on",
      noPendingReminders: "No pending reminders",
    },
    propertyAction: {
      preparationStatus: "Preparation Status",
      nextRenoSteps: "Next Renovation Steps",
      renovator: "Renovator",
      renovationDates: "Renovation Dates",
      workDates: "Work Dates",
      startDate: "Start Date",
      estimatedEndDate: "Estimated End Date",
      estimatedVisitDate: "Estimated Visit Date",
      openInitialChecklist: "Open Initial Checklist",
      openFinalChecklist: "Open Final Checklist",
      completeInitialChecklist: "Complete the initial checklist to evaluate the property's status before starting the works.",
      completeFinalChecklist: "Complete the final checklist to verify that all works have been completed correctly.",
      initialCheckDescription: "Complete the initial checklist to evaluate the property's status before starting the works.",
      finalCheckDescription: "Complete the final checklist to verify that all works have been completed correctly.",
    },
    propertyPage: {
      property: "Property",
      reportProblem: "Report Problem",
      propertyNotFound: "Property not found",
      backToKanban: "Back to kanban",
      loadingProperty: "Loading property...",
      renovationBudget: "Renovation Budget",
      comingSoon: "Coming soon",
      currentDate: "Current date",
      modifyDate: "Modify date",
      saving: "Saving...",
      save: "Save",
    },
    propertyStatusTab: {
      loadingHistory: "Loading history...",
      noChecklistsYet: "No checklists completed yet",
      completed: "Completed",
      inProgress: "In progress",
      created: "Created",
      completedOn: "Completed",
      createdBy: "Created by",
      viewDetails: "View details",
    },
    propertyCard: {
      expired: "Expired",
      region: "Region",
      signing: "Signing",
      estimatedVisit: "Est. visit",
      next: "Next",
      today: "Today",
      workInProgress: "Work in progress",
      cleaningFurnishing: "Cleaning & furnishing",
      repairs: "Repairs",
      completed: "Completed",
      ago: "Ago",
      days: "days",
      day: "day",
      hours: "hours",
      hour: "hour",
      lessThanHour: "Less than 1 hour ago",
      siteManager: "Site Manager",
    },
    partner: {
      management: "Property Selling",
      navProperties: "Property Selling",
    },
    help: {
      title: "Help",
      description: "What do you need help with?",
      selectErrorType: "What do you need help with?",
      propertyError: "Error related to a property",
      propertyErrorDescription: "Specific issues with a property from the kanban",
      generalError: "General application error",
      generalErrorDescription: "General problems with the application or features",
      selectProperty: "Select the property and describe the problem.",
      selectPropertyRequired: "Property",
      describeProblem: "Describe the problem",
      describeProblemRequired: "Describe the problem",
      propertyPlaceholder: "Search property by address or ID...",
      propertyErrorPlaceholder: "Tell us what problem you found with this property...",
      generalErrorPlaceholder: "Tell us your problem...",
      back: "Back",
      cancel: "Cancel",
      send: "Send",
      sending: "Sending...",
      messageSent: "Message sent",
      messageSentDescription: "Your message has been sent successfully. We will respond soon.",
      errorSending: "Error sending",
      pleaseWriteMessage: "Please write your message",
      pleaseSelectProperty: "Please select a property",
      notAuthenticated: "You are not authenticated. Please log in.",
      errorSavingConversation: "Error saving conversation. Please try again.",
      couldNotCreateConversation: "Could not create conversation.",
      unknownUser: "Unknown user",
    },
    notifications: {
      title: "Notifications",
      description: "Your help conversations with the support team",
      loadingConversations: "Loading conversations...",
      noConversations: "No conversations",
      noConversationsDescription: "When you send a help message, it will appear here along with the team's response.",
      propertyError: "Error related to property",
      generalError: "General application error",
      new: "New",
      property: "Property",
      yourMessage: "Your message:",
      teamResponse: "Team response:",
      waitingForResponse: "Waiting for team response...",
      conversationDetails: "Conversation Details",
      propertyLabel: "Property:",
      close: "Close",
    },
  },
};

