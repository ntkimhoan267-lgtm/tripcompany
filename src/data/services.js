// Danh mục dịch vụ & bảng giá CÔNG KHAI (Giá Khách Lẻ).
// QUY TẮC: tuyệt đối không đưa Giá Đại Lý (Net) / hoa hồng (COM) vào file này.

// Lựa chọn trong dropdown "Dịch vụ cần tư vấn"
const leadServiceOptions = [
  'Visa Trung Quốc',
  'Visa Hàn Quốc',
  'Visa Nhật Bản',
  'Visa Châu Âu (Schengen, Anh)',
  'Visa Mỹ / Úc / Canada',
  'Visa nước khác',
  'E-visa Việt Nam (người nước ngoài)',
  'Dịch thuật công chứng',
  'Hợp pháp hoá lãnh sự',
  'Hộ chiếu',
  'Vé máy bay / Vé tàu',
  'Tour du lịch',
  'Thuê xe / Xe đưa đón',
  'Bảo hiểm du lịch / eSIM',
  'Khác',
];

const chinaVisa = {
  currency: 'VND',
  note: 'Áp dụng cho quốc tịch Việt Nam, xét duyệt thường (Regular). Làm nhanh (Express): cộng thêm 35 USD phí Lãnh sự và 375.000đ phí dịch vụ.',
  rows: [
    { type: 'Visa Du lịch (L) – 15 ngày', time: '10–14 ngày làm việc', detail: 'Lưu trú tối đa 15 ngày', price: 2800000 },
    { type: 'Visa Du lịch (L) – 30 ngày', time: '10–14 ngày làm việc', detail: 'Lưu trú tối đa 30 ngày', price: 2900000 },
    { type: 'Visa Thăm thân (Q1, Q2)', time: '10–14 ngày làm việc', detail: 'Nhập cảnh 1 lần', price: 3200000 },
    { type: 'Visa Thương mại (M)', time: '10–14 ngày làm việc', detail: 'Nhập cảnh 1 lần', price: 3000000 },
    { type: 'Visa Thương mại / Thăm thân – 2 lần', time: '10–14 ngày làm việc', detail: 'Nhập cảnh 2 lần', price: 4000000 },
    { type: 'Visa Thương mại / Thăm thân – 6 tháng', time: '10–14 ngày làm việc', detail: '6 tháng, nhập cảnh nhiều lần', price: 4800000 },
    { type: 'Visa Thương mại / Thăm thân – 1 năm', time: '10–14 ngày làm việc', detail: '1 năm, nhập cảnh nhiều lần', price: 6200000 },
    { type: 'Visa Thăm thân (S1, S2)', time: '10–14 ngày làm việc', detail: 'Dành cho người thân chuyên gia', price: 3200000 },
    { type: 'Visa Du học (X1, X2)', time: '10–14 ngày làm việc', detail: 'Dành cho học sinh, sinh viên', price: 3000000 },
    { type: 'Combo Visa Kết hôn (S2)', time: '10–14 ngày làm việc', detail: 'Trọn gói thủ tục kết hôn', price: 8200000 },
  ],
};

