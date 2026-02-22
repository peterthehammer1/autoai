-- ============================================================================
-- DEMO DATA SEED: Realistic appointments, calls, SMS for Premier Auto Service
-- Run in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- PART 1: CLEANUP — Remove obvious test/fake data
-- ============================================================================

-- Remove appointment_services for test customer appointments
DELETE FROM appointment_services
WHERE appointment_id IN (
  SELECT a.id FROM appointments a
  JOIN customers c ON a.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.phone LIKE '(555)%'
     OR c.first_name ILIKE '%test%'
     OR c.last_name ILIKE '%test%'
);

-- Free time_slots for test appointments
UPDATE time_slots SET is_available = true, appointment_id = NULL
WHERE appointment_id IN (
  SELECT a.id FROM appointments a
  JOIN customers c ON a.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.phone LIKE '(555)%'
     OR c.first_name ILIKE '%test%'
     OR c.last_name ILIKE '%test%'
);

-- Remove review_requests for test customers
DELETE FROM review_requests
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR phone LIKE '(555)%'
     OR first_name ILIKE '%test%'
     OR last_name ILIKE '%test%'
);

-- Remove SMS logs with "test" in body or for test customers
DELETE FROM sms_logs
WHERE message_body ILIKE '%this is a test%'
   OR customer_id IN (
     SELECT id FROM customers
     WHERE phone_normalized LIKE '+1555%'
        OR phone LIKE '555-%'
        OR phone LIKE '(555)%'
        OR first_name ILIKE '%test%'
        OR last_name ILIKE '%test%'
   );

-- Remove call_logs for test customers
DELETE FROM call_logs
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR phone LIKE '(555)%'
     OR first_name ILIKE '%test%'
     OR last_name ILIKE '%test%'
);

-- Remove work order related data for test work orders
DELETE FROM work_order_status_history
WHERE work_order_id IN (
  SELECT wo.id FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);
DELETE FROM time_entries
WHERE work_order_id IN (
  SELECT wo.id FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);
DELETE FROM inspection_items
WHERE inspection_id IN (
  SELECT i.id FROM inspections i
  JOIN work_orders wo ON i.work_order_id = wo.id
  JOIN customers c ON wo.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);
DELETE FROM inspections
WHERE work_order_id IN (
  SELECT wo.id FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);
DELETE FROM work_order_items
WHERE work_order_id IN (
  SELECT wo.id FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);
DELETE FROM payments
WHERE work_order_id IN (
  SELECT wo.id FROM work_orders wo
  JOIN customers c ON wo.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);
DELETE FROM work_orders
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR first_name ILIKE '%test%'
);

-- Remove email_logs for test customer appointments
DELETE FROM email_logs
WHERE appointment_id IN (
  SELECT a.id FROM appointments a
  JOIN customers c ON a.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.phone LIKE '(555)%'
     OR c.first_name ILIKE '%test%'
     OR c.last_name ILIKE '%test%'
);

-- Remove appointments for test customers
DELETE FROM appointments
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR phone LIKE '(555)%'
     OR first_name ILIKE '%test%'
     OR last_name ILIKE '%test%'
);

-- Remove vehicle_service_history for test customers
DELETE FROM vehicle_service_history
WHERE vehicle_id IN (
  SELECT v.id FROM vehicles v
  JOIN customers c ON v.customer_id = c.id
  WHERE c.phone_normalized LIKE '+1555%'
     OR c.phone LIKE '555-%'
     OR c.first_name ILIKE '%test%'
);

-- Remove vehicles for test customers
DELETE FROM vehicles
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR phone LIKE '(555)%'
     OR first_name ILIKE '%test%'
     OR last_name ILIKE '%test%'
);

-- Remove campaign_sends for test customers
DELETE FROM campaign_sends
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR first_name ILIKE '%test%'
);

