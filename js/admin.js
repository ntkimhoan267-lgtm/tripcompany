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
})();
