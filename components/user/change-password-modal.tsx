"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { t } = useI18n();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t.userMenu?.changePassword?.errors?.allFieldsRequired || "Todos los campos son requeridos");
      return;
    }

    if (newPassword.length < 6) {
      setError(t.userMenu?.changePassword?.errors?.passwordTooShort || "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.userMenu?.changePassword?.errors?.passwordsDoNotMatch || "Las contraseñas no coinciden");
      return;
    }

    if (currentPassword === newPassword) {
      setError(t.userMenu?.changePassword?.errors?.samePassword || "La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setLoading(true);

    try {
      // Verificar la contraseña actual intentando iniciar sesión
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error(t.userMenu?.changePassword?.errors?.userNotFound || "Usuario no encontrado");
      }

      // Intentar iniciar sesión con la contraseña actual para verificarla
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error(t.userMenu?.changePassword?.errors?.currentPasswordIncorrect || "La contraseña actual es incorrecta");
      }

      // Si la verificación es exitosa, actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success(t.userMenu?.changePassword?.success || "Contraseña actualizada exitosamente");
      
      // Limpiar el formulario y cerrar el modal
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error changing password:", err);
      const errorMessage = err.message || t.userMenu?.changePassword?.errors?.generic || "Error al cambiar la contraseña. Intenta nuevamente.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Lock className="h-5 w-5 flex-shrink-0" />
            <span>{t.userMenu?.changePassword?.title || "Cambiar Contraseña"}</span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base mt-2">
            {t.userMenu?.changePassword?.description || "Ingresa tu contraseña actual y la nueva contraseña para actualizar tu cuenta."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword" className="text-sm font-medium">
              {t.userMenu?.changePassword?.currentPassword || "Contraseña Actual"}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder={t.userMenu?.changePassword?.currentPasswordPlaceholder || "Ingresa tu contraseña actual"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              autoFocus
              className="text-base sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              {t.userMenu?.changePassword?.newPassword || "Nueva Contraseña"}
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder={t.userMenu?.changePassword?.newPasswordPlaceholder || "Ingresa tu nueva contraseña"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              className="text-base sm:text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              {t.userMenu?.changePassword?.confirmPassword || "Confirmar Contraseña"}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t.userMenu?.changePassword?.confirmPasswordPlaceholder || "Confirma tu nueva contraseña"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              className="text-base sm:text-sm"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto order-1 sm:order-2">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-sm sm:text-base">{t.userMenu?.changePassword?.updating || "Actualizando..."}</span>
                </>
              ) : (
                <span className="text-sm sm:text-base">{t.userMenu?.changePassword?.updateButton || "Actualizar Contraseña"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