-- Remove time_entries for test customers (via technician — won't match, but safe)
-- Time entries are linked to techs, not customers, so skip

-- Remove customer_tags for test customers
DELETE FROM customer_tags
WHERE customer_id IN (
  SELECT id FROM customers
  WHERE phone_normalized LIKE '+1555%'
     OR phone LIKE '555-%'
     OR phone LIKE '(555)%'
     OR first_name ILIKE '%test%'
     OR last_name ILIKE '%test%'
);

-- Remove test customers themselves
DELETE FROM customers
WHERE phone_normalized LIKE '+1555%'
   OR phone LIKE '555-%'
   OR phone LIKE '(555)%'
   OR first_name ILIKE '%test%'
   OR last_name ILIKE '%test%';

-- Clean up any orphaned SMS with test content
DELETE FROM sms_logs WHERE message_body ILIKE '%this is a test%';

-- Clean up any call_logs with 555 phone numbers
DELETE FROM call_logs WHERE phone_normalized LIKE '+1555%' OR phone_number LIKE '555-%';

-- Clean up tow_requests with fake addresses
DELETE FROM tow_requests WHERE pickup_address_line1 ILIKE '%123 main%';

-- ============================================================================
-- PART 2: INSERT REALISTIC CUSTOMERS & VEHICLES
-- ============================================================================

DO $$
DECLARE
  cust_id UUID;
  veh_id UUID;
  cust RECORD;
  veh RECORD;
  customers_data TEXT[][] := ARRAY[
    -- {first, last, phone, email, preferred_contact, total_visits, total_spent}
    ['Amir','Patel','+14163829174','amir.patel@outlook.com','phone','8','2340.00'],
    ['Jessica','Thompson','+16477201843','jess.thompson@gmail.com','text','5','1650.00'],
    ['Marcus','Williams','+19058374621','marcus.w@hotmail.com','phone','12','4200.00'],
    ['Priya','Sharma','+12897463081','priya.sharma@yahoo.ca','text','3','890.00'],
    ['Daniel','Costa','+14169283746','dcosta84@gmail.com','phone','7','2100.00'],
    ['Samantha','Chen','+16478193562','samchen.to@gmail.com','text','6','1890.00'],
    ['Robert','Fitzgerald','+19053847261','rob.fitz@rogers.com','phone','15','5430.00'],
    ['Nina','Volkov','+12894738261','nina.volkov@outlook.com','text','4','1320.00'],
    ['Brandon','Okafor','+14167382941','brandon.okafor@gmail.com','phone','9','3150.00'],
    ['Emily','Richardson','+16479284731','emily.r@sympatico.ca','phone','2','540.00'],
    ['Kevin','Tremblay','+15198273641','ktremblay@gmail.com','text','11','3890.00'],
    ['Sofia','Hernandez','+12267384921','sofia.h@hotmail.com','phone','6','1980.00'],
    ['James','MacDonald','+14168293741','jmacdonald@outlook.com','phone','14','4870.00'],
    ['Hannah','Park','+16472938471','hannahpark@gmail.com','text','3','920.00'],
    ['Michael','Nguyen','+19057384926','m.nguyen@yahoo.ca','phone','8','2760.00'],
    ['Laura','DiMaggio','+12893748261','laura.dimaggio@gmail.com','text','5','1540.00'],
    ['Andrew','Campbell','+14168374921','acampbell@rogers.com','phone','10','3650.00'],
    ['Fatima','Hassan','+16479382741','fatima.hassan@outlook.com','phone','4','1180.00'],
    ['Ryan','Morrison','+15192847361','rmorrison@gmail.com','text','7','2430.00'],
    ['Olivia','St-Pierre','+12268473921','olivia.sp@hotmail.com','phone','2','680.00'],
    ['David','Kovacs','+14167294831','dkovacs@gmail.com','phone','13','4520.00'],
    ['Megan','Torres','+16478293641','megan.torres@yahoo.ca','text','6','1870.00'],
    ['Nathan','Singh','+19053829174','nathan.singh@outlook.com','phone','9','3210.00'],
    ['Rachel','Murphy','+12894738162','rachel.murphy@gmail.com','text','3','990.00'],
    ['Carlos','Rivera','+14169374826','carlos.r@hotmail.com','phone','5','1680.00'],
    ['Stephanie','Lee','+16472849371','slee.gta@gmail.com','text','8','2540.00'],
    ['Patrick','O''Brien','+15197384921','pobrien@rogers.com','phone','11','3980.00'],
    ['Diana','Kozlov','+12268394721','diana.kozlov@outlook.com','phone','4','1250.00'],
    ['Tyler','Bennett','+14168293746','tyler.bennett@gmail.com','text','7','2290.00'],
    ['Jasmine','Ahmad','+16479273841','jasmine.ahmad@yahoo.ca','phone','2','590.00'],
    ['Scott','Fraser','+19053847291','sfraser@sympatico.ca','phone','16','5780.00'],
    ['Maria','Santos','+12897382941','maria.santos@gmail.com','text','5','1560.00'],
    ['Eric','Johansson','+14167293841','eric.j@hotmail.com','phone','9','3080.00'],
    ['Ashley','Kim','+16478392741','ashley.kim@outlook.com','text','3','870.00'],
    ['Matthew','Dubois','+15198374621','matt.dubois@gmail.com','phone','6','2040.00'],
    ['Christine','Ivanova','+12268473291','c.ivanova@yahoo.ca','phone','4','1390.00'],
    ['Jason','Garza','+14169283741','jgarza@rogers.com','text','10','3470.00'],
    ['Angela','Wright','+16472938461','angela.wright@gmail.com','phone','7','2180.00'],
    ['Derek','Huang','+19053748291','derek.huang@outlook.com','phone','8','2830.00'],
    ['Tanya','Robinson','+12894739261','tanya.r@hotmail.com','text','5','1710.00'],
    ['Paul','Leclerc','+14168374291','pleclerc@gmail.com','phone','12','4150.00'],
    ['Vanessa','Ali','+16479283741','vanessa.ali@yahoo.ca','text','3','940.00'],
    ['Jordan','Mitchell','+15197293841','jordan.m@rogers.com','phone','6','1960.00'],
    ['Grace','Tanaka','+12268394712','grace.tanaka@outlook.com','phone','4','1280.00'],
    ['Brian','Kelly','+14167382941','bkelly@gmail.com','text','9','3290.00'],
    ['Amanda','Petrova','+16478293741','amanda.petrova@hotmail.com','phone','2','620.00'],
    ['Steven','Lapointe','+19053829471','slapointe@sympatico.ca','phone','14','4730.00'],
    ['Michelle','Chadha','+12897384921','michelle.chadha@gmail.com','text','5','1490.00'],
    ['Keith','Andersen','+14169374281','k.andersen@outlook.com','phone','7','2370.00'],
    ['Lisa','Martinez','+16472847391','lisa.martinez@yahoo.ca','phone','8','2690.00'],
    ['Harper','Jenkins','+15198293741','harper.jenkins@gmail.com','text','3','860.00'],
    ['Ryan','Griffin','+12268473912','ryan.griffin@hotmail.com','phone','6','1830.00'],
    ['Charlotte','Russell','+14168293471','charlotte.r@rogers.com','text','10','3540.00'],
    ['Cody','Baldwin','+16479384721','cody.baldwin@gmail.com','phone','4','1170.00'],
    ['Evelyn','Powell','+19053748926','evelyn.powell@outlook.com','phone','5','1640.00'],
    ['Aaron','Long','+12894738921','aaron.long@yahoo.ca','text','7','2260.00'],
    ['Abigail','Butler','+14167293846','abigail.butler@gmail.com','phone','9','3130.00'],
    ['Francisco','Dominguez','+16478394721','fdominguez@hotmail.com','text','2','570.00'],
    ['Mariana','Saric','+15197384291','mariana.saric@gmail.com','phone','6','1920.00'],
    ['Bob','Jones','+12268394271','bob.jones@outlook.com','text','11','3870.00']
  ];

  vehicles_data TEXT[][] := ARRAY[
    -- {customer_phone, year, make, model, trim, color, mileage, license_plate, is_primary}
    ['+14163829174','2022','Honda','Civic','Sport','Lunar Silver','34200','BWRT 483','true'],
    ['+14163829174','2019','Toyota','Highlander','XLE','Midnight Black','67800','CJNS 291','false'],
    ['+16477201843','2023','Hyundai','Tucson','Preferred','Amazon Grey','18500','DNKP 847','true'],
    ['+19058374621','2020','Ford','F-150','XLT','Oxford White','82300','AVHM 639','true'],
    ['+19058374621','2021','Chevrolet','Equinox','LT','Mosaic Black','45100','FKRW 184','false'],
    ['+12897463081','2024','Toyota','Corolla','SE','Celestite Grey','8900','GNLS 572','true'],
    ['+14169283746','2021','Mazda','CX-5','GS','Soul Red','41600','HPTD 936','true'],
    ['+16478193562','2022','Volkswagen','Tiguan','Comfortline','Pure White','29800','JQMV 418','true'],
    ['+19053847261','2018','Ram','1500','Big Horn','Granite Crystal','103400','KWNC 725','true'],
    ['+19053847261','2023','Jeep','Grand Cherokee','Limited','Diamond Black','15200','LXBY 893','false'],
    ['+12894738261','2023','Kia','Sportage','EX','Snow White','22400','MRZF 167','true'],
    ['+14167382941','2020','Nissan','Rogue','SV','Gun Metallic','56700','NTSG 452','true'],
    ['+16479284731','2025','Honda','CR-V','EX-L','Platinum White','4300','PVWH 381','true'],
    ['+15198273641','2019','Subaru','Outback','Limited','Magnetite Grey','78200','QXCJ 694','true'],
    ['+12267384921','2021','Toyota','RAV4','LE','Blueprint','38900','RYDK 527','true'],
    ['+14168293741','2017','Ford','Escape','SE','Ingot Silver','112500','SZFL 839','true'],
    ['+14168293741','2022','Lincoln','Corsair','Reserve','Infinite Black','21300','TABM 146','false'],
    ['+16472938471','2023','Hyundai','Elantra','Preferred','Fluid Metal','16800','UCNP 473','true'],
    ['+19057384926','2020','Chevrolet','Silverado','LT','Havana Brown','71400','VDQR 285','true'],
    ['+12893748261','2022','Mazda','3','GT','Machine Grey','31500','WETS 618','true'],
    ['+14168374921','2018','Toyota','Camry','SE','Celestial Silver','89300','XFUV 947','true'],
    ['+16479382741','2024','Kia','Seltos','EX','Gravity Grey','11200','YGWX 352','true'],
    ['+15192847361','2021','Honda','Accord','Sport','Platinum White','43800','ZHAY 781','true'],
    ['+12268473921','2023','Nissan','Kicks','SV','Gun Metallic','19600','AJBZ 194','true'],
    ['+14167294831','2019','Ford','Explorer','XLT','Agate Black','67200','BKCL 536','true'],
    ['+14167294831','2022','Mustang','Mach-E','Select','Star White','24800','CMDP 872','false'],
    ['+16478293641','2021','Subaru','Crosstrek','Sport','Cool Grey','37400','DNEQ 415','true'],
    ['+19053829174','2020','Toyota','Tacoma','TRD Sport','Cement','58900','EPFR 748','true'],
    ['+12894738162','2024','Honda','HR-V','EX-L','Urban Grey','7800','FQGS 263','true'],
    ['+14169374826','2022','Hyundai','Santa Fe','Preferred','Shimmering Silver','28500','GRHT 591','true'],
    ['+16472849371','2021','Volkswagen','Jetta','Highline','Reflex Silver','42100','HSIU 827','true'],
    ['+15197384921','2018','Chevrolet','Colorado','Z71','Satin Steel','94700','ITJV 354','true'],
    ['+15197384921','2023','GMC','Terrain','SLE','Quicksilver','17300','JUKW 689','false'],
    ['+12268394721','2020','Mazda','CX-30','GS','Polymetal Grey','49800','KVLX 912','true'],
    ['+14168293746','2023','Toyota','Corolla Cross','LE','Bronze Oxide','14600','LWMY 438','true'],
    ['+16479273841','2022','Kia','Forte','EX','Snow White','26300','MXNZ 765','true'],
    ['+19053847291','2017','Ford','F-250','Lariat','Blue Jeans','128600','NYOA 217','true'],
    ['+19053847291','2021','Lincoln','Aviator','Reserve','Flight Blue','33400','OZPB 543','false'],
    ['+12897382941','2024','Honda','Civic','Touring','Rallye Red','6200','PAQC 876','true'],
    ['+14167293841','2020','Nissan','Pathfinder','SV','Magnetic Black','61500','QBRD 198','true'],
    ['+16478392741','2023','Hyundai','Kona','Preferred','Surfy Blue','15900','RCSE 524','true'],
    ['+15198374621','2019','Subaru','Forester','Touring','Jasper Green','72100','SDTF 857','true'],
    ['+12268473291','2021','Toyota','Sienna','XLE','Celestial Silver','39700','TEUG 183','true'],
    ['+14169283741','2022','Ford','Bronco Sport','Big Bend','Cactus Grey','27900','UFVH 419','true'],
    ['+16472938461','2020','Chevrolet','Traverse','LT','Iridescent Pearl','54200','VGWI 746','true'],
    ['+19053748291','2023','Mazda','CX-50','GS-L','Zircon Sand','20100','WHXJ 372','true'],
    ['+12894739261','2021','Kia','Sorento','LX','Ebony Black','41800','XIYK 695','true'],
    ['+14168374291','2018','Honda','Pilot','EX-L','Modern Steel','96400','YJZL 128','true'],
    ['+16479283741','2024','Toyota','Corolla','LE','Classic Silver','9400','ZKAM 453','true'],
    ['+15197293841','2022','Nissan','Murano','SV','Deep Blue Pearl','30700','ALBN 786','true'],
    ['+12268394712','2020','Hyundai','Palisade','Essential','Moonlight Cloud','47300','BMCO 319','true'],
    ['+14167382941','2019','Ford','Edge','SEL','Baltic Sea Green','63800','CNDP 642','false'],
    ['+16478293741','2023','Subaru','Legacy','Touring','Ice Silver','13500','DOEQ 975','true'],
    ['+19053829471','2021','Chevrolet','Blazer','RS','Cherry Red','36900','EPFR 408','true'],
    ['+12897384921','2024','Mazda','CX-90','GS-L','Rhodium White','8100','FQGS 731','true'],
    ['+14169374281','2022','Toyota','Highlander','LE','Wind Chill Pearl','25600','GRHT 264','true'],
    ['+16472847391','2020','Honda','Odyssey','EX-L','Obsidian Blue','52400','HSIU 597','true'],
    ['+15198293741','2023','Kia','Carnival','LX','Astra Blue','18700','ITJV 823','true'],
    ['+12268473912','2019','Ford','Ranger','XLT','Oxford White','79500','JUKW 156','true'],
    ['+14168293471','2021','Volkswagen','Atlas','Comfortline','Pure Grey','44200','KVLX 489','true'],
    ['+16479384721','2022','Toyota','4Runner','TRD Off-Road','Army Green','32800','LWMY 712','true'],
    ['+19053748926','2024','Hyundai','Ioniq 5','Preferred','Cyber Grey','5600','MXNZ 345','true'],
    ['+12894738921','2020','Nissan','Frontier','SV','Baja Storm','58100','NYOA 678','true'],
    ['+14167293846','2023','Honda','Accord','Sport','Canyon River Blue','16200','OZPB 901','true'],
    ['+16478394721','2021','Subaru','WRX','Sport','WR Blue Pearl','37600','PAQC 234','true'],
    ['+15197384291','2019','Chevrolet','Malibu','Premier','Mosaic Black','71900','QBRD 567','true'],
    ['+12268394271','2022','Ford','Maverick','XLT','Area 51','24900','RCSE 890','true']
  ];

BEGIN
  -- Insert customers
  FOR i IN 1..array_length(customers_data, 1) LOOP
    INSERT INTO customers (
      phone, phone_normalized, first_name, last_name, email,
      preferred_contact, marketing_opt_in, total_visits, total_spent
    ) VALUES (
      customers_data[i][3],
      customers_data[i][3],
      customers_data[i][1],
      customers_data[i][2],
      customers_data[i][4],
      customers_data[i][5],
      random() < 0.6,
      customers_data[i][6]::int,
      customers_data[i][7]::numeric
    )
    ON CONFLICT (phone_normalized) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      email = EXCLUDED.email,
      total_visits = EXCLUDED.total_visits,
      total_spent = EXCLUDED.total_spent;
  END LOOP;

  -- Insert vehicles
  FOR i IN 1..array_length(vehicles_data, 1) LOOP
    SELECT id INTO cust_id FROM customers WHERE phone_normalized = vehicles_data[i][1] LIMIT 1;
    IF cust_id IS NOT NULL THEN
      INSERT INTO vehicles (
        customer_id, year, make, model, trim, color,
        mileage, license_plate, is_primary
      ) VALUES (
        cust_id,
        vehicles_data[i][2]::int,
        vehicles_data[i][3],
        vehicles_data[i][4],
        vehicles_data[i][5],
        vehicles_data[i][6],
        vehicles_data[i][7]::int,
        vehicles_data[i][8],
        vehicles_data[i][9]::boolean
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- PART 3: GENERATE APPOINTMENTS (15+ per weekday, past 2 weeks + next month)
-- ============================================================================

DO $$
DECLARE
  target_date DATE;
  slot_time TIME;
  chosen_customer_id UUID;
  chosen_vehicle_id UUID;
  chosen_bay_id UUID;
  chosen_tech_id UUID;
  chosen_service_id UUID;
  chosen_service_name TEXT;
  chosen_service_price NUMERIC;
  chosen_service_duration INT;
  new_apt_id UUID;
  apt_status appointment_status;
  num_appointments INT;
  attempt INT;
  i INT;
  time_options TIME[] := ARRAY[
    '07:00','07:30','08:00','08:30','09:00','09:30',
    '10:00','10:30','11:00','11:30','12:00','12:30',
    '13:00','13:30','14:00','14:30','15:00','15:30'
  ];
  duration_options INT[] := ARRAY[30,30,45,60,60,60,90,90,120];
  created_by_options TEXT[] := ARRAY['ai_agent','ai_agent','ai_agent','ai_agent','ai_agent','dashboard','phone','ai_agent'];
  start_date DATE := CURRENT_DATE - INTERVAL '14 days';
  end_date DATE := CURRENT_DATE + INTERVAL '30 days';
  is_past BOOLEAN;
BEGIN
  target_date := start_date;

  WHILE target_date <= end_date LOOP
    -- Skip weekends
    IF EXTRACT(DOW FROM target_date) IN (0, 6) THEN
      target_date := target_date + 1;
      CONTINUE;
    END IF;

    -- 15-18 appointments per day
    num_appointments := 15 + floor(random() * 4)::int;
    is_past := target_date < CURRENT_DATE;

    FOR i IN 1..num_appointments LOOP
      -- Pick a random customer with their primary vehicle
      SELECT c.id, v.id INTO chosen_customer_id, chosen_vehicle_id
      FROM customers c
      JOIN vehicles v ON v.customer_id = c.id AND v.is_primary = true
      WHERE c.phone_normalized NOT LIKE '+1555%'
      ORDER BY random()
      LIMIT 1;

      IF chosen_customer_id IS NULL THEN CONTINUE; END IF;

      -- Pick a random time slot
      slot_time := time_options[1 + floor(random() * array_length(time_options, 1))::int];

      -- Pick a random service
      SELECT s.id, s.name,
             ROUND((s.price_min + random() * (s.price_max - s.price_min))::numeric, 2),
             s.duration_minutes
      INTO chosen_service_id, chosen_service_name, chosen_service_price, chosen_service_duration
      FROM services s
      WHERE s.is_active = true AND s.is_popular = true
      ORDER BY random()
      LIMIT 1;

      IF chosen_service_id IS NULL THEN
        SELECT s.id, s.name,
               ROUND((s.price_min + random() * (s.price_max - s.price_min))::numeric, 2),
               s.duration_minutes
        INTO chosen_service_id, chosen_service_name, chosen_service_price, chosen_service_duration
        FROM services s WHERE s.is_active = true
        ORDER BY random() LIMIT 1;
      END IF;

      -- Use the service duration or a random one
      chosen_service_duration := COALESCE(chosen_service_duration,
        duration_options[1 + floor(random() * array_length(duration_options, 1))::int]);

      -- Pick a random bay
      SELECT id INTO chosen_bay_id
      FROM service_bays
      WHERE is_active = true
      ORDER BY random()
      LIMIT 1;

      -- Pick a random technician
      SELECT id INTO chosen_tech_id
      FROM technicians
      WHERE is_active = true
      ORDER BY random()
      LIMIT 1;

      -- Determine status based on past/future
      IF is_past THEN
        -- Past appointments: mostly completed, some cancelled/no_show
        IF random() < 0.82 THEN
          apt_status := 'completed';
        ELSIF random() < 0.6 THEN
          apt_status := 'cancelled';
        ELSE
          apt_status := 'no_show';
        END IF;
      ELSIF target_date = CURRENT_DATE THEN
        -- Today: mix of statuses
        IF random() < 0.3 THEN
          apt_status := 'in_progress';
        ELSIF random() < 0.5 THEN
          apt_status := 'confirmed';
        ELSIF random() < 0.7 THEN
          apt_status := 'checked_in';
        ELSE
          apt_status := 'scheduled';
        END IF;
      ELSE
        -- Future: scheduled or confirmed
        IF random() < 0.6 THEN
          apt_status := 'confirmed';
        ELSE
          apt_status := 'scheduled';
        END IF;
      END IF;

      -- Insert appointment
      INSERT INTO appointments (
        customer_id, vehicle_id, scheduled_date, scheduled_time,
        estimated_duration_minutes, bay_id, technician_id, status,
        created_by, internal_notes
      ) VALUES (
        chosen_customer_id,
        chosen_vehicle_id,
        target_date,
        slot_time,
        chosen_service_duration,
        chosen_bay_id,
        chosen_tech_id,
        apt_status,
        created_by_options[1 + floor(random() * array_length(created_by_options, 1))::int],
        CASE WHEN random() < 0.2 THEN
          (ARRAY[
            'Customer requested early morning drop-off',
            'Waiting on parts — may need to reschedule',
            'Repeat customer, offer 10% loyalty discount',
            'Vehicle has aftermarket exhaust — note for tech',
            'Customer mentioned engine light came on last week',
            'Shuttle requested for pickup at 3 PM',
            'Customer prefers to wait — estimated 1hr job',
            'Check rear brakes while vehicle is up on lift'
          ])[1 + floor(random() * 8)::int]
        ELSE NULL END
      )
      RETURNING id INTO new_apt_id;

      -- Insert appointment_services
      INSERT INTO appointment_services (
        appointment_id, service_id, service_name, quoted_price, duration_minutes
      ) VALUES (
        new_apt_id, chosen_service_id, chosen_service_name,
        chosen_service_price, chosen_service_duration
      );

      -- Occasionally add a second service
      IF random() < 0.25 THEN
        SELECT s.id, s.name,
               ROUND((s.price_min + random() * (s.price_max - s.price_min))::numeric, 2),
               s.duration_minutes
        INTO chosen_service_id, chosen_service_name, chosen_service_price, chosen_service_duration
        FROM services s
        WHERE s.is_active = true AND s.id != chosen_service_id
        ORDER BY random() LIMIT 1;

        IF chosen_service_id IS NOT NULL THEN
          INSERT INTO appointment_services (
            appointment_id, service_id, service_name, quoted_price, duration_minutes
          ) VALUES (
            new_apt_id, chosen_service_id, chosen_service_name,
            chosen_service_price, COALESCE(chosen_service_duration, 30)
          );
        END IF;
      END IF;

      -- Book time_slots for future appointments
      IF NOT is_past THEN
        UPDATE time_slots
        SET is_available = false, appointment_id = new_apt_id
        WHERE slot_date = target_date
          AND bay_id = chosen_bay_id
          AND start_time >= slot_time
          AND start_time < slot_time + (chosen_service_duration || ' minutes')::interval
          AND is_available = true;
      END IF;

    END LOOP; -- appointments for this day

    target_date := target_date + 1;
  END LOOP; -- days
END $$;


-- ============================================================================
-- PART 4: GENERATE CALL LOGS (one per appointment)
-- ============================================================================

DO $$
DECLARE
  apt RECORD;
  call_duration INT;
  call_outcome call_outcome;
  call_sentiment TEXT;
  call_intent TEXT;
  summaries TEXT[] := ARRAY[
    'Customer called to book an oil change for their vehicle. Confirmed appointment and sent SMS.',
    'Returning customer requested a brake inspection. Checked availability and scheduled service.',
    'Caller inquired about tire rotation pricing. Booked appointment after reviewing options.',
    'Customer needed alignment service. Found an available slot and confirmed the booking.',
    'Routine maintenance call — customer booked their regular service appointment.',
    'Customer called about a check engine light. Scheduled diagnostic appointment.',
    'Caller wanted to book a battery replacement. Verified the correct battery type and scheduled.',
    'Customer requested transmission fluid change. Explained the process and booked the visit.',
    'Returning customer called for seasonal tire swap. Quick booking, regular customer.',
    'Customer called to schedule a full inspection before a road trip. Booked comprehensive check.',
    'Caller inquired about brake pad replacement cost. Provided estimate and booked service.',
    'Customer wanted an oil change and tire rotation combo. Scheduled both services together.',
    'New customer referred by a friend. Booked first appointment for general maintenance.',
    'Customer called about a noise from the engine. Scheduled diagnostic to investigate.',
    'Returning customer booked their quarterly maintenance appointment as usual.',
    'Customer called to schedule exhaust repair. Explained timeline and booked the visit.',
    'Caller needed AC service before summer. Checked availability and confirmed booking.',
    'Customer requested a wheel alignment after hitting a pothole. Booked earliest slot.',
    'Returning customer called for a coolant flush. Quick booking, knows the routine.',
    'Customer called to schedule pre-purchase inspection for a used vehicle they are considering.'
  ];
BEGIN
  FOR apt IN
    SELECT a.id, a.customer_id, a.scheduled_date, a.scheduled_time, a.status,
           c.phone_normalized, c.first_name
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    WHERE a.created_by IN ('ai_agent', 'phone')
      AND a.scheduled_date <= CURRENT_DATE
      AND NOT EXISTS (SELECT 1 FROM call_logs cl WHERE cl.appointment_id = a.id)
    ORDER BY a.scheduled_date, a.scheduled_time
  LOOP
    -- Random call duration 45-240 seconds
    call_duration := 45 + floor(random() * 195)::int;

    -- Determine outcome based on appointment status
    IF apt.status IN ('completed'::appointment_status, 'confirmed'::appointment_status, 'scheduled'::appointment_status, 'checked_in'::appointment_status, 'in_progress'::appointment_status) THEN
      call_outcome := 'booked';
    ELSIF apt.status = 'cancelled'::appointment_status THEN
      IF random() < 0.5 THEN call_outcome := 'cancelled'; ELSE call_outcome := 'booked'; END IF;
    ELSE
      call_outcome := 'booked';
    END IF;

    -- Random sentiment weighted toward positive
    IF random() < 0.65 THEN
      call_sentiment := 'positive';
    ELSIF random() < 0.85 THEN
      call_sentiment := 'neutral';
    ELSE
      call_sentiment := 'negative';
    END IF;

    call_intent := 'book';

    INSERT INTO call_logs (
      retell_call_id, phone_number, phone_normalized, customer_id,
      direction, started_at, ended_at, duration_seconds,
      outcome, sentiment, intent_detected, appointment_id,
      transcript_summary, agent_id, llm_model
    ) VALUES (
      'call_' || gen_random_uuid()::text,
      apt.phone_normalized,
      apt.phone_normalized,
      apt.customer_id,
      'inbound',
      (apt.scheduled_date - INTERVAL '1 day' + TIME '09:00' + (random() * INTERVAL '7 hours'))::timestamptz,
      (apt.scheduled_date - INTERVAL '1 day' + TIME '09:00' + (random() * INTERVAL '7 hours') + (call_duration || ' seconds')::interval)::timestamptz,
      call_duration,
      call_outcome,
      call_sentiment,
      call_intent,
      apt.id,
      summaries[1 + floor(random() * array_length(summaries, 1))::int],
      'agent_amber_premier',
      'gpt-4o-mini'
    );
  END LOOP;
END $$;


-- ============================================================================
-- PART 5: GENERATE SMS LOGS (confirmations + reminders)
-- ============================================================================

DO $$
DECLARE
  apt RECORD;
  sms_body TEXT;
  day_name TEXT;
  time_display TEXT;
  veh_display TEXT;
  h INT;
  m INT;
BEGIN
  FOR apt IN
    SELECT a.id, a.customer_id, a.scheduled_date, a.scheduled_time, a.status,
           c.phone_normalized, c.first_name,
           v.year, v.make, v.model
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    LEFT JOIN vehicles v ON a.vehicle_id = v.id
    WHERE a.scheduled_date <= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM sms_logs sl
        WHERE sl.appointment_id = a.id AND sl.message_type = 'confirmation'
      )
    ORDER BY a.scheduled_date, a.scheduled_time
  LOOP
    -- Format day name
    day_name := to_char(apt.scheduled_date, 'Day');
    day_name := trim(day_name);

    -- Format time to 12h
    h := EXTRACT(HOUR FROM apt.scheduled_time)::int;
    m := EXTRACT(MINUTE FROM apt.scheduled_time)::int;
    IF h = 0 THEN
      time_display := '12:' || lpad(m::text, 2, '0') || ' AM';
    ELSIF h < 12 THEN
      time_display := h::text || ':' || lpad(m::text, 2, '0') || ' AM';
    ELSIF h = 12 THEN
      time_display := '12:' || lpad(m::text, 2, '0') || ' PM';
    ELSE
      time_display := (h - 12)::text || ':' || lpad(m::text, 2, '0') || ' PM';
    END IF;

    -- Vehicle display
    IF apt.year IS NOT NULL THEN
      veh_display := apt.year || ' ' || apt.make || ' ' || apt.model;
    ELSE
      veh_display := 'your vehicle';
    END IF;

    -- Confirmation SMS
    sms_body := 'Hi ' || apt.first_name || '! Your appointment at Premier Auto Service is confirmed for ' ||
                day_name || ', ' || to_char(apt.scheduled_date, 'Mon DD') || ' at ' || time_display ||
                '. We''ll be working on your ' || veh_display ||
                '. Reply CONFIRM to confirm, RESCHEDULE to reschedule, or CANCEL to cancel. - Amber';

    INSERT INTO sms_logs (
      to_phone, from_phone, message_body, message_type,
      twilio_sid, status, direction, customer_id, appointment_id, created_at
    ) VALUES (
      apt.phone_normalized,
      '+14406641850',
      sms_body,
      'confirmation',
      'SM' || replace(gen_random_uuid()::text, '-', ''),
      'delivered',
      'outbound',
      apt.customer_id,
      apt.id,
      apt.scheduled_date - INTERVAL '1 day' + TIME '10:00' + (random() * INTERVAL '4 hours')
    );

    -- Add reminder SMS for past/today appointments (sent day before at ~5:30 PM)
    IF apt.scheduled_date <= CURRENT_DATE THEN
      sms_body := 'Reminder: ' || apt.first_name || ', you have an appointment tomorrow at Premier Auto Service at ' ||
                  time_display || ' for your ' || veh_display ||
                  '. See you then! Reply RESCHEDULE or CANCEL if plans changed. - Amber';

      INSERT INTO sms_logs (
        to_phone, from_phone, message_body, message_type,
        twilio_sid, status, direction, customer_id, appointment_id, created_at
      ) VALUES (
        apt.phone_normalized,
        '+14406641850',
        sms_body,
        'reminder',
        'SM' || replace(gen_random_uuid()::text, '-', ''),
        'delivered',
        'outbound',
        apt.customer_id,
        apt.id,
        apt.scheduled_date - INTERVAL '1 day' + TIME '17:30'
      );
    END IF;

  END LOOP;
END $$;


-- ============================================================================
-- PART 6: ADD SOME INQUIRY / NON-BOOKING CALLS FOR REALISM
-- ============================================================================

DO $$
DECLARE
  cust RECORD;
  call_dur INT;
  call_time TIMESTAMPTZ;
  inquiry_summaries TEXT[] := ARRAY[
    'Customer called to ask about pricing for brake service. Said they would call back to book.',
    'Caller inquired about wait times for oil changes. Mentioned they might walk in next week.',
    'Customer asked about warranty coverage for a transmission issue. Transferred to service manager.',
    'Caller wanted to know if we service European vehicles. Explained our capabilities.',
    'Customer called about a recall notice. Explained the process and suggested booking.',
    'Caller asked about financing options for major repairs. Provided general information.',
    'Customer inquired about tire brands we carry. Discussed options and pricing.',
    'Caller wanted an estimate for body work. Explained we focus on mechanical services.',
    'Customer called to ask about their vehicle pickup time. Confirmed it would be ready by 3 PM.',
    'Caller asked about seasonal tire storage. Explained our storage program details.'
  ];
  outcomes call_outcome[] := ARRAY['inquiry'::call_outcome,'inquiry'::call_outcome,'inquiry'::call_outcome,'transferred'::call_outcome,'callback_requested'::call_outcome];
  sentiments TEXT[] := ARRAY['positive','positive','neutral','neutral','neutral'];
BEGIN
  FOR i IN 1..30 LOOP
    SELECT c.id, c.phone_normalized, c.first_name
    INTO cust
    FROM customers c
    WHERE c.phone_normalized NOT LIKE '+1555%'
    ORDER BY random() LIMIT 1;

    call_dur := 30 + floor(random() * 120)::int;
    call_time := (CURRENT_DATE - (floor(random() * 14)::int || ' days')::interval
                  + TIME '08:00' + (random() * INTERVAL '8 hours'))::timestamptz;

    INSERT INTO call_logs (
      retell_call_id, phone_number, phone_normalized, customer_id,
      direction, started_at, ended_at, duration_seconds,
      outcome, sentiment, intent_detected,
      transcript_summary, agent_id, llm_model
    ) VALUES (
      'call_' || gen_random_uuid()::text,
      cust.phone_normalized,
      cust.phone_normalized,
      cust.id,
      'inbound',
      call_time,
      call_time + (call_dur || ' seconds')::interval,
      call_dur,
      outcomes[1 + floor(random() * array_length(outcomes, 1))::int],
      sentiments[1 + floor(random() * array_length(sentiments, 1))::int],
      'inquiry',
      inquiry_summaries[1 + floor(random() * array_length(inquiry_summaries, 1))::int],
      'agent_amber_premier',
      'gpt-4o-mini'
    );
  END LOOP;
END $$;


-- ============================================================================
-- PART 7: UPDATE CUSTOMER STATS
-- ============================================================================

UPDATE customers c SET
  total_visits = sub.visit_count,
  total_spent = sub.spent,
  last_visit_date = sub.last_date
FROM (
  SELECT
    a.customer_id,
    COUNT(*) FILTER (WHERE a.status = 'completed'::appointment_status) AS visit_count,
    COALESCE(SUM(asp.quoted_price) FILTER (WHERE a.status = 'completed'::appointment_status), 0) AS spent,
    MAX(a.scheduled_date) FILTER (WHERE a.status = 'completed'::appointment_status) AS last_date
  FROM appointments a
  LEFT JOIN appointment_services asp ON asp.appointment_id = a.id
  GROUP BY a.customer_id
) sub
WHERE c.id = sub.customer_id;


-- ============================================================================
-- PART 8: TAGS + CUSTOMER TAGS
-- ============================================================================

-- Insert tags (idempotent)
INSERT INTO tags (name, color) VALUES
  ('VIP', '#eab308'),
  ('Fleet', '#3b82f6'),
  ('Returning Customer', '#22c55e'),
  ('New Customer', '#8b5cf6'),
  ('Referral', '#ec4899'),
  ('Loyal', '#14b8a6'),
  ('Commercial', '#f97316'),
  ('Warranty', '#64748b'),
  ('Prepaid Plan', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

-- Assign hero customer tags
DO $$
DECLARE
  tag_vip UUID;
  tag_fleet UUID;
  tag_returning UUID;
  tag_new UUID;
  tag_referral UUID;
  tag_loyal UUID;
  tag_commercial UUID;
  cust UUID;
BEGIN
  SELECT id INTO tag_vip FROM tags WHERE name = 'VIP';
  SELECT id INTO tag_fleet FROM tags WHERE name = 'Fleet';
  SELECT id INTO tag_returning FROM tags WHERE name = 'Returning Customer';
  SELECT id INTO tag_new FROM tags WHERE name = 'New Customer';
  SELECT id INTO tag_referral FROM tags WHERE name = 'Referral';
  SELECT id INTO tag_loyal FROM tags WHERE name = 'Loyal';
  SELECT id INTO tag_commercial FROM tags WHERE name = 'Commercial';

  -- Marcus Williams: VIP + Fleet
  SELECT id INTO cust FROM customers WHERE phone_normalized = '+19058374621';
  IF cust IS NOT NULL THEN
    INSERT INTO customer_tags (customer_id, tag_id) VALUES (cust, tag_vip), (cust, tag_fleet) ON CONFLICT DO NOTHING;
  END IF;

  -- Robert Fitzgerald: Loyal
  SELECT id INTO cust FROM customers WHERE phone_normalized = '+19053847261';
  IF cust IS NOT NULL THEN
    INSERT INTO customer_tags (customer_id, tag_id) VALUES (cust, tag_loyal) ON CONFLICT DO NOTHING;
  END IF;

  -- Brandon Okafor: Returning Customer
  SELECT id INTO cust FROM customers WHERE phone_normalized = '+14167382941';
  IF cust IS NOT NULL THEN
    INSERT INTO customer_tags (customer_id, tag_id) VALUES (cust, tag_returning) ON CONFLICT DO NOTHING;
  END IF;

  -- Stephanie Lee: New Customer + Referral
  SELECT id INTO cust FROM customers WHERE phone_normalized = '+16472849371';
  IF cust IS NOT NULL THEN
    INSERT INTO customer_tags (customer_id, tag_id) VALUES (cust, tag_new), (cust, tag_referral) ON CONFLICT DO NOTHING;
  END IF;

  -- Scott Fraser: Fleet + Commercial
  SELECT id INTO cust FROM customers WHERE phone_normalized = '+19053847291';
  IF cust IS NOT NULL THEN
    INSERT INTO customer_tags (customer_id, tag_id) VALUES (cust, tag_fleet), (cust, tag_commercial) ON CONFLICT DO NOTHING;
  END IF;

  -- Randomly tag ~35% of other customers
  FOR cust IN
    SELECT c.id FROM customers c
    WHERE c.phone_normalized NOT LIKE '+1555%'
    AND NOT EXISTS (SELECT 1 FROM customer_tags ct WHERE ct.customer_id = c.id)
    AND random() < 0.35
  LOOP
    -- Give 1-2 random tags
    INSERT INTO customer_tags (customer_id, tag_id)
    SELECT cust, t.id FROM tags t ORDER BY random() LIMIT (1 + floor(random() * 2)::int)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;


-- ============================================================================
-- PART 9: WORK ORDERS + LINE ITEMS + PAYMENTS
-- ============================================================================

DO $$
DECLARE
  apt RECORD;
  wo_id UUID;
  wo_status TEXT;
  wo_number INT := 1001;
  item_count INT;
  item_total_cents INT;
  rand_val FLOAT;
  labor_descriptions TEXT[] := ARRAY[
    'Oil change labor', 'Brake pad replacement labor', 'Tire rotation labor',
    'Diagnostic scan', 'Alignment labor', 'Battery replacement labor',
    'Coolant flush labor', 'Spark plug replacement labor', 'Filter replacement labor',
    'Suspension inspection', 'A/C recharge labor', 'Belt replacement labor',
    'Fluid exchange labor', 'Multi-point inspection', 'Wheel balance labor'
  ];
  part_descriptions TEXT[] := ARRAY[
    'Engine oil (5W-30 synthetic)', 'Oil filter', 'Air filter', 'Cabin air filter',
    'Front brake pads (set)', 'Rear brake pads (set)', 'Front rotors (pair)',
    'Battery (group 35)', 'Coolant (1 gal)', 'Spark plugs (set of 4)',
    'Serpentine belt', 'Wiper blades (pair)', 'Transmission fluid (4 qt)',
    'Brake fluid (DOT 4)', 'Power steering fluid', 'Wheel weights',
    'Tire valve stems', 'PCV valve', 'Thermostat', 'Radiator hose'
  ];
  fee_descriptions TEXT[] := ARRAY[
    'Shop supplies', 'Environmental fee', 'Waste disposal fee', 'Diagnostic software fee'
  ];
  labor_prices INT[] := ARRAY[4500, 6500, 3500, 9900, 8500, 4000, 5500, 7500, 3000, 4500, 6000, 5000, 5500, 0, 4000];
  part_prices INT[] := ARRAY[4299, 899, 2499, 3499, 8999, 8999, 12999, 15999, 1899, 4999, 3999, 2499, 3299, 1299, 999, 500, 399, 1899, 2999, 1499];
  wo_count INT := 0;
BEGIN
  FOR apt IN
    SELECT a.id, a.customer_id, a.vehicle_id, a.scheduled_date, a.status,
           a.technician_id
    FROM appointments a
    WHERE a.status = 'completed'
      AND a.scheduled_date >= CURRENT_DATE - INTERVAL '14 days'
      AND a.scheduled_date < CURRENT_DATE
      AND a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM work_orders wo WHERE wo.appointment_id = a.id)
    ORDER BY a.scheduled_date DESC
    LIMIT 80
  LOOP
    -- Determine WO status (weighted distribution)
    rand_val := random();
    IF rand_val < 0.06 THEN wo_status := 'draft';
    ELSIF rand_val < 0.12 THEN wo_status := 'estimated';
    ELSIF rand_val < 0.17 THEN wo_status := 'sent_to_customer';
    ELSIF rand_val < 0.22 THEN wo_status := 'approved';
    ELSIF rand_val < 0.35 THEN wo_status := 'in_progress';
    ELSIF rand_val < 0.60 THEN wo_status := 'completed';
    ELSIF rand_val < 0.80 THEN wo_status := 'invoiced';
    ELSE wo_status := 'paid';
    END IF;

    -- Insert work order
    INSERT INTO work_orders (
      work_order_number, customer_id, appointment_id, vehicle_id,
      status, tax_rate, subtotal_cents, tax_cents, total_cents,
      discount_cents, created_at
    ) VALUES (
      wo_number, apt.customer_id, apt.id, apt.vehicle_id,
      wo_status, 0.13, 0, 0, 0,
      CASE WHEN random() < 0.15 THEN (500 + floor(random() * 1500))::int ELSE 0 END,
      apt.scheduled_date + TIME '08:00'
    )
    RETURNING id INTO wo_id;

    wo_number := wo_number + 1;

    -- Add 1 labor item always
    item_total_cents := labor_prices[1 + floor(random() * array_length(labor_prices, 1))::int];
    INSERT INTO work_order_items (
      work_order_id, item_type, description, quantity, unit_price_cents, total_cents, sort_order,
      technician_id
    ) VALUES (
      wo_id, 'labor',
      labor_descriptions[1 + floor(random() * array_length(labor_descriptions, 1))::int],
      1, item_total_cents, item_total_cents, 1, apt.technician_id
    );

    -- Add 1-3 parts
    item_count := 1 + floor(random() * 3)::int;
    FOR i IN 1..item_count LOOP
      item_total_cents := part_prices[1 + floor(random() * array_length(part_prices, 1))::int];
      INSERT INTO work_order_items (
        work_order_id, item_type, description, quantity, unit_price_cents, total_cents, sort_order
      ) VALUES (
        wo_id, 'part',
        part_descriptions[1 + floor(random() * array_length(part_descriptions, 1))::int],
        CASE WHEN random() < 0.2 THEN 2 ELSE 1 END,
        item_total_cents, item_total_cents, i + 1
      );
    END LOOP;

    -- Add shop supplies fee (~70% of WOs)
    IF random() < 0.7 THEN
      item_total_cents := 299 + floor(random() * 500)::int;
      INSERT INTO work_order_items (
        work_order_id, item_type, description, quantity, unit_price_cents, total_cents, sort_order
      ) VALUES (
        wo_id, 'fee',
        fee_descriptions[1 + floor(random() * array_length(fee_descriptions, 1))::int],
        1, item_total_cents, item_total_cents, item_count + 2
      );
    END IF;

    -- Totals will be recalculated in bulk after the loop

    -- Work order status history
    INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
    VALUES (wo_id, 'draft', 'advisor', apt.scheduled_date + TIME '08:00');

    IF wo_status NOT IN ('draft') THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'estimated', 'advisor', apt.scheduled_date + TIME '09:00');
    END IF;
    IF wo_status IN ('sent_to_customer','approved','in_progress','completed','invoiced','paid') THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'sent_to_customer', 'advisor', apt.scheduled_date + TIME '09:30');
    END IF;
    IF wo_status IN ('approved','in_progress','completed','invoiced','paid') THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'approved', 'customer', apt.scheduled_date + TIME '10:00');
    END IF;
    IF wo_status IN ('in_progress','completed','invoiced','paid') THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'in_progress', 'advisor', apt.scheduled_date + TIME '10:30');
    END IF;
    IF wo_status IN ('completed','invoiced','paid') THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'completed', 'advisor', apt.scheduled_date + TIME '15:00');
    END IF;
    IF wo_status IN ('invoiced','paid') THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'invoiced', 'advisor', apt.scheduled_date + TIME '15:30');
    END IF;
    IF wo_status = 'paid' THEN
      INSERT INTO work_order_status_history (work_order_id, status, changed_by, created_at)
      VALUES (wo_id, 'paid', 'system', apt.scheduled_date + TIME '16:00');
    END IF;

    -- Payments for paid/invoiced WOs (amount_cents updated in bulk below)
    IF wo_status IN ('paid', 'invoiced') THEN
      INSERT INTO payments (
        work_order_id, customer_id, amount_cents, method, status, created_at
      ) VALUES (
        wo_id, apt.customer_id, 0,
        (ARRAY['card','card','card','debit','cash','e_transfer'])[1 + floor(random() * 6)::int],
        CASE WHEN wo_status = 'paid' THEN 'completed' ELSE 'pending' END,
        apt.scheduled_date + TIME '16:00'
      );
    END IF;

    wo_count := wo_count + 1;
  END LOOP;

  RAISE NOTICE 'Created % work orders with line items', wo_count;
