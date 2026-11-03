// Thông tin công ty — nguồn: [TRIP] BẢNG BÁO GIÁ DỊCH VỤ, tripdn.com, xác nhận của TRIP.
// Các giá trị liên hệ (hotline, Facebook...) có thể ghi đè trong Dashboard > Cài đặt.
module.exports = {
  brand: 'TRIP',
  legalName: 'Công ty TNHH Dịch thuật và Dịch vụ Du lịch TRIP',
  taxCode: '0402222965',
  slogan: 'Let Your Adventures Begin With Us',
  domain: 'tripdn.com',
  address: 'Phòng 406, Tầng 4, 35 Cao Thắng, Hải Châu, Đà Nẵng',
  mapQuery: '35 Cao Thắng, Hải Châu, Đà Nẵng',
  email: 'triptranslate.com@gmail.com',
  hours: [
    { label: 'Thứ 2 – Thứ 6', value: '08:00 – 17:00' },
    { label: 'Thứ 7', value: '08:00 – 12:00' },
  ],
  facebook: 'https://www.facebook.com/triptranslate/',
  // Gmail nhận thông báo khách mới & được chia sẻ Google Sheet. Danh sách thật nằm trong google-apps-script/Code.gs;
  // ở đây chỉ dùng để hiển thị và gửi thử bản tin.
  notifyEmails: ['ntkimhoan267@gmail.com', 'triptranslate.com@gmail.com'],
  // Số liệu thành tích (theo video giới thiệu chính thức của TRIP, đã được TRIP xác nhận)
  stats: [
    { value: 5, suffix: ' năm', label: 'Đồng hành cùng khách hàng' },
    { value: 10000, suffix: '+', label: 'Hồ sơ đã thực hiện', note: 'Giấc mơ xuất ngoại thành hiện thực' },
    { value: 98, suffix: '%', label: 'Tỉ lệ đậu visa' },
  ],
  hotlines: [
    { label: 'Visa & Tour', name: 'Phạm Minh Trí', phone: '0935191394' },
    { label: 'Dịch thuật', name: 'Phạm Trang', phone: '0768141862' },
  ],
  // Tư vấn viên theo mảng (hiển thị trên trang dịch vụ tương ứng)
  consultants: {
    visa: [
      { name: 'Phạm Minh Trí', phone: '0935191394' },
      { name: 'Lê Kim Ngọc Nhi', phone: '0886933786' },
      { name: 'Lâm Thị Yến Nhị', phone: '0971712254' },
    ],
    translation: [
      { name: 'Phạm Trang', phone: '0768141862' },
      { name: 'Lâm Thị Yến Nhị', phone: '0971712254' },
    ],
    passport: [{ name: 'Phan Sỹ Nhật Anh', phone: '0935182687' }],
    flight: [{ name: 'Lâm Thị Yến Nhị', phone: '0971712254' }],
    car: [
      { name: 'Phạm Minh Trí', phone: '0935191394' },
      { name: 'Phan Sỹ Nhật Anh', phone: '0935182687' },
    ],
    tour: [{ name: 'Phạm Minh Trí', phone: '0935191394' }],
    other: [{ name: 'Phạm Trang', phone: '0768141862' }],
  },
};
