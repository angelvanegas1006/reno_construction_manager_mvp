"use client";

import { useEffect, useState } from "react";
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
import { Loader2, Plus, Trash2, Edit, RefreshCw } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_sign_in_at: string | null;
}

export default function AdminUsersPage() {
  const { user, role, isLoading: authLoading } = useAppAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingRoles, setSyncingRoles] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
  });

  // Verificar que sea admin
  useEffect(() => {
    if (!authLoading && (!user || role !== "admin")) {
      router.push("/login");
    }
  }, [user, role, authLoading, router]);

  // Cargar usuarios
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to load users");
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: any) {
      toast.error("Error cargando usuarios: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === "admin") {
      loadUsers();
    }
  }, [role]);

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
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update user");
      }

      toast.success("Usuario actualizado exitosamente");
      setEditDialogOpen(false);
      setSelectedUser(null);
      setFormData({ email: "", password: "", name: "", role: "user" });
      loadUsers();
    } catch (error: any) {
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

  if (authLoading || role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-1">
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Crea un nuevo usuario en Auth0 y Supabase
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="usuario@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Nombre del usuario"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Dejar vacío para generar automática"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="foreman">Foreman</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser}>Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Nombre</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Rol</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Último Acceso</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        user.role === "admin"
                          ? "bg-red-100 text-red-800"
                          : user.role === "foreman"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {user.role}
                    </span>
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
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.id === user?.id}
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
      )}

      {/* Dialog de edición */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Actualiza la información del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="foreman">Foreman</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}








