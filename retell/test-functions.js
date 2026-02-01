#!/usr/bin/env node

/**
 * Retell Functions Test Script
 * Tests all 6 Retell AI function endpoints
 * 
 * Usage:
 *   node retell/test-functions.js
 *   BASE_URL=https://your-ngrok-url.ngrok.io node retell/test-functions.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, ...args) {
  console.log(colors[color], ...args, colors.reset);
}

async function testEndpoint(name, endpoint, data, description) {
  log('cyan', `\n${'='.repeat(60)}`);
  log('yellow', `Testing: ${name}`);
  console.log(`POST ${BASE_URL}${endpoint}`);
  if (description) console.log(`Purpose: ${description}`);
  console.log('Request:', JSON.stringify(data, null, 2));
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    console.log('\nResponse:');
    console.log(JSON.stringify(result, null, 2).substring(0, 800));
    
    if (result.success !== false) {
      log('green', '✓ PASSED');
      return { passed: true, result };
    } else {
      log('red', '✗ FAILED - success: false');
      return { passed: false, result };
    }
  } catch (error) {
    log('red', `✗ ERROR: ${error.message}`);
    return { passed: false, error };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('cyan', 'RETELL FUNCTIONS TEST SUITE');
  console.log(`Testing against: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Health check
  log('yellow', '\nTest 1: Health Check');
  try {
    const health = await fetch(`${BASE_URL}/health`);
    const healthData = await health.json();
    if (healthData.status === 'ok') {
      log('green', '✓ Server is running');
      passed++;
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    log('red', `✗ Server not responding: ${error.message}`);
    console.log('\nMake sure the backend is running: cd backend && npm run dev');
    process.exit(1);
  }
  
  // Test 2: lookup_customer - Existing
  const test2 = await testEndpoint(
    'lookup_customer (existing: John Smith)',
    '/api/voice/lookup_customer',
    { phone_number: '555-234-5678' },
    'Find existing customer by phone'
  );
  test2.passed ? passed++ : failed++;
  
  // Test 3: lookup_customer - New
  const test3 = await testEndpoint(
    'lookup_customer (new customer)',
    '/api/voice/lookup_customer',
    { phone_number: '555-999-0000' },
    'Handle unknown phone number'
  );
  test3.passed ? passed++ : failed++;
  
  // Test 4: get_services - Popular
  const test4 = await testEndpoint(
    'get_services (popular)',
    '/api/voice/get_services',
    {},
    'Get popular services list'
  );
  test4.passed ? passed++ : failed++;
  
  // Get a service ID for further tests
  let serviceId = test4.result?.services?.[0]?.id;
  
  // Test 5: get_services - Search
  const test5 = await testEndpoint(
    'get_services (search)',
    '/api/voice/get_services',
    { search: 'oil change' },
    'Search for specific service'
  );
  test5.passed ? passed++ : failed++;
  
  // Use search result if available
  if (test5.result?.services?.[0]?.id) {
    serviceId = test5.result.services[0].id;
  }
  
  // Test 6: get_services - Category
  const test6 = await testEndpoint(
    'get_services (category)',
    '/api/voice/get_services',
    { category: 'Brakes' },
    'Filter services by category'
  );
  test6.passed ? passed++ : failed++;
  
  // Test 7: get_services - With Mileage
  const test7 = await testEndpoint(
    'get_services (with mileage)',
    '/api/voice/get_services',
    { mileage: 45000 },
    'Get services with mileage recommendations'
  );
  test7.passed ? passed++ : failed++;
  
  // Test 8: check_availability - Morning
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  const test8 = await testEndpoint(
    'check_availability (morning)',
    '/api/voice/check_availability',
    { 
      service_ids: serviceId ? [serviceId] : ['test-id'],
      preferred_date: tomorrowStr,
      preferred_time: 'morning'
    },
    'Check morning availability'
  );
  test8.passed ? passed++ : failed++;
  
  // Test 9: check_availability - Afternoon
  const test9 = await testEndpoint(
    'check_availability (afternoon)',
    '/api/voice/check_availability',
    { 
      service_ids: serviceId ? [serviceId] : ['test-id'],
      preferred_time: 'afternoon',
      days_to_check: 7
    },
    'Check afternoon availability over 7 days'
  );
  test9.passed ? passed++ : failed++;
  
  // Test 10: get_customer_appointments - Existing
  const test10 = await testEndpoint(
    'get_customer_appointments (existing)',
    '/api/voice/get_customer_appointments',
    { customer_phone: '555-234-5678', status: 'upcoming' },
    'Get upcoming appointments for customer'
  );
  test10.passed ? passed++ : failed++;
  
  // Test 11: get_customer_appointments - New
  const test11 = await testEndpoint(
    'get_customer_appointments (new customer)',
    '/api/voice/get_customer_appointments',
    { customer_phone: '555-000-0000' },
    'Handle customer with no appointments'
  );
  test11.passed ? passed++ : failed++;
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('cyan', 'TEST SUMMARY');
  console.log('='.repeat(60));
  log('green', `Passed: ${passed}`);
  log('red', `Failed: ${failed}`);
  
  if (failed === 0) {
    log('green', '\n✓ All tests passed! Your Retell functions are ready.');
  } else {
    log('yellow', '\n⚠ Some tests failed. Check the responses above.');
  }
  
  // Next steps
  console.log('\n' + '='.repeat(60));
  log('cyan', 'NEXT STEPS');
  console.log('='.repeat(60));
  console.log(`
1. Make your API publicly accessible:
   ${colors.yellow}npx ngrok http 3001${colors.reset}

2. Copy the ngrok URL (e.g., https://abc123.ngrok-free.app)

3. Go to Retell Dashboard → Create Agent

4. Add the 6 functions from retell/retell-config.json
   Replace {{BASE_URL}} with your ngrok URL

5. Copy retell/agent-prompt.md into the System Prompt

6. Test with the "Test Agent" button in Retell

For detailed instructions, see: retell/SETUP.md
`);

  // Show book_appointment example
  console.log('='.repeat(60));
  log('cyan', 'MANUAL TEST: book_appointment');
  console.log('='.repeat(60));
  console.log(`
To test booking (creates real data):

curl -X POST ${BASE_URL}/api/voice/book_appointment \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_phone": "555-TEST-999",
    "customer_first_name": "Test",
    "customer_last_name": "User",
    "vehicle_year": 2022,
    "vehicle_make": "Toyota",
    "vehicle_model": "Camry",
    "service_ids": ["${serviceId || 'SERVICE_ID'}"],
    "appointment_date": "${tomorrowStr}",
    "appointment_time": "10:00"
  }'
`);
}

runTests().catch(console.error);
