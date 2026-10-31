(function () {
  'use strict';
  document.documentElement.classList.remove('no-js');
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } },
  };

  // ---------- Header & menu ----------
  var header = $('#header');
  var onScroll = function () { header && header.classList.toggle('is-scrolled', window.scrollY > 10); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var burger = $('#burger'); var nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      document.body.classList.toggle('nav-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (open) { var firstLink = $('a, button', nav); firstLink && firstLink.focus(); }
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') || e.target.closest('[data-open-lead]')) {
        nav.classList.remove('is-open'); document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  $$('.nav__caret').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var item = btn.parentElement; var open = !item.classList.contains('is-open');
      $$('.nav__item.is-open').forEach(function (i) { if (i !== item) { i.classList.remove('is-open'); $('.nav__caret', i).setAttribute('aria-expanded', 'false'); } });
      item.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open));
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav__item') && window.innerWidth > 980) $$('.nav__item.is-open').forEach(function (i) { i.classList.remove('is-open'); });
  });

  // ---------- Modal ----------
  var lastFocus = null;
  function openModal(m) {
    if (!m) return;
    $$('.modal.is-open').forEach(closeModal);
    lastFocus = document.activeElement;
    m.hidden = false;
    requestAnimationFrame(function () { m.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    var f = $('input:not(.hp), select, button.modal__close', m);
    setTimeout(function () { f && f.focus(); }, 60);
  }
  function closeModal(m) {
    if (!m || !m.classList.contains('is-open')) return;
    m.classList.remove('is-open');
    setTimeout(function () {
      m.hidden = true;
      if (m.id === 'video-modal') $('#video-modal-frame').innerHTML = '';
    }, 220);
    document.body.style.overflow = '';
    if (m.id === 'news-modal') store.set('trip_news_seen', String(Date.now()));
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  $$('.modal').forEach(function (m) {
    m.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeModal(m); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      $$('.modal.is-open').forEach(closeModal);
      if (nav && nav.classList.contains('is-open')) { nav.classList.remove('is-open'); document.body.classList.remove('nav-open'); burger.setAttribute('aria-expanded', 'false'); burger.focus(); }
      var openItem = $('.nav__item.is-open');
      $$('.nav__item.is-open').forEach(function (i) { i.classList.remove('is-open'); $('.nav__caret', i).setAttribute('aria-expanded', 'false'); });
      if (openItem && openItem.contains(document.activeElement)) $('.nav__caret', openItem).focus();
      // Dropdown mở do rê chuột/focus: rời focus khỏi menu con để đóng lại
      var sub = document.activeElement && document.activeElement.closest && document.activeElement.closest('.nav__sub');
      if (sub) { var c = $('.nav__caret', sub.parentElement); c && c.focus(); }
    }
    if (e.key === 'Tab' && nav && nav.classList.contains('is-open') && !$('.modal.is-open')) {
      var items = [burger].concat($$('a[href], button:not([disabled])', nav).filter(function (el) { return el.offsetParent !== null; }));
      var i0 = items[0]; var iN = items[items.length - 1];
      if (e.shiftKey && document.activeElement === i0) { e.preventDefault(); iN.focus(); }
      else if (!e.shiftKey && (document.activeElement === iN || items.indexOf(document.activeElement) === -1)) { e.preventDefault(); i0.focus(); }
    }
    // Giữ focus trong popup đang mở
    var open = $('.modal.is-open');
    if (e.key === 'Tab' && open) {
      var f = $$('a[href], button:not([disabled]), input:not([type="hidden"]):not(.hp), select, textarea, [tabindex]:not([tabindex="-1"])', open)
        .filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0]; var last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || !open.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || !open.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
    }
  });

  var leadModal = $('#lead-modal');
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open-lead]');
    if (t) {
      e.preventDefault();
      var svc = t.getAttribute('data-service');
      var sel = $('select[name="service"]', leadModal);
      if (sel && svc) sel.value = svc;
      openModal(leadModal);
    }
    if (e.target.closest('[data-open-news]')) { e.preventDefault(); openModal($('#news-modal')); }
  });

  // ---------- Popup nhận tin tự động ----------
  // Không làm phiền: không hiện ở trang bảng giá / liên hệ, không hiện cho người vừa gửi form tư vấn,
  // chỉ hiện sau N giây VÀ khi đã đọc tới nửa trang (hoặc khi định rời trang trên máy tính).
  var WEEK = 7 * 24 * 3600 * 1000;
  var news = $('#news-modal');
  var quietPage = /^\/(bang-gia|lien-he|huy-dang-ky)/.test(location.pathname);
  var recentLead = Date.now() - Number(store.get('trip_lead') || 0) < WEEK;
  if (news && news.dataset.auto === '1' && !store.get('trip_subscribed') && !quietPage && !recentLead) {
    var seen = Number(store.get('trip_news_seen') || 0);
    if (Date.now() - seen > WEEK) {
      var shown = false; var timeUp = false;
      var show = function () {
        if (shown || $('.modal.is-open') || Date.now() - Number(store.get('trip_lead') || 0) < WEEK) return;
        shown = true; openModal(news);
      };
      var scrolledHalf = function () { return (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight > 0.5; };
      setTimeout(function () { timeUp = true; if (scrolledHalf()) show(); }, (Number(news.dataset.delay) || 45) * 1000);
      window.addEventListener('scroll', function () { if (timeUp && scrolledHalf()) show(); }, { passive: true });
      document.addEventListener('mouseout', function (e) { if (timeUp && !e.relatedTarget && e.clientY < 10) show(); });
    }
  }

  // ---------- Gửi form (tư vấn & nhận tin) ----------
  function bindForm(form, onOk) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = $('button[type="submit"]', form); var msg = $('.form-msg', form);
      $$('.field', form).forEach(function (f) { f.classList.remove('has-error'); });
      $$('[data-error]', form).forEach(function (el) { el.textContent = ''; });
      msg.className = 'form-msg'; msg.textContent = '';

      var data = {}; new FormData(form).forEach(function (v, k) { data[k] = v; });
      data.source = location.pathname;

      // Kiểm tra nhanh phía trình duyệt
      var errs = {};
      var nameField = $('[name="name"]', form);
      if (nameField && nameField.required && String(data.name || '').trim().length < 2) errs.name = 'Vui lòng nhập họ tên.';
      var phoneField = $('[name="phone"]', form);
      if (phoneField && (phoneField.required || data.phone) && !/^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(String(data.phone || '').replace(/[\s.\-()]/g, ''))) errs.phone = 'Số điện thoại chưa đúng (VD: 0935 191 394).';
      var svcField = $('[name="service"]', form);
      if (svcField && svcField.required && !data.service) errs.service = 'Vui lòng chọn dịch vụ.';
      if ('email' in data && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(data.email).trim())) errs.email = 'Email chưa đúng định dạng.';
      if (showErrors(form, errs)) return;

      // Bản xem trước tĩnh (GitHub Pages) không có máy chủ để nhận form
      if (document.documentElement.getAttribute('data-preview')) {
        msg.className = 'form-msg is-ok';
        msg.textContent = 'Đây là bản xem trước giao diện nên form chưa gửi đi. Khi website chạy chính thức, thông tin sẽ được gửi tới TRIP. Cần tư vấn ngay, vui lòng gọi hotline.';
        return;
      }

      btn.disabled = true; var label = btn.innerHTML; btn.textContent = 'Đang gửi…';
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            if (onOk) { msg.className = 'form-msg is-ok'; msg.textContent = res.message || 'Đã gửi thành công!'; onOk(); }
            else showThanks(form, res.message, data.service);
          } else if (res.errors) {
            showErrors(form, res.errors);
          } else {
            msg.className = 'form-msg is-err'; msg.textContent = res.error || 'Gửi chưa thành công. Vui lòng thử lại hoặc gọi hotline.';
          }
        })
        .catch(function () { msg.className = 'form-msg is-err'; msg.textContent = 'Mất kết nối. Vui lòng thử lại hoặc gọi hotline.'; })
        .finally(function () { btn.disabled = false; btn.innerHTML = label; });
    });
  }
  // Sau khi gửi form tư vấn: thay form bằng màn hình cảm ơn (tránh gửi trùng) + nút Zalo/Gọi
  function showThanks(form, message, service) {
    store.set('trip_lead', String(Date.now()));
    // Trong popup: ẩn tiêu đề + dòng "Hoặc gọi ngay" để không lặp với màn hình cảm ơn
    var modal = form.closest('.modal');
    var hiddenBits = modal ? $$('.modal__head, .form-note', modal) : [];
    hiddenBits.forEach(function (el) { el.hidden = true; });
    var tpl = $('#lead-thanks');
    var box = document.createElement('div');
    box.className = 'form-done';
    box.setAttribute('role', 'status');
    box.innerHTML = tpl ? tpl.innerHTML : '';
    var p = $('[data-thanks-msg]', box); if (p && message) p.textContent = message;
    // Khách hỏi dịch thuật / hợp pháp hoá: nút gọi trỏ tới hotline dịch thuật
    var call = $('[data-thanks-call]', box);
    if (call && /Dịch thuật|Hợp pháp/i.test(service || '')) {
      call.href = 'tel:' + call.getAttribute('data-phone-trans');
      $('span', call).textContent = call.getAttribute('data-phone-trans-label');
    }
    form.replaceWith(box);
    box.tabIndex = -1; box.focus();
    var again = $('[data-thanks-again]', box);
    if (again) again.addEventListener('click', function () { box.replaceWith(form); hiddenBits.forEach(function (el) { el.hidden = false; }); });
  }
  function showErrors(form, errs) {
    var keys = Object.keys(errs);
    $$('[aria-invalid]', form).forEach(function (i) { i.removeAttribute('aria-invalid'); });
    keys.forEach(function (k) {
      var el = $('[data-error="' + k + '"]', form);
      if (el) {
        el.textContent = errs[k]; el.closest('.field').classList.add('has-error');
        if (!el.id) el.id = (form.id || 'f') + '-' + k + '-err-' + Math.random().toString(36).slice(2, 6);
        $$('[name="' + k + '"]', form).forEach(function (i) { i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', el.id); });
      }
    });
    if (keys.length) { var first = $('[name="' + keys[0] + '"]', form); first && first.focus(); }
    return keys.length > 0;
  }
  $$('.js-lead-form').forEach(function (f) { bindForm(f); });
  $$('.js-review-form').forEach(function (f) { bindForm(f, function () {}); });
  $$('.js-sub-form').forEach(function (f) {
    bindForm(f, function () { store.set('trip_subscribed', '1'); setTimeout(function () { closeModal($('#news-modal')); }, 2500); });
  });

  // ---------- Chấm sao (trang Đánh giá): tô sao 1..n theo lựa chọn ----------
  $$('.star-input').forEach(function (box) {
    var inputs = $$('input', box);
    var paint = function (n) { $$('label', box).forEach(function (l, i) { l.classList.toggle('on', i < n); }); };
    var current = function () { var c = $('input:checked', box); return c ? Number(c.value) : 0; };
    inputs.forEach(function (inp) { inp.addEventListener('change', function () { paint(current()); }); });
    $$('label', box).forEach(function (l, i) {
      l.addEventListener('mouseenter', function () { paint(i + 1); });
      l.addEventListener('mouseleave', function () { paint(current()); });
    });
    paint(current());
  });

  // ---------- Bảng trên điện thoại: gắn nhãn cột để hiển thị dạng thẻ ----------
  $$('.table').forEach(function (t) {
    var heads = $$('thead th', t).map(function (th) { return th.textContent.trim(); });
    $$('tbody tr', t).forEach(function (tr) {
      $$('td', tr).forEach(function (td, i) { if (heads[i]) td.setAttribute('data-label', heads[i]); });
    });
  });

  // ---------- Video ----------
  document.addEventListener('click', function (e) {
    var vm = e.target.closest('[data-video-modal]');
    if (vm) {
      var src = vm.getAttribute('data-video-modal');
      $('#video-modal-frame').innerHTML = vm.getAttribute('data-video-type') === 'file'
        ? '<video src="' + src + '" controls autoplay playsinline></video>'
        : '<iframe src="' + src + '" title="Video giới thiệu TRIP" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
      openModal($('#video-modal'));
    }
  });
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-video-embed]');
    if (!p) return;
    var frame = p.parentElement;
    frame.innerHTML = '<iframe src="' + p.getAttribute('data-video-embed') + '" title="Video giới thiệu TRIP" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
  });
  // Video nền: chỉ phát khi nằm trong màn hình; tôn trọng người dùng muốn giảm chuyển động
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var heroBg = $('.hero__bg');
  if (heroBg && heroBg.dataset.src && !reduce && window.matchMedia('(min-width: 768px)').matches) {
    heroBg.src = heroBg.dataset.src; var hp = heroBg.play(); if (hp && hp.catch) hp.catch(function () {});
    // Tạm dừng khi cuộn khỏi màn hình để đỡ tốn pin/CPU
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var p = heroBg.play(); if (p && p.catch) p.catch(function () {}); } else heroBg.pause(); });
    }).observe(heroBg);
  }
  // Rê chuột vào khung cửa sổ: phát thử đoạn video ngắn trên nền thumbnail
  var porthole = $('.porthole'); var pv = porthole && $('.porthole__teaser', porthole);
  if (porthole && pv && !reduce && window.matchMedia('(hover: hover)').matches) {
    porthole.addEventListener('mouseenter', function () { pv.preload = 'auto'; var p = pv.play(); if (p && p.catch) p.catch(function () {}); porthole.classList.add('is-previewing'); });
    porthole.addEventListener('mouseleave', function () { porthole.classList.remove('is-previewing'); pv.pause(); });
  }
  var lazyVideos = $$('video.js-inview');
  // Điện thoại: chỉ hiện ảnh poster, không tải video thị trường (tiết kiệm dữ liệu di động)
  if (!reduce && lazyVideos.length && 'IntersectionObserver' in window && window.matchMedia('(min-width: 768px)').matches) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    lazyVideos.forEach(function (v) { vio.observe(v); });
  }

  // ---------- Số liệu chạy tăng dần khi cuộn tới ----------
  var counters = $$('.js-count');
  var fmt = function (n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  if (counters.length && 'IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        cio.unobserve(en.target);
        var el = en.target; var to = Number(el.getAttribute('data-to')) || 0; var t0 = null;
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / 1600);
          el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(step);
        };
        el.textContent = '0';
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  // ---------- Hiệu ứng khi cuộn ----------
  var items = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else items.forEach(function (el) { el.classList.add('is-in'); });
})();

