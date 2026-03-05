import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateCheckProHTML } from "@/lib/html/check-pro-html-generator";
import type { CheckProData } from "@/components/reno/check-pro-form";

export async function POST(req: NextRequest) {
  try {
    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: project, error: fetchError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (fetchError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const checkProData = (project.check_pro_data as CheckProData) ?? {};
    const now = new Date();

    const html = generateCheckProHTML(checkProData, {
      projectName: project.name ?? "Sin nombre",
      projectId: project.project_unique_id ?? project.id,
      architect: (project as any).architect ?? "",
      generatedAt: now.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });

    const storagePath = `check-pro/${projectId}/check-pro-report.html`;

    await supabase.storage
      .from("project-attachments")
      .remove([storagePath]);

    const htmlBlob = new Blob([html], { type: "text/html" });
    const htmlFile = new File([htmlBlob], "check-pro-report.html", { type: "text/html" });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("project-attachments")
      .upload(storagePath, htmlFile, { contentType: "text/html", upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("project-attachments")
      .getPublicUrl(uploadData.path);

    const reportUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("projects")
      .update({ check_pro_report_url: reportUrl, updated_at: now.toISOString() })
      .eq("id", projectId);

    if (updateError) {
      console.warn("Failed to save check_pro_report_url:", updateError.message);
    }

    return NextResponse.json({ url: reportUrl });
  } catch (err: unknown) {
    console.error("Check Pro report generation error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