END $$;

-- Fix the subtotal reference (use a direct UPDATE from item sums)
UPDATE work_orders wo SET
  subtotal_cents = sub.item_total,
  tax_cents = ROUND(GREATEST(sub.item_total - wo.discount_cents, 0) * wo.tax_rate),
  total_cents = GREATEST(sub.item_total - wo.discount_cents, 0) + ROUND(GREATEST(sub.item_total - wo.discount_cents, 0) * wo.tax_rate)
FROM (
  SELECT work_order_id, SUM(
    CASE WHEN item_type = 'discount' THEN -ABS(total_cents) ELSE total_cents END
  )::int AS item_total
  FROM work_order_items
  WHERE status IS DISTINCT FROM 'declined'
  GROUP BY work_order_id
) sub
WHERE wo.id = sub.work_order_id;

-- Update payment amounts to match WO totals
UPDATE payments p SET amount_cents = wo.total_cents
FROM work_orders wo
WHERE p.work_order_id = wo.id AND p.amount_cents = 0;


-- ============================================================================
-- PART 10: PORTAL TOKENS
-- ============================================================================

DO $$
DECLARE
  cust RECORD;
  token TEXT;
  short TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  i INT;
BEGIN
  FOR cust IN
    SELECT c.id, c.first_name, c.phone_normalized
    FROM customers c
    WHERE c.phone_normalized IN (
      -- Hero customers
      '+19058374621', '+19053847261', '+14167382941', '+16472849371', '+19053847291',
      -- Additional customers for portal demo
      '+14163829174', '+16477201843', '+12897463081', '+14169283746', '+16478193562',
      '+12894738261', '+16479284731', '+15198273641', '+12267384921', '+14168293741',
      '+16472938471', '+19057384926', '+12893748261', '+14168374921', '+16479382741'
    )
    AND c.portal_token IS NULL
  LOOP
    -- Generate 64-char token
    token := '';
    FOR i IN 1..64 LOOP
      token := token || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;

    -- Generate short code: FirstName + 4 random chars
    short := cust.first_name;
    FOR i IN 1..4 LOOP
      short := short || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;

    UPDATE customers SET
      portal_token = token,
      portal_token_expires_at = NOW() + INTERVAL '30 days',
      portal_short_code = short
    WHERE id = cust.id;
  END LOOP;
