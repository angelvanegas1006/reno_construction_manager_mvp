"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChecklistData,
  ChecklistSection,
  ChecklistType,
  getChecklist,
  createChecklist,
  updateChecklistSection,
  saveChecklist,
} from "@/lib/checklist-storage";

interface UseChecklistProps {
  propertyId: string;
  checklistType: ChecklistType;
}

interface UseChecklistReturn {
  checklist: ChecklistData | null;
  isLoading: boolean;
  updateSection: (sectionId: string, sectionData: Partial<ChecklistSection>) => void;
  save: () => void;
}

export function useChecklist({
  propertyId,
  checklistType,
}: UseChecklistProps): UseChecklistReturn {
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!propertyId) {
      setIsLoading(false);
      return;
    }

    const existing = getChecklist(propertyId, checklistType);
    if (existing) {
      setChecklist(existing);
    } else {
      // Create new checklist with initial structure for all sections
      const newChecklist = createChecklist(propertyId, checklistType, {
        "entorno-zonas-comunes": {
          id: "entorno-zonas-comunes",
          uploadZones: [
            { id: "portal", photos: [], videos: [] },
            { id: "fachada", photos: [], videos: [] },
            { id: "entorno", photos: [], videos: [] },
          ],
          questions: [
            { id: "acceso-principal" },
            { id: "acabados" },
            { id: "comunicaciones" },
            { id: "electricidad" },
            { id: "carpinteria" },
          ],
        },
        "estado-general": {
          id: "estado-general",
          uploadZones: [
            { id: "perspectiva-general", photos: [], videos: [] },
          ],
          questions: [
            { id: "acabados" },
            { id: "electricidad" },
          ],
          climatizationItems: [
            { id: "radiadores", cantidad: 0 },
            { id: "split-ac", cantidad: 0 },
            { id: "calentador-agua", cantidad: 0 },
            { id: "calefaccion-conductos", cantidad: 0 },
          ],
        },
              "entrada-pasillos": {
                id: "entrada-pasillos",
                uploadZones: [
                  { id: "cuadro-general-electrico", photos: [], videos: [] },
                  { id: "entrada-vivienda-pasillos", photos: [], videos: [] },
                ],
                questions: [
                  { id: "acabados" },
                  { id: "electricidad" },
                ],
                carpentryItems: [
                  { id: "ventanas", cantidad: 0 },
                  { id: "persianas", cantidad: 0 },
                  { id: "armarios", cantidad: 0 },
                ],
                climatizationItems: [
                  { id: "radiadores", cantidad: 0 },
                  { id: "split-ac", cantidad: 0 },
                ],
                mobiliario: {
                  existeMobiliario: false,
                },
              },
        "habitaciones": {
          id: "habitaciones",
          dynamicItems: [],
          dynamicCount: 0,
        },
        "salon": {
          id: "salon",
          questions: [],
        },
        "banos": {
          id: "banos",
          dynamicItems: [],
          dynamicCount: 0,
        },
        "cocina": {
          id: "cocina",
          questions: [],
        },
        "exteriores": {
          id: "exteriores",
          questions: [],
        },
      });
      setChecklist(newChecklist);
    }
    setIsLoading(false);
  }, [propertyId, checklistType]);

  const updateSection = useCallback(
    (sectionId: string, sectionData: Partial<ChecklistSection>) => {
      console.log("=== useChecklist.updateSection START ===");
      console.log("sectionId:", sectionId);
      console.log("sectionData:", sectionData);
      console.log("sectionData.dynamicItems:", sectionData.dynamicItems);
      
      setChecklist((prevChecklist) => {
        console.log("setChecklist callback - prevChecklist:", prevChecklist);
        if (!prevChecklist) {
          console.log("prevChecklist is null, returning null");
          return null;
        }

        const currentSection = prevChecklist.sections[sectionId] || {};
        console.log("currentSection:", currentSection);
        console.log("currentSection.dynamicItems:", currentSection.dynamicItems);
        
        // Create a new section object to ensure React detects the change
        const updatedSection: ChecklistSection = {
          ...currentSection,
          ...sectionData,
        };

        // Ensure dynamicItems is a new array reference if it's being updated
        // Also create deep copies of the objects inside the array to ensure React detects changes
        if (sectionData.dynamicItems !== undefined) {
          console.log("sectionData.dynamicItems before map:", sectionData.dynamicItems);
          if (sectionData.dynamicItems.length > 0 && sectionData.dynamicItems[0].carpentryItems) {
            const ventanasBefore = sectionData.dynamicItems[0].carpentryItems.find(i => i.id === "ventanas");
            console.log("ventanas in sectionData.dynamicItems[0] before map:", ventanasBefore);
          }
          
          // Create deep copies of all objects in the array
          updatedSection.dynamicItems = sectionData.dynamicItems.map(item => ({
            ...item,
            carpentryItems: item.carpentryItems ? item.carpentryItems.map(cItem => ({ ...cItem })) : undefined,
            climatizationItems: item.climatizationItems ? item.climatizationItems.map(cItem => ({ ...cItem })) : undefined,
            questions: item.questions ? item.questions.map(q => ({ ...q })) : undefined,
            uploadZone: item.uploadZone ? { ...item.uploadZone } : undefined,
            mobiliario: item.mobiliario ? { ...item.mobiliario } : undefined,
          }));
          
          console.log("Created new dynamicItems array with deep copies:", updatedSection.dynamicItems);
          if (updatedSection.dynamicItems.length > 0 && updatedSection.dynamicItems[0].carpentryItems) {
            const ventanasAfter = updatedSection.dynamicItems[0].carpentryItems.find(i => i.id === "ventanas");
            console.log("ventanas in updatedSection.dynamicItems[0] after map:", ventanasAfter);
          }
        }

        const updatedSections = {
          ...prevChecklist.sections,
          [sectionId]: updatedSection,
        };

        const updatedChecklist: ChecklistData = {
          ...prevChecklist,
          sections: updatedSections,
        };

        console.log("updatedChecklist:", updatedChecklist);
        console.log("updatedChecklist.sections[sectionId]:", updatedChecklist.sections[sectionId]);
        console.log("updatedChecklist.sections[sectionId].dynamicItems:", updatedChecklist.sections[sectionId].dynamicItems);
        if (updatedChecklist.sections[sectionId].dynamicItems && updatedChecklist.sections[sectionId].dynamicItems.length > 0) {
          console.log("updatedChecklist.sections[sectionId].dynamicItems[0]:", updatedChecklist.sections[sectionId].dynamicItems[0]);
          console.log("updatedChecklist.sections[sectionId].dynamicItems[0].carpentryItems:", updatedChecklist.sections[sectionId].dynamicItems[0].carpentryItems);
          if (updatedChecklist.sections[sectionId].dynamicItems[0].carpentryItems) {
            const ventanas = updatedChecklist.sections[sectionId].dynamicItems[0].carpentryItems.find(i => i.id === "ventanas");
            console.log("ventanas item:", ventanas);
          }
        }

        // Persist to localStorage
        updateChecklistSection(propertyId, checklistType, sectionId, sectionData);
        
        console.log("=== useChecklist.updateSection END ===");
        return updatedChecklist;
      });
    },
    [propertyId, checklistType]
  );

  const save = useCallback(() => {
    if (!checklist) return;
    saveChecklist(checklist);
  }, [checklist]);

  return {
    checklist,
    isLoading,
    updateSection,
    save,
  };
}

