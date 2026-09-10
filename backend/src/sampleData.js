export const SAMPLE_SUPPLIERS = [
  { id: 'sup_001', name: '한빛물류', kind: 'sales', daysAgo: 40 },
  { id: 'sup_002', name: '동서트레이딩', kind: 'sales', daysAgo: 35 },
  { id: 'sup_003', name: '글로벌서플라이', kind: 'sales', daysAgo: 28 },
  { id: 'sup_004', name: '에스더푸드', kind: 'sales', daysAgo: 20 },
  { id: 'ven_001', name: '제주워터', kind: 'purchase', daysAgo: 42 },
  { id: 'ven_002', name: '녹차원', kind: 'purchase', daysAgo: 39 },
  { id: 'ven_003', name: '한진패키지', kind: 'purchase', daysAgo: 33 },
  { id: 'ven_004', name: '클린케미컬', kind: 'purchase', daysAgo: 26 },
  { id: 'ven_005', name: '메디텍', kind: 'purchase', daysAgo: 19 },
]

export const SAMPLE_PRODUCTS = [
  {
    id: 'prd_001',
    name: '프리미엄 생수 500ml',
    cost: 180,
    shipping_fee: 3500,
    carton_quantity: 24,
    pallet_quantity: 60,
    daysAgo: 38,
    options: [
      { id: 'opt_001', name: '24병/박스', extra_price: 0 },
      { id: 'opt_002', name: '개별 포장', extra_price: 1500 },
    ],
  },
  {
    id: 'prd_002',
    name: '유기농 녹차티백',
    cost: 3200,
    shipping_fee: 2500,
    carton_quantity: 20,
    pallet_quantity: 40,
    daysAgo: 36,
    options: [
      { id: 'opt_003', name: '100티백', extra_price: 0 },
      { id: 'opt_004', name: '200티백', extra_price: 2500 },
    ],
  },
  {
    id: 'prd_003',
    name: '일회용 종이컵',
    cost: 4500,
    shipping_fee: 4000,
    carton_quantity: 10,
    pallet_quantity: 50,
    daysAgo: 30,
    options: [{ id: 'opt_005', name: '1000개', extra_price: 0 }],
  },
  {
    id: 'prd_004',
    name: '주방세제 1L',
    cost: 2100,
    shipping_fee: 3000,
    carton_quantity: 12,
    pallet_quantity: 48,
    daysAgo: 25,
    options: [
      { id: 'opt_006', name: '본품', extra_price: 0 },
      { id: 'opt_007', name: '리필', extra_price: 800 },
    ],
  },
  {
    id: 'prd_005',
    name: '마스크 KF94',
    cost: 8900,
    shipping_fee: 2800,
    carton_quantity: 20,
    pallet_quantity: 30,
    daysAgo: 18,
    options: [
      { id: 'opt_008', name: '50매', extra_price: 0 },
      { id: 'opt_009', name: '100매', extra_price: 4000 },
    ],
  },
]

export const SAMPLE_SUPPLY_PRICES = [
  { id: 'sp_001', supplier_id: 'sup_001', product_id: 'prd_001', option_id: 'opt_001', supply_price: 220, shipping_fee: 3500, createdDaysAgo: 30, updatedDaysAgo: 5 },
  { id: 'sp_001b', supplier_id: 'sup_001', product_id: 'prd_001', option_id: 'opt_002', supply_price: 1720, shipping_fee: 3500, createdDaysAgo: 30, updatedDaysAgo: 5 },
  { id: 'sp_002', supplier_id: 'sup_002', product_id: 'prd_001', option_id: 'opt_001', supply_price: 205, shipping_fee: 3500, createdDaysAgo: 28, updatedDaysAgo: 4 },
  { id: 'sp_003', supplier_id: 'sup_003', product_id: 'prd_001', option_id: 'opt_001', supply_price: 240, shipping_fee: 3500, createdDaysAgo: 25, updatedDaysAgo: 3 },
  { id: 'sp_004', supplier_id: 'sup_001', product_id: 'prd_002', option_id: 'opt_003', supply_price: 3800, shipping_fee: 2500, createdDaysAgo: 27, updatedDaysAgo: 6 },
  { id: 'sp_005', supplier_id: 'sup_004', product_id: 'prd_002', option_id: 'opt_003', supply_price: 3500, shipping_fee: 2500, createdDaysAgo: 22, updatedDaysAgo: 2 },
  { id: 'sp_005b', supplier_id: 'sup_004', product_id: 'prd_002', option_id: 'opt_004', supply_price: 6000, shipping_fee: 2500, createdDaysAgo: 22, updatedDaysAgo: 2 },
  { id: 'sp_006', supplier_id: 'sup_002', product_id: 'prd_003', option_id: 'opt_005', supply_price: 5200, shipping_fee: 4000, createdDaysAgo: 24, updatedDaysAgo: 7 },
  { id: 'sp_007', supplier_id: 'sup_003', product_id: 'prd_003', option_id: 'opt_005', supply_price: 4900, shipping_fee: 4000, createdDaysAgo: 20, updatedDaysAgo: 1 },
  { id: 'sp_008', supplier_id: 'sup_001', product_id: 'prd_004', option_id: 'opt_006', supply_price: 2500, shipping_fee: 3000, createdDaysAgo: 18, updatedDaysAgo: 8 },
  { id: 'sp_009', supplier_id: 'sup_004', product_id: 'prd_004', option_id: 'opt_006', supply_price: 2350, shipping_fee: 3000, createdDaysAgo: 15, updatedDaysAgo: 2 },
  { id: 'sp_009b', supplier_id: 'sup_004', product_id: 'prd_004', option_id: 'opt_007', supply_price: 3150, shipping_fee: 3000, createdDaysAgo: 15, updatedDaysAgo: 2 },
  { id: 'sp_010', supplier_id: 'sup_002', product_id: 'prd_005', option_id: 'opt_008', supply_price: 9800, shipping_fee: 2800, createdDaysAgo: 12, updatedDaysAgo: 3 },
  { id: 'sp_011', supplier_id: 'sup_003', product_id: 'prd_005', option_id: 'opt_008', supply_price: 9200, shipping_fee: 2800, createdDaysAgo: 10, updatedDaysAgo: 1 },
  { id: 'sp_012', supplier_id: 'sup_004', product_id: 'prd_005', option_id: 'opt_008', supply_price: 9500, shipping_fee: 2800, createdDaysAgo: 8, updatedDaysAgo: 0 },
  { id: 'sp_012b', supplier_id: 'sup_004', product_id: 'prd_005', option_id: 'opt_009', supply_price: 13500, shipping_fee: 2800, createdDaysAgo: 8, updatedDaysAgo: 0 },
]

export const SAMPLE_PURCHASE_PRICES = [
  { id: 'pp_001', supplier_id: 'ven_001', product_id: 'prd_001', purchase_price: 180, createdDaysAgo: 32, updatedDaysAgo: 6 },
  { id: 'pp_002', supplier_id: 'ven_002', product_id: 'prd_002', purchase_price: 3200, createdDaysAgo: 29, updatedDaysAgo: 4 },
  { id: 'pp_003', supplier_id: 'ven_003', product_id: 'prd_003', purchase_price: 4500, createdDaysAgo: 26, updatedDaysAgo: 5 },
  { id: 'pp_004', supplier_id: 'ven_004', product_id: 'prd_004', purchase_price: 2100, createdDaysAgo: 20, updatedDaysAgo: 3 },
  { id: 'pp_005', supplier_id: 'ven_005', product_id: 'prd_005', purchase_price: 8900, createdDaysAgo: 14, updatedDaysAgo: 2 },
]
