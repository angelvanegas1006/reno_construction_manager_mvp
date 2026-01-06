import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/auth/get-user-by-email
 * 
 * Obtiene un usuario de Supabase por email
 * Solo para uso interno cuando Auth0 está autenticado pero no hay sesión de Supabase
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();

    // Buscar usuario por email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.email === email);

    if (!existingUser) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    // Retornar solo la información necesaria del usuario
    return NextResponse.json({
      user: {
        id: existingUser.id,
        email: existingUser.email,
        user_metadata: existingUser.user_metadata,
        created_at: existingUser.created_at,
      },
    });
  } catch (error: any) {
    console.error("[get-user-by-email] Unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

