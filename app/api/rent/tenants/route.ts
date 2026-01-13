import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/rent/tenants
 * Obtener lista de inquilinos
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
    const propertyId = searchParams.get('property_id');

    // Construir query
    let query = supabase
      .from('rent_tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tenants:', error);
      return NextResponse.json({ error: 'Error al obtener inquilinos' }, { status: 500 });
    }

    return NextResponse.json({ tenants: data || [] });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}

/**
 * POST /api/rent/tenants
 * Crear nuevo inquilino
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
      return NextResponse.json({ error: 'No tienes permisos para crear inquilinos' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, id_number, property_id, status, notes } = body;

    // Validar campos requeridos
    if (!name) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rent_tenants')
      .insert({
        name,
        email: email || null,
        phone: phone || null,
        id_number: id_number || null,
        property_id: property_id || null,
        status: status || 'active',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tenant:', error);
      return NextResponse.json({ error: 'Error al crear inquilino' }, { status: 500 });
    }

    return NextResponse.json({ tenant: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}
