// Visa các nước khác. price: số USD, hoặc { vnd: số } khi niêm yết bằng VNĐ.
const worldVisa = [
  { region: 'chau-my', country: 'Hoa Kỳ (Mỹ)', code: 'us', type: 'B1/B2 – Phỏng vấn lần đầu', time: 'Theo lịch phỏng vấn LSQ', usd: 250 },
  { region: 'chau-my', country: 'Hoa Kỳ (Mỹ)', code: 'us', type: 'B1/B2 – Gia hạn, miễn phỏng vấn', time: '2–3 tuần', usd: 260 },
  { region: 'chau-my', country: 'Canada', code: 'ca', type: 'Du lịch / Công tác / Thăm thân', time: '19–21 ngày', usd: 296 },
  { region: 'chau-au', country: 'Vương quốc Anh', code: 'gb', type: 'Standard Visitor (6 tháng)', time: '3–4 tuần', usd: 444 },
  { region: 'chau-au', country: 'Vương quốc Anh', code: 'gb', type: 'Visa du học (6 tháng)', time: '3–4 tuần', usd: 1000 },
  { region: 'chau-au', country: 'Pháp (Schengen)', code: 'fr', type: 'Du lịch / Thăm thân / Công tác', time: '15–20 ngày', usd: 230 },
  { region: 'chau-au', country: 'Ý (Schengen)', code: 'it', type: 'Du lịch / Thăm thân / Công tác', time: '15–25 ngày', usd: 260 },
  { region: 'chau-au', country: 'Đức (Schengen)', code: 'de', type: 'Du lịch / Thăm thân / Công tác', time: '15–20 ngày', usd: 240 },
  { region: 'chau-au', country: 'Tây Ban Nha (Schengen)', code: 'es', type: 'Du lịch / Thăm thân / Công tác', time: '15–20 ngày', usd: 220, note: 'Giá thay đổi theo ĐSQ/LSQ' },
  { region: 'chau-au', country: 'Thuỵ Sĩ (Schengen)', code: 'ch', type: 'Du lịch / Thăm thân / Công tác', time: '10–15 ngày', usd: 250 },
  { region: 'chau-au', country: 'Bỉ (Schengen)', code: 'be', type: 'Du lịch / Thăm thân / Công tác', time: '15–20 ngày', usd: 225 },
  { region: 'chau-uc', country: 'Úc (Australia)', code: 'au', type: 'Du lịch (Subclass 600)', time: '2–4 tuần', usd: 260, note: 'Chưa gồm phí lăn tay' },
  { region: 'chau-uc', country: 'New Zealand', code: 'nz', type: 'Visitor Visa', time: '3–5 tuần', usd: 240, note: 'Giá thay đổi theo ĐSQ/LSQ' },
  { region: 'chau-a', country: 'Nhật Bản', code: 'jp', type: 'Du lịch – Single (3 tháng)', time: '7 ngày làm việc', vnd: 3800000 },
  { region: 'chau-a', country: 'Nhật Bản', code: 'jp', type: 'Du lịch – Multiple (1 năm / 3 năm)', time: '7 ngày làm việc', vnd: 6500000 },
  { region: 'chau-a', country: 'Hàn Quốc', code: 'kr', type: 'Du lịch – Single (3 tháng)', time: '10 ngày làm việc', usd: 120, note: 'Cần gấp (nộp khẩn): +20 USD' },
  { region: 'chau-a', country: 'Hàn Quốc', code: 'kr', type: 'Du lịch – Multiple (5 năm / 10 năm)', time: '10 ngày làm việc', usd: 230 },
  { region: 'chau-a', country: 'Đài Loan', code: 'tw', type: 'Du lịch / Công tác (dán)', time: '17–21 ngày', usd: 150, note: 'Chưa gồm phí giao nhận' },
  { region: 'chau-a', country: 'Hồng Kông', code: 'hk', type: 'Du lịch / Công tác / Thăm thân', time: '18–21 ngày', usd: 120 },
  { region: 'chau-a', country: 'Macau', code: 'mo', type: 'Du lịch (dán)', time: '14–21 ngày', usd: 140, note: 'Cộng phí dịch thuật' },
  { region: 'chau-a', country: 'Ấn Độ', code: 'in', type: 'Du lịch (dán)', time: '15–21 ngày', usd: 70 },
  { region: 'chau-a', country: 'Dubai (UAE)', code: 'ae', type: 'Du lịch (dán)', time: '16–21 ngày', usd: 185 },
];

const visaRegions = [
  { id: 'chau-a', label: 'Châu Á' },
  { id: 'chau-au', label: 'Châu Âu' },
  { id: 'chau-my', label: 'Châu Mỹ' },
  { id: 'chau-uc', label: 'Úc & New Zealand' },
];

