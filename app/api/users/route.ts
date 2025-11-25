import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * API Route para obtener lista de usuarios
 * Requiere permisos de admin para acceder a auth.users
 */
export async function GET() {
  try {
    const supabase = createAdminClient();

    // Obtener usuarios desde auth.users
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error("Error fetching users:", error);
      return NextResponse.json(
        { error: "Error al obtener usuarios" },
        { status: 500 }
      );
    }

    // Obtener roles desde user_roles
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const rolesMap = new Map(
      (userRoles || []).map((ur) => [ur.user_id, ur.role])
    );

    // Transformar usuarios
    const transformedUsers = (users || []).map((user) => ({
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.name || user.user_metadata?.full_name,
      role: rolesMap.get(user.id) || user.user_metadata?.role,
    }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}


