"use client";

import { useState, useCallback, useMemo } from "react";
import { PropertyData } from "@/lib/property-storage";

interface UsePropertyUIStateReturn {
  activeSection: string;
  hasUnsavedChanges: boolean;
  showDeleteModal: boolean;
  isMobileMenuOpen: boolean;
  expandedGroups: string[];
  showInquilino: boolean;
  setActiveSection: (section: string) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setShowDeleteModal: (show: boolean) => void;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  toggleGroup: (groupId: string) => void;
  handleSectionClick: (sectionId: string) => void;
  markAsChanged: () => void;
  markAsSaved: () => void;
}

export function usePropertyUIState(propertyData?: PropertyData): UsePropertyUIStateReturn {
  const [activeSection, setActiveSection] = useState("info-propiedad");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([
    "datos-basicos",
    "propietario-ocupacion", 
    "estado-caracteristicas",
  ]);

  // Derived state - memoized for performance
  const showInquilino = useMemo(() => {
    return propertyData?.propiedadAlquilada === true;
  }, [propertyData?.propiedadAlquilada]);

  // Actions
  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const handleSectionClick = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
  }, []);

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const markAsSaved = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  return {
    activeSection,
    hasUnsavedChanges,
    showDeleteModal,
    isMobileMenuOpen,
    expandedGroups,
    showInquilino,
    setActiveSection,
    setHasUnsavedChanges,
    setShowDeleteModal,
    setIsMobileMenuOpen,
    toggleGroup,
    handleSectionClick,
    markAsChanged,
    markAsSaved,
  };
}