// 4 thị trường trọng tâm: Trung – Hàn – Nhật (thế mạnh) và Châu Âu
const markets = [
  {
    id: 'trung-quoc', art: 'cn', country: 'Trung Quốc', native: '中国', en: 'China', code: 'cn', leadService: 'Visa Trung Quốc',
    from: { vnd: 2800000 }, time: '10–14 ngày làm việc',
    types: ['Du lịch L 15 / 30 ngày', 'Thăm thân Q, S', 'Thương mại M', 'Du học X', 'Nhiều lần 6 tháng – 1 năm', 'Combo kết hôn'],
    blurb: 'Thị trường TRIP xử lý nhiều nhất: đủ mọi loại visa, kèm chứng nhận lãnh sự giấy tờ.',
  },
  {
    id: 'han-quoc', art: 'kr', country: 'Hàn Quốc', native: '대한민국', en: 'Korea', code: 'kr', leadService: 'Visa Hàn Quốc',
    from: { usd: 120 }, time: '10 ngày làm việc',
    types: ['Du lịch 3 tháng', 'Multiple 5 năm', 'Multiple 10 năm', 'Nộp khẩn'],
    blurb: 'Tư vấn chứng minh tài chính, công việc và hồ sơ visa nhiều lần 5 – 10 năm.',
  },
  {
    id: 'nhat-ban', art: 'jp', country: 'Nhật Bản', native: '日本', en: 'Japan', code: 'jp', leadService: 'Visa Nhật Bản',
    from: { vnd: 3800000 }, time: '7 ngày làm việc',
    types: ['Du lịch Single 3 tháng', 'Multiple 1 năm', 'Multiple 3 năm'],
    blurb: 'Lịch trình, đặt phòng và bộ hồ sơ chuẩn theo yêu cầu Đại sứ quán Nhật.',
  },
  {
    id: 'chau-au', art: 'eu', country: 'Châu Âu', native: 'Schengen · UK', en: 'Europe', code: 'eu', leadService: 'Visa Châu Âu (Schengen, Anh)',
    from: { usd: 220 }, time: '10 ngày – 4 tuần',
    types: ['Pháp', 'Đức', 'Ý', 'Tây Ban Nha', 'Thuỵ Sĩ', 'Bỉ', 'Vương quốc Anh'],
    blurb: 'Đặt lịch VFS / TLS / BLS, bảo hiểm Schengen và luyện phỏng vấn 1 kèm 1.',
  },
];

// only: chỉ hiện ở các trang visa này (không có = hiện ở mọi trang)
const visaIncluded = [
  { text: 'Phí nộp Lãnh sự quán / Đại sứ quán / Trung tâm tiếp nhận' },
  { text: 'Dịch thuật, công chứng tư pháp các giấy tờ cơ bản' },
  { text: 'Tư vấn hồ sơ, khai form, đặt lịch hẹn' },
  { text: 'Luyện phỏng vấn 1 kèm 1', only: ['chau-au', 'nuoc-khac'] },
];
const visaExcluded = [
  { text: 'Thuế VAT (nếu cần xuất hoá đơn, vui lòng báo trước)' },
  { text: 'Phí dịch vụ VIP / Premium tại trung tâm tiếp nhận', only: ['chau-au', 'nuoc-khac', 'han-quoc'] },
  { text: 'Bảo hiểm du lịch quốc tế (bắt buộc với khối Schengen)', only: ['chau-au'] },
  { text: 'Bảo hiểm du lịch quốc tế' , only: ['trung-quoc', 'han-quoc', 'nhat-ban', 'nuoc-khac'] },
  { text: 'Vé máy bay và đặt phòng khách sạn thật' },
];
// Giấy tờ cơ bản (mang tính tham khảo — TRIP gửi danh sách chi tiết theo từng hồ sơ)
const visaDocs = {
  default: [
    'Hộ chiếu bản gốc còn hạn tối thiểu 6 tháng, còn trang trống',
    'Ảnh thẻ nền trắng theo quy cách của Lãnh sự quán',
    'Căn cước công dân (bản chụp)',
    'Giấy tờ công việc: hợp đồng lao động / đăng ký kinh doanh / thẻ học sinh, sinh viên',
    'Giấy tờ tài chính: sổ tiết kiệm, sao kê tài khoản ngân hàng',
    'Lịch trình, đặt vé và khách sạn dự kiến (TRIP hỗ trợ chuẩn bị)',
  ],
  'e-visa': [
    'Ảnh chụp trang thông tin hộ chiếu (còn hạn tối thiểu 6 tháng)',
    'Ảnh chân dung nền trắng',
    'Ngày nhập cảnh dự kiến và cửa khẩu / sân bay nhập cảnh',
    'Địa chỉ lưu trú tại Việt Nam',
  ],
};

