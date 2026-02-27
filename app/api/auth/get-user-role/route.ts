import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/auth/get-user-role?user_id=xxx
 *
 * Lee el rol de un usuario desde user_roles usando el cliente admin (bypassa RLS).
 * Para uso interno desde el callback de Auth0 cuando no hay sesión Supabase.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[get-user-role] Error:", error.message);
      return NextResponse.json({ role: "user" });
    }

    return NextResponse.json({ role: data?.role || "user" });
  } catch (error: any) {
    console.error("[get-user-role] Unexpected error:", error);
    return NextResponse.json({ role: "user" });
  }
}
