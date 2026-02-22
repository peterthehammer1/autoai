// One-time script to update Retell LLM with new prompt + tool configs
// Run: node retell/update-retell.js

const fs = require('fs');
const path = require('path');

const LLM_ID = 'llm_dd6a7b57d61462264425d8f6546e';
const API_KEY = 'key_80e08bf8729fafff9a02258ee34f';

const prompt = fs.readFileSync(path.join(__dirname, 'agent-prompt-slim.md'), 'utf8');

const tools = [
  {
    type: 'end_call',
    name: 'end_call',
    description: 'End the call when the customer says goodbye or the conversation is complete.'
  },
  {
    type: 'custom',
    name: 'get_services',
    description: 'Get available services. Use when you need to find service IDs for booking, or when the customer asks about services or prices.',
    url: 'https://www.alignedai.dev/api/voice/get_services',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say a brief acknowledgment like 'One sec.' or 'Sure thing.' — 3 words max.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search term to find services (e.g., oil change, brakes, alignment)' }
      }
    }
  },
  {
    type: 'custom',
    name: 'check_availability',
    description: 'Check available appointment times. Call after you know what service they need.',
    url: 'https://www.alignedai.dev/api/voice/check_availability',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're checking the schedule — e.g. 'Checking the schedule now.' Keep it under 5 words. Do NOT repeat what you already said.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        service_ids: { type: 'array', items: { type: 'string' }, description: 'Service IDs from get_services' },
        preferred_date: { type: 'string', description: 'Preferred date YYYY-MM-DD' },
        preferred_time: { type: 'string', description: 'morning, afternoon, or specific time' }
      },
      required: ['service_ids']
    }
  },
  {
    type: 'custom',
    name: 'book_appointment',
    description: 'Book the appointment after customer confirms date, time, and service.',
    url: 'https://www.alignedai.dev/api/voice/book_appointment',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say 'Great. One second please.' exactly.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled from caller ID' },
        vehicle_id: { type: 'string', const: '{{vehicle_id}}', description: 'Vehicle ID - auto-filled for returning customers' },
        service_ids: { type: 'array', items: { type: 'string' }, description: 'Service IDs to book' },
        appointment_date: { type: 'string', description: 'Date YYYY-MM-DD' },
        appointment_time: { type: 'string', description: 'Time HH:MM (24-hour)' },
        customer_first_name: { type: 'string', description: 'For new customers only' },
        customer_last_name: { type: 'string', description: 'For new customers only' },
        customer_email: { type: 'string', description: 'Customer email (optional)' },
        vehicle_year: { type: 'integer', description: 'For new customers only' },
        vehicle_make: { type: 'string', description: 'For new customers only' },
        vehicle_model: { type: 'string', description: 'For new customers only' }
      },
      required: ['customer_phone', 'service_ids', 'appointment_date', 'appointment_time']
    }
  },
  {
    type: 'custom',
    name: 'get_customer_appointments',
    description: 'Get customer existing appointments. Use when customer asks about their appointments, wants to check when it is, reschedule, or cancel.',
    url: 'https://www.alignedai.dev/api/voice/get_customer_appointments',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're pulling up their info — e.g. 'Let me pull that up.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled from caller ID' }
      },
      required: ['customer_phone']
    }
  },
  {
    type: 'custom',
    name: 'modify_appointment',
    description: 'Cancel, reschedule, or add services to an existing appointment.',
    url: 'https://www.alignedai.dev/api/voice/modify_appointment',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're making the change — e.g. 'Updating that for you.' or 'Got it, one sec.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string', description: 'The appointment ID from get_customer_appointments' },
        action: { type: 'string', enum: ['cancel', 'reschedule', 'add_services'], description: 'cancel, reschedule, or add_services' },
        new_date: { type: 'string', description: 'New date YYYY-MM-DD (required for reschedule)' },
        new_time: { type: 'string', description: 'New time HH:MM (required for reschedule)' },
        service_ids: { type: 'array', items: { type: 'string' }, description: 'Service IDs to add (required for add_services)' }
      },
      required: ['appointment_id', 'action']
    }
  },
  {
    type: 'custom',
    name: 'send_confirmation',
    description: 'Send SMS confirmation to customer with appointment details. Use when customer asks for a confirmation text or reminder.',
    url: 'https://www.alignedai.dev/api/voice/send_confirmation',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're sending the text — e.g. 'Sending that over now.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        appointment_id: { type: 'string', description: 'The appointment ID to send confirmation for' },
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled from caller ID' }
      },
      required: ['customer_phone']
    }
  },
  {
    type: 'custom',
    name: 'submit_tow_request',
    description: 'Submit a tow-in request when the customer needs a tow. Use after you have the pickup address (where the car is) and customer/vehicle info.',
    url: 'https://www.alignedai.dev/api/voice/submit_tow_request',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're setting up the tow — e.g. 'Getting that tow set up.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled from caller ID' },
        customer_first_name: { type: 'string', description: 'First name' },
        customer_last_name: { type: 'string', description: 'Last name' },
        vehicle_id: { type: 'string', const: '{{vehicle_id}}', description: 'Vehicle ID if on file' },
        vehicle_year: { type: 'integer', description: 'Year of vehicle' },
        vehicle_make: { type: 'string', description: 'Make of vehicle' },
        vehicle_model: { type: 'string', description: 'Model of vehicle' },
        pickup_address_line1: { type: 'string', description: 'Street address where the car is (required)' },
        pickup_city: { type: 'string', description: 'City (required)' },
        pickup_state: { type: 'string', description: 'State (required)' },
        pickup_zip: { type: 'string', description: 'ZIP code (required)' },
        pickup_notes: { type: 'string', description: 'Cross street, landmark, etc.' }
      },
      required: ['customer_phone', 'pickup_address_line1', 'pickup_city', 'pickup_state', 'pickup_zip']
    }
  },
  {
    type: 'custom',
    name: 'submit_lead',
    description: 'ONLY use when someone asks about the AI platform itself (who made this, how do I get this for my business, etc). NOT for auto service questions.',
    url: 'https://www.alignedai.dev/api/voice/submit_lead',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're passing their info along — e.g. 'Let me get that noted.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_name: { type: 'string', description: "The person's name" },
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Their phone number - auto-filled from caller ID' },
        business_name: { type: 'string', description: 'Their business name if they mentioned it' },
        interest: { type: 'string', description: "What they're interested in (e.g., 'AI receptionist for auto shop', 'voice AI for my business')" }
      },
      required: ['customer_name', 'customer_phone']
    }
  },
  {
    type: 'custom',
    name: 'transfer_to_human',
    description: "Transfer the call to a human service advisor. Use when: customer is frustrated and wants a person, complex issue you can't handle, customer explicitly asks for a person, or you've failed multiple times at a task.",
    url: 'https://www.alignedai.dev/api/voice/transfer_to_human',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're connecting them — e.g. 'Let me get you to someone.' Keep it under 7 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled' },
        reason: { type: 'string', description: "Why the customer needs to speak with a human (e.g., 'customer frustrated', 'complex repair question', 'billing dispute')" },
        context: { type: 'string', description: "Brief summary of what you've discussed so the advisor has context" }
      },
      required: ['reason']
    }
  },
  {
    type: 'custom',
    name: 'request_callback',
    description: 'Request a callback from a service advisor. Use when customer wants someone to call them back rather than hold or transfer.',
    url: 'https://www.alignedai.dev/api/voice/request_callback',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're setting up the callback — e.g. 'I\\'ll get that set up.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled' },
        customer_name: { type: 'string', description: "Customer's name" },
        reason: { type: 'string', description: "What they need help with (e.g., 'question about repair cost', 'warranty question', 'complex scheduling')" },
        preferred_time: { type: 'string', description: "When they'd like to be called back (e.g., 'this afternoon', 'tomorrow morning', 'anytime')" }
      },
      required: ['customer_phone', 'reason']
    }
  },
  {
    type: 'custom',
    name: 'get_repair_status',
    description: "Check status of a vehicle currently at the shop. Use when customer asks 'is my car ready?', 'what\\'s the status?', 'how much longer?', or similar.",
    url: 'https://www.alignedai.dev/api/voice/get_repair_status',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're checking on their car — e.g. 'Let me check on that.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled' }
      },
      required: ['customer_phone']
    }
  },
  {
    type: 'custom',
    name: 'get_estimate',
    description: "Get a price estimate for a service. Use when customer asks 'how much for...', 'what does X cost?', 'can I get a quote?'",
    url: 'https://www.alignedai.dev/api/voice/get_estimate',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're pulling up pricing — e.g. 'Let me grab that price.' Keep it under 6 words.",
    speak_after_execution: true,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled for logging' },
        service_search: { type: 'string', description: "The service they want a price for (e.g., 'brake pads', 'oil change', 'alignment')" },
        issue_description: { type: 'string', description: "If they described a problem rather than a service (e.g., 'my car is making a grinding noise')" },
        vehicle_year: { type: 'integer', description: 'Vehicle year if they mentioned it' },
        vehicle_make: { type: 'string', description: 'Vehicle make if they mentioned it' },
        vehicle_model: { type: 'string', description: 'Vehicle model if they mentioned it' }
      },
      required: []
    }
  },
  {
    type: 'custom',
    name: 'get_vehicle_info',
    description: 'Get detailed vehicle information including maintenance schedule and open recalls by VIN. Use when: customer provides a VIN, you need to check if a service is due based on mileage, or customer asks about recalls on their vehicle.',
    url: 'https://www.alignedai.dev/api/voice/get_vehicle_info',
    speak_during_execution: true,
    execution_message_type: 'prompt',
    execution_message_description: "Say you're looking up their vehicle — e.g. 'Pulling up your vehicle info.' Keep it under 6 words.",
    speak_after_execution: false,
    parameters: {
      type: 'object',
      properties: {
        customer_phone: { type: 'string', const: '{{customer_phone}}', description: 'Customer phone - auto-filled, used to look up vehicle on file' },
        vin: { type: 'string', description: '17-character VIN if customer provides it' },
        current_mileage: { type: 'integer', description: 'Current vehicle mileage if customer mentions it' },
        check_service: { type: 'string', description: "Specific service to check if due (e.g., 'oil change', 'air filter', 'transmission fluid')" }
      },
      required: []
    }
  }
];

async function updateRetellLLM() {
  const res = await fetch(`https://api.retellai.com/update-retell-llm/${LLM_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      general_prompt: prompt,
      general_tools: tools
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`Failed (${res.status}):`, err);
    process.exit(1);
  }

  const data = await res.json();
  console.log('Retell LLM updated successfully!');
  console.log(`LLM ID: ${data.llm_id}`);
  console.log(`Tools: ${data.general_tools?.length || 0} configured`);
}

updateRetellLLM();