// Danh sách đúng cho từng trang visa (không truyền id = trang tổng quan)
const visaListFor = (list, id) => list.filter((x) => !x.only || (id ? x.only.includes(id) : x.only.length > 2)).map((x) => x.text);

const evisa = {
  note: 'Dịch vụ dành cho người nước ngoài nhập cảnh Việt Nam. Đơn vị: USD.',
  rows: [
    { speed: 'Tiêu chuẩn (Standard)', single: 40, multiple: 70 },
    { speed: '2 ngày làm việc', single: 65, multiple: 90 },
    { speed: '1 ngày làm việc', single: 75, multiple: 100 },
    { speed: '4 giờ làm việc', single: 85, multiple: 115 },
    { speed: '2 giờ làm việc', single: 160, multiple: 185 },
  ],
  fastTrack: [
    { name: 'Fast Track (VIP Entry)', small: '15 USD/khách', large: '12 USD/khách' },
    { name: 'Hỗ trợ hành lý (Luggage)', small: '15 USD/khách', large: '12 USD/khách' },
  ],
  fastTrackNote: 'Khách quốc tịch Việt Nam được giảm phí Fast Track còn 12 USD/khách (nhóm 1–5) và 10 USD/khách (nhóm từ 6).',
};

const translation = {
  unit: 'trang',
  languages: [
    {
      id: 'anh', label: 'Tiếng Anh', pair: 'Việt ⇄ Anh',
      rows: [
        { level: 'Dịch thuật tiêu chuẩn', price: 40000 },
        { level: 'Dịch thuật công chứng dấu công ty', price: 50000 },
        { level: 'Công chứng dấu công ty – Hoả tốc / Không theo form', price: 70000 },
        { level: 'Dịch thuật công chứng dấu tư pháp', price: 100000 },
      ],
    },
    {
      id: 'trung-han-nhat', label: 'Trung · Hàn · Nhật', pair: 'Việt ⇄ Trung / Hàn / Nhật',
      rows: [
        { level: 'Dịch thuật tiêu chuẩn', price: 80000 },
        { level: 'Dịch thuật công chứng dấu công ty', price: 90000 },
        { level: 'Công chứng dấu công ty – Hoả tốc / Không theo form', price: 120000 },
      ],
    },
    {
      id: 'thai-lao', label: 'Thái · Lào', pair: 'Việt ⇄ Thái / Lào',
      rows: [
        { level: 'Dịch thuật tiêu chuẩn', price: 190000 },
        { level: 'Dịch thuật công chứng dấu công ty', price: 200000 },
        { level: 'Công chứng dấu công ty – Hoả tốc / Không theo form', price: 230000 },
      ],
    },
    {
      id: 'khac', label: 'Ngôn ngữ khác', pair: 'Các ngôn ngữ khác',
      rows: [{ level: 'Dịch thuật ngôn ngữ khác', price: null, text: 'Báo giá khi nhận tài liệu' }],
    },
  ],
  surcharges: [
    { name: 'Công chứng dấu công ty', unit: 'dấu', price: 15000 },
    { name: 'Công chứng dấu tư pháp', unit: 'dấu', price: 65000 },
    { name: 'Công chứng bản sao', unit: 'tờ', price: 15000 },
    { name: 'In ấn màu', unit: 'trang', price: 12000 },
    { name: 'In ấn bản sao', unit: 'bản', price: 10000 },
    { name: 'In ảnh thẻ', unit: 'combo 10 tấm', price: 50000 },
    { name: 'Hiệu đính bản dịch', unit: 'trang', price: 10000 },
  ],
  notes: [
    'Chi phí chưa bao gồm phí vận chuyển.',
    'Giá niêm yết dành cho tài liệu phổ thông. Văn bản chuyên ngành sâu (y khoa, kỹ thuật, pháp lý phức tạp…) được báo giá cụ thể sau khi nhận tài liệu.',
    'Đóng dấu lại / in thêm bản sao chỉ áp dụng cho tài liệu đã dịch và lưu hồ sơ tại TRIP.',
  ],
  documents: [
    'Giấy khai sinh, giấy đăng ký kết hôn, xác nhận độc thân',
    'Bằng cấp, bảng điểm, học bạ',
    'Hộ khẩu, CCCD, hộ chiếu, lý lịch tư pháp',
    'Sao kê ngân hàng, xác nhận số dư, giấy tờ nhà đất',
    'Hợp đồng lao động, hợp đồng thương mại',
    'Hồ sơ du học, hồ sơ xin visa, định cư',
  ],
  legalization: [
    { name: 'Chứng nhận lãnh sự Trung Quốc (giấy tờ dân sự)', detail: 'Giấy độc thân, khai sinh, kết hôn…', price: 2700000 },
    { name: 'Chứng nhận lãnh sự Trung Quốc (giấy tờ kinh tế)', detail: 'Hợp đồng lao động, thương mại… (gồm tem đỏ)', price: 6200000 },
  ],
};

