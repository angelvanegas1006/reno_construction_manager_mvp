"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function UpdateEmailViewPage() {
  const params = useParams();
  const propertyId = params.id as string;
  const emailId = params.emailId as string;
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEmail = async () => {
      if (!propertyId || !emailId) {
        setError("Faltan parámetros");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      
      const { data, error: fetchError } = await supabase
        .from('client_update_emails')
        .select('html_content')
        .eq('id', emailId)
        .eq('property_id', propertyId)
        .single();

      if (fetchError) {
        console.error('Error fetching email:', fetchError);
        setError('Error al cargar el email');
        setLoading(false);
        return;
      }

      if (data?.html_content) {
        setHtmlContent(data.html_content);
      } else {
        setError('Email no encontrado');
      }

      setLoading(false);
    };

    fetchEmail();
  }, [propertyId, emailId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Cargando email...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!htmlContent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">No se encontró contenido del email</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div 
        className="max-w-4xl mx-auto p-6"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

