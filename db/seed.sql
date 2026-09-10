SET client_encoding = 'UTF8';

INSERT INTO suppliers (id, name, kind, created_at) VALUES
  ('sup_001', '한빛물류', 'sales', NOW() - INTERVAL '40 days'),
  ('sup_002', '동서트레이딩', 'sales', NOW() - INTERVAL '35 days'),
  ('sup_003', '글로벌서플라이', 'sales', NOW() - INTERVAL '28 days'),
  ('sup_004', '에스더푸드', 'sales', NOW() - INTERVAL '20 days'),
  ('ven_001', '제주워터', 'purchase', NOW() - INTERVAL '42 days'),
  ('ven_002', '녹차원', 'purchase', NOW() - INTERVAL '39 days'),
  ('ven_003', '한진패키지', 'purchase', NOW() - INTERVAL '33 days'),
  ('ven_004', '클린케미컬', 'purchase', NOW() - INTERVAL '26 days'),
  ('ven_005', '메디텍', 'purchase', NOW() - INTERVAL '19 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, name, cost, option, shipping_fee, carton_quantity, pallet_quantity, created_at) VALUES
  ('prd_001', '프리미엄 생수 500ml', 180, '24병/박스, 개별 포장', 3500, 24, 60, NOW() - INTERVAL '38 days'),
  ('prd_002', '유기농 녹차티백', 3200, '100티백, 200티백', 2500, 20, 40, NOW() - INTERVAL '36 days'),
  ('prd_003', '일회용 종이컵', 4500, '1000개', 4000, 10, 50, NOW() - INTERVAL '30 days'),
  ('prd_004', '주방세제 1L', 2100, '본품, 리필', 3000, 12, 48, NOW() - INTERVAL '25 days'),
  ('prd_005', '마스크 KF94', 8900, '50매, 100매', 2800, 20, 30, NOW() - INTERVAL '18 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_options (id, product_id, name, extra_price) VALUES
  ('opt_001', 'prd_001', '24병/박스', 0),
  ('opt_002', 'prd_001', '개별 포장', 1500),
  ('opt_003', 'prd_002', '100티백', 0),
  ('opt_004', 'prd_002', '200티백', 2500),
  ('opt_005', 'prd_003', '1000개', 0),
  ('opt_006', 'prd_004', '본품', 0),
  ('opt_007', 'prd_004', '리필', 800),
  ('opt_008', 'prd_005', '50매', 0),
  ('opt_009', 'prd_005', '100매', 4000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO supply_prices (id, supplier_id, product_id, option_id, supply_price, shipping_fee, created_at, updated_at) VALUES
  ('sp_001', 'sup_001', 'prd_001', 'opt_001', 220, 3500, NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
  ('sp_001b', 'sup_001', 'prd_001', 'opt_002', 1720, 3500, NOW() - INTERVAL '30 days', NOW() - INTERVAL '5 days'),
  ('sp_002', 'sup_002', 'prd_001', 'opt_001', 205, 3500, NOW() - INTERVAL '28 days', NOW() - INTERVAL '4 days'),
  ('sp_003', 'sup_003', 'prd_001', 'opt_001', 240, 3500, NOW() - INTERVAL '25 days', NOW() - INTERVAL '3 days'),
  ('sp_004', 'sup_001', 'prd_002', 'opt_003', 3800, 2500, NOW() - INTERVAL '27 days', NOW() - INTERVAL '6 days'),
  ('sp_005', 'sup_004', 'prd_002', 'opt_003', 3500, 2500, NOW() - INTERVAL '22 days', NOW() - INTERVAL '2 days'),
  ('sp_005b', 'sup_004', 'prd_002', 'opt_004', 6000, 2500, NOW() - INTERVAL '22 days', NOW() - INTERVAL '2 days'),
  ('sp_006', 'sup_002', 'prd_003', 'opt_005', 5200, 4000, NOW() - INTERVAL '24 days', NOW() - INTERVAL '7 days'),
  ('sp_007', 'sup_003', 'prd_003', 'opt_005', 4900, 4000, NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day'),
  ('sp_008', 'sup_001', 'prd_004', 'opt_006', 2500, 3000, NOW() - INTERVAL '18 days', NOW() - INTERVAL '8 days'),
  ('sp_009', 'sup_004', 'prd_004', 'opt_006', 2350, 3000, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
  ('sp_009b', 'sup_004', 'prd_004', 'opt_007', 3150, 3000, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days'),
  ('sp_010', 'sup_002', 'prd_005', 'opt_008', 9800, 2800, NOW() - INTERVAL '12 days', NOW() - INTERVAL '3 days'),
  ('sp_011', 'sup_003', 'prd_005', 'opt_008', 9200, 2800, NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day'),
  ('sp_012', 'sup_004', 'prd_005', 'opt_008', 9500, 2800, NOW() - INTERVAL '8 days', NOW()),
  ('sp_012b', 'sup_004', 'prd_005', 'opt_009', 13500, 2800, NOW() - INTERVAL '8 days', NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_prices (id, supplier_id, product_id, purchase_price, created_at, updated_at) VALUES
  ('pp_001', 'ven_001', 'prd_001', 180, NOW() - INTERVAL '32 days', NOW() - INTERVAL '6 days'),
  ('pp_002', 'ven_002', 'prd_002', 3200, NOW() - INTERVAL '29 days', NOW() - INTERVAL '4 days'),
  ('pp_003', 'ven_003', 'prd_003', 4500, NOW() - INTERVAL '26 days', NOW() - INTERVAL '5 days'),
  ('pp_004', 'ven_004', 'prd_004', 2100, NOW() - INTERVAL '20 days', NOW() - INTERVAL '3 days'),
  ('pp_005', 'ven_005', 'prd_005', 8900, NOW() - INTERVAL '14 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;
