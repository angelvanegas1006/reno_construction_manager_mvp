import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/rent/contracts
 * Obtener lista de contratos
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
    const tenantId = searchParams.get('tenant_id');
    const propertyId = searchParams.get('property_id');

    // Construir query
    let query = supabase
      .from('rent_contracts')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contracts:', error);
      return NextResponse.json({ error: 'Error al obtener contratos' }, { status: 500 });
    }

    return NextResponse.json({ contracts: data || [] });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}

/**
 * POST /api/rent/contracts
 * Crear nuevo contrato
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
      return NextResponse.json({ error: 'No tienes permisos para crear contratos' }, { status: 403 });
    }

    const body = await request.json();
    const { tenant_id, property_id, start_date, end_date, monthly_rent, deposit, status, contract_number, notes } = body;

    // Validar campos requeridos
    if (!tenant_id || !property_id || !start_date || !monthly_rent) {
      return NextResponse.json({ error: 'Los campos tenant_id, property_id, start_date y monthly_rent son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('rent_contracts')
      .insert({
        tenant_id,
        property_id,
        start_date,
        end_date: end_date || null,
        monthly_rent,
        deposit: deposit || null,
        status: status || 'active',
        contract_number: contract_number || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contract:', error);
      return NextResponse.json({ error: 'Error al crear contrato' }, { status: 500 });
    }

    return NextResponse.json({ contract: data }, { status: 201 });
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 });
  }
}














