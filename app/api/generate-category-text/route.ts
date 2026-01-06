import { NextRequest, NextResponse } from 'next/server';

// Leer la variable de entorno en tiempo de ejecución
const getOpenAIApiKey = () => process.env.OPENAI_API_KEY;
// Usar OpenAI GPT-3.5-turbo que es más económico
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-3.5-turbo'; // Modelo económico y rápido

interface CategoryData {
  categoryName: string;
  currentPercentage: number;
  previousPercentage?: number;
  activities?: string;
  notes?: string;
  updateDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Generate Category Text] Starting request...');
    
    const OPENAI_API_KEY = getOpenAIApiKey();
    
    if (!OPENAI_API_KEY) {
      console.error('[Generate Category Text] OPENAI_API_KEY no configurada');
      console.error('[Generate Category Text] Environment check:', {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI')),
      });
      return NextResponse.json(
        { 
          error: 'OPENAI_API_KEY no configurada',
          details: 'Por favor, configura la variable de entorno OPENAI_API_KEY en .env.local o en Vercel'
        },
        { status: 500 }
      );
    }

    console.log('[Generate Category Text] API Key present:', OPENAI_API_KEY.substring(0, 10) + '...');

    const body = await request.json();
    console.log('[Generate Category Text] Request body:', JSON.stringify(body).substring(0, 200));
    
    const { categoryData }: { categoryData: CategoryData } = body;

    if (!categoryData) {
      console.error('[Generate Category Text] categoryData missing');
      return NextResponse.json(
        { error: 'Datos de categoría requeridos' },
        { status: 400 }
      );
    }

    // Construir el prompt para OpenAI
    let prompt: string;
    
    if (categoryData.categoryName === 'Resumen General') {
      // Prompt especial para el resumen final
      prompt = categoryData.activities || '';
    } else {
      // Prompt para categorías individuales
      prompt = `Eres un profesional de la construcción escribiendo un update de progreso para un cliente.

Categoría: ${categoryData.categoryName}
${categoryData.previousPercentage !== undefined && categoryData.currentPercentage > categoryData.previousPercentage ? `- Ha avanzado significativamente` : categoryData.currentPercentage > 0 ? `- Está en progreso` : ''}
${categoryData.activities ? `- Trabajos realizados: ${categoryData.activities}` : ''}
${categoryData.notes ? `- Detalles: ${categoryData.notes}` : ''}

Escribe UNA SOLA FRASE corta y natural en español, como si la escribiera un jefe de obra. 
- NO menciones porcentajes específicos
- Sé positivo y profesional
- Menciona algo concreto del avance si hay información disponible
- Máximo 20 palabras

Ejemplo: "La cocina ya tiene instalados los muebles y electrodomésticos, quedando muy bien."`;
    }


    // Llamar a la API de OpenAI
    console.log('[Generate Category Text] Calling OpenAI API...');
    
    const requestBody = {
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: categoryData.categoryName === 'Resumen General' ? 150 : 50, // Más corto para categorías, un poco más para resumen
      temperature: 0.8, // Un poco más creativo para sonar más natural
    };
    
    console.log('[Generate Category Text] Request body length:', JSON.stringify(requestBody).length);
    
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Generate Category Text] OpenAI response status:', response.status);

    if (!response.ok) {
      let errorData: any;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: { message: await response.text() } };
      }
      
      console.error('[Generate Category Text] Error en API de OpenAI:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
      });
      
      // Manejar errores específicos de cuota
      if (errorData.error?.code === 'insufficient_quota' || errorData.error?.type === 'insufficient_quota') {
        return NextResponse.json(
          { 
            error: 'Cuota de OpenAI excedida',
            message: 'La API key de OpenAI ha excedido su cuota. Por favor, verifica tu plan y facturación en https://platform.openai.com/account/billing',
            details: errorData.error?.message
          },
          { status: 402 } // Payment Required
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error al generar texto con OpenAI',
          message: errorData.error?.message || 'Error desconocido',
          details: process.env.NODE_ENV === 'development' ? JSON.stringify(errorData) : undefined
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[Generate Category Text] OpenAI response data keys:', Object.keys(data));
    
    // Extraer el texto generado (formato de OpenAI es diferente)
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      console.error('[Generate Category Text] No text generated. Response structure:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        firstChoice: data.choices?.[0] ? Object.keys(data.choices[0]) : null,
      });
      return NextResponse.json(
        { error: 'No se pudo generar texto', details: 'Respuesta de OpenAI no contiene texto' },
        { status: 500 }
      );
    }

    console.log('[Generate Category Text] ✅ Text generated successfully, length:', generatedText.length);
    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    console.error('[Generate Category Text] ❌ Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error?.message || 'An unexpected error occurred',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