END $$;


-- ============================================================================
-- PART 11: DIGITAL VEHICLE INSPECTIONS (DVI)
-- ============================================================================

-- Create default inspection template
INSERT INTO inspection_templates (name, description, is_default)
VALUES ('Full Multi-Point Inspection', 'Comprehensive vehicle inspection covering all major systems', true)
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  tmpl_id UUID;
  insp_id UUID;
  wo RECORD;
  item RECORD;
  condition TEXT;
  rand_val FLOAT;
  notes_options TEXT[] := ARRAY[
    'Worn past minimum specification — recommend immediate replacement',
    'Showing signs of wear — monitor and plan for replacement within 3 months',
    'Minor leak detected — should be addressed at next service',
    'Cracked — needs replacement soon',
    'Corrosion present — clean and treat',
    'Below minimum thickness — replace before next inspection'
  ];
  insp_count INT := 0;
BEGIN
  SELECT id INTO tmpl_id FROM inspection_templates WHERE is_default = true LIMIT 1;

  -- Insert template items if not exists
  IF NOT EXISTS (SELECT 1 FROM inspection_template_items WHERE template_id = tmpl_id) THEN
    INSERT INTO inspection_template_items (template_id, category, item_name, sort_order) VALUES
      -- Exterior (1-5)
      (tmpl_id, 'Exterior', 'Headlights', 1),
      (tmpl_id, 'Exterior', 'Tail lights & brake lights', 2),
      (tmpl_id, 'Exterior', 'Turn signals', 3),
      (tmpl_id, 'Exterior', 'Windshield condition', 4),
      (tmpl_id, 'Exterior', 'Wiper blades', 5),
      -- Under Hood (6-10)
      (tmpl_id, 'Under Hood', 'Engine oil level & condition', 6),
      (tmpl_id, 'Under Hood', 'Coolant level & condition', 7),
      (tmpl_id, 'Under Hood', 'Serpentine belt', 8),
      (tmpl_id, 'Under Hood', 'Air filter', 9),
      (tmpl_id, 'Under Hood', 'Battery terminals & cables', 10),
      -- Brakes (11-14)
      (tmpl_id, 'Brakes', 'Front brake pads', 11),
      (tmpl_id, 'Brakes', 'Rear brake pads', 12),
      (tmpl_id, 'Brakes', 'Front rotors', 13),
      (tmpl_id, 'Brakes', 'Rear rotors', 14),
      -- Tires & Wheels (15-18)
      (tmpl_id, 'Tires & Wheels', 'LF tire tread depth', 15),
      (tmpl_id, 'Tires & Wheels', 'RF tire tread depth', 16),
      (tmpl_id, 'Tires & Wheels', 'LR tire tread depth', 17),
      (tmpl_id, 'Tires & Wheels', 'RR tire tread depth', 18),
      -- Fluids & Filters (19-22)
      (tmpl_id, 'Fluids & Filters', 'Brake fluid', 19),
      (tmpl_id, 'Fluids & Filters', 'Transmission fluid', 20),
      (tmpl_id, 'Fluids & Filters', 'Power steering fluid', 21),
      (tmpl_id, 'Fluids & Filters', 'Cabin air filter', 22);
  END IF;

  -- Create inspections for ~15 work orders
  FOR wo IN
    SELECT w.id AS wo_id, w.vehicle_id, w.created_at,
           (SELECT t.id FROM technicians t WHERE t.is_active = true ORDER BY random() LIMIT 1) AS tech_id
    FROM work_orders w
    WHERE w.status IN ('completed', 'invoiced', 'paid', 'in_progress')
      AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.work_order_id = w.id)
    ORDER BY random()
    LIMIT 15
  LOOP
    INSERT INTO inspections (
      work_order_id, vehicle_id, technician_id, template_id, status, created_at
    ) VALUES (
      wo.wo_id, wo.vehicle_id, wo.tech_id, tmpl_id,
      CASE WHEN random() < 0.7 THEN 'completed' ELSE 'in_progress' END,
      wo.created_at
    )
    RETURNING id INTO insp_id;

    -- Add all template items with randomized conditions
    FOR item IN
      SELECT ti.category, ti.item_name, ti.sort_order
      FROM inspection_template_items ti
      WHERE ti.template_id = tmpl_id
      ORDER BY ti.sort_order
    LOOP
      rand_val := random();
      IF rand_val < 0.50 THEN condition := 'good';
      ELSIF rand_val < 0.75 THEN condition := 'fair';
      ELSIF rand_val < 0.90 THEN condition := 'needs_attention';
      ELSE condition := 'urgent';
      END IF;

      INSERT INTO inspection_items (
        inspection_id, category, item_name, condition, notes, sort_order
      ) VALUES (
        insp_id, item.category, item.item_name, condition,
        CASE WHEN condition IN ('needs_attention', 'urgent') THEN
          notes_options[1 + floor(random() * array_length(notes_options, 1))::int]
        ELSE NULL END,
        item.sort_order
      );
    END LOOP;

    insp_count := insp_count + 1;
  END LOOP;

  RAISE NOTICE 'Created % inspections with items', insp_count;
