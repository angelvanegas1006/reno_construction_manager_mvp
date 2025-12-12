/**
 * Script de prueba simplificado para verificar transiciones de fase
 * 
 * Este script prueba solo las funciones de mapeo sin requerir conexión a Supabase
 */

// Copiar las funciones de mapeo directamente para evitar dependencias de Supabase
type RenoKanbanPhase = 
  | "upcoming-settlements"
  | "initial-check"
  | "reno-budget-renovator"
  | "reno-budget-client"
  | "reno-budget-start"
  | "reno-budget"
  | "upcoming"
  | "reno-in-progress"
  | "furnishing-cleaning"
  | "final-check"
  | "reno-fixes"
  | "done"
  | "orphaned";

function mapSetUpStatusToKanbanPhase(setUpStatus: string | null): RenoKanbanPhase | null {
  if (!setUpStatus) return null;

  const status = setUpStatus.trim().toLowerCase();

  const mapping: Record<string, RenoKanbanPhase> = {
    'pending to visit': 'upcoming-settlements',
    'nuevas escrituras': 'upcoming-settlements',
    'check inicial': 'initial-check',
    'initial check': 'initial-check',
    'pending to validate budget (from renovator)': 'reno-budget-renovator',
    'pending to budget (from renovator)': 'reno-budget-renovator',
    'pending to budget from renovator': 'reno-budget-renovator',
    'pending budget from renovator': 'reno-budget-renovator',
    'pending to validate budget (from client)': 'reno-budget-client',
    'pending to budget (from client)': 'reno-budget-client',
    'pending to budget from client': 'reno-budget-client',
    'pending budget from client': 'reno-budget-client',
    'reno to start': 'reno-budget-start',
    'obra para empezar': 'reno-budget-start',
    'obra a empezar': 'reno-budget-start',
    'pending to validate budget (client & renovator) & reno to start': 'reno-budget',
    'upcoming': 'reno-budget',
    'pending to validate budget': 'upcoming',
    'pending to validate budget & reno to start': 'upcoming',
    'proximas propiedades': 'upcoming',
    'reno in progress': 'reno-in-progress',
    'obras en proceso': 'reno-in-progress',
    'cleaning & furnishing': 'furnishing-cleaning',
    'limpieza y amoblamiento': 'furnishing-cleaning',
    'cleaning and furnishing': 'furnishing-cleaning',
    'final check': 'final-check',
    'check final': 'final-check',
  };

  if (mapping[status]) {
    return mapping[status];
  }

  const sortedKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    if (status.includes(key)) {
      return mapping[key];
    }
  }

  return null;
}

function getSetUpStatusForPhase(phase: RenoKanbanPhase): string {
  const phaseToStatusMap: Record<RenoKanbanPhase, string> = {
    'upcoming-settlements': 'Pending to visit',
    'initial-check': 'initial check',
    'reno-budget-renovator': 'Pending to budget (from Renovator)',
    'reno-budget-client': 'Pending to budget (from Client)',
    'reno-budget-start': 'Reno to start',
    'reno-budget': 'Pending to validate budget',
    'upcoming': 'Pending to validate budget',
    'reno-in-progress': 'Reno in progress',
    'furnishing-cleaning': 'Cleaning & Furnishing',
    'final-check': 'Final Check',
    'reno-fixes': 'Reno Fixes',
    'done': 'Done',
    'orphaned': 'Orphaned',
  };

  return phaseToStatusMap[phase] || phase;
}

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

async function testMainTransitions() {
  logTest('Test 4: Transiciones principales');

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

async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 PRUEBAS AUTOMATIZADAS DE TRANSICIONES DE FASE', 'blue');
  log('='.repeat(60) + '\n', 'blue');

  const startTime = Date.now();

  try {
    const results = await Promise.all([
      testSetUpStatusMapping(),
      testPhaseToSetUpStatusMapping(),
      testBidirectionalConsistency(),
      testMainTransitions(),
    ]);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

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

runAllTests().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});

