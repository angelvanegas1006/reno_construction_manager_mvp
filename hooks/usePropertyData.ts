"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getPropertyById,
  updateProperty,
  deleteProperty,
  submitPropertyToReview,
  Property,
  PropertyData,
} from "@/lib/property-storage";
import { calculateOverallProgress, getAllSectionsProgress, validateForSubmission } from "@/lib/property-validation";

interface UsePropertyDataReturn {
  property: Property | null;
  isLoading: boolean;
  error: string | null;
  overallProgress: number;
  sectionsProgress: ReturnType<typeof getAllSectionsProgress>;
  canSubmit: boolean;
  updatePropertyData: (data: Partial<PropertyData>) => Promise<void>;
  saveProperty: () => Promise<void>;
  submitToReview: () => Promise<void>;
  deletePropertyById: () => Promise<void>;
}

export function usePropertyData(): UsePropertyDataReturn {
  const params = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state - memoized for performance
  const propertyData = property?.data;
  const overallProgress = propertyData ? calculateOverallProgress(propertyData) : 0;
  const sectionsProgress = propertyData ? getAllSectionsProgress(propertyData) : [];
  const canSubmit = propertyData ? validateForSubmission(propertyData).isValid : false;

  // Data fetching
  const loadProperty = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      if (!params.id || typeof params.id !== "string") {
        throw new Error("Property ID is required");
      }

      const foundProperty = getPropertyById(params.id);
      if (!foundProperty) {
        throw new Error("Property not found");
      }

      setProperty(foundProperty);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load property";
      setError(errorMessage);
      console.error("Error loading property:", err);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  // Effects
  useEffect(() => {
    loadProperty();
  }, [loadProperty]);

  // Actions
  const updatePropertyData = useCallback(async (data: Partial<PropertyData>) => {
    if (!property) return;

    try {
      const updatedProperty = {
        ...property,
        data: { ...property.data, ...data },
        lastSaved: new Date().toISOString(),
      };

      updateProperty(updatedProperty.id, updatedProperty);
      setProperty(updatedProperty);
    } catch (err) {
      console.error("Error updating property data:", err);
      throw err;
    }
  }, [property]);

  const saveProperty = useCallback(async () => {
    if (!property) return;

    try {
      const updatedProperty = {
        ...property,
        lastSaved: new Date().toISOString(),
      };

      updateProperty(updatedProperty.id, updatedProperty);
      setProperty(updatedProperty);
    } catch (err) {
      console.error("Error saving property:", err);
      throw err;
    }
  }, [property]);

  const submitToReview = useCallback(async () => {
    if (!property) return;

    try {
      submitPropertyToReview(property.id);
      // Reload the property to get updated data
      const updatedProperty = getPropertyById(property.id);
      if (updatedProperty) {
        setProperty(updatedProperty);
      }
    } catch (err) {
      console.error("Error submitting property to review:", err);
      throw err;
    }
  }, [property]);

  const deletePropertyById = useCallback(async () => {
    if (!property) return;

    try {
      deleteProperty(property.id);
      setProperty(null);
    } catch (err) {
      console.error("Error deleting property:", err);
      throw err;
    }
  }, [property]);

  return {
    property,
    isLoading,
    error,
    overallProgress,
    sectionsProgress,
    canSubmit,
    updatePropertyData,
    saveProperty,
    submitToReview,
    deletePropertyById,
  };
}