END $$;


-- ============================================================================
-- PART 12: REVIEW REQUESTS + SETTINGS
-- ============================================================================

-- Insert review settings
INSERT INTO settings (key, value) VALUES
  ('review_google_url', 'https://g.page/r/premierautoservice/review'),
  ('review_auto_send', 'true'),
  ('review_delay_hours', '4'),
  ('review_message_template', 'Hi {first_name}, thanks for choosing Premier Auto Service! We''d love your feedback. Please take a moment to leave us a review: {review_url}'),
  ('review_min_rating_for_google', '4')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Create review requests from completed appointments
DO $$
DECLARE
  apt RECORD;
  rev_status TEXT;
  rand_val FLOAT;
  rev_count INT := 0;
BEGIN
  FOR apt IN
    SELECT a.id, a.customer_id, a.scheduled_date, c.phone_normalized
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    WHERE a.status = 'completed'
      AND a.scheduled_date >= CURRENT_DATE - INTERVAL '14 days'
      AND a.scheduled_date < CURRENT_DATE
      AND a.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM review_requests rr WHERE rr.appointment_id = a.id)
    ORDER BY a.scheduled_date DESC
    LIMIT 40
  LOOP
    rand_val := random();
    IF rand_val < 0.10 THEN rev_status := 'pending';
    ELSIF rand_val < 0.15 THEN rev_status := 'skipped';
    ELSIF rand_val < 0.75 THEN rev_status := 'sent';
    ELSIF rand_val < 0.90 THEN rev_status := 'clicked';
    ELSE rev_status := 'completed';
    END IF;

    INSERT INTO review_requests (
      customer_id, appointment_id, channel, review_type,
      review_url, status, skip_reason,
      sent_at, clicked_at, rating, created_at
    ) VALUES (
      apt.customer_id, apt.id, 'sms', 'google',
      'https://g.page/r/premierautoservice/review',
      rev_status,
      CASE WHEN rev_status = 'skipped' THEN
        (ARRAY['no_phone','opted_out','already_sent'])[1 + floor(random() * 3)::int]
      ELSE NULL END,
      CASE WHEN rev_status IN ('sent','clicked','completed') THEN
        apt.scheduled_date + INTERVAL '4 hours' + (random() * INTERVAL '2 hours')
      ELSE NULL END,
      CASE WHEN rev_status IN ('clicked','completed') THEN
        apt.scheduled_date + INTERVAL '6 hours' + (random() * INTERVAL '4 hours')
      ELSE NULL END,
      CASE WHEN rev_status = 'completed' THEN
        (ARRAY[4,4,5,5,5])[1 + floor(random() * 5)::int]
      ELSE NULL END,
      apt.scheduled_date + TIME '20:00'
    );

    rev_count := rev_count + 1;
  END LOOP;

  RAISE NOTICE 'Created % review requests', rev_count;