const passport = {
  rows: [{ type: 'Hộ chiếu phổ thông', time: '8–10 ngày làm việc', price: 500000 }],
  notes: [
    'Mất hộ chiếu, cấp lại: cộng thêm 100.000đ.',
    'Giá chưa bao gồm phí chuyển phát hộ chiếu. Chuyển phát hoả tốc HCM – Đà Nẵng: 1–2 ngày 130.000đ; trong ngày 330.000đ.',
    'Thời gian xử lý không tính thứ 7, chủ nhật và thời gian vận chuyển.',
    'Hồ sơ tiếp nhận sau 15:00 được tính từ ngày làm việc tiếp theo.',
  ],
};

const carTransfer = {
  area: 'Khu vực Đà Nẵng – Hội An – Huế',
  rows: [
    { route: 'Sân bay / Ga ⇄ Khách sạn Đà Nẵng', way: '1 chiều', p4: 120000, p7: 150000, p16: 300000 },
    { route: 'KS Đà Nẵng – Phố cổ Hội An', way: '2 chiều', p4: 500000, p7: 600000, p16: 1000000 },
    { route: 'KS Đà Nẵng – Bà Nà Hills', way: '2 chiều', p4: 600000, p7: 700000, p16: 1100000 },
    { route: 'KS Đà Nẵng – Núi Thần Tài', way: '2 chiều', p4: 700000, p7: 800000, p16: 1200000 },
    { route: 'KS Đà Nẵng – Sơn Trà', way: '2 chiều', p4: 300000, p7: 350000, p16: 750000 },
    { route: 'KS Đà Nẵng – VinWonders Nam Hội An', way: '2 chiều', p4: 800000, p7: 900000, p16: 1300000 },
    { route: 'KS Đà Nẵng – VinWonders – Phố cổ Hội An', way: '2 chiều', p4: 900000, p7: 1100000, p16: 1400000 },
    { route: 'KS Đà Nẵng – Rừng dừa Bảy Mẫu – Phố cổ Hội An', way: '2 chiều', p4: 600000, p7: 750000, p16: 1200000 },
    { route: 'KS Đà Nẵng – Huế', way: '2 chiều', p4: 1800000, p7: 2000000, p16: 2700000 },
  ],
  selfDrive: [
    { car: 'Kia Seltos', seats: '4 chỗ', price: 800000 },
    { car: 'Mazda CX-5', seats: '4 chỗ', price: 800000 },
    { car: 'Toyota Veloz Cross', seats: '7 chỗ', price: 800000 },
  ],
  notes: [
    'Giá áp dụng đón – trả tại 1 điểm trong trung tâm TP Đà Nẵng. Khu vực ngoại ô cộng 50.000đ/chuyến.',
    'Xe 4 chỗ chở tối đa 4 khách, xe 7 chỗ tối đa 6 khách, xe 16 chỗ tối đa 15 khách.',
    'Giá thuê xe tự lái tính theo ngày, giao xe tại Đà Nẵng.',
  ],
};

const airlines = [
  'Vietnam Airlines', 'Vietjet Air', 'Bamboo Airways', 'Vietravel Airlines', 'Sun PhuQuoc Airways',
  'AirAsia', 'Scoot', 'Jetstar', 'IndiGo', 'Cebu Pacific', 'Myanmar Airways International', 'Emirates',
];

