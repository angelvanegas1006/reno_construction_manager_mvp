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
      setError(t.userMenu.changePassword.errors.allFieldsRequired);
      return;
    }

    if (newPassword.length < 6) {
      setError(t.userMenu.changePassword.errors.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.userMenu.changePassword.errors.passwordsDoNotMatch);
      return;
    }

    if (currentPassword === newPassword) {
      setError(t.userMenu.changePassword.errors.samePassword);
      return;
    }

    setLoading(true);

    try {
      // Verificar la contraseña actual intentando iniciar sesión
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error(t.userMenu.changePassword.errors.userNotFound);
      }

      // Intentar iniciar sesión con la contraseña actual para verificarla
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error(t.userMenu.changePassword.errors.currentPasswordIncorrect);
      }

      // Si la verificación es exitosa, actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast.success(t.userMenu.changePassword.success);
      
      // Limpiar el formulario y cerrar el modal
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error changing password:", err);
      const errorMessage = err.message || t.userMenu.changePassword.errors.generic;
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t.userMenu.changePassword.title}
          </DialogTitle>
          <DialogDescription>
            {t.userMenu.changePassword.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">
              {t.userMenu.changePassword.currentPassword}
            </Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder={t.userMenu.changePassword.currentPasswordPlaceholder}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {t.userMenu.changePassword.newPassword}
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder={t.userMenu.changePassword.newPasswordPlaceholder}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              {t.userMenu.changePassword.confirmPassword}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder={t.userMenu.changePassword.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.userMenu.changePassword.updating}
                </>
              ) : (
                t.userMenu.changePassword.updateButton
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