END $$;


-- ============================================================================
-- PART 13: CAMPAIGNS + CAMPAIGN SENDS
-- ============================================================================

-- Insert auto campaigns
INSERT INTO campaigns (name, campaign_type, status, message_template, audience_filter) VALUES
  ('Welcome New Customers', 'welcome', 'active',
   'Hi {first_name}! Welcome to Premier Auto Service. We''re glad to have you. Access your customer portal anytime: {portal_link} — The Premier Auto Team',
   '{}'),
  ('Post-Visit Follow Up', 'follow_up', 'active',
   'Hi {first_name}, thanks for bringing your {vehicle} in today! We hope everything went smoothly. If you have any questions, just reply to this text. See you next time! — Premier Auto',
   '{}'),
  ('Win-Back — 90 Days Inactive', 'win_back', 'active',
   'Hi {first_name}, it''s been a while since we''ve seen your {vehicle}! Schedule your next service and get 10% off: {portal_link} — Premier Auto',
   '{"days_inactive": 90}')
ON CONFLICT DO NOTHING;

-- Insert seasonal campaigns
INSERT INTO campaigns (name, campaign_type, status, message_template, audience_filter, scheduled_at) VALUES
  ('Winter Tire Special', 'seasonal', 'completed',
   'Hey {first_name}! Winter is here — time to swap to winter tires. Book your tire changeover today and save $20: {portal_link} — Premier Auto',
   '{"vehicle_types": ["SUV", "Truck"]}',
   CURRENT_DATE - INTERVAL '30 days'),
  ('Spring Maintenance Promo', 'seasonal', 'draft',
   'Hi {first_name}, spring is around the corner! Get your {vehicle} ready with our Spring Maintenance Package — oil change + inspection for $89. Book now: {portal_link}',
   '{"days_since_visit": 45}',
   NULL)
