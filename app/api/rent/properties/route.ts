import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/rent/properties
 * Obtener lista de propiedades en alquiler
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de rent
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userRole = roleData?.role;
    const rentRoles = ['rent_manager', 'rent_agent', 'tenant', 'admin'];
    
    if (!userRole || !rentRoles.includes(userRole)) {
      return NextResponse.json({ error: 'No tienes permisos para acceder a esta información' }, { status: 403 });
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Construir query
    let query = supabase
      .from('rent_properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching properties:', error);
      return NextResponse.json({ error: 'Error al obtener propiedades' }, { status: 500 });
    }

    return NextResponse.json({ properties: data || [] });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}

/**
 * POST /api/rent/properties
 * Crear nueva propiedad en alquiler
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar rol de rent (solo managers y agents pueden crear)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userRole = roleData?.role;
    const allowedRoles = ['rent_manager', 'rent_agent', 'admin'];
    
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'No tienes permisos para crear propiedades' }, { status: 403 });
    }

    const body = await request.json();
    const { address, monthly_rent, status, bedrooms, bathrooms, square_meters, description, property_id } = body;

    // Validar campos requeridos
    if (!address) {
      return NextResponse.json({ error: 'La dirección es requerida' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rent_properties')
      .insert({
        address,
        monthly_rent: monthly_rent || null,
        status: status || 'available',
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
        square_meters: square_meters || null,
        description: description || null,
        property_id: property_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return NextResponse.json({ error: 'Error al crear propiedad' }, { status: 500 });
    }

    return NextResponse.json({ property: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}













