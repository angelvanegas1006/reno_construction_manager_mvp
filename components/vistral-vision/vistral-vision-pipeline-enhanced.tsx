"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Property } from "@/lib/property-storage";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { MapPin, Euro, LayoutGrid, List, ArrowUpDown, Filter, X, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface VistralVisionPipelineEnhancedProps {
  properties: Property[];
  searchQuery: string;
}

type ViewMode = "kanban" | "list";
type SortOption = "price-asc" | "price-desc" | "date-asc" | "date-desc" | "address-asc" | "address-desc" | "stage";
type FilterOption = {
  propertyType?: string[];
  priceRange?: { min?: number; max?: number };
  bedrooms?: number;
  bathrooms?: number;
};

const pipelineStages = [
  { key: "new", label: "New", color: "bg-[var(--prophero-blue-500)] dark:bg-[var(--prophero-blue-600)]" },
  { key: "evaluation", label: "Evaluation", color: "bg-[var(--prophero-warning)] dark:bg-[var(--prophero-warning-hover)]" },
  { key: "negotiation", label: "Negotiation", color: "bg-[var(--prophero-info)] dark:bg-[var(--prophero-info-hover)]" },
  { key: "contract", label: "Contract", color: "bg-[var(--prophero-blue-600)] dark:bg-[var(--prophero-blue-700)]" },
  { key: "renovation", label: "Renovation", color: "bg-[var(--prophero-blue-400)] dark:bg-[var(--prophero-blue-500)]" },
  { key: "ready", label: "Ready", color: "bg-[var(--prophero-success)] dark:bg-[var(--prophero-success-hover)]" },
  { key: "rented", label: "Rented", color: "bg-[var(--prophero-success-hover)] dark:bg-[var(--prophero-success)]" },
];

