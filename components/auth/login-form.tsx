"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { VistralLogo } from "@/components/vistral-logo";
import { useI18n } from "@/lib/i18n";
import { Auth0LoginButton } from "@/components/auth/auth0-login-button";

export function LoginForm() {
  const { t } = useI18n();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleShowForm = () => {
    setShowForm(true);
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Sign in with Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (!data.user) {
        throw new Error("No se pudo obtener la información del usuario");
      }

      // Get user role from user_roles table
      let role = 'user'; // Default role
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (roleError) {
          // PGRST116 = no rows returned (user has no role assigned yet - this is OK)
          // 42P01 = relation does not exist (table doesn't exist - need to run migration)
          if (roleError.code === 'PGRST116') {
            // User has no role assigned, use default 'user'
            role = 'user';
          } else if (roleError.code === '42P01') {
            // Table doesn't exist - show helpful error
            console.warn('Table user_roles does not exist. Please run migration 002_user_roles.sql');
            toast.error("Configuración incompleta: ejecuta la migración de user_roles");
            await supabase.auth.signOut();
            return;
          } else {
            // Other error - log but continue with default role
            console.warn('Error fetching user role:', roleError);
            role = 'user';
          }
        } else {
          role = roleData?.role || 'user';
        }
      } catch (err) {
        // Catch any unexpected errors
        console.warn('Unexpected error fetching user role:', err);
        role = 'user';
      }

      // Redirect based on role
      if (role === 'foreman') {
        router.push("/reno/construction-manager/kanban");
        toast.success("¡Bienvenido!");
      } else if (role === 'admin') {
        // TODO: Add admin dashboard route
        router.push("/reno/construction-manager/kanban");
        toast.success("¡Bienvenido Admin!");
      } else {
        toast.error("No tienes permisos para acceder a esta aplicación");
        await supabase.auth.signOut();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || "Error al iniciar sesión. Verifica tus credenciales.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Initial state: Show logo, title, description and button
  if (!showForm) {
    return (
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <VistralLogo className="h-12" />
        </div>

        {/* Title */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground dark:text-foreground">
            {t.login.title}
          </h1>
          <p className="text-base text-muted-foreground dark:text-muted-foreground">
            {t.login.subtitle}
          </p>
        </div>

        {/* Primary Button */}
        <div className="pt-2 space-y-3">
          <Button 
            onClick={handleShowForm}
            className="w-full text-base h-12 font-medium"
            size="lg"
          >
            {t.login.secureLoginButton}
          </Button>
          
          {/* Auth0 Login Button (SDK) */}
          <div className="w-full">
            <Auth0LoginButton />
          </div>
        </div>

        {/* Secondary Link */}
        <div className="text-center pt-2">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
            onClick={() => {
              toast.info("Funcionalidad de crear cuenta próximamente");
            }}
          >
            {t.login.createAccount}
          </button>
        </div>
      </div>
    );
  }

  // Form state: Show login form
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-semibold tracking-tight">
          {t.login.title.split(" o ")[0]}
        </CardTitle>
        <CardDescription>
          {t.login.subtitle}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t.login.email}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t.login.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t.login.password}</Label>
            <Input
              id="password"
              type="password"
              placeholder={t.login.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t.login.loggingIn}
              </>
            ) : (
              t.login.loginButton
            )}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">O</span>
            </div>
          </div>

          {/* Auth0 Login Button (SDK) */}
          <Auth0LoginButton />

          <div className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="underline-offset-4 hover:underline"
              onClick={() => {
                // TODO: Implement password reset
                toast.info("Funcionalidad de recuperación de contraseña próximamente");
              }}
            >
              {t.login.forgotPassword}
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

