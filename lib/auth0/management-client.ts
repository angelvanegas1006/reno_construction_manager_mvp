/**
 * Auth0 Management API Client
 * 
 * Cliente para interactuar con Auth0 Management API
 * Usado para crear usuarios, asignar roles, etc.
 */

interface Auth0ManagementToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface Auth0User {
  user_id: string;
  email: string;
  name?: string;
  app_metadata?: {
    roles?: string[];
    role?: string;
  };
  user_metadata?: Record<string, any>;
}

interface Auth0Role {
  id: string;
  name: string;
  description?: string;
}

export class Auth0ManagementClient {
  private domain: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.domain = process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || '';
    this.clientId = process.env.AUTH0_MANAGEMENT_CLIENT_ID || '';
    this.clientSecret = process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || '';

    if (!this.domain || !this.clientId || !this.clientSecret) {
      console.warn('[Auth0ManagementClient] Missing configuration. Some features may not work.');
    }
  }

  /**
   * Obtener access token de Auth0 Management API
   */
  private async getAccessToken(): Promise<string> {
    // Si tenemos un token válido, usarlo
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: `https://${this.domain}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get Auth0 Management token: ${error}`);
    }

    const data: Auth0ManagementToken = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    return this.accessToken;
  }

  /**
   * Hacer request a Auth0 Management API
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken();
    const url = `https://${this.domain}/api/v2/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Auth0 API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  /**
   * Crear roles en Auth0 desde los roles de Supabase
   */
  async syncRolesFromSupabase(): Promise<Auth0Role[]> {
    const roles = ['admin', 'foreman', 'user'];
    const createdRoles: Auth0Role[] = [];

    for (const roleName of roles) {
      try {
        // Verificar si el rol ya existe
        const existingRoles = await this.request<Auth0Role[]>(`roles?name_filter=${roleName}`);
        
        if (existingRoles.length > 0) {
          console.log(`[Auth0ManagementClient] Role ${roleName} already exists`);
          createdRoles.push(existingRoles[0]);
          continue;
        }

        // Crear el rol
        const role = await this.request<Auth0Role>('roles', {
          method: 'POST',
          body: JSON.stringify({
            name: roleName,
            description: this.getRoleDescription(roleName),
          }),
        });

        console.log(`[Auth0ManagementClient] ✅ Created role: ${roleName}`);
        createdRoles.push(role);
      } catch (error: any) {
        // Si el rol ya existe, continuar
        if (error.message?.includes('already exists') || error.message?.includes('409')) {
          console.log(`[Auth0ManagementClient] Role ${roleName} already exists`);
          continue;
        }
        console.error(`[Auth0ManagementClient] ❌ Error creating role ${roleName}:`, error);
      }
    }

    return createdRoles;
  }

  /**
   * Obtener descripción del rol
   */
  private getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      admin: 'Administrador con acceso completo al sistema',
      foreman: 'Jefe de obra con acceso a construcción',
      user: 'Usuario básico con acceso de solo lectura',
    };
    return descriptions[role] || `Role: ${role}`;
  }

  /**
   * Crear usuario en Auth0
   */
  async createUser(params: {
    email: string;
    password?: string;
    name?: string;
    role?: string;
    connection?: string;
  }): Promise<Auth0User> {
    const connection = params.connection || 'Username-Password-Authentication';

    const userData: any = {
      email: params.email,
      name: params.name || params.email,
      connection,
      verify_email: false, // El usuario verificará su email después
    };

    if (params.password) {
      userData.password = params.password;
    }

    const user = await this.request<Auth0User>('users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Si se especificó un rol, asignarlo
    if (params.role) {
      await this.assignRoleToUser(user.user_id, params.role);
    }

    return user;
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email: string): Promise<Auth0User | null> {
    try {
      const users = await this.request<Auth0User[]>(`users-by-email?email=${encodeURIComponent(email)}`);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('[Auth0ManagementClient] Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Obtener roles de un usuario
   */
  async getUserRoles(userId: string): Promise<Auth0Role[]> {
    try {
      return await this.request<Auth0Role[]>(`users/${userId}/roles`);
    } catch (error) {
      console.error('[Auth0ManagementClient] Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Asignar rol a usuario
   */
  async assignRoleToUser(userId: string, roleName: string): Promise<void> {
    // Primero obtener el ID del rol
    const roles = await this.request<Auth0Role[]>(`roles?name_filter=${roleName}`);
    
    if (roles.length === 0) {
      throw new Error(`Role ${roleName} not found in Auth0`);
    }

    const roleId = roles[0].id;

    await this.request(`users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify({
        roles: [roleId],
      }),
    });

    console.log(`[Auth0ManagementClient] ✅ Assigned role ${roleName} to user ${userId}`);
  }

  /**
   * Remover rol de usuario
   */
  async removeRoleFromUser(userId: string, roleName: string): Promise<void> {
    const roles = await this.request<Auth0Role[]>(`roles?name_filter=${roleName}`);
    
    if (roles.length === 0) {
      throw new Error(`Role ${roleName} not found in Auth0`);
    }

    const roleId = roles[0].id;

    await this.request(`users/${userId}/roles`, {
      method: 'DELETE',
      body: JSON.stringify({
        roles: [roleId],
      }),
    });

    console.log(`[Auth0ManagementClient] ✅ Removed role ${roleName} from user ${userId}`);
  }

  /**
   * Actualizar usuario
   */
  async updateUser(userId: string, updates: {
    email?: string;
    name?: string;
    app_metadata?: Record<string, any>;
    user_metadata?: Record<string, any>;
  }): Promise<Auth0User> {
    return this.request<Auth0User>(`users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Eliminar usuario
   */
  async deleteUser(userId: string): Promise<void> {
    await this.request(`users/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Listar todos los usuarios
   */
  async listUsers(params?: {
    page?: number;
    per_page?: number;
    q?: string; // Query string para buscar
  }): Promise<{ users: Auth0User[]; total: number }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.per_page) queryParams.set('per_page', params.per_page.toString());
    if (params?.q) queryParams.set('q', params.q);

    const users = await this.request<Auth0User[]>(`users?${queryParams.toString()}`);
    
    // Auth0 no devuelve el total directamente, así que usamos la longitud del array
    return {
      users,
      total: users.length,
    };
  }
}

// Singleton instance
let managementClient: Auth0ManagementClient | null = null;

export function getAuth0ManagementClient(): Auth0ManagementClient {
  if (!managementClient) {
    managementClient = new Auth0ManagementClient();
  }
  return managementClient;
}








