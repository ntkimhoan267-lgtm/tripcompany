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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $$('.modal.is-open').forEach(closeModal); });

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
  var news = $('#news-modal');
  if (news && news.dataset.auto === '1' && !store.get('trip_subscribed')) {
    var seen = Number(store.get('trip_news_seen') || 0);
    if (Date.now() - seen > 7 * 24 * 3600 * 1000) {
      var shown = false;
      var show = function () {
        if (shown || $('.modal.is-open')) return;
        shown = true; openModal(news);
      };
      setTimeout(show, (Number(news.dataset.delay) || 15) * 1000);
      document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY < 10) show(); });
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
      if ('name' in data && String(data.name).trim().length < 2) errs.name = 'Vui lòng nhập họ tên.';
      if ('phone' in data && !/^(0|\+?84)(3|5|7|8|9)\d{8}$/.test(String(data.phone).replace(/[\s.\-()]/g, ''))) errs.phone = 'Số điện thoại chưa đúng (VD: 0935 191 394).';
      if ('service' in data && !data.service) errs.service = 'Vui lòng chọn dịch vụ.';
      if ('email' in data && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(data.email).trim())) errs.email = 'Email chưa đúng định dạng.';
      if (showErrors(form, errs)) return;

      btn.disabled = true; var label = btn.innerHTML; btn.textContent = 'Đang gửi…';
      fetch(form.getAttribute('action'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (res.ok) {
            msg.className = 'form-msg is-ok'; msg.textContent = res.message || 'Đã gửi thành công!';
            form.reset(); onOk && onOk();
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
  function showErrors(form, errs) {
    var keys = Object.keys(errs);
    keys.forEach(function (k) {
      var el = $('[data-error="' + k + '"]', form);
      if (el) { el.textContent = errs[k]; el.closest('.field').classList.add('has-error'); }
    });
    if (keys.length) { var first = $('[name="' + keys[0] + '"]', form); first && first.focus(); }
    return keys.length > 0;
  }
  $$('.js-lead-form').forEach(function (f) { bindForm(f); });
  $$('.js-sub-form').forEach(function (f) {
    bindForm(f, function () { store.set('trip_subscribed', '1'); setTimeout(function () { closeModal($('#news-modal')); }, 2500); });
  });

  // ---------- Tabs ----------
  $$('[data-tabs]').forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.setAttribute('aria-selected', String(t === tab)); $('#' + t.getAttribute('aria-controls')).hidden = t !== tab; });
      });
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
  if (reduce) $$('.hero__bg, .porthole__teaser').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); });
  // Rê chuột vào khung cửa sổ: phát thử đoạn video ngắn trên nền thumbnail
  var porthole = $('.porthole'); var pv = porthole && $('.porthole__teaser', porthole);
  if (porthole && pv && !reduce && window.matchMedia('(hover: hover)').matches) {
    porthole.addEventListener('mouseenter', function () { pv.preload = 'auto'; var p = pv.play(); if (p && p.catch) p.catch(function () {}); porthole.classList.add('is-previewing'); });
    porthole.addEventListener('mouseleave', function () { porthole.classList.remove('is-previewing'); pv.pause(); });
  }
  var lazyVideos = $$('video.js-inview');
  if (!reduce && lazyVideos.length && 'IntersectionObserver' in window) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var v = en.target;
        if (en.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: 0.25 });
    lazyVideos.forEach(function (v) { vio.observe(v); });
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
