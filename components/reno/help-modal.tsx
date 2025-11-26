"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PropertyCombobox } from "@/components/reno/property-combobox";
import { useSupabaseKanbanProperties } from "@/hooks/useSupabaseKanbanProperties";
import { useSupabaseAuthContext } from "@/lib/auth/supabase-auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Property } from "@/lib/property-storage";
import { useI18n } from "@/lib/i18n";

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string;
  userRole?: string;
}

const WEBHOOK_URL = "https://n8n.prod.prophero.com/webhook/bugs_renovation_app";

type ErrorType = "property" | "general" | null;

export function HelpModal({
  open,
  onOpenChange,
  userName,
  userRole,
}: HelpModalProps) {
  const { t } = useI18n();
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user info
  const { user: supabaseUser } = useSupabaseAuthContext();
  const supabase = createClient();

  // Get properties from kanban
  const { propertiesByPhase, loading: propertiesLoading } = useSupabaseKanbanProperties();

  // Flatten all properties from all phases
  const allProperties = useMemo(() => {
    const properties: Property[] = [];
    Object.values(propertiesByPhase).forEach((phaseProperties) => {
      properties.push(...phaseProperties);
    });
    return properties;
  }, [propertiesByPhase]);

  const handleSubmit = async () => {
    // Validation
    if (!message.trim()) {
      setError(t.help.pleaseWriteMessage);
      return;
    }

    if (errorType === "property" && !selectedProperty) {
      setError(t.help.pleaseSelectProperty);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!supabaseUser) {
        throw new Error(t.help.notAuthenticated);
      }

      // Get airtable_id from property
      const airtableId = selectedProperty?.uniqueIdFromEngagements || 
                        ((selectedProperty as any)?.supabaseProperty as any)?.['Unique ID From Engagements'] ||
                        ((selectedProperty as any)?.supabaseProperty as any)?.airtable_property_id ||
                        null;

      // First, save conversation to Supabase
      // Nota: help_conversations aún no está en los tipos de TypeScript, usar cast temporal
      const { data: conversation, error: conversationError } = await (supabase as any)
        .from('help_conversations')
        .insert({
          user_id: supabaseUser.id,
          user_email: supabaseUser.email || undefined,
          user_name: userName || undefined,
          user_role: userRole || undefined,
          original_message: message.trim(),
          error_type: errorType || null,
          property_address: errorType === "property" && selectedProperty
            ? (selectedProperty.fullAddress || selectedProperty.address || selectedProperty.id)
            : null,
          property_airtable_id: errorType === "property" && selectedProperty ? airtableId : null,
        })
        .select()
        .single();

      if (conversationError) {
        console.error("Error saving conversation:", conversationError);
        throw new Error(t.help.errorSavingConversation);
      }

      if (!conversation) {
        throw new Error(t.help.couldNotCreateConversation);
      }

      // Prepare payload for n8n webhook
      const payload: any = {
        conversation_id: conversation.id, // Include conversation ID so n8n can use it when responding
        message: message.trim(),
        user: {
          name: userName || t.help.unknownUser,
          role: userRole || "user",
        },
      };

      // Add property info if it's a property error
      if (errorType === "property" && selectedProperty) {
        payload.property = {
          address: selectedProperty.fullAddress || selectedProperty.address || selectedProperty.id,
          airtable_id: airtableId,
        };
      }

      // Send to n8n webhook
      const response = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Even if webhook fails, conversation is saved, so we can still show success
        console.warn("Webhook response not OK, but conversation saved:", response.statusText);
      }

      // Success - reset form and close
      setMessage("");
      setErrorType(null);
      setSelectedProperty(null);
      setError(null);
      onOpenChange(false);
      toast.success(t.help.messageSent, {
        description: t.help.messageSentDescription,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t.help.errorSending;
      setError(errorMessage);
      toast.error(t.help.errorSending, {
        description: errorMessage,
      });
      console.error("Error sending help message:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setMessage("");
      setErrorType(null);
      setSelectedProperty(null);
      setError(null);
      onOpenChange(false);
    }
  };

  const handleErrorTypeSelect = (type: "property" | "general") => {
    setErrorType(type);
    setError(null);
    if (type === "general") {
      setSelectedProperty(null);
    }
  };

  const handleBack = () => {
    setErrorType(null);
    setSelectedProperty(null);
    setMessage("");
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card">
        <DialogHeader>
          <DialogTitle>{t.help.title}</DialogTitle>
          <DialogDescription>
            {errorType === null
              ? t.help.selectErrorType
              : errorType === "property"
              ? t.help.selectProperty
              : t.help.generalErrorPlaceholder}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {errorType === null ? (
            // Step 1: Select error type
            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => handleErrorTypeSelect("property")}
                disabled={isSubmitting || propertiesLoading}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">{t.help.propertyError}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.help.propertyErrorDescription}
                  </span>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start h-auto py-4 px-4"
                onClick={() => handleErrorTypeSelect("general")}
                disabled={isSubmitting}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="font-medium">{t.help.generalError}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.help.generalErrorDescription}
                  </span>
                </div>
              </Button>
            </div>
          ) : errorType === "property" ? (
            // Step 2: Property error - select property and describe
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="property-select">
                  {t.help.selectPropertyRequired} <span className="text-destructive">*</span>
                </Label>
                <PropertyCombobox
                  properties={allProperties}
                  value={selectedProperty}
                  onValueChange={(property) => {
                    setSelectedProperty(property);
                    setError(null);
                  }}
                  placeholder={t.help.propertyPlaceholder}
                  disabled={isSubmitting || propertiesLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="help-message">
                  {t.help.describeProblemRequired} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="help-message"
                  placeholder={t.help.propertyErrorPlaceholder}
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setError(null);
                  }}
                  rows={6}
                  disabled={isSubmitting}
                  className="resize-none"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            // Step 2: General error - just describe
            <div className="space-y-2">
              <Label htmlFor="help-message">
                {t.help.describeProblemRequired} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="help-message"
                placeholder={t.help.generalErrorPlaceholder}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setError(null);
                }}
                rows={6}
                disabled={isSubmitting}
                className="resize-none"
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {errorType !== null && (
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              {t.help.back}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {t.help.cancel}
          </Button>
          {errorType !== null && (
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                !message.trim() ||
                (errorType === "property" && !selectedProperty)
              }
            >
              {isSubmitting ? t.help.sending : t.help.send}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


