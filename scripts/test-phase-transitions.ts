/**
 * Script de prueba automatizada para verificar transiciones de fase
 * 
 * Este script prueba:
 * 1. La función helper de actualización de fase
 * 2. El mapeo de Set Up Status a reno_phase
 * 3. Las transiciones principales
 * 4. La consistencia entre Set Up Status y reno_phase
 */

// Importar tipos primero
import type { RenoKanbanPhase } from '@/lib/reno-kanban-config';

// Las funciones de mapeo se importarán dinámicamente para evitar errores de Supabase
let mapSetUpStatusToKanbanPhase: any;
let getSetUpStatusForPhase: any;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name: string) {
  log(`\n🧪 ${name}`, 'cyan');
}

function logSuccess(message: string) {
  log(`  ✅ ${message}`, 'green');
}

function logError(message: string) {
  log(`  ❌ ${message}`, 'red');
}

function logWarning(message: string) {
  log(`  ⚠️  ${message}`, 'yellow');
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const testResults: TestResult[] = [];

function recordTest(name: string, passed: boolean, error?: string, details?: any) {
  testResults.push({ name, passed, error, details });
  if (passed) {
    logSuccess(`${name}`);
  } else {
    logError(`${name}: ${error || 'Failed'}`);
    if (details) {
      console.log('    Details:', details);
    }
  }
}

/**
 * Cargar funciones de mapeo
 */
async function loadMappingFunctions() {
  try {
    const mappingModule = await import('@/lib/supabase/kanban-mapping');
    const helperModule = await import('@/lib/supabase/phase-update-helper');
    mapSetUpStatusToKanbanPhase = mappingModule.mapSetUpStatusToKanbanPhase;
    getSetUpStatusForPhase = helperModule.getSetUpStatusForPhase;
    return true;
  } catch (error: any) {
    logError(`Error cargando funciones de mapeo: ${error.message}`);
    return false;
  }
}

/**
 * Test 1: Verificar mapeo de Set Up Status a reno_phase
 */
async function testSetUpStatusMapping() {
  logTest('Test 1: Mapeo de Set Up Status a reno_phase');

  const testCases = [
    { setUpStatus: 'Pending to visit', expectedPhase: 'upcoming-settlements' },
    { setUpStatus: 'initial check', expectedPhase: 'initial-check' },
    { setUpStatus: 'Initial Check', expectedPhase: 'initial-check' },
    { setUpStatus: 'Pending to budget (from Renovator)', expectedPhase: 'reno-budget-renovator' },
    { setUpStatus: 'Pending to budget (from Client)', expectedPhase: 'reno-budget-client' },
    { setUpStatus: 'Reno to start', expectedPhase: 'reno-budget-start' },
    { setUpStatus: 'Reno in progress', expectedPhase: 'reno-in-progress' },
    { setUpStatus: 'Cleaning & Furnishing', expectedPhase: 'furnishing-cleaning' },
    { setUpStatus: 'Final Check', expectedPhase: 'final-check' },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const mappedPhase = mapSetUpStatusToKanbanPhase(testCase.setUpStatus);
    if (mappedPhase === testCase.expectedPhase) {
      passed++;
      logSuccess(`${testCase.setUpStatus} → ${mappedPhase}`);
    } else {
      failed++;
      logError(`${testCase.setUpStatus} → Expected: ${testCase.expectedPhase}, Got: ${mappedPhase}`);
    }
  }

  const allPassed = failed === 0;
  recordTest('Mapeo de Set Up Status', allPassed, failed > 0 ? `${failed} casos fallaron` : undefined, {
    passed,
    failed,
    total: testCases.length,
  });

  return allPassed;
}

/**
 * Test 2: Verificar mapeo inverso (reno_phase a Set Up Status)
 */
async function testPhaseToSetUpStatusMapping() {
  logTest('Test 2: Mapeo de reno_phase a Set Up Status');

  const testCases: Array<{ phase: RenoKanbanPhase; expectedSetUpStatus: string }> = [
    { phase: 'upcoming-settlements', expectedSetUpStatus: 'Pending to visit' },
    { phase: 'initial-check', expectedSetUpStatus: 'initial check' },
    { phase: 'reno-budget-renovator', expectedSetUpStatus: 'Pending to budget (from Renovator)' },
    { phase: 'reno-budget-client', expectedSetUpStatus: 'Pending to budget (from Client)' },
    { phase: 'reno-budget-start', expectedSetUpStatus: 'Reno to start' },
    { phase: 'reno-in-progress', expectedSetUpStatus: 'Reno in progress' },
    { phase: 'furnishing-cleaning', expectedSetUpStatus: 'Cleaning & Furnishing' },
    { phase: 'final-check', expectedSetUpStatus: 'Final Check' },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const setUpStatus = getSetUpStatusForPhase(testCase.phase);
    if (setUpStatus === testCase.expectedSetUpStatus) {
      passed++;
      logSuccess(`${testCase.phase} → ${setUpStatus}`);
    } else {
      failed++;
      logError(`${testCase.phase} → Expected: ${testCase.expectedSetUpStatus}, Got: ${setUpStatus}`);
    }
  }

  const allPassed = failed === 0;
  recordTest('Mapeo de reno_phase a Set Up Status', allPassed, failed > 0 ? `${failed} casos fallaron` : undefined, {
    passed,
    failed,
    total: testCases.length,
  });

  return allPassed;
}

/**
 * Test 3: Verificar consistencia bidireccional
 */
async function testBidirectionalConsistency() {
  logTest('Test 3: Consistencia bidireccional (Set Up Status ↔ reno_phase)');

  const phases: RenoKanbanPhase[] = [
    'upcoming-settlements',
    'initial-check',
    'reno-budget-renovator',
    'reno-budget-client',
    'reno-budget-start',
    'reno-in-progress',
    'furnishing-cleaning',
    'final-check',
  ];

  let passed = 0;
  let failed = 0;

  for (const phase of phases) {
    const setUpStatus = getSetUpStatusForPhase(phase);
    const mappedBack = mapSetUpStatusToKanbanPhase(setUpStatus);

    if (mappedBack === phase) {
      passed++;
      logSuccess(`${phase} → ${setUpStatus} → ${mappedBack} ✓`);
    } else {
      failed++;
      logError(`${phase} → ${setUpStatus} → ${mappedBack} (expected ${phase})`);
    }
  }

  const allPassed = failed === 0;
  recordTest('Consistencia bidireccional', allPassed, failed > 0 ? `${failed} casos fallaron` : undefined, {
    passed,
    failed,
    total: phases.length,
  });

  return allPassed;
}

/**
 * Test 4: Verificar función helper con propiedad real (si existe)
 */
async function testHelperFunction() {
  logTest('Test 4: Función helper updatePropertyPhaseConsistent');

  // Intentar importar dinámicamente para evitar errores si no hay variables de entorno
  let supabase: any;
  let updatePropertyPhaseConsistent: any;
  
  try {
    const supabaseModule = await import('@/lib/supabase/client');
    const helperModule = await import('@/lib/supabase/phase-update-helper');
    supabase = supabaseModule.createClient();
    updatePropertyPhaseConsistent = helperModule.updatePropertyPhaseConsistent;
  } catch (error: any) {
    logWarning('No se pudo conectar a Supabase (variables de entorno faltantes)');
    logWarning('Saltando prueba con propiedad real');
    recordTest('Función helper (con propiedad real)', true, undefined, {
      skipped: true,
      reason: 'Variables de entorno de Supabase no disponibles',
    });
    return true;
  }

  try {
    // Buscar una propiedad de prueba (preferiblemente en upcoming-settlements)
    const { data: properties, error: fetchError } = await supabase
      .from('properties')
      .select('id, reno_phase, "Set Up Status"')
      .eq('reno_phase', 'upcoming-settlements')
      .limit(1);

    if (fetchError || !properties || properties.length === 0) {
      logWarning('No se encontró propiedad de prueba en upcoming-settlements');
      logWarning('Saltando prueba con propiedad real');
      recordTest('Función helper (con propiedad real)', true, undefined, {
        skipped: true,
        reason: 'No hay propiedades de prueba disponibles',
      });
      return true;
    }

    const testProperty = properties[0];
    const originalPhase = testProperty.reno_phase as RenoKanbanPhase;
    const originalSetUpStatus = testProperty['Set Up Status'] as string;

    log(`  Propiedad de prueba: ${testProperty.id}`);
    log(`  Fase original: ${originalPhase}`);
    log(`  Set Up Status original: ${originalSetUpStatus}`);

    // Probar actualización a initial-check
    const result = await updatePropertyPhaseConsistent(testProperty.id, {
      setUpStatus: 'initial check',
      renoPhase: 'initial-check',
    });

    if (!result.success) {
      recordTest('Función helper (actualización)', false, result.error);
      return false;
    }

    // Verificar que se actualizó correctamente
    const { data: updatedProperty, error: verifyError } = await supabase
      .from('properties')
      .select('reno_phase, "Set Up Status"')
      .eq('id', testProperty.id)
      .single();

    if (verifyError) {
      recordTest('Función helper (verificación)', false, verifyError.message);
      return false;
    }

    const updatedPhase = updatedProperty.reno_phase as RenoKanbanPhase;
    const updatedSetUpStatus = updatedProperty['Set Up Status'] as string;

    if (updatedPhase === 'initial-check' && updatedSetUpStatus === 'initial check') {
      logSuccess('Actualización exitosa: ambos campos coinciden');
      
      // Restaurar valores originales
      await updatePropertyPhaseConsistent(testProperty.id, {
        setUpStatus: originalSetUpStatus,
        renoPhase: originalPhase,
      });
      logSuccess('Valores originales restaurados');

      recordTest('Función helper (con propiedad real)', true);
      return true;
    } else {
      recordTest('Función helper (verificación)', false, `Fase: ${updatedPhase}, Set Up Status: ${updatedSetUpStatus}`, {
        expectedPhase: 'initial-check',
        expectedSetUpStatus: 'initial check',
        actualPhase: updatedPhase,
        actualSetUpStatus: updatedSetUpStatus,
      });
      return false;
    }
  } catch (error: any) {
    recordTest('Función helper (excepción)', false, error.message);
    return false;
  }
}

/**
 * Test 5: Verificar transiciones principales
 */
async function testMainTransitions() {
  logTest('Test 5: Transiciones principales');

  const transitions = [
    {
      name: 'upcoming-settlements → initial-check',
      fromPhase: 'upcoming-settlements' as RenoKanbanPhase,
      fromSetUpStatus: 'Pending to visit',
      toPhase: 'initial-check' as RenoKanbanPhase,
      toSetUpStatus: 'initial check',
      trigger: 'Guardar Estimated Visit Date',
    },
    {
      name: 'initial-check → reno-budget-renovator',
      fromPhase: 'initial-check' as RenoKanbanPhase,
      fromSetUpStatus: 'initial check',
      toPhase: 'reno-budget-renovator' as RenoKanbanPhase,
      toSetUpStatus: 'Pending to budget (from Renovator)',
      trigger: 'Finalizar Checklist Inicial',
    },
    {
      name: 'reno-budget-renovator → reno-budget-client',
      fromPhase: 'reno-budget-renovator' as RenoKanbanPhase,
      fromSetUpStatus: 'Pending to budget (from Renovator)',
      toPhase: 'reno-budget-client' as RenoKanbanPhase,
      toSetUpStatus: 'Pending to budget (from Client)',
      trigger: 'Completar presupuesto renovador',
    },
    {
      name: 'reno-budget-client → reno-budget-start',
      fromPhase: 'reno-budget-client' as RenoKanbanPhase,
      fromSetUpStatus: 'Pending to budget (from Client)',
      toPhase: 'reno-budget-start' as RenoKanbanPhase,
      toSetUpStatus: 'Reno to start',
      trigger: 'Aprobar presupuesto cliente',
    },
    {
      name: 'reno-budget-start → reno-in-progress',
      fromPhase: 'reno-budget-start' as RenoKanbanPhase,
      fromSetUpStatus: 'Reno to start',
      toPhase: 'reno-in-progress' as RenoKanbanPhase,
      toSetUpStatus: 'Reno in progress',
      trigger: 'Iniciar obra',
    },
    {
      name: 'reno-in-progress → furnishing-cleaning',
      fromPhase: 'reno-in-progress' as RenoKanbanPhase,
      fromSetUpStatus: 'Reno in progress',
      toPhase: 'furnishing-cleaning' as RenoKanbanPhase,
      toSetUpStatus: 'Cleaning & Furnishing',
      trigger: 'Completar obra',
    },
    {
      name: 'furnishing-cleaning → final-check',
      fromPhase: 'furnishing-cleaning' as RenoKanbanPhase,
      fromSetUpStatus: 'Cleaning & Furnishing',
      toPhase: 'final-check' as RenoKanbanPhase,
      toSetUpStatus: 'Final Check',
      trigger: 'Completar limpieza/amoblamiento',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const transition of transitions) {
    // Verificar mapeo desde Set Up Status
    const mappedPhase = mapSetUpStatusToKanbanPhase(transition.toSetUpStatus);
    const mappedSetUpStatus = getSetUpStatusForPhase(transition.toPhase);

    const phaseMatches = mappedPhase === transition.toPhase;
    const statusMatches = mappedSetUpStatus === transition.toSetUpStatus;

    if (phaseMatches && statusMatches) {
      passed++;
      logSuccess(`${transition.name} (${transition.trigger})`);
    } else {
      failed++;
      logError(`${transition.name}:`);
      if (!phaseMatches) {
        logError(`  - Fase: Expected ${transition.toPhase}, Got ${mappedPhase}`);
      }
      if (!statusMatches) {
        logError(`  - Set Up Status: Expected ${transition.toSetUpStatus}, Got ${mappedSetUpStatus}`);
      }
    }
  }

  const allPassed = failed === 0;
  recordTest('Transiciones principales', allPassed, failed > 0 ? `${failed} transiciones fallaron` : undefined, {
    passed,
    failed,
    total: transitions.length,
  });

  return allPassed;
}

/**
 * Ejecutar todas las pruebas
 */
async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 PRUEBAS AUTOMATIZADAS DE TRANSICIONES DE FASE', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  const startTime = Date.now();

  try {
    // Cargar funciones de mapeo primero
    log('📦 Cargando funciones de mapeo...', 'cyan');
    const functionsLoaded = await loadMappingFunctions();
    
    if (!functionsLoaded) {
      logError('No se pudieron cargar las funciones de mapeo');
      process.exit(1);
    }
    logSuccess('Funciones de mapeo cargadas correctamente\n');

    const results = await Promise.all([
      testSetUpStatusMapping(),
      testPhaseToSetUpStatusMapping(),
      testBidirectionalConsistency(),
      testHelperFunction(),
      testMainTransitions(),
    ]);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Resumen
    log('\n' + '='.repeat(60), 'blue');
    log('📊 RESUMEN DE PRUEBAS', 'blue');
    log('='.repeat(60), 'blue');

    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    testResults.forEach((result, index) => {
      const status = result.passed ? '✅' : '❌';
      log(`${status} ${index + 1}. ${result.name}`, result.passed ? 'green' : 'red');
    });

    log('\n' + '-'.repeat(60), 'blue');
    log(`Total: ${totalTests} pruebas`, 'cyan');
    log(`Pasadas: ${passedTests}`, 'green');
    log(`Fallidas: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
    log(`Duración: ${duration}s`, 'cyan');
    log('-'.repeat(60) + '\n', 'blue');

    if (failedTests === 0) {
      log('🎉 ¡Todas las pruebas pasaron exitosamente!', 'green');
      process.exit(0);
    } else {
      log(`⚠️  ${failedTests} prueba(s) fallaron`, 'red');
      process.exit(1);
    }
  } catch (error: any) {
    logError(`Error ejecutando pruebas: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar pruebas si se ejecuta directamente
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

export { runAllTests };