// ---------- Bảng giá: tab theo nhóm dịch vụ (không có JS thì hiện tất cả) ----------
(function () {
  var nav = document.querySelector('[data-tabs]');
  if (!nav) return;
  var tabs = Array.prototype.slice.call(nav.querySelectorAll('[role="tab"]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  function show(i, opts) {
    opts = opts || {};
    tabs.forEach(function (t, j) {
      var on = j === i;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (panels[j]) panels[j].hidden = !on;
    });
    if (opts.focus) tabs[i].focus();
    // Chỉ cuộn ngang thanh tab (điện thoại) khi người dùng chọn tab, không làm trang tự nhảy lúc mới tải
    if (opts.focus || opts.push) nav.scrollLeft += tabs[i].getBoundingClientRect().left - nav.getBoundingClientRect().left - 20;
    if (opts.push && history.replaceState) history.replaceState(null, '', '#' + tabs[i].getAttribute('aria-controls'));
    if (opts.scroll) nav.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function fromHash() {
    var id = location.hash.slice(1);
    var i = tabs.findIndex(function (t) { return t.getAttribute('aria-controls') === id; });
    return i;
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      show(i, { push: true });
      // Đang cuộn giữa nội dung tab cũ: đưa về đầu bảng giá mới
      if (panels[i] && panels[i].getBoundingClientRect().top < nav.getBoundingClientRect().bottom) panels[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, j = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') j = (i + 1) % n;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (i - 1 + n) % n;
      else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1;
      if (j !== null) { e.preventDefault(); show(j, { focus: true, push: true }); }
    });
  });
  var start = fromHash();
  show(start < 0 ? 0 : start, { scroll: start >= 0 });
  window.addEventListener('hashchange', function () { var i = fromHash(); if (i >= 0) show(i, { scroll: true }); });
})();

// ---------- Lọc thẻ visa theo châu lục ----------
(function () {
  document.querySelectorAll('[data-filter-group]').forEach(function (group) {
    var scope = group.parentElement;
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-filter]');
      if (!btn) return;
      var f = btn.getAttribute('data-filter');
      group.querySelectorAll('[data-filter]').forEach(function (b) { b.classList.toggle('is-on', b === btn); b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      scope.querySelectorAll('[data-region]').forEach(function (c) { c.hidden = f !== 'all' && c.getAttribute('data-region') !== f; });
    });
  });
})();
