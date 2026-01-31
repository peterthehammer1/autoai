import { createClient } from '@supabase/supabase-js';
import { subHours } from 'date-fns';

const supabase = createClient(
  'https://yvuvgpzywdyxybokjvfg.supabase.co',
  'sb_secret_8H7RSh7FRreH-lPk2oytxQ_OhV0fIrK'
);

const transcripts = [
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, I need to get an oil change for my car.

Agent: Absolutely, I can help with that! What vehicle will you be bringing in?

Customer: It's a 2021 Honda Accord.

Agent: Great choice! And is this for conventional, synthetic blend, or full synthetic oil?

Customer: Full synthetic, please.

Agent: Perfect. When works best for you?

Customer: Do you have anything tomorrow?

Agent: Let me check... I have 10 AM available tomorrow. Would that work?

Customer: That's perfect.

Agent: Wonderful! And can I get your name for the appointment?

Customer: Michael Johnson.

Agent: Great, Michael! You're all set for tomorrow at 10 AM for a full synthetic oil change on your 2021 Honda Accord. We'll send you a confirmation text with all the details. Is there anything else I can help with?

Customer: No, that's everything. Thank you!

Agent: Thanks for calling Premier Auto Service! See you tomorrow!`,
    summary: 'Customer Michael called to book a full synthetic oil change for their 2021 Honda Accord. Appointment scheduled for tomorrow at 10 AM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, my brakes have been making a squeaking noise. I think I need them looked at.

Agent: Oh, I'm sorry to hear that! Squeaky brakes can definitely be concerning. We should get that checked out. What vehicle are you driving?

Customer: I have a 2020 Toyota Camry.

Agent: Got it. We can do a brake inspection to see what's going on - it might just need new pads, or it could be the rotors too. Would you like to schedule that?

Customer: Yes, please. What do you have available?

Agent: I have an opening Thursday at 2 PM. Does that work for your schedule?

Customer: Thursday works. Let's do it.

Agent: Perfect! And your name?

Customer: Sarah Williams.

Agent: Alright Sarah, you're booked for Thursday at 2 PM for a brake inspection on your 2020 Toyota Camry. Our technicians will take a look and let you know exactly what's needed. You'll get a text confirmation shortly. Anything else?

Customer: That's all. Thanks so much!

Agent: You're welcome! Drive safe and we'll see you Thursday!`,
    summary: 'Customer Sarah reported squeaky brakes on their 2020 Toyota Camry. Scheduled brake inspection for Thursday at 2 PM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Yeah, I need to get my tires rotated. It's been a while.

Agent: No problem! Regular rotation is important for even wear. What are you driving?

Customer: 2022 Ford F-150.

Agent: Nice truck! We can get you in for a tire rotation. Would you also like us to balance them while we're at it? It's often recommended to do both together.

Customer: Sure, might as well do both.

Agent: Great call. That'll help with a smoother ride too. When would you like to come in?

Customer: What's available Friday?

Agent: I have 9 AM open Friday. Would that work?

Customer: Perfect timing. Book it.

Agent: Done! And your name?

Customer: Robert Davis.

Agent: Excellent, Robert! You're confirmed for Friday at 9 AM for tire rotation and balance on your 2022 Ford F-150. We'll text you the details. Anything else I can help with?

Customer: Nope, I'm good. Thanks!

Agent: Thanks for calling! See you Friday!`,
    summary: 'Customer Robert booked tire rotation and balance for their 2022 Ford F-150. Appointment set for Friday at 9 AM.',
  },
  {
    outcome: 'inquiry',
    sentiment: 'positive',
    intent: 'general_inquiry',
    transcript: `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, I'm just calling to get some pricing information.

Agent: Of course! What services are you interested in?

Customer: How much is an oil change? And do you do alignments?

Agent: Great questions! For oil changes, we have conventional starting at $39.99, synthetic blend at $59.99, and full synthetic at $79.99. For wheel alignment, a 4-wheel alignment is $99.99.

Customer: Okay, that's reasonable. What about brake work?

Agent: For brakes, a basic inspection is free with any service. Front or rear brake pads are $149.99 each, and if you need pads plus rotors, that's $349.99 per axle.

Customer: Got it. I drive a BMW 3 Series - does that change anything?

Agent: For a BMW 3 Series, those prices should be accurate for standard services. Some European vehicles have slightly higher parts costs for things like brakes, but we'll always give you an exact quote before any work.

Customer: Good to know. I might call back to schedule something.

Agent: Sounds good! We're here Monday through Friday 7 to 6, Saturday 8 to 4. Is there anything else I can help with?

Customer: No, that's helpful. Thanks!

Agent: You're welcome! Thanks for calling Premier Auto Service. Have a great day!`,
    summary: 'Customer called to inquire about pricing for oil changes, alignments, and brake work for their BMW 3 Series. No appointment booked but may call back.',
  },
  {
    outcome: 'rescheduled',
    sentiment: 'positive',
    intent: 'modify_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Hi, I have an appointment scheduled but I need to change it.

Agent: No problem at all! Let me pull that up. Can I get your name or phone number?

Customer: Jennifer Martinez.

Agent: Got it, Jennifer. I see your appointment here for tomorrow. When would you like to reschedule to?

Customer: Do you have anything next Monday?

Agent: Let me check Monday... I have 11 AM available. Would that work better?

Customer: Yes, that's much better for me.

Agent: Perfect! I've moved your appointment to Monday at 11 AM. Everything else stays the same - we'll see you then with your 2021 Lexus RX 350. I'll send you an updated confirmation text.

Customer: Thank you so much for being flexible!

Agent: Of course! Life happens. We'll see you Monday. Anything else I can help with?

Customer: That's all. Thanks again!

Agent: You're welcome! Take care!`,
    summary: 'Customer Jennifer called to reschedule their existing appointment. New appointment set for Monday at 11 AM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi there! I need to schedule my 30,000 mile service.

Agent: Perfect timing! What vehicle do you have?

Customer: 2022 Subaru Outback.

Agent: Great car! For a 30,000 mile service on a Subaru, we typically recommend a synthetic oil change, tire rotation, brake inspection, and fluid top-offs. Would you like the full package?

Customer: Yes, let's do the full service.

Agent: Excellent. When would you like to come in?

Customer: What do you have Wednesday morning?

Agent: I have 8:30 AM available on Wednesday. That would give us plenty of time for the full service.

Customer: That works perfectly.

Agent: Great! And your name?

Customer: David Thompson.

Agent: Wonderful, David! You're all set for Wednesday at 8:30 AM for your 30,000 mile service on the 2022 Subaru Outback. We'll take great care of it. You'll receive a confirmation text shortly. Anything else?

Customer: That's everything. Thank you!

Agent: Thank you for choosing Premier Auto Service! See you Wednesday!`,
    summary: 'Customer David scheduled 30,000 mile service for their 2022 Subaru Outback including oil change, tire rotation, and brake inspection. Appointment Wednesday at 8:30 AM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Hi, my check engine light came on this morning. Can you take a look?

Agent: Of course! That can definitely be stressful. We can do a diagnostic scan to see what's triggering the light. What are you driving?

Customer: It's a 2019 Chevrolet Equinox.

Agent: Got it. The diagnostic will tell us exactly what code is stored and what's causing the issue. When can you bring it in?

Customer: Is today possible? I'm a bit worried about it.

Agent: Let me check... Yes, I actually have an opening at 3:30 PM today. Would that work?

Customer: Oh that would be great!

Agent: Perfect. And your name?

Customer: Amanda Wilson.

Agent: Alright Amanda, you're booked for today at 3:30 PM. Bring in your 2019 Equinox and we'll run the diagnostic to see what's going on. If it's something simple, we might even be able to fix it today.

Customer: Thank you so much, that's a relief!

Agent: Of course! We'll see you at 3:30. Drive carefully!`,
    summary: 'Customer Amanda reported check engine light on their 2019 Chevrolet Equinox. Urgent same-day diagnostic appointment booked for 3:30 PM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, I need a wheel alignment. My car has been pulling to the right.

Agent: That's definitely something to address - it can cause uneven tire wear too. What vehicle will you be bringing in?

Customer: 2020 Nissan Altima.

Agent: Perfect. We do 4-wheel alignments that will correct any pull and make sure all four wheels are properly aligned. When would you like to schedule?

Customer: Do you have anything Saturday?

Agent: Yes! I have 10 AM available on Saturday. Would that work?

Customer: That's perfect, Saturday morning works great for me.

Agent: Excellent! Your name?

Customer: Chris Anderson.

Agent: Great, Chris! You're all set for Saturday at 10 AM for a 4-wheel alignment on your 2020 Nissan Altima. That should fix the pulling issue. We'll send you a confirmation. Anything else?

Customer: No, that's it. Thanks!

Agent: Thank you for calling! See you Saturday!`,
    summary: 'Customer Chris booked 4-wheel alignment for their 2020 Nissan Altima which has been pulling right. Saturday at 10 AM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Hi, I need to get my transmission fluid changed.

Agent: Of course! That's important maintenance. What vehicle do you have?

Customer: 2018 Honda Pilot.

Agent: Great SUV! For a transmission fluid exchange on the Pilot, we do a complete flush and refill with Honda-approved fluid. When would you like to schedule?

Customer: What's your earliest availability?

Agent: I have tomorrow at 1 PM available. Would that work?

Customer: Yes, let's do it.

Agent: Perfect! And your name?

Customer: Mark Taylor.

Agent: Excellent, Mark! You're confirmed for tomorrow at 1 PM for a transmission fluid exchange on your 2018 Honda Pilot. The service takes about an hour. We'll text you the details. Anything else I can help with?

Customer: Nope, all set. Thanks!

Agent: Thanks for calling Premier Auto Service! See you tomorrow!`,
    summary: 'Customer Mark scheduled transmission fluid exchange for their 2018 Honda Pilot. Tomorrow at 1 PM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber. How may I help you?

Customer: Hey, I want to schedule a complete brake job - pads and rotors on all four wheels.

Agent: Absolutely! A complete brake service. What vehicle is this for?

Customer: 2019 BMW X5.

Agent: Nice! For the X5, we use high-quality OEM-equivalent parts. We can definitely take care of all four corners. When works for you?

Customer: I need to get this done soon. What do you have this week?

Agent: I have Thursday morning at 9 AM. The complete brake service will take a few hours, so morning is ideal.

Customer: Thursday at 9 works. Let's do it.

Agent: Perfect! Your name?

Customer: Kevin Chen.

Agent: Great, Kevin! You're booked for Thursday at 9 AM for a complete brake service on your 2019 BMW X5 - pads and rotors all around. We'll make sure your X5 stops like new. Confirmation coming via text. Anything else?

Customer: That's all. Thanks!

Agent: Thank you Kevin! See you Thursday!`,
    summary: 'Customer Kevin booked complete brake service (pads and rotors all four wheels) for their 2019 BMW X5. Thursday at 9 AM.',
  },
];

// Add more transcripts
const moreTranscripts = [
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you today?

Customer: Hi, my air conditioning isn't blowing cold air anymore.

Agent: Oh no, especially with warmer weather coming! We can diagnose and repair A/C systems. What vehicle do you have?

Customer: 2021 Mazda CX-5.

Agent: Got it. We'll check the refrigerant level and inspect the system to find the issue. When can you bring it in?

Customer: Is tomorrow afternoon available?

Agent: Yes! I have 2:30 PM tomorrow. Would that work?

Customer: Perfect.

Agent: Great! Your name?

Customer: Lisa Park.

Agent: Alright Lisa, you're scheduled for tomorrow at 2:30 PM for an A/C diagnosis on your 2021 Mazda CX-5. We'll get that cooling again! Anything else?

Customer: No, thanks so much!

Agent: You're welcome! See you tomorrow!`,
    summary: 'Customer Lisa reported A/C not cooling on their 2021 Mazda CX-5. A/C diagnosis scheduled for tomorrow at 2:30 PM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good morning! Thanks for calling Premier Auto Service, this is Amber!

Customer: Hi there. I need an oil change and I think my battery might be dying too.

Agent: Happy to help with both! What are you driving?

Customer: 2020 Kia Sorento.

Agent: Perfect. We can do a synthetic oil change and also test your battery. If it needs replacing, we can take care of that too. When would you like to come in?

Customer: Friday afternoon if possible?

Agent: I have 3 PM on Friday available.

Customer: That works!

Agent: Wonderful! Your name?

Customer: Daniel Rivera.

Agent: You're all set Daniel! Friday at 3 PM for an oil change and battery test on your 2020 Kia Sorento. We'll text you confirmation. Anything else?

Customer: That's everything. Thank you!

Agent: Thank you! See you Friday!`,
    summary: 'Customer Daniel scheduled oil change and battery test for their 2020 Kia Sorento. Friday at 3 PM.',
  },
  {
    outcome: 'inquiry',
    sentiment: 'positive',
    intent: 'general_inquiry',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber. How can I help you?

Customer: Hi, I have a Tesla Model 3. Do you work on electric vehicles?

Agent: Great question! Yes, we do service electric vehicles for things like tire services, brake inspections, suspension work, and general maintenance. We just don't do high-voltage battery or motor work - that requires Tesla's specialized equipment.

Customer: Oh good! So you could do tire rotation and brake check?

Agent: Absolutely! Teslas actually have regenerative braking, so the brake pads often last much longer than traditional cars, but we can definitely inspect them and do tire rotation.

Customer: Perfect. What about wheel alignment?

Agent: Yes, we do 4-wheel alignments on all vehicles including Teslas. The Model 3 actually benefits from precise alignment for range optimization.

Customer: Great to know. I'll call back to schedule something soon.

Agent: Sounds good! We're here Monday through Saturday. Feel free to call anytime. Anything else I can answer?

Customer: No, that was really helpful!

Agent: Happy to help! Thanks for calling Premier Auto Service!`,
    summary: 'Customer inquired about EV services for their Tesla Model 3. Confirmed we do tire services, brakes, and alignments on EVs. May call back to schedule.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good morning! Premier Auto Service, this is Amber speaking. How can I help you?

Customer: Hey, I need new brake pads on the front of my car. The mechanic at my last oil change said they were getting low.

Agent: Good that you're being proactive! What vehicle do you have?

Customer: 2022 Hyundai Sonata.

Agent: Perfect. For the Sonata, front brake pads are straightforward. Would you also like us to inspect the rotors while we're there?

Customer: Sure, might as well check everything.

Agent: Smart. When would you like to come in?

Customer: Next Tuesday if you have anything?

Agent: I have 10:30 AM on Tuesday available.

Customer: Book it!

Agent: Done! Your name?

Customer: Steve Mitchell.

Agent: Great Steve! Tuesday at 10:30 AM for front brake pads and rotor inspection on your 2022 Hyundai Sonata. We'll text you details. Anything else?

Customer: Nope, all good!

Agent: Thanks for calling! See you Tuesday!`,
    summary: 'Customer Steve scheduled front brake pads replacement with rotor inspection for their 2022 Hyundai Sonata. Tuesday at 10:30 AM.',
  },
  {
    outcome: 'booked',
    sentiment: 'positive',
    intent: 'book_appointment',
    transcript: `Agent: Good afternoon! Thanks for calling Premier Auto Service, this is Amber.

Customer: Hi! I'm hearing a weird squealing noise when I start my car in the morning.

Agent: Hmm, that could be the serpentine belt. It often squeals when cold. What are you driving?

Customer: A 2019 Toyota Corolla.

Agent: Got it. We can inspect the belt and if it needs replacing, we have Corolla belts in stock. When can you bring it in?

Customer: Tomorrow morning works for me.

Agent: I have 8 AM available tomorrow. First appointment of the day would be perfect for hearing that cold-start noise.

Customer: Oh smart thinking! Yes, 8 AM.

Agent: Perfect! Your name?

Customer: Rachel Green.

Agent: Great Rachel! Tomorrow at 8 AM, we'll check out that squealing noise on your 2019 Toyota Corolla. Early appointment so we can hear it cold! Text confirmation coming. Anything else?

Customer: That's it, thanks!

Agent: See you tomorrow morning!`,
    summary: 'Customer Rachel reported squealing noise on cold start for their 2019 Toyota Corolla. Scheduled early appointment tomorrow at 8 AM to diagnose.',
  },
];

async function addTranscripts() {
  console.log('Adding 25 call logs with full transcripts...\n');
  
  const { data: customers } = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone')
    .not('last_name', 'is', null)
    .limit(25);

  if (!customers || customers.length === 0) {
    console.log('No customers found');
    return;
  }

  const today = new Date();
  const allTranscripts = [...transcripts, ...moreTranscripts];
  const callLogs = [];

  for (let i = 0; i < Math.min(25, allTranscripts.length); i++) {
    const t = allTranscripts[i];
    const customer = customers[i % customers.length];
    const hoursAgo = (i * 3) + 1; // Spread over time
    const callDate = subHours(today, hoursAgo);
    const duration = 90 + Math.floor(Math.random() * 120);

    callLogs.push({
      phone_number: customer.phone,
      phone_normalized: customer.phone,
      customer_id: customer.id,
      direction: 'inbound',
      started_at: callDate.toISOString(),
      ended_at: new Date(callDate.getTime() + duration * 1000).toISOString(),
      duration_seconds: duration,
      outcome: t.outcome,
      sentiment: t.sentiment,
      intent_detected: t.intent,
      transcript: t.transcript,
      transcript_summary: t.summary,
      agent_id: 'agent_98c68bf49ac79b86c517c5c2ba',
      retell_call_id: `call_transcript_${Date.now()}_${i}`,
    });
  }

  const { error } = await supabase.from('call_logs').insert(callLogs);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`✓ Created ${callLogs.length} call logs with full transcripts!`);
  }
}

addTranscripts().catch(console.error);
