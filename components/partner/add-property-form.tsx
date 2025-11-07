"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  PropertyType,
  createProperty,
  saveProperty,
  checkDuplicateProperty,
} from "@/lib/property-storage";
import {
  simulateAutocomplete,
  AutocompletePrediction,
} from "@/lib/maps-simulation";
import { PROPERTY_TYPES } from "@/lib/constants";

interface AddPropertyFormProps {
  onSuccess?: (propertyId: string) => void;
  showTitle?: boolean;
}

export function AddPropertyForm({ onSuccess, showTitle = false }: AddPropertyFormProps) {
  const router = useRouter();
  const [fullAddress, setFullAddress] = useState("");
  const [planta, setPlanta] = useState("");
  const [puerta, setPuerta] = useState("");
  const [bloque, setBloque] = useState("");
  const [escalera, setEscalera] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  
  // Validation states
  const [errors, setErrors] = useState<{
    fullAddress?: string;
    propertyType?: string;
    general?: string;
  }>({});
  
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Handle autocomplete
  useEffect(() => {
    if (fullAddress.length >= 3) {
      simulateAutocomplete(fullAddress, (results) => {
        setPredictions(results);
        setShowPredictions(true);
      });
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  }, [fullAddress]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target as Node)
      ) {
        setShowPredictions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check for duplicates when address or auxiliary fields change
  useEffect(() => {
    if (
      fullAddress.trim() &&
      propertyType &&
      !errors.fullAddress &&
      !errors.propertyType
    ) {
      setIsCheckingDuplicate(true);
      
      // Debounce duplicate check
      const timer = setTimeout(() => {
        const duplicate = checkDuplicateProperty(
          fullAddress,
          planta || undefined,
          puerta || undefined,
          bloque || undefined,
          escalera || undefined
        );
        
        setIsDuplicate(!!duplicate);
        setIsCheckingDuplicate(false);
      }, 500);

      return () => clearTimeout(timer);
    } else {
      setIsDuplicate(false);
      setIsCheckingDuplicate(false);
    }
  }, [fullAddress, planta, puerta, bloque, escalera, propertyType, errors]);

  const handleSelectPrediction = (prediction: AutocompletePrediction) => {
    setFullAddress(prediction.description);
    setShowPredictions(false);
  };

  const handleSubmit = () => {
    // Reset errors
    setErrors({});

    // Validate required fields
    if (!fullAddress.trim()) {
      setErrors((prev) => ({
        ...prev,
        fullAddress: "La dirección completa es obligatoria",
      }));
      return;
    }

    if (!propertyType) {
      setErrors((prev) => ({
        ...prev,
        propertyType: "El tipo de propiedad es obligatorio",
      }));
      return;
    }

    // Check for duplicate again
    if (isDuplicate) {
      setErrors({
        general: "Ya existe una propiedad con esta dirección exacta subida anteriormente por ti",
      });
      return;
    }

    // Create property
    const property = createProperty(
      fullAddress.trim(),
      propertyType as PropertyType,
      planta.trim() || undefined,
      puerta.trim() || undefined,
      bloque.trim() || undefined,
      escalera.trim() || undefined
    );

    // Save to localStorage
    saveProperty(property);
    
    console.log("Property created:", property.id);
    console.log("onSuccess callback:", onSuccess ? "exists" : "does not exist");

    // Call success callback if provided, otherwise redirect
    if (onSuccess) {
      console.log("Calling onSuccess with property id:", property.id);
      try {
        onSuccess(property.id);
      } catch (error) {
        console.error("Error in onSuccess callback:", error);
        // Fallback: use window.location for hard navigation
        window.location.href = `/partner/property/${property.id}/edit`;
      }
    } else {
      console.log("No onSuccess, redirecting to:", `/partner/property/${property.id}/edit`);
      // Use window.location for hard navigation to avoid RSC fetch issues
      window.location.href = `/partner/property/${property.id}/edit`;
    }
  };

  const isFormValid = 
    fullAddress.trim() !== "" && 
    propertyType !== "" && 
    !isDuplicate &&
    !isCheckingDuplicate;

  return (
    <div className="space-y-6 py-4">
      {showTitle && (
        <h1 className="text-2xl font-bold">Añadir una nueva propiedad</h1>
      )}

      {/* Duplicate Warning */}
      {isDuplicate && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Ya existe una propiedad con esta dirección exacta subida anteriormente por ti
          </p>
        </div>
      )}

      {/* General Error */}
      {errors.general && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
        </div>
      )}

      {/* Full Address Field */}
      <div className="space-y-2">
        <Label htmlFor="fullAddress" className="text-sm font-semibold">
          Dirección completa del inmueble <span className="text-red-500">*</span>
        </Label>
        <div className="relative" ref={autocompleteRef}>
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            id="fullAddress"
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            placeholder="Escribe la dirección..."
            className={cn(
              "pl-10",
              errors.fullAddress && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          
          {/* Autocomplete predictions */}
          {showPredictions && predictions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-card dark:bg-[var(--prophero-gray-900)] border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
              {predictions.map((prediction, index) => (
                <button
                  key={prediction.placeId}
                  type="button"
                  onClick={() => handleSelectPrediction(prediction)}
                  className="w-full text-left px-4 py-2 hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-800)] transition-colors first:rounded-t-md last:rounded-b-md"
                >
                  <div className="font-medium text-sm">
                    {prediction.structuredFormatting.mainText}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {prediction.structuredFormatting.secondaryText}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.fullAddress && (
          <p className="text-sm text-red-500">{errors.fullAddress}</p>
        )}
      </div>

      {/* Auxiliary Address Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="planta" className="text-sm font-semibold">
            Planta <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
          </Label>
          <Input
            id="planta"
            value={planta}
            onChange={(e) => setPlanta(e.target.value)}
            placeholder="Ej: 1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="puerta" className="text-sm font-semibold">
            Puerta <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
          </Label>
          <Input
            id="puerta"
            value={puerta}
            onChange={(e) => setPuerta(e.target.value)}
            placeholder="Ej: 1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bloque" className="text-sm font-semibold">
            Bloque <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
          </Label>
          <Input
            id="bloque"
            value={bloque}
            onChange={(e) => setBloque(e.target.value)}
            placeholder="Ej: A"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="escalera" className="text-sm font-semibold">
            Escalera <span className="text-xs text-muted-foreground font-normal">(Opcional)</span>
          </Label>
          <Input
            id="escalera"
            value={escalera}
            onChange={(e) => setEscalera(e.target.value)}
            placeholder="Ej: 1"
          />
        </div>
      </div>

      {/* Property Type */}
      <div className="space-y-2">
        <Label htmlFor="propertyType" className="text-sm font-semibold">
          Tipo de propiedad <span className="text-red-500">*</span>
        </Label>
        <Select
          value={propertyType}
          onValueChange={(value) => setPropertyType(value as PropertyType)}
        >
          <SelectTrigger
            id="propertyType"
            className={cn(
              errors.propertyType && "border-red-500 focus:ring-red-500"
            )}
          >
            <SelectValue placeholder="Selecciona un tipo" />
          </SelectTrigger>
          <SelectContent position="popper" side="bottom" sideOffset={4} className="max-h-[200px] overflow-y-auto">
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.propertyType && (
          <p className="text-sm text-red-500">{errors.propertyType}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid}
          className="w-full h-12 text-base font-semibold"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Crear nueva propiedad
        </Button>
      </div>
    </div>
  );
}


