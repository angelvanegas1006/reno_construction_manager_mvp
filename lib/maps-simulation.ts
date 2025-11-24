// Simulated Google Maps API autocomplete
// In production, this would call the actual Google Maps Places API

export interface AutocompletePrediction {
  description: string;
  placeId: string;
  structuredFormatting: {
    mainText: string;
    secondaryText: string;
  };
}

// Simulated addresses for autocomplete
const MOCK_ADDRESSES = [
  "Calle Martinez de la Rosa 43, 08014 Barcelona, España",
  "Calle Gran Vía 12, 28013 Madrid, España",
  "Paseo de Gracia 89, 08008 Barcelona, España",
  "Avenida Diagonal 345, 08013 Barcelona, España",
  "Calle Serrano 15, 28001 Madrid, España",
  "Rambla Catalunya 234, 08008 Barcelona, España",
  "Calle Provença 156, 08036 Barcelona, España",
  "Calle Valencia 78, 28012 Madrid, España",
  "Passeig de Sant Joan 124, 08037 Barcelona, España",
  "Calle Princesa 45, 28008 Madrid, España",
  "Calle Diputació 345, 08013 Barcelona, España",
  "Calle Velázquez 89, 28006 Madrid, España",
  "Calle Mallorca 234, 08008 Barcelona, España",
  "Calle Génova 12, 28004 Madrid, España",
  "Calle Aragó 234, 08007 Barcelona, España",
  "Calle Claudio Coello 89, 28006 Madrid, España",
  "Calle Passeig de Gràcia 92, 08008 Barcelona, España",
];

// Simulate Google Maps Places Autocomplete
export function simulateAutocomplete(
  input: string,
  callback: (predictions: AutocompletePrediction[]) => void
): void {
  if (!input || input.length < 3) {
    callback([]);
    return;
  }

  const query = input.toLowerCase();
  
  // Simulate API delay
  setTimeout(() => {
    const predictions = MOCK_ADDRESSES.filter((addr) =>
      addr.toLowerCase().includes(query)
    )
      .slice(0, 5) // Limit to 5 results
      .map((addr, index) => ({
        description: addr,
        placeId: `mock_place_${index}`,
        structuredFormatting: {
          mainText: addr.split(",")[0],
          secondaryText: addr.split(",").slice(1).join(",").trim(),
        },
      }));

    callback(predictions);
  }, 200); // Simulate network delay
}

// Simulate getting place details and standardized address
export function simulateGetPlaceDetails(
  placeId: string,
  callback: (address: string) => void
): void {
  // In production, this would call Google Maps Place Details API
  // For now, we just return the address as-is since we're using mock data
  setTimeout(() => {
    const address = MOCK_ADDRESSES.find((_, index) => 
      `mock_place_${index}` === placeId
    ) || "";
    
    callback(address || "");
  }, 100);
}











