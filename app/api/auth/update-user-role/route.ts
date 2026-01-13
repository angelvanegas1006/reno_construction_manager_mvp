import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRoleToSupabaseAdmin } from "@/lib/auth/auth0-role-sync";

/**
 * POST /api/auth/update-user-role
 * 
 * Actualiza el rol de un usuario en Supabase usando el cliente admin
 * Solo se puede llamar desde el cliente después de autenticarse con Auth0
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, role } = body;

    if (!user_id || !role) {
      return NextResponse.json(
        { error: "user_id and role are required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Validar que el rol sea válido
    const validRoles = ["admin", "foreman", "construction_manager", "user"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Actualizar el rol usando syncRoleToSupabaseAdmin
    const updatedRole = await syncRoleToSupabaseAdmin(
      supabaseAdmin,
      user_id,
      [role],
      { role }
    );

    return NextResponse.json({
      success: true,
      role: updatedRole,
    });
  } catch (error: any) {
    console.error("[update-user-role] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