ON CONFLICT DO NOTHING;

-- Create campaign sends for the auto campaigns
DO $$
DECLARE
  camp_id UUID;
  cust RECORD;
  send_count INT := 0;
BEGIN
  -- Welcome campaign sends (for newer customers)
  SELECT id INTO camp_id FROM campaigns WHERE campaign_type = 'welcome' AND status = 'active' LIMIT 1;
  IF camp_id IS NOT NULL THEN
    FOR cust IN
      SELECT c.id, c.created_at
      FROM customers c
      WHERE c.total_visits <= 2
        AND c.phone_normalized NOT LIKE '+1555%'
        AND NOT EXISTS (SELECT 1 FROM campaign_sends cs WHERE cs.campaign_id = camp_id AND cs.customer_id = c.id)
      ORDER BY c.created_at DESC
      LIMIT 15
    LOOP
      INSERT INTO campaign_sends (campaign_id, customer_id, status, sent_at)
      VALUES (camp_id, cust.id, 'sent',
        COALESCE(cust.created_at, NOW() - (random() * INTERVAL '14 days'))
      );
      send_count := send_count + 1;
    END LOOP;
  END IF;

  -- Follow-up campaign sends (for customers with completed appointments)
  SELECT id INTO camp_id FROM campaigns WHERE campaign_type = 'follow_up' AND status = 'active' LIMIT 1;
  IF camp_id IS NOT NULL THEN
    FOR cust IN
      SELECT DISTINCT a.customer_id AS id, a.scheduled_date
      FROM appointments a
      WHERE a.status = 'completed'
        AND a.scheduled_date >= CURRENT_DATE - INTERVAL '14 days'
        AND a.deleted_at IS NULL
        AND NOT EXISTS (SELECT 1 FROM campaign_sends cs WHERE cs.campaign_id = camp_id AND cs.customer_id = a.customer_id)
      ORDER BY a.scheduled_date DESC
      LIMIT 25
    LOOP
      INSERT INTO campaign_sends (campaign_id, customer_id, status, sent_at)
      VALUES (camp_id, cust.id,
        CASE WHEN random() < 0.95 THEN 'sent' ELSE 'failed' END,
        cust.scheduled_date + INTERVAL '10 hours'
      );
      send_count := send_count + 1;
    END LOOP;
  END IF;

  -- Win-back campaign sends
  SELECT id INTO camp_id FROM campaigns WHERE campaign_type = 'win_back' AND status = 'active' LIMIT 1;
  IF camp_id IS NOT NULL THEN
    FOR cust IN
      SELECT c.id
      FROM customers c
      WHERE (c.last_visit_date IS NULL OR c.last_visit_date < CURRENT_DATE - INTERVAL '60 days')
        AND c.total_visits >= 2
        AND c.phone_normalized NOT LIKE '+1555%'
        AND NOT EXISTS (SELECT 1 FROM campaign_sends cs WHERE cs.campaign_id = camp_id AND cs.customer_id = c.id)
      ORDER BY random()
      LIMIT 10
    LOOP
      INSERT INTO campaign_sends (campaign_id, customer_id, status, sent_at)
      VALUES (camp_id, cust.id,
        CASE WHEN random() < 0.9 THEN 'sent' ELSE 'skipped' END,
        NOW() - (random() * INTERVAL '7 days')
      );
      send_count := send_count + 1;
    END LOOP;
  END IF;

  -- Winter Tire campaign sends (completed campaign)
  SELECT id INTO camp_id FROM campaigns WHERE name = 'Winter Tire Special' AND status = 'completed' LIMIT 1;
  IF camp_id IS NOT NULL THEN
    FOR cust IN
      SELECT c.id
      FROM customers c
      WHERE c.phone_normalized NOT LIKE '+1555%'
        AND NOT EXISTS (SELECT 1 FROM campaign_sends cs WHERE cs.campaign_id = camp_id AND cs.customer_id = c.id)
      ORDER BY random()
      LIMIT 20
    LOOP
      INSERT INTO campaign_sends (campaign_id, customer_id, status, sent_at)
      VALUES (camp_id, cust.id, 'sent',
        CURRENT_DATE - INTERVAL '30 days' + (random() * INTERVAL '2 hours')
      );
      send_count := send_count + 1;
    END LOOP;
  END IF;

  RAISE NOTICE 'Created % campaign sends', send_count;
