import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
// @ts-ignore - jspdf types
import jsPDF from "jspdf";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ checkId: string }> }
) {
  const { checkId } = await params;
  if (!checkId) {
    return NextResponse.json({ error: "checkId required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: check, error: checkError } = await supabase
    .from("project_final_checks")
    .select("*")
    .eq("id", checkId)
    .single();

  if (checkError || !check) {
    return NextResponse.json({ error: "Final check not found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", check.project_id)
    .single();

  const { data: dwellings } = await supabase
    .from("project_final_check_dwellings")
    .select("*")
    .eq("project_final_check_id", checkId)
    .order("property_id");

  const propertyIds = [...new Set((dwellings ?? []).map((d) => d.property_id))];
  const propsById = new Map<string, { id: string; address: string | null; name: string | null }>();
  if (propertyIds.length > 0) {
    const { data: propsList } = await supabase
      .from("properties")
      .select("id, address, name")
      .in("id", propertyIds);
    (propsList ?? []).forEach((p) => propsById.set(p.id, p));
  }

  const projectName = project?.name ?? "Proyecto";
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const addText = (text: string, fontSize = 11, bold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, pageW - 2 * margin);
    for (const line of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, margin, y);
      y += fontSize * 0.4 + 2;
    }
  };

  addText("Informe Final Check", 18, true);
  y += 4;
  addText(`Proyecto: ${projectName}`, 12, true);
  addText(`Fecha: ${new Date().toLocaleDateString("es-ES", { dateStyle: "long" })}`);
  if (check.assigned_site_manager_email) {
    addText(`Jefe de obra: ${check.assigned_site_manager_email}`);
  }
  y += 10;

  for (const d of dwellings ?? []) {
    const prop = propsById.get(d.property_id);
    const address = prop?.address ?? prop?.name ?? d.property_id ?? "Vivienda";
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    addText(address, 12, true);
    y += 2;
    addText("Estado de la vivienda:", 10, true);
    addText(d.estado_vivienda?.trim() || "—");
    y += 2;
    addText("Estado del mobiliario:", 10, true);
    addText(d.estado_mobiliario?.trim() || "—");
    y += 12;
  }

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="final-check-${checkId.slice(0, 8)}.pdf"`,
    },
  });
}
