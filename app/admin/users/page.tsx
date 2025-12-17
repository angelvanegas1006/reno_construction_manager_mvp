"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAppAuth } from "@/lib/auth/app-auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit, RefreshCw, Search, Calendar, CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { RenoSidebar } from "@/components/reno/reno-sidebar";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
  google_calendar_connected?: boolean;
}

export default function AdminUsersPage() {
  const { user, role, isLoading: authLoading } = useAppAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingRoles, setSyncingRoles] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
  });

  // Verificar que sea admin o construction_manager
  useEffect(() => {
    if (!authLoading && (!user || (role !== "admin" && role !== "construction_manager"))) {
      router.push("/login");
    }
  }, [user, role, authLoading, router]);

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      setLoading(true);
      console.log('[AdminUsersPage] Loading users...');
      const response = await fetch("/api/admin/users");
      console.log('[AdminUsersPage] Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[AdminUsersPage] Error response:', errorData);
        throw new Error(errorData.error || `Failed to load users: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[AdminUsersPage] Users loaded:', data.users?.length || 0);
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('[AdminUsersPage] Error loading users:', error);
      toast.error("Error cargando usuarios: " + (error.message || 'Error desconocido'));
      setUsers([]); // Asegurar que el estado se actualice incluso en error
    } finally {
      setLoading(false);
    }
  };

  // Filtered and paginated users
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.name.toLowerCase().includes(query)
      );
    }

    // Apply role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    return filtered;
  }, [users, searchQuery, roleFilter]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter]);

  useEffect(() => {
    if (!authLoading && (role === "admin" || role === "construction_manager")) {
      loadUsers();
    }
  }, [role, authLoading]);

  // Sincronizar roles a Auth0
  const syncRoles = async () => {
    try {
      setSyncingRoles(true);
      const response = await fetch("/api/admin/sync-roles", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to sync roles");
      }
      const data = await response.json();
      toast.success("Roles sincronizados exitosamente");
      console.log("Roles sincronizados:", data.roles);
    } catch (error: any) {
      toast.error("Error sincronizando roles: " + error.message);
    } finally {
      setSyncingRoles(false);
    }
  };

  // Crear usuario
  const handleCreateUser = async () => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }

      toast.success("Usuario creado exitosamente");
      setCreateDialogOpen(false);
      setFormData({ email: "", password: "", name: "", role: "user" });
      loadUsers();
    } catch (error: any) {
      toast.error("Error creando usuario: " + error.message);
    }
  };

  // Actualizar usuario
  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      console.log('[AdminUsersPage] Updating user:', { userId: selectedUser.id, formData });
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log('[AdminUsersPage] Update response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('[AdminUsersPage] Update error:', error);
        throw new Error(error.error || "Failed to update user");
      }

      const result = await response.json();
      console.log('[AdminUsersPage] Update success:', result);

      toast.success("Usuario actualizado exitosamente");
      setEditDialogOpen(false);
      setSelectedUser(null);
      setFormData({ email: "", password: "", name: "", role: "user" });
      loadUsers();
    } catch (error: any) {
      console.error('[AdminUsersPage] Error updating user:', error);
      toast.error("Error actualizando usuario: " + error.message);
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete user");
      }

      toast.success("Usuario eliminado exitosamente");
      loadUsers();
    } catch (error: any) {
      toast.error("Error eliminando usuario: " + error.message);
    }
  };

  // Abrir diálogo de edición
  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      name: user.name,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  if (authLoading || (!user || (role !== "admin" && role !== "construction_manager"))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <RenoSidebar 
        isMobileOpen={isMobileMenuOpen}
        onMobileToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden w-full md:w-auto">
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-3 md:px-4 lg:px-6 py-3 md:py-4 lg:py-6 bg-[var(--prophero-gray-50)] dark:bg-[#000000]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">Gestión de Usuarios</h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  Administra usuarios y roles del sistema
                </p>
              </div>
        <div className="flex gap-2">
          <Button
            onClick={syncRoles}
            disabled={syncingRoles}
            variant="outline"
          >
            {syncingRoles ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Roles a Auth0
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl">Crear Nuevo Usuario</DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  Crea un nuevo usuario en Auth0 y Supabase
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="usuario@example.com"
                    className="text-base sm:text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nombre del usuario"
                    className="text-base sm:text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Dejar vacío para generar automática"
                    className="text-base sm:text-sm mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="role" className="text-sm font-medium">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="construction_manager">Construction Manager</SelectItem>
                      <SelectItem value="foreman">Foreman</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} className="w-full sm:w-auto order-1 sm:order-2">
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email o nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-base sm:text-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="construction_manager">Construction Manager</SelectItem>
              <SelectItem value="foreman">Foreman</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          Mostrando {paginatedUsers.length} de {filteredUsers.length} usuarios
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="border rounded-lg p-8 sm:p-12 text-center">
          <p className="text-sm sm:text-base text-muted-foreground">No se encontraron usuarios</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Google Calendar</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Último Acceso</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 text-sm">{user.email}</td>
                    <td className="px-4 py-3 text-sm">{user.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                            : user.role === "foreman"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {t.roles[user.role as keyof typeof t.roles] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.google_calendar_connected ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CalendarCheck className="h-4 w-4" />
                          <span className="text-xs">Conectado</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">No conectado</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : "Nunca"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={user.id === user?.id}
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {paginatedUsers.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold truncate">{user.name || user.email}</h3>
                    <p className="text-xs text-muted-foreground truncate mt-1">{user.email}</p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      title="Editar usuario"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === user?.id}
                      title="Eliminar usuario"
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        : user.role === "foreman"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {t.roles[user.role as keyof typeof t.roles] || user.role}
                  </span>
                  {user.google_calendar_connected ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      <span>Conectado</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>No conectado</span>
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Último acceso: {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : "Nunca"}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-xs sm:text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-1 sm:flex-none"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1 sm:flex-none"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Dialog de edición */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Editar Usuario</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Actualiza la información del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="text-base sm:text-sm mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium">Nombre</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="text-base sm:text-sm mt-1"
              />
            </div>
            <div>
              <Label htmlFor="edit-role" className="text-sm font-medium">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="construction_manager">Construction Manager</SelectItem>
                  <SelectItem value="foreman">Foreman</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0 pt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} className="w-full sm:w-auto order-1 sm:order-2">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </div>
        </div>
      </div>
    </div>
  );
}