const attractions = [
  'Sun World Bà Nà Hills', 'Núi Thần Tài', 'Mikazuki Water Park 365', 'Du thuyền sông Hàn',
  'Du thuyền Tàu Rồng sông Hàn', 'Du thuyền Danang Dragon', 'Du thuyền Poseidon Đà Nẵng',
  'Rừng dừa Bảy Mẫu', 'Show Ký ức Hội An', 'Cổng trời Đông Giang', 'Hoà Phú Thành',
  'Bảo tàng 3D', 'Lặn ngắm san hô Sơn Trà', 'Cano cao tốc Sơn Trà', 'Áo Dài Show',
  'Thiên đường Cổ Cò', 'VinWonders Nam Hội An',
];

// Các trang dịch vụ phụ dùng chung template "service-generic"
const otherServices = {
  'ho-chieu': {
    slug: 'ho-chieu', icon: 'passport', title: 'Dịch vụ làm hộ chiếu',
    short: 'Làm mới, cấp lại hộ chiếu phổ thông nhanh gọn, không phải xếp hàng.',
    intro: 'TRIP hỗ trợ trọn gói thủ tục làm hộ chiếu phổ thông: tư vấn giấy tờ, khai tờ khai, nộp hồ sơ và nhận kết quả. Bạn chỉ cần chuẩn bị giấy tờ cá nhân, phần còn lại TRIP lo.',
    consultants: 'passport', leadService: 'Hộ chiếu',
  },
  've-may-bay': {
    slug: 've-may-bay', icon: 'plane', title: 'Đặt vé máy bay & vé tàu',
    short: 'Vé nội địa và quốc tế của hơn 10 hãng bay, tư vấn hành trình tối ưu.',
    intro: 'TRIP là đại lý đặt vé của nhiều hãng hàng không trong nước và quốc tế. Chúng tôi tư vấn hành trình, giờ bay và hạng vé phù hợp ngân sách, hỗ trợ đổi – hoàn vé theo điều kiện của hãng.',
    consultants: 'flight', leadService: 'Vé máy bay / Vé tàu',
  },
  'tour': {
    slug: 'tour', icon: 'map', title: 'Tour du lịch & vé vui chơi',
    short: 'Tour trong ngày tại Đà Nẵng, tour trọn gói trong nước và Châu Á.',
    intro: 'Từ tour trong ngày Bà Nà, Hội An, Cù Lao Chàm đến tour Trung Quốc, Hàn Quốc, Nhật Bản — TRIP thiết kế hành trình trọn gói khởi hành từ Đà Nẵng, kèm sẵn visa và vé máy bay.',
    consultants: 'tour', leadService: 'Tour du lịch',
  },
  'thue-xe': {
    slug: 'thue-xe', icon: 'car', title: 'Xe đưa đón & thuê xe tự lái',
    short: 'Xe 4–16 chỗ đưa đón sân bay, tham quan Đà Nẵng – Hội An – Huế.',
    intro: 'Dịch vụ xe đưa đón sân bay, ga tàu và tham quan các điểm du lịch Đà Nẵng – Hội An – Huế với xe đời mới, tài xế kinh nghiệm. Ngoài ra TRIP cho thuê xe tự lái 4 và 7 chỗ, giao xe tại Đà Nẵng.',
    consultants: 'car', leadService: 'Thuê xe / Xe đưa đón',
  },
  'bao-hiem-esim': {
    slug: 'bao-hiem-esim', icon: 'shield', title: 'Bảo hiểm du lịch & eSIM',
    short: 'Bảo hiểm du lịch quốc tế Liberty và eSIM data cho chuyến đi nước ngoài.',
    intro: 'Bảo hiểm du lịch quốc tế của Liberty — đáp ứng yêu cầu hồ sơ visa Schengen — và eSIM du lịch giúp bạn có internet ngay khi hạ cánh, không cần đổi SIM.',
    consultants: 'other', leadService: 'Bảo hiểm du lịch / eSIM',
  },
};

module.exports = {
  leadServiceOptions, chinaVisa, worldVisa, visaRegions, markets, visaListFor, visaDocs, visaIncluded, visaExcluded,
  evisa, translation, passport, carTransfer, airlines, attractions, otherServices,
};
