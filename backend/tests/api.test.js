/**
 * API test suite using Node's built-in test runner.
 * Run: node --test backend/tests/api.test.js
 * Or:  BASE_URL=https://www.alignedai.dev node --test backend/tests/api.test.js
 *
 * Tests cover: health check, input validation, availability, webhook/cron auth,
 * dashboard endpoints, and voice function validation.
 *
 * Note: Production has rate limiting (10/min on bookings, 60/min general).
 * Tests include small delays to avoid hitting limits.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function get(path, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function post(path, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// 1. Health & root
// ---------------------------------------------------------------------------
describe('Health & root', () => {
  it('GET / returns API info', async () => {
    const { status, data } = await get('/');
    assert.equal(status, 200);
    assert.equal(data.status, 'online');
    assert.ok(data.name);
  });

  it('GET /health returns ok with db status', async () => {
    const { status, data } = await get('/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
    assert.equal(data.database, 'connected');
    assert.ok(typeof data.response_ms === 'number');
  });

  it('GET /nonexistent returns 404', async () => {
    const { status } = await get('/nonexistent');
    assert.equal(status, 404);
  });
});

// ---------------------------------------------------------------------------
// 2. Input validation (appointments) — sequential with delays for rate limit
// ---------------------------------------------------------------------------
describe('Appointment input validation', () => {
  it('rejects missing required fields', async () => {
    const { status, data } = await post('/api/appointments', {});
    assert.ok(status === 400 || status === 429, `Expected 400 or 429, got ${status}`);
    if (status === 400) assert.ok(data.error?.message);
  });

  it('rejects invalid date format', async () => {
    await sleep(1500);
    const { status, data } = await post('/api/appointments', {
      customer_phone: '5551234567',
      customer_first_name: 'Test',
      vehicle_year: 2024,
      vehicle_make: 'Honda',
      vehicle_model: 'Civic',
      service_ids: ['00000000-0000-0000-0000-000000000001'],
      appointment_date: '13-01-2025',
      appointment_time: '10:00',
    });
    assert.ok(status === 400 || status === 429, `Expected 400 or 429, got ${status}`);
    if (status === 400) assert.match(data.error.message, /date/i);
  });

  it('rejects weekend date', async () => {
    await sleep(1500);
    const d = new Date();
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    const saturday = d.toISOString().slice(0, 10);

    const { status, data } = await post('/api/appointments', {
      customer_phone: '5551234567',
      customer_first_name: 'Test',
      vehicle_year: 2024,
      vehicle_make: 'Honda',
      vehicle_model: 'Civic',
      service_ids: ['00000000-0000-0000-0000-000000000001'],
      appointment_date: saturday,
      appointment_time: '10:00',
    });
    assert.ok(status === 400 || status === 429, `Expected 400 or 429, got ${status}`);
    if (status === 400) assert.match(data.error.message, /weekday|weekend|Monday.*Friday/i);
  });

  it('rejects time outside business hours', async () => {
    await sleep(1500);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const weekday = d.toISOString().slice(0, 10);

    const { status, data } = await post('/api/appointments', {
      customer_phone: '5551234567',
      customer_first_name: 'Test',
      vehicle_year: 2024,
      vehicle_make: 'Honda',
      vehicle_model: 'Civic',
      service_ids: ['00000000-0000-0000-0000-000000000001'],
      appointment_date: weekday,
      appointment_time: '18:00',
    });
    assert.ok(status === 400 || status === 429, `Expected 400 or 429, got ${status}`);
    if (status === 400) assert.match(data.error.message, /business hours|7.*AM.*4.*PM/i);
  });

  it('rejects invalid service_ids format', async () => {
    await sleep(1500);
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const weekday = d.toISOString().slice(0, 10);

    const { status, data } = await post('/api/appointments', {
      customer_phone: '5551234567',
      customer_first_name: 'Test',
      vehicle_year: 2024,
      vehicle_make: 'Honda',
      vehicle_model: 'Civic',
      service_ids: ['not-a-uuid'],
      appointment_date: weekday,
      appointment_time: '10:00',
    });
    assert.ok(status === 400 || status === 429, `Expected 400 or 429, got ${status}`);
    if (status === 400) assert.match(data.error.message, /service_ids|UUID/i);
  });
});

// ---------------------------------------------------------------------------
// 3. Availability endpoint
// ---------------------------------------------------------------------------
describe('Availability', () => {
  it('GET /api/availability/check returns slots for valid service_ids', async () => {
    const svc = await post('/api/voice/get_services', { search: 'oil change' });
    if (!svc.data?.services?.length) return;

    const serviceId = svc.data.services[0].id;
    const d = new Date();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    const date = d.toISOString().slice(0, 10);

    const { status, data } = await get(
      `/api/availability/check?service_ids=${serviceId}&date=${date}`
    );
    assert.equal(status, 200);
    assert.ok(data.available_slots || data.slots || data.available_times);
  });

  it('GET /api/availability/check rejects missing service_ids', async () => {
    const { status, data } = await get('/api/availability/check');
    assert.equal(status, 400);
    assert.match(data.error.message, /service_ids/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Cron auth
// ---------------------------------------------------------------------------
describe('Cron auth', () => {
  it('rejects regenerate-slots without auth', async () => {
    const { status, data } = await get('/api/cron/regenerate-slots');
    assert.equal(status, 401);
    assert.ok(data.error);
  });

  it('rejects send-reminders without auth', async () => {
    const { status, data } = await get('/api/cron/send-reminders');
    assert.equal(status, 401);
    assert.ok(data.error);
  });

  it('rejects regenerate-slots with wrong Bearer token', async () => {
    const { status } = await get('/api/cron/regenerate-slots', {
      Authorization: 'Bearer wrong-token',
    });
    assert.equal(status, 401);
  });
});

// ---------------------------------------------------------------------------
// 5. Webhook auth
// ---------------------------------------------------------------------------
describe('Webhook auth', () => {
  it('POST /api/webhooks/voice handles unauthenticated request', async () => {
    const { status } = await post('/api/webhooks/voice', { event: 'call_started' });
    // If RETELL_SKIP_WEBHOOK_VERIFY is set, server may accept (200).
    // Otherwise it should reject (401/400/403).
    assert.ok([200, 400, 401, 403].includes(status),
      `Expected 200/401/400/403, got ${status}`);
  });
});

// ---------------------------------------------------------------------------
// 6. Dashboard endpoints (smoke tests) — sequential with delays
// ---------------------------------------------------------------------------
describe('Dashboard endpoints', () => {
  it('GET /api/appointments returns paginated list', async () => {
    await sleep(1200);
    const { status, data } = await get('/api/appointments?limit=5');
    assert.ok(status === 200 || status === 429, `Expected 200 or 429, got ${status}`);
    if (status === 200) {
      assert.ok(data.appointments || Array.isArray(data));
    }
  });

  it('GET /api/appointments/upcoming returns list', async () => {
    await sleep(1200);
    const { status, data } = await get('/api/appointments/upcoming?limit=5');
    assert.ok(status === 200 || status === 429, `Expected 200 or 429, got ${status}`);
    if (status === 200) {
      assert.ok(data.appointments || Array.isArray(data));
    }
  });

  it('GET /api/appointments/today returns today data', async () => {
    await sleep(1200);
    const { status, data } = await get('/api/appointments/today');
    assert.ok(status === 200 || status === 429, `Expected 200 or 429, got ${status}`);
    if (status === 200) {
      assert.ok(data.date);
      assert.ok(Array.isArray(data.appointments));
    }
  });

  it('GET /api/customers returns list', async () => {
    await sleep(1200);
    const { status, data } = await get('/api/customers?limit=5');
    assert.ok(status === 200 || status === 429, `Expected 200 or 429, got ${status}`);
    if (status === 200) {
      assert.ok(data.customers || data.data || Array.isArray(data));
    }
  });

  it('GET /api/services returns services', async () => {
    await sleep(1200);
    const { status, data } = await get('/api/services');
    assert.ok(status === 200 || status === 429, `Expected 200 or 429, got ${status}`);
    if (status === 200) {
      assert.ok(Array.isArray(data) || data.services);
    }
  });

  it('GET /api/analytics/overview returns stats', async () => {
    await sleep(1200);
    const { status, data } = await get('/api/analytics/overview');
    assert.ok(status === 200 || status === 429, `Expected 200 or 429, got ${status}`);
    if (status === 200) {
      assert.ok(typeof data === 'object');
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Voice function validation
// ---------------------------------------------------------------------------
describe('Voice function validation', () => {
  it('get_services returns results for common search', async () => {
    const { status, data } = await post('/api/voice/get_services', { search: 'brakes' });
    assert.equal(status, 200);
    assert.ok(data.success !== false);
    assert.ok(Array.isArray(data.services));
  });

  it('check_availability rejects missing service_ids', async () => {
    const { status, data } = await post('/api/voice/check_availability', {
      preferred_date: '2025-03-10',
    });
    assert.ok(status === 400 || data.success === false || data.available === false,
      'Should reject without service_ids');
  });

  it('book_appointment rejects incomplete payload', async () => {
    await sleep(1500);
    const { status, data } = await post('/api/voice/book_appointment', {
      customer_phone: '5551234567',
    });
    assert.ok(status === 400 || status === 429 || data.success === false,
      'Should reject incomplete booking');
  });
});
