const { RentalsAdapterEngine, PurchaseTrackerAdapterEngine } = require('../packages/domain/dist/index.js');

console.log('=== BUFFER POLICIES & CONNECTOR GUARDS VERIFICATION ===\n');

let allPassed = true;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    allPassed = false;
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

// Case 1: Zero buffers (10 Nov 2026, 10:00–18:00)
const case1 = RentalsAdapterEngine.calculateOccupiedInterval(
  { start: '2026-11-10T10:00:00+03:00', end: '2026-11-10T18:00:00+03:00', basis: 'event_dates_only' },
  { prepHours: 0, returnHours: 0 }
);
console.log('Case 1 (Zero Buffers):', case1);
assert(case1.start.startsWith('2026-11-10T10:00:00'), 'Case 1 start equals 10:00');
assert(case1.end.startsWith('2026-11-10T18:00:00'), 'Case 1 end equals 18:00');
assert(case1.policyProvenance === 'configured_policy', 'Case 1 provenance is configured_policy');

// Case 2: 2-hour prep and 6-hour return
const case2 = RentalsAdapterEngine.calculateOccupiedInterval(
  { start: '2026-11-10T10:00:00+03:00', end: '2026-11-10T18:00:00+03:00', basis: 'event_dates_only' },
  { prepHours: 2, returnHours: 6 }
);
console.log('\nCase 2 (2h prep, 6h return):', case2);
assert(case2.start.startsWith('2026-11-10T08:00:00'), 'Case 2 start expanded backwards by 2h to 08:00');
assert(case2.end.startsWith('2026-11-11T00:00:00'), 'Case 2 end expanded forward by 6h to 11 Nov 00:00');
assert(case2.policyProvenance === 'configured_policy', 'Case 2 provenance is configured_policy');

// Case 3: Already buffered interval (no double expansion)
const case3 = RentalsAdapterEngine.calculateOccupiedInterval(
  { start: '2026-11-10T08:00:00+03:00', end: '2026-11-11T00:00:00+03:00', basis: 'occupied_including_buffers' },
  { prepHours: 2, returnHours: 6 }
);
console.log('\nCase 3 (Already buffered interval):', case3);
assert(case3.start.startsWith('2026-11-10T08:00:00'), 'Case 3 start unchanged at 08:00');
assert(case3.end.startsWith('2026-11-11T00:00:00'), 'Case 3 end unchanged at 11 Nov 00:00');
assert(case3.policyProvenance === 'already_buffered_input', 'Case 3 provenance is already_buffered_input');

// Case 4: Absent policy exposes uncertainty (no silent 24h default constant)
const case4 = RentalsAdapterEngine.calculateOccupiedInterval(
  { start: '2026-11-10T10:00:00+03:00', end: '2026-11-10T18:00:00+03:00', basis: 'event_dates_only' },
  undefined
);
console.log('\nCase 4 (Absent policy):', case4);
assert(case4.start.startsWith('2026-11-10T10:00:00'), 'Case 4 start unchanged');
assert(case4.end.startsWith('2026-11-10T18:00:00'), 'Case 4 end unchanged');
assert(case4.policyProvenance === 'absent_policy_unspecified', 'Case 4 provenance is absent_policy_unspecified');

// Connector Guards Verification
console.log('\n--- Connector Guards Verification ---');

// 1. Rentals Query in disabled mode
const rentalsQuery = RentalsAdapterEngine.queryAvailability(
  {
    productPoolId: 'pool-reg-counters-doha',
    quantity: 20,
    window: { start: '2026-11-10T10:00:00+03:00', end: '2026-11-10T18:00:00+03:00' },
  },
  'disabled'
);
console.log('Rentals Availability Query (disabled mode):', rentalsQuery.connectionStatus, rentalsQuery.warehouseRef);
assert(rentalsQuery.connectionStatus === 'not_connected', 'Rentals availability reports not_connected');
assert(rentalsQuery.availableQuantity === 0, 'No manufactured inventory balance is reported');

// 2. Rentals Reservation Command in disabled mode
const rentalsReservation = RentalsAdapterEngine.submitReservationCommand(
  'PROJ-ACC-001',
  'tenant-e3-production',
  'idem-key-test-01',
  {
    sourceProduct: { connectionId: 'rnt-conn-01', productPoolId: 'pool-reg-counters-doha' },
    quantity: 20,
    window: { start: '2026-11-10T10:00:00+03:00', end: '2026-11-10T18:00:00+03:00' },
  },
  'disabled'
);
console.log('Rentals Reservation Command:', rentalsReservation.operation.businessState, rentalsReservation.operation.errorDetail);
assert(rentalsReservation.operation.businessState === 'rejected', 'Rentals mutation command is strictly rejected');
assert(rentalsReservation.operation.errorDetail.includes('CONNECTOR_DISABLED'), 'Error detail states CONNECTOR_DISABLED');

// 3. PurchaseTracker Vendor Onboarding in disabled mode
const ptOnboarding = PurchaseTrackerAdapterEngine.submitVendorOnboarding(
  {
    companyName: 'Acme Event Supplies LLC',
    crNumber: 'CR-12345-QA',
    tradeLicenseExpiry: '2027-12-31',
    category: 'fabrication',
  },
  'disabled'
);
console.log('PurchaseTracker Vendor Onboarding:', ptOnboarding.status, ptOnboarding.message);
assert(ptOnboarding.status === 'blocked', 'PurchaseTracker onboarding is blocked in disabled mode');
assert(ptOnboarding.message.includes('CONNECTOR_DISABLED'), 'Onboarding message references CONNECTOR_DISABLED');

// 4. PurchaseTracker PO Creation guard
const ptPoCreation = PurchaseTrackerAdapterEngine.attemptPurchaseOrderCreation();
console.log('PurchaseTracker PO Creation:', ptPoCreation.errorCode, ptPoCreation.message);
assert(ptPoCreation.allowed === false, 'Direct PO creation is strictly not allowed');
assert(ptPoCreation.errorCode === 'PO_CREATION_DEFERRED', 'Error code is PO_CREATION_DEFERRED');
assert(ptPoCreation.message.includes('Direct PO creation capability is deferred and unverified'), 'Message states PO creation capability is deferred');

if (!allPassed) {
  console.error('\n❌ Buffer and Connector verification failed!');
  process.exit(1);
} else {
  console.log('\n>>> ALL BUFFER POLICIES & CONNECTOR GUARDS VERIFIED SUCCESSFULLY (100% PASS)! <<<');
  process.exit(0);
}
