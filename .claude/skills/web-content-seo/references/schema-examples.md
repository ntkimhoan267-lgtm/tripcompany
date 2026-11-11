# Mẫu JSON-LD

## LocalBusiness theo ngành (đặt ở head mọi trang)
```json
{"@context":"https://schema.org","@type":"TravelAgency","name":"<tên pháp lý>","alternateName":"<thương hiệu>",
 "url":"https://domain.vn","logo":"https://domain.vn/img/logo-icon.png","image":"https://domain.vn/img/og-image.jpg",
 "telephone":"<hotline>","email":"<email>","taxID":"<MST>",
 "address":{"@type":"PostalAddress","streetAddress":"…","addressLocality":"…","addressRegion":"…","addressCountry":"VN"},
 "openingHours":["Mo-Fr 08:00-17:00","Sa 08:00-12:00"],"sameAs":["https://www.facebook.com/…"]}
```
Đổi `@type`: Restaurant (thêm servesCuisine, menu), MedicalClinic/Dentist, RealEstateAgent,
EducationalOrganization, Store, LegalService, ProfessionalService, BeautySalon/DaySpa.

## Bài viết
```json
{"@context":"https://schema.org","@type":"BlogPosting","headline":"…","description":"…","image":"…",
 "datePublished":"2026-11-01T08:00:00+07:00","dateModified":"…","author":{"@type":"Organization","name":"…"},
 "publisher":{"@type":"Organization","name":"…","logo":{"@type":"ImageObject","url":"…"}},
 "mainEntityOfPage":"https://domain.vn/blog/slug"}
```
```json
{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"…",
 "acceptedAnswer":{"@type":"Answer","text":"…"}}]}
```
```json
{"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[
 {"@type":"ListItem","position":1,"name":"Trang chủ","item":"https://domain.vn/"},
 {"@type":"ListItem","position":2,"name":"Cẩm nang","item":"https://domain.vn/blog"},
 {"@type":"ListItem","position":3,"name":"<bài>"}]}
```
## Sản phẩm có giá
```json
{"@context":"https://schema.org","@type":"Product","name":"…","image":"…","description":"…",
 "offers":{"@type":"Offer","priceCurrency":"VND","price":"2800000","availability":"https://schema.org/InStock","url":"…"}}
```
