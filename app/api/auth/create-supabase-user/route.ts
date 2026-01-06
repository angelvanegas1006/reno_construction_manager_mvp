import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncRoleToSupabaseAdmin } from "@/lib/auth/auth0-role-sync";

/**
 * POST /api/auth/create-supabase-user
 * 
 * Crea un usuario en Supabase basado en la información de Auth0
 * Solo se puede llamar desde el cliente después de autenticarse con Auth0
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, auth0Roles, auth0Role } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Buscar usuario existente por email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    let supabaseUserId: string;

    if (existingUser) {
      // Usuario ya existe en Supabase
      supabaseUserId = existingUser.id;
      console.log("[create-supabase-user] User exists:", supabaseUserId);
    } else {
      // Crear usuario en Supabase
      // No podemos usar password porque viene de Auth0
      // Usamos un password temporal que nunca se usará
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            name: name || email,
            auth0_user: true,
          },
        });

      if (createError) {
        console.error("[create-supabase-user] Error creating user:", createError);
        return NextResponse.json(
          { error: createError.message || "Failed to create user in Supabase" },
          { status: 500 }
        );
      }

      if (!newUser.user) {
        return NextResponse.json(
          { error: "Failed to create user" },
          { status: 500 }
        );
      }

      supabaseUserId = newUser.user.id;
      console.log("[create-supabase-user] ✅ User created:", supabaseUserId);
    }

    // Sincronizar rol de Auth0 a Supabase
    let role = await syncRoleToSupabaseAdmin(
      supabaseAdmin,
      supabaseUserId,
      auth0Roles,
      { role: auth0Role }
    );

    // Caso especial: angel.vanegas@prophero.com debería ser construction_manager
    if (email === "angel.vanegas@prophero.com" && role === "user") {
      console.log("[create-supabase-user] 🔧 Fixing role for angel.vanegas@prophero.com to construction_manager");
      role = await syncRoleToSupabaseAdmin(
        supabaseAdmin,
        supabaseUserId,
        ["construction_manager"],
        { role: "construction_manager" }
      );
    }

    return NextResponse.json({
      success: true,
      user_id: supabaseUserId,
      role,
    });
  } catch (error: any) {
    console.error("[create-supabase-user] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