END $$;


-- ============================================================================
-- PART 14: TIME ENTRIES (TECH CLOCK)
-- ============================================================================

DO $$
DECLARE
  target_date DATE;
  tech RECORD;
  clock_in_time TIMESTAMPTZ;
  clock_out_time TIMESTAMPTZ;
  dur INT;
  wo_id UUID;
  entry_count INT := 0;
BEGIN
  target_date := CURRENT_DATE - INTERVAL '14 days';

  WHILE target_date < CURRENT_DATE LOOP
    -- Skip weekends
    IF EXTRACT(DOW FROM target_date) IN (0, 6) THEN
      target_date := target_date + 1;
      CONTINUE;
    END IF;

    FOR tech IN
      SELECT t.id FROM technicians t WHERE t.is_active = true
    LOOP
      -- Morning clock-in (7:00-7:45 AM)
      clock_in_time := (target_date + TIME '07:00' + (random() * INTERVAL '45 minutes'))::timestamptz;

      -- First work block: clock in until lunch (4-5 hrs of labor)
      dur := 240 + floor(random() * 60)::int; -- 4-5 hours
      clock_out_time := clock_in_time + (dur || ' minutes')::interval;

      -- Try to link to a work order
      SELECT w.id INTO wo_id
      FROM work_orders w
      JOIN appointments a ON w.appointment_id = a.id
      WHERE a.scheduled_date = target_date
        AND a.technician_id = tech.id
      ORDER BY random() LIMIT 1;

      INSERT INTO time_entries (
        technician_id, work_order_id, entry_type,
        clock_in, clock_out, duration_minutes, notes, created_at
      ) VALUES (
        tech.id, wo_id, 'labor',
        clock_in_time, clock_out_time, dur,
        CASE WHEN wo_id IS NOT NULL THEN NULL
        ELSE 'General shop work' END,
        clock_in_time
      );
      entry_count := entry_count + 1;

      -- Lunch break (~30-45 min)
      clock_in_time := clock_out_time;
      dur := 30 + floor(random() * 15)::int;
      clock_out_time := clock_in_time + (dur || ' minutes')::interval;

      INSERT INTO time_entries (
        technician_id, entry_type,
        clock_in, clock_out, duration_minutes, notes, created_at
      ) VALUES (
        tech.id, 'break',
        clock_in_time, clock_out_time, dur,
        'Lunch break', clock_in_time
      );
      entry_count := entry_count + 1;

      -- Afternoon block (3-4.5 hrs of labor)
      clock_in_time := clock_out_time;
      dur := 180 + floor(random() * 90)::int;
      clock_out_time := clock_in_time + (dur || ' minutes')::interval;

      -- Try another WO for afternoon
      SELECT w.id INTO wo_id
      FROM work_orders w
      JOIN appointments a ON w.appointment_id = a.id
      WHERE a.scheduled_date = target_date
        AND a.technician_id = tech.id
        AND w.id NOT IN (SELECT te.work_order_id FROM time_entries te WHERE te.work_order_id IS NOT NULL AND te.technician_id = tech.id AND te.clock_in::date = target_date)
      ORDER BY random() LIMIT 1;

      IF wo_id IS NULL THEN
        SELECT w.id INTO wo_id
        FROM work_orders w
        JOIN appointments a ON w.appointment_id = a.id
        WHERE a.scheduled_date = target_date
        ORDER BY random() LIMIT 1;
      END IF;

      INSERT INTO time_entries (
        technician_id, work_order_id, entry_type,
        clock_in, clock_out, duration_minutes, notes, created_at
      ) VALUES (
        tech.id, wo_id, 'labor',
        clock_in_time, clock_out_time, dur,
        NULL, clock_in_time
      );
      entry_count := entry_count + 1;

      -- Occasional training entry (~10% of days)
      IF random() < 0.1 THEN
        clock_in_time := clock_out_time;
        dur := 30 + floor(random() * 30)::int;
        clock_out_time := clock_in_time + (dur || ' minutes')::interval;

        INSERT INTO time_entries (
          technician_id, entry_type,
          clock_in, clock_out, duration_minutes, notes, created_at
        ) VALUES (
          tech.id, 'training',
          clock_in_time, clock_out_time, dur,
          (ARRAY['Safety training', 'New equipment training', 'Manufacturer certification', 'Team meeting'])[1 + floor(random() * 4)::int],
          clock_in_time
        );
        entry_count := entry_count + 1;
      END IF;

    END LOOP; -- techs

    target_date := target_date + 1;
  END LOOP; -- days

  RAISE NOTICE 'Created % time entries', entry_count;
END $$;


-- ============================================================================
-- DONE — FULL DEMO DATA SEEDED
-- ============================================================================
-- Verify counts:
SELECT 'customers' AS entity, COUNT(*) FROM customers
UNION ALL SELECT 'vehicles', COUNT(*) FROM vehicles
UNION ALL SELECT 'appointments', COUNT(*) FROM appointments WHERE deleted_at IS NULL
UNION ALL SELECT 'call_logs', COUNT(*) FROM call_logs
UNION ALL SELECT 'sms_logs', COUNT(*) FROM sms_logs
UNION ALL SELECT 'tags', COUNT(*) FROM tags
UNION ALL SELECT 'customer_tags', COUNT(*) FROM customer_tags
UNION ALL SELECT 'work_orders', COUNT(*) FROM work_orders
UNION ALL SELECT 'work_order_items', COUNT(*) FROM work_order_items
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'inspections', COUNT(*) FROM inspections
UNION ALL SELECT 'inspection_items', COUNT(*) FROM inspection_items
UNION ALL SELECT 'review_requests', COUNT(*) FROM review_requests
UNION ALL SELECT 'campaigns', COUNT(*) FROM campaigns
UNION ALL SELECT 'campaign_sends', COUNT(*) FROM campaign_sends
UNION ALL SELECT 'time_entries', COUNT(*) FROM time_entries
ORDER BY entity;
