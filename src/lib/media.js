// Ảnh & video hiển thị trên website, đổi được trong Dashboard → Ảnh & video.
// Mỗi "ô" (slot) có giá trị mặc định (file sẵn trong public/); khi chủ website tải ảnh/video mới hoặc dán link,
// giá trị được lưu trong bảng settings với khoá "media_<key>" (poster của video: "media_<key>__poster").
const { getSettings } = require('./helpers');

const img = (key, group, label, def, hint = '') => ({ key, group, label, type: 'image', def, hint });
const vid = (key, group, label, def, poster, hint = '') => ({ key, group, label, type: 'video', def, poster, hint });

const SVC = [
  ['dich-thuat', 'Dịch thuật công chứng', '/img/services/dich-thuat.jpg'],
  ['hop-phap-hoa', 'Hợp pháp hoá lãnh sự', '/img/services/hop-phap-hoa.jpg'],
  ['ho-chieu', 'Làm hộ chiếu', '/img/services/ho-chieu-viet-nam.jpg'],
  ['ve-may-bay', 'Vé máy bay & vé tàu', '/img/services/ve-may-bay.jpg'],
  ['tour', 'Tour du lịch', '/img/tours/ba-na.jpg'],
  ['thue-xe', 'Xe đưa đón & thuê xe', '/img/services/thue-xe.jpg'],
  ['bao-hiem-esim', 'Bảo hiểm & eSIM', '/img/services/bao-hiem.jpg'],
];

const GROUPS = {
  home: 'Trang chủ & video chung',
  markets: 'Video 4 thị trường visa',
  visa: 'Ảnh các trang visa',
  services: 'Ảnh các dịch vụ',
  servicebg: 'Video nền đầu trang dịch vụ',
  pages: 'Các trang khác',
};

const SLOTS = [
  vid('home_hero', 'home', 'Video nền đầu trang chủ (và mặc định cho đầu các trang con)', '/media/hero-montage.mp4', '/media/hero-montage.jpg',
    'Video ngang 16:9, không tiếng, 10–20 giây, dưới 8MB. Điện thoại chỉ hiện ảnh poster để tiết kiệm dữ liệu.'),
  img('home_team', 'home', 'Ảnh đội ngũ (mục "Về TRIP" ở trang chủ)', '/img/team/team.jpg'),

  ...['cn:Trung Quốc', 'kr:Hàn Quốc', 'jp:Nhật Bản', 'eu:Châu Âu'].map((x) => {
    const [code, name] = x.split(':');
    return vid(`market_${code}`, 'markets', `Visa ${name} (thẻ ở trang chủ, trang Visa và nền đầu trang visa ${name})`,
      `/media/markets/${code}.mp4`, `/media/markets/${code}.jpg`, 'Video khổ dọc hoặc vuông, không tiếng, dưới 5MB.');
  }),

  img('visa_cn', 'visa', 'Ảnh trang Visa Trung Quốc', '/img/visa/cn.jpg'),
  img('visa_kr', 'visa', 'Ảnh trang Visa Hàn Quốc', '/img/visa/kr.jpg'),
  img('visa_jp', 'visa', 'Ảnh trang Visa Nhật Bản (và trang Visa tổng quan)', '/img/visa/jp.jpg'),
  img('visa_eu', 'visa', 'Ảnh trang Visa Châu Âu', '/img/visa/eu.jpg'),
  img('visa_nuoc-khac', 'visa', 'Ảnh trang Visa Mỹ · Úc · Canada & nước khác', '/img/visa/nuoc-khac.jpg'),
  img('visa_e-visa', 'visa', 'Ảnh trang E-visa Việt Nam', '/img/visa/e-visa-viet-nam.jpg'),

  ...SVC.map(([slug, name, def]) => img(`svc_${slug}`, 'services', `Ảnh dịch vụ: ${name}`, def, 'Hiện ở đầu trang dịch vụ, thẻ dịch vụ và bảng giá.')),
  ...SVC.map(([slug, name]) => vid(`bg_${slug}`, 'servicebg', `Video nền đầu trang: ${name}`, '', '',
    'Để trống = dùng video nền chung của trang chủ.')),

  img('pillar_visa', 'pages', 'Ảnh nền thẻ "Dịch vụ Visa" (trang Dịch vụ)', '/media/hero-montage.jpg'),
  img('page_pricing', 'pages', 'Ảnh đầu trang Bảng giá', '/img/team/team.jpg'),
  img('page_services', 'pages', 'Ảnh đầu trang Dịch vụ', '/img/team/team-banner.jpg'),
  img('page_tours', 'pages', 'Ảnh đầu trang Tour', '/img/tours/ba-na.jpg'),
  img('page_blog', 'pages', 'Ảnh đầu trang Cẩm nang', '/img/home/tu-van-hanh-trinh.jpg'),
  vid('bg_bang-gia', 'pages', 'Video nền đầu trang Bảng giá', '', '', 'Để trống = dùng video nền chung.'),
  vid('bg_tours', 'pages', 'Video nền đầu trang Tour', '', '', 'Để trống = dùng video nền chung.'),
];
const SLOT_MAP = Object.fromEntries(SLOTS.map((s) => [s.key, s]));

// Giá trị hợp lệ: ảnh/video nội bộ (không có '..') hoặc link https
const SAFE_IMAGE = /^(\/(uploads|img|media)\/(?!.*\.\.)[\w./-]+\.(jpe?g|png|webp|gif|avif)|https:\/\/[^\s"'<>()]+)$/i;
const SAFE_VIDEO = /^(\/(uploads|media)\/(?!.*\.\.)[\w./-]+\.(mp4|webm)|https:\/\/[\w\-./%~]+\.(mp4|webm))$/i;

function mediaUrl(key, settings = getSettings()) {
  const s = SLOT_MAP[key];
  if (!s) return '';
  const v = settings[`media_${key}`];
  return v || s.def;
}
function mediaPoster(key, settings = getSettings()) {
  const s = SLOT_MAP[key];
  if (!s || s.type !== 'video') return '';
  return settings[`media_${key}__poster`] || s.poster || '';
}

module.exports = { SLOTS, SLOT_MAP, GROUPS, mediaUrl, mediaPoster, SAFE_IMAGE, SAFE_VIDEO };
