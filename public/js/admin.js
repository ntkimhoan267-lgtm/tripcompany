(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var csrf = ($('meta[name="csrf-token"]') || {}).content || '';

  // Menu trên mobile
  var side = $('#side');
  $$('[data-side-toggle]').forEach(function (b) { b.addEventListener('click', function () { side.classList.toggle('is-open'); }); });
  document.addEventListener('click', function (e) {
    if (side && side.classList.contains('is-open') && !e.target.closest('#side') && !e.target.closest('[data-side-toggle]')) side.classList.remove('is-open');
  });

  // Sao chép link (VD: link trang đánh giá để gửi khách qua Zalo)
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.getAttribute('data-copy'); var old = b.textContent;
      var done = function () { b.textContent = '✓ Đã sao chép'; setTimeout(function () { b.textContent = old; }, 1500); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt('Sao chép link:', text); });
      else prompt('Sao chép link:', text);
    });
  });

  // Xác nhận trước khi xoá / gửi
  $$('form[data-confirm]').forEach(function (f) {
    f.addEventListener('submit', function (e) { if (!confirm(f.getAttribute('data-confirm'))) e.preventDefault(); });
  });
  $$('form[data-confirm-submit]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (e.submitter && e.submitter.value === 'all' && !confirm('Gửi bản tin tới toàn bộ người đăng ký? Thao tác này không thể hoàn tác.')) e.preventDefault();
    });
  });

  // Form chỉ được gửi 1 lần (bản tin): khoá mọi nút sau lần bấm đầu, tránh bấm 2 lần gửi trùng.
  // Đăng ký SAU các hộp xác nhận ở trên nên nếu người dùng bấm "Huỷ" thì không bị khoá.
  // Khoá trong setTimeout: lúc đó trình duyệt đã lấy dữ liệu form, nên giá trị của nút vừa bấm (mode=test/all) vẫn được gửi.
  $$('form[data-once]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      if (e.defaultPrevented) return;
      if (f.dataset.sent) { e.preventDefault(); return; }
      f.dataset.sent = '1';
      setTimeout(function () {
        $$('button', f).forEach(function (b) { b.disabled = true; });
        if (e.submitter) e.submitter.textContent = 'Đang gửi…';
      }, 0);
    });
  });

  // Cập nhật trạng thái khách không cần tải lại trang
  $$('.js-lead-update').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button', f); var old = btn.textContent; btn.textContent = '…';
      fetch(f.action, { method: 'POST', headers: { 'x-requested-with': 'fetch', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(f)) })
        .then(function (r) {
          // Chỉ báo "Đã lưu" khi máy chủ xác nhận ok:true; bị chuyển hướng (hết phiên) hay lỗi đều không tính là đã lưu
          if (r.status === 401) return { ok: false, expired: true };
          if (r.redirected || !/json/.test(r.headers.get('content-type') || '')) return { ok: false };
          return r.json().catch(function () { return { ok: false }; });
        })
        .then(function (res) {
          if (res.expired) { btn.textContent = 'Hết phiên'; alert('Phiên đăng nhập đã hết hạn. Vui lòng tải lại trang và đăng nhập lại — thay đổi vừa rồi CHƯA được lưu.'); }
          else btn.textContent = res.ok === true ? '✓ Đã lưu' : 'Lỗi, chưa lưu';
        })
        .catch(function () { btn.textContent = 'Lỗi, chưa lưu'; })
        .finally(function () { setTimeout(function () { btn.textContent = old; }, 2000); });
    });
  });

  // Thanh công cụ Markdown đơn giản
  var ed = $('textarea.editor#content');
  function insert(before, after, placeholder) {
    var s = ed.selectionStart, e = ed.selectionEnd, sel = ed.value.slice(s, e) || placeholder || '';
    ed.setRangeText(before + sel + (after || ''), s, e, 'end');
    ed.focus();
  }
  if (ed) {
    $$('[data-md]').forEach(function (b) {
      b.addEventListener('click', function () {
        var s = ed.selectionStart; var lineStart = ed.value.lastIndexOf('\n', s - 1) + 1;
        ed.setRangeText(b.getAttribute('data-md'), lineStart, lineStart, 'end'); ed.focus();
      });
    });
    $$('[data-md-wrap]').forEach(function (b) { b.addEventListener('click', function () { var w = b.getAttribute('data-md-wrap'); insert(w, w, 'chữ đậm'); }); });
    $$('[data-md-link]').forEach(function (b) {
      b.addEventListener('click', function () { var url = prompt('Nhập đường link:', 'https://'); if (url) insert('[', '](' + url + ')', 'chữ hiển thị'); });
    });
    $$('[data-md-image]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.files[0]) return;
        var fd = new FormData(); fd.append('_csrf', csrf); fd.append('file', input.files[0]);
        fetch('/admin/upload', { method: 'POST', headers: { 'x-requested-with': 'fetch' }, body: fd }).then(function (r) { return r.json(); }).then(function (res) {
          if (res.ok === true) insert('\n![', '](' + res.url + ')\n', 'mô tả ảnh'); else alert(res.error || 'Tải ảnh thất bại');
        }).catch(function () { alert('Tải ảnh thất bại'); });
        input.value = '';
      });
    });
  }
  // ---------- Bài viết: xem trước Google + chấm điểm SEO ----------
  var seoBox = $('#seo-box');
  if (seoBox) {
    var f = function (id) { return $('#' + id); };
    var val = function (id) { var el = f(id); return el ? el.value.trim() : ''; };
    // Bỏ dấu tiếng Việt để so khớp từ khoá ("làm hộ chiếu" = "lam ho chieu")
    var fold = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(); };
    var slugify = function (s) { return fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); };
    var countWords = function (md) { return md.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#>*_`|-]/g, ' ').split(/\s+/).filter(Boolean).length; };

    // Bộ đếm ký tự cạnh ô tiêu đề / mô tả Google
    $$('[data-count]').forEach(function (c) {
      var input = f(c.getAttribute('data-count')); var min = +c.getAttribute('data-min'); var max = +c.getAttribute('data-max');
      var upd = function () {
        var n = input.value.trim().length;
        c.textContent = '(' + n + ' ký tự · nên ' + min + '–' + max + ')';
        c.className = 'hint ' + (!n ? '' : n < min || n > max ? 'is-warn' : 'is-ok');
      };
      input.addEventListener('input', upd); upd();
    });

    var run = function () {
      var title = val('title'); var seoTitle = val('seo_title') || (title ? title + ' | TRIP Đà Nẵng' : '');
      var desc = val('meta_desc') || val('excerpt');
      var slug = val('slug') ? slugify(val('slug')) : slugify(title);
      var content = f('content').value; var kw = fold(val('focus_kw'));
      $('[data-serp-title]', seoBox).textContent = seoTitle.length > 62 ? seoTitle.slice(0, 60) + '…' : seoTitle || 'Tiêu đề bài viết';
      $('[data-serp-desc]', seoBox).textContent = desc.length > 162 ? desc.slice(0, 158) + '…' : desc || 'Mô tả sẽ hiện ở đây. Viết 120–160 ký tự, có từ khoá chính và lời mời gọi.';
      $('[data-serp-slug]', seoBox).textContent = slug || 'duong-dan';

      var words = countWords(content);
      var lines = content.split('\n');
      var heads = lines.filter(function (l) { return /^#{2,3}\s/.test(l); });
      var h2 = lines.filter(function (l) { return /^##\s/.test(l); }).length;
      var h1 = lines.filter(function (l) { return /^#\s/.test(l); }).length;
      var imgs = content.match(/!\[[^\]]*\]\([^)]*\)/g) || [];
      var noAlt = imgs.filter(function (m) { return /^!\[\s*\]/.test(m); }).length;
      var links = (content.match(/\]\(([^)\s]+)/g) || []).map(function (m) { return m.slice(2); }).filter(function (u, i, a) { return !/\.(jpe?g|png|webp|gif)$/i.test(u); });
      var internal = links.filter(function (u) { return /^\/(?!\/)/.test(u) || /tripdn\.com/.test(u); }).length;
      var external = links.filter(function (u) { return /^https?:\/\//.test(u) && !/tripdn\.com/.test(u); }).length;
      var firstPara = fold(lines.filter(function (l) { return l.trim() && !/^#/.test(l); }).slice(0, 2).join(' ')) + ' ' + fold(val('excerpt'));
      var hasCover = !!$('input[name="cover"]') || !!(f('cover_file') && f('cover_file').files.length);
      var faqCount = val('faq') ? val('faq').split(/\n\s*\n/).filter(function (b) { return b.trim().split('\n').length >= 2; }).length : 0;

      var checks = [
        [!!kw, 'Đã nhập từ khoá chính', 'Nhập từ khoá chính (cụm từ khách gõ trên Google)'],
        [kw && fold(seoTitle).indexOf(kw) > -1, 'Từ khoá có trong tiêu đề Google', 'Đưa từ khoá chính vào tiêu đề Google (càng gần đầu càng tốt)'],
        [kw && slug.indexOf(slugify(kw)) > -1, 'Từ khoá có trong đường dẫn', 'Đưa từ khoá (không dấu) vào đường dẫn'],
        [kw && fold(desc).indexOf(kw) > -1, 'Từ khoá có trong mô tả Google', 'Đưa từ khoá chính vào mô tả Google'],
        [kw && firstPara.indexOf(kw) > -1, 'Từ khoá xuất hiện ngay đoạn đầu', 'Nhắc từ khoá chính trong đoạn mở đầu'],
        [kw && heads.some(function (l) { return fold(l).indexOf(kw) > -1; }), 'Từ khoá có trong ít nhất 1 tiêu đề mục', 'Đưa từ khoá vào ít nhất 1 tiêu đề ## hoặc ###'],
        [seoTitle.length >= 30 && seoTitle.length <= 65, 'Tiêu đề Google dài vừa đủ (' + seoTitle.length + ' ký tự)', 'Tiêu đề Google nên 30–60 ký tự (hiện ' + seoTitle.length + ')'],
        [desc.length >= 120 && desc.length <= 165, 'Mô tả Google dài vừa đủ (' + desc.length + ' ký tự)', 'Mô tả Google nên 120–160 ký tự (hiện ' + desc.length + ')'],
        [words >= 800, 'Bài đủ dài: ' + words + ' chữ', 'Bài nên từ 800 chữ trở lên (hiện ' + words + ' chữ)'],
        [h2 >= 2, 'Có ' + h2 + ' mục H2 → có mục lục', 'Chia bài thành ít nhất 2 mục bằng ## (tạo mục lục)'],
        [!h1, 'Không có H1 thừa trong nội dung', 'Bỏ dòng bắt đầu bằng "# " (tiêu đề bài đã là H1), dùng ## thay thế'],
        [hasCover, 'Có ảnh bìa', 'Thêm ảnh bìa (hiện khi chia sẻ Facebook/Zalo và Google Discover)'],
        [!hasCover || !!val('cover_alt'), 'Ảnh bìa có mô tả (alt)', 'Điền mô tả ảnh bìa (alt)'],
        [!noAlt, imgs.length ? 'Ảnh trong bài đều có mô tả' : 'Không có ảnh thiếu mô tả', noAlt + ' ảnh trong bài thiếu mô tả: viết ![mô tả](link)'],
        [internal >= 2, 'Có ' + internal + ' link nội bộ', 'Thêm ít nhất 2 link tới trang khác của TRIP (VD /bang-gia, /dich-vu/ho-chieu)'],
        [external >= 1, 'Có link tới nguồn uy tín', 'Thêm 1 link tới nguồn chính thống (VD cổng dịch vụ công)'],
        [faqCount >= 2, 'Có ' + faqCount + ' câu hỏi thường gặp', 'Thêm ít nhất 2 câu hỏi thường gặp (FAQ)'],
      ];
      var ok = checks.filter(function (c) { return c[0]; }).length;
      var score = Math.round(ok / checks.length * 100);
      var badge = $('[data-seo-score]', seoBox);
      badge.textContent = score + '/100';
      badge.className = 'seo-score ' + (score >= 80 ? 'is-ok' : score >= 50 ? 'is-mid' : 'is-warn');
      var ul = $('[data-seo-checks]', seoBox); ul.innerHTML = '';
      checks.forEach(function (c) {
        var li = document.createElement('li'); li.className = c[0] ? 'is-ok' : 'is-warn';
        li.textContent = (c[0] ? '✓ ' : '! ') + (c[0] ? c[1] : c[2]); ul.appendChild(li);
      });
    };
    ['title', 'seo_title', 'meta_desc', 'excerpt', 'slug', 'content', 'focus_kw', 'cover_alt', 'faq'].forEach(function (id) { var el = f(id); if (el) el.addEventListener('input', run); });
    if (f('cover_file')) f('cover_file').addEventListener('change', run);
    run();
  }

  // ---------- Bảng giá: bảng sửa được (thêm/xoá dòng), gửi dạng JSON ----------
  var priceForm = $('#price-form');
  if (priceForm) {
    var readTable = function (t) {
      return $$('tbody tr', t).filter(function (tr) { return !tr.hasAttribute('data-template'); }).map(function (tr) {
        var row = {};
        $$('[data-f]', tr).forEach(function (inp) { row[inp.getAttribute('data-f')] = inp.value; });
        return row;
      });
    };
    priceForm.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add-row]');
      if (add) {
        var t = $('table[data-table="' + add.getAttribute('data-add-row') + '"]', priceForm);
        var tpl = $('tr[data-template]', t);
        var tr = tpl.cloneNode(true); tr.removeAttribute('data-template'); tr.hidden = false;
        $('tbody', t).appendChild(tr);
        var first = $('input, select', tr); if (first) first.focus();
      }
      var del = e.target.closest('[data-del-row]');
      if (del) { var row = del.closest('tr'); if (confirm('Xoá dòng này?')) row.remove(); }
      var up = e.target.closest('[data-up-row]');
      if (up) { var r = up.closest('tr'); var prev = r.previousElementSibling; if (prev && !prev.hasAttribute('data-template')) r.parentNode.insertBefore(r, prev); }
    });
    priceForm.addEventListener('submit', function () {
      var payload = { tables: {}, texts: {}, reset: [] };
      $$('table[data-table]', priceForm).forEach(function (t) { payload.tables[t.getAttribute('data-table')] = readTable(t); });
      $$('[data-text]', priceForm).forEach(function (el) { payload.texts[el.getAttribute('data-text')] = el.value; });
      $('input[name="payload"]', priceForm).value = JSON.stringify(payload);
    });
  }

  // ---------- Ảnh & video: tải file lên rồi điền đường dẫn vào ô ----------
  // data-upload-to="<id ô nhập>" hoặc "@cell" (ô nhập cùng ô bảng, dùng cho dòng mới thêm). Bắt sự kiện ở document
  // để cả dòng vừa thêm (nhân bản từ mẫu) cũng tải được.
  document.addEventListener('change', function (e) {
    var input = e.target.closest && e.target.closest('[data-upload-to]');
    if (!input || !input.files || !input.files[0]) return;
    var to = input.getAttribute('data-upload-to');
    var target = to === '@cell' ? input.closest('td').querySelector('[data-f]') : document.getElementById(to);
    var isVideo = input.getAttribute('data-kind') === 'video';
    var holder = input.closest('[data-upload-box]') || input.parentNode;
    var status = holder.querySelector('.upload-status');
    var say = function (t) { if (status) status.textContent = t; };
    var fd = new FormData(); fd.append('_csrf', csrf); fd.append('file', input.files[0]);
    say(isVideo ? 'Đang tải video lên… (có thể mất 1 phút)' : 'Đang tải lên…');
    fetch(isVideo ? '/admin/upload-video' : '/admin/upload', { method: 'POST', headers: { 'x-requested-with': 'fetch' }, body: fd })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: r.status === 413 ? 'File quá lớn.' : 'Tải lên thất bại.' }; }); })
      .then(function (res) {
        if (res.ok === true) { target.value = res.url; target.dispatchEvent(new Event('input')); say('✓ Đã tải lên. Bấm "Lưu" để áp dụng.'); }
        else { say(''); alert(res.error || 'Tải lên thất bại'); }
      })
      .catch(function () { say(''); alert('Tải lên thất bại'); })
      .finally(function () { input.value = ''; });
  });
  // Xem trước ảnh/video ngay khi đổi đường dẫn
  $$('[data-preview-for]').forEach(function (box) {
    var input = document.getElementById(box.getAttribute('data-preview-for'));
    var kind = box.getAttribute('data-kind');
    var fallback = box.getAttribute('data-default') || '';
    var show = function () {
      var url = input.value.trim() || fallback;
      box.innerHTML = '';
      if (!url) { box.textContent = 'Chưa có'; return; }
      var el = document.createElement(kind === 'video' ? 'video' : 'img');
      el.src = url; if (kind === 'video') { el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true; } else el.alt = '';
      box.appendChild(el);
    };
    input.addEventListener('input', show); input.addEventListener('change', show);
  });
  $$('[data-clear]').forEach(function (b) {
    b.addEventListener('click', function () { var t = document.getElementById(b.getAttribute('data-clear')); t.value = ''; t.dispatchEvent(new Event('input')); });
  });
})();