export function VistralVisionPipelineEnhanced({ properties, searchQuery }: VistralVisionPipelineEnhancedProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [selectedStage, setSelectedStage] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("stage");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOption>({});

  // Categorize properties into pipeline stages
  const categorizedProperties = useMemo(() => {
    const categorized: Record<string, Property[]> = {
      new: [],
      evaluation: [],
      negotiation: [],
      contract: [],
      renovation: [],
      ready: [],
      rented: [],
    };

    properties.forEach((prop) => {
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches = 
          prop.id.toLowerCase().includes(query) ||
          prop.fullAddress.toLowerCase().includes(query) ||
          (prop.price && prop.price.toString().includes(query));
        if (!matches) return;
      }

      // Categorize based on stage
      if (!prop.currentStage) {
        // If no stage, default to "new"
        categorized.new.push(prop);
      } else if (prop.currentStage === "draft") {
        categorized.new.push(prop);
      } else if (prop.currentStage === "review" || prop.currentStage === "needs-correction") {
        categorized.evaluation.push(prop);
      } else if (prop.currentStage === "negotiation") {
        categorized.negotiation.push(prop);
      } else if (prop.currentStage === "pending-arras") {
        categorized.contract.push(prop);
      } else if (prop.currentStage === "settlement") {
        categorized.renovation.push(prop);
      } else if (prop.currentStage === "sold") {
        categorized.ready.push(prop);
      } else {
        // Default: if no stage matches, put in "new"
        categorized.new.push(prop);
      }
    });

    // Add some mock rented properties for demo
    if (categorized.ready.length > 0) {
      categorized.rented = categorized.ready.slice(0, Math.min(3, categorized.ready.length)).map(p => ({
        ...p,
        id: `${p.id}-rented`,
      }));
    }

    return categorized;
  }, [properties, searchQuery]);

  // Helper function to get stage for a property
  const getStageForProperty = (property: Property) => {
    if (property.currentStage === "draft") return "new";
    if (property.currentStage === "review" || property.currentStage === "needs-correction") return "evaluation";
    if (property.currentStage === "negotiation") return "negotiation";
    if (property.currentStage === "pending-arras") return "contract";
    if (property.currentStage === "settlement") return "renovation";
    if (property.currentStage === "sold") return "ready";
    return "new";
  };

  // Apply filters
  const applyFilters = (props: Property[]): Property[] => {
    let filtered = [...props];

    // Filter by property type
    if (filters.propertyType && filters.propertyType.length > 0) {
      filtered = filtered.filter(p => 
        p.propertyType && filters.propertyType!.includes(p.propertyType)
      );
    }

    // Filter by price range
    if (filters.priceRange) {
      if (filters.priceRange.min !== undefined) {
        filtered = filtered.filter(p => p.price && p.price >= filters.priceRange!.min!);
      }
      if (filters.priceRange.max !== undefined) {
        filtered = filtered.filter(p => p.price && p.price <= filters.priceRange!.max!);
      }
    }

    // Filter by bedrooms
    if (filters.bedrooms !== undefined) {
      filtered = filtered.filter(p => 
        p.data?.habitaciones && p.data.habitaciones >= filters.bedrooms!
      );
    }

    // Filter by bathrooms
    if (filters.bathrooms !== undefined) {
      filtered = filtered.filter(p => 
        p.data?.banos && p.data.banos >= filters.bathrooms!
      );
    }

    return filtered;
  };

  // Apply sorting
  const applySorting = (props: Property[]): Property[] => {
    const sorted = [...props];

    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price-desc":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
      case "date-asc":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA - dateB;
        });
      case "date-desc":
        return sorted.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      case "address-asc":
        return sorted.sort((a, b) => 
          (a.fullAddress || "").localeCompare(b.fullAddress || "")
        );
      case "address-desc":
        return sorted.sort((a, b) => 
          (b.fullAddress || "").localeCompare(a.fullAddress || "")
        );
      case "stage":
      default:
        // Sort by stage order
        return sorted.sort((a, b) => {
          const stageOrder = ["new", "evaluation", "negotiation", "contract", "renovation", "ready", "rented"];
          const stageA = getStageForProperty(a);
          const stageB = getStageForProperty(b);
          return stageOrder.indexOf(stageA) - stageOrder.indexOf(stageB);
        });
    }
  };

  // Get filtered and sorted properties for list view
  const filteredProperties = useMemo(() => {
    let props: Property[];
    if (selectedStage === "all") {
      props = Object.values(categorizedProperties).flat();
    } else {
      props = categorizedProperties[selectedStage] || [];
    }
    
    // Apply filters
    props = applyFilters(props);
    
    // Apply sorting
    props = applySorting(props);
    
    return props;
  }, [categorizedProperties, selectedStage, filters, sortBy]);

  // Get unique property types for filter
  const propertyTypes = useMemo(() => {
    const types = new Set<string>();
    properties.forEach(p => {
      if (p.propertyType) types.add(p.propertyType);
    });
    return Array.from(types).sort();
  }, [properties]);

  // Get price range for filter
  const priceRange = useMemo(() => {
    const prices = properties
      .map(p => p.price)
      .filter((p): p is number => p !== undefined && p > 0);
    if (prices.length === 0) return { min: 0, max: 0 };
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [properties]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.propertyType && filters.propertyType.length > 0) count++;
    if (filters.priceRange && (filters.priceRange.min !== undefined || filters.priceRange.max !== undefined)) count++;
    if (filters.bedrooms !== undefined) count++;
    if (filters.bathrooms !== undefined) count++;
    return count;
  }, [filters]);

  const clearFilters = () => {
    setFilters({});
  };

  const formatPrice = (price?: number) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handlePropertyClick = (property: Property) => {
    if (property.currentStage === "draft") {
      router.push(`/partner/property/${property.id}/edit`);
    } else {
      router.push(`/partner/property/${property.id}`);
    }
  };

  // Kanban View
  const renderKanbanView = () => {
    // Apply filters and sorting to kanban view too
    const processedStages = pipelineStages.map(stage => {
      let stageProperties = categorizedProperties[stage.key] || [];
      stageProperties = applyFilters(stageProperties);
      stageProperties = applySorting(stageProperties);
      return { ...stage, properties: stageProperties };
    });

    return (
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {processedStages.map((stage) => {
            const stageProperties = stage.properties;
            return (
            <div
              key={stage.key}
              className="flex-shrink-0 w-80 bg-card dark:bg-[var(--prophero-gray-900)] rounded-lg border border-border p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", stage.color)} />
                  <h3 className="font-semibold text-foreground">{stage.label}</h3>
                </div>
                <span className="text-sm text-muted-foreground bg-accent dark:bg-[var(--prophero-gray-800)] px-2 py-1 rounded">
                  {stageProperties.length}
                </span>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {stageProperties.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    No properties
                  </div>
                ) : (
                  stageProperties.map((property) => (
                    <div
                      key={property.id}
                      onClick={() => handlePropertyClick(property)}
                      className="p-3 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg cursor-pointer hover:bg-[var(--prophero-gray-100)] dark:hover:bg-[var(--prophero-gray-700)] transition-colors"
                    >
                      <p className="font-medium text-sm text-foreground mb-1">{property.id}</p>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{property.fullAddress}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{formatPrice(property.price)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  // List View with Tabs
  const renderListView = () => (
    <div className="space-y-4">
      {/* Stage Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        <button
          onClick={() => setSelectedStage("all")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
            selectedStage === "all"
              ? "bg-[var(--prophero-blue-500)] text-white"
              : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
          )}
        >
          All ({Object.values(categorizedProperties).flat().length})
        </button>
        {pipelineStages.map((stage) => {
          const count = categorizedProperties[stage.key]?.length || 0;
          return (
            <button
              key={stage.key}
              onClick={() => setSelectedStage(stage.key)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                selectedStage === stage.key
                  ? "bg-[var(--prophero-blue-500)] text-white"
                  : "bg-card dark:bg-[var(--prophero-gray-900)] border border-border text-foreground hover:bg-accent"
              )}
            >
              <div className={cn("w-2 h-2 rounded-full", stage.color)} />
              {stage.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Properties List */}
      <div className="space-y-3">
        {filteredProperties.length === 0 ? (
          <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No properties found</p>
            </CardContent>
          </Card>
        ) : (
          filteredProperties.map((property) => {
            const stageKey = getStageForProperty(property);
            const stage = pipelineStages.find(s => s.key === stageKey);
            
            return (
              <Card
                key={property.id}
                onClick={() => handlePropertyClick(property)}
                className="bg-card dark:bg-[var(--prophero-gray-900)] cursor-pointer hover:bg-accent dark:hover:bg-[var(--prophero-gray-800)] transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn("w-3 h-3 rounded-full flex-shrink-0", stage?.color)} />
                        <p className="font-semibold text-foreground truncate">{property.id}</p>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-medium",
                          stage?.color,
                          "text-white"
                        )}>
                          {stage?.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground ml-6">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{property.fullAddress}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Euro className="h-3 w-3" />
                          <span>{formatPrice(property.price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <Card className="bg-card dark:bg-[var(--prophero-gray-900)]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-foreground">Property Pipeline</h2>
            <p className="text-sm text-muted-foreground">
              Complete view of your property journey from new to rented
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card dark:bg-[var(--prophero-gray-900)] text-foreground hover:bg-accent transition-colors text-sm font-medium">
                  <ArrowUpDown className="h-4 w-4" />
                  Sort
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSortBy("stage")}>
                  Stage (Default)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("price-asc")}>
                  Price: Low to High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("price-desc")}>
                  Price: High to Low
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("date-desc")}>
                  Date: Newest First
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("date-asc")}>
                  Date: Oldest First
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSortBy("address-asc")}>
                  Address: A-Z
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("address-desc")}>
                  Address: Z-A
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filters Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card dark:bg-[var(--prophero-gray-900)] text-foreground hover:bg-accent transition-colors text-sm font-medium",
                showFilters && "bg-[var(--prophero-blue-50)] dark:bg-[var(--prophero-blue-950)] border-[var(--prophero-blue-500)]",
                activeFiltersCount > 0 && "bg-[var(--prophero-blue-100)] dark:bg-[var(--prophero-blue-900)]"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-[var(--prophero-blue-500)] text-white text-xs px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg p-1">
              <button
                onClick={() => setViewMode("kanban")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  viewMode === "kanban"
                    ? "bg-[var(--prophero-blue-500)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
                  viewMode === "list"
                    ? "bg-[var(--prophero-blue-500)] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-4 w-4" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-accent dark:bg-[var(--prophero-gray-800)] rounded-lg border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Filters</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Property Type Filter */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Property Type
                </label>
                <div className="space-y-2">
                  {propertyTypes.map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.propertyType?.includes(type) || false}
                        onChange={(e) => {
                          const currentTypes = filters.propertyType || [];
                          if (e.target.checked) {
                            setFilters({ ...filters, propertyType: [...currentTypes, type] });
                          } else {
                            setFilters({ 
                              ...filters, 
                              propertyType: currentTypes.filter(t => t !== type) 
                            });
                          }
                        }}
                        className="rounded border-border"
                      />
                      <span className="text-muted-foreground">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Price Range
                </label>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min price"
                    value={filters.priceRange?.min || ""}
                    onChange={(e) => {
                      const min = e.target.value ? parseInt(e.target.value) : undefined;
                      setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, min }
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background dark:bg-[var(--prophero-gray-900)] text-foreground text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max price"
                    value={filters.priceRange?.max || ""}
                    onChange={(e) => {
                      const max = e.target.value ? parseInt(e.target.value) : undefined;
                      setFilters({
                        ...filters,
                        priceRange: { ...filters.priceRange, max }
                      });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background dark:bg-[var(--prophero-gray-900)] text-foreground text-sm"
                  />
                  {priceRange.max > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Range: €{priceRange.min.toLocaleString()} - €{priceRange.max.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Bedrooms Filter */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Bedrooms (min)
                </label>
                <select
                  value={filters.bedrooms || ""}
                  onChange={(e) => {
                    const bedrooms = e.target.value ? parseInt(e.target.value) : undefined;
                    setFilters({ ...filters, bedrooms });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background dark:bg-[var(--prophero-gray-900)] text-foreground text-sm"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num}+ bedrooms</option>
                  ))}
                </select>
              </div>

              {/* Bathrooms Filter */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Bathrooms (min)
                </label>
                <select
                  value={filters.bathrooms || ""}
                  onChange={(e) => {
                    const bathrooms = e.target.value ? parseInt(e.target.value) : undefined;
                    setFilters({ ...filters, bathrooms });
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background dark:bg-[var(--prophero-gray-900)] text-foreground text-sm"
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map(num => (
                    <option key={num} value={num}>{num}+ bathrooms</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Render selected view */}
        {viewMode === "kanban" ? renderKanbanView() : renderListView()}
      </CardContent>
    </Card>
  );
}

