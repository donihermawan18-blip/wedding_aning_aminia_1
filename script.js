/* ==================================================================
   WEDDING INVITATION — Aning & Aminia
   script.js
   ==================================================================
   FITUR:
   01. Guest name dari URL (?to=Nama)
   02. Buka undangan + mulai musik
   03. Countdown real-time
   04. Reveal on scroll (IntersectionObserver)
   05. Lightbox gallery
   06. Copy rekening / alamat
   07. RSVP form + daftar ucapan
   08. Musik ambient fallback (Web Audio API)
   09. Floating petals
   10. Music button play/pause
   11. Floating nav active state
   12. Scroll progress bar
   13. Toast notification
   ================================================================== */

(function () {
  'use strict';

  /* ================================================================
     KONFIGURASI — GANTI DI SINI
     ================================================================ */
  const CONFIG = {
    // Tanggal & jam pernikahan (format: YYYY, MM-1, DD, HH, MM, SS)
    // Ingat: bulan di JavaScript dimulai dari 0 (Januari = 0)
    // Contoh: 20 Desember 2026, pukul 08.00 WIB
    weddingDate: new Date(2026, 9, 9, 8, 0, 0),

    // Path file musik (relatif terhadap index.html)
    musicSrc: 'wedding-song.mp3',

    // Daftar ucapan awal (akan tampil sebelum ada RSVP baru)
    defaultWishes: [
      {
        name: 'Doni Hermawan',
        status: 'hadir',
        message: 'Barakallahu lakuma wa baraka alaikuma wa jama\'a bainakuma fii khairin. Semoga menjadi keluarga sakinah, mawaddah, warahmah.',
      },
      {
        name: 'BRAM',
        status: 'hadir',
        guests: 2,
        message: 'Selamat menempuh hidup baru Bro',
      },
      {
        name: 'Hilmi',
        status: 'hadir',
        message: 'Selamat Bro semoga sakinah selalu doa terbaik',
      },
    ]
  };

  /* ================================================================
     HELPER
     ================================================================ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  /* ================================================================
     01. GUEST NAME DARI URL (?to=Nama%20Tamu)
     ================================================================ */
  function setGuestName() {
    const el = $('#guestName');
    if (!el) return;

    const params = new URLSearchParams(window.location.search);
    const to = params.get('to') || params.get('kepada') || params.get('nama');

    if (to && to.trim()) {
      el.textContent = decodeURIComponent(to).replace(/\+/g, ' ').trim();
    }
    // Jika tidak ada parameter, biarkan default "Tamu Undangan"
  }

  /* ================================================================
     02. BUKA UNDANGAN + MULAI MUSIK
     ================================================================ */
  const cover   = $('#cover');
  const site    = $('#site');
  const openBtn = $('#openBtn');
  const musicBtn = $('#musicBtn');

  function openInvitation() {
    if (!cover || !site) return;

    // Sembunyikan cover
    cover.classList.add('is-hidden');

    // Tampilkan site
    site.classList.add('is-open');

    // Buka kunci scroll
    document.body.classList.remove('is-locked');

    // Tampilkan tombol musik
    if (musicBtn) musicBtn.classList.add('is-visible');

    // Mulai musik
    startMusic();

    // Refresh posisi scroll ke atas
    window.scrollTo({ top: 0, behavior: 'auto' });

    // Trigger reveal untuk elemen yang sudah kelihatan
    setTimeout(triggerRevealNow, 400);

    // Hapus cover dari DOM setelah animasi selesai (opsional, hemat memori)
    setTimeout(() => {
      cover.style.display = 'none';
    }, 1100);
  }

  if (openBtn) {
    openBtn.addEventListener('click', openInvitation);
  }

  /* ================================================================
     03. COUNTDOWN REAL-TIME
     ================================================================ */
  const cdDays    = $('#cdDays');
  const cdHours   = $('#cdHours');
  const cdMinutes = $('#cdMinutes');
  const cdSeconds = $('#cdSeconds');

  function updateCountdown() {
    if (!cdDays) return;

    const now  = new Date().getTime();
    const diff = CONFIG.weddingDate.getTime() - now;

    if (diff <= 0) {
      cdDays.textContent    = '00';
      cdHours.textContent   = '00';
      cdMinutes.textContent = '00';
      cdSeconds.textContent = '00';
      return;
    }

    const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    cdDays.textContent    = pad(days);
    cdHours.textContent   = pad(hours);
    cdMinutes.textContent = pad(minutes);
    cdSeconds.textContent = pad(seconds);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  /* ================================================================
     04. REVEAL ON SCROLL (IntersectionObserver)
     ================================================================ */
  let revealObserver = null;

  function initReveal() {
    const items = $$('.reveal');
    if (!items.length) return;

    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -60px 0px'
      });

      items.forEach((el) => revealObserver.observe(el));
    } else {
      // Fallback: munculkan semua
      items.forEach((el) => el.classList.add('is-visible'));
    }
  }

  // Trigger manual saat undangan dibuka
  function triggerRevealNow() {
    $$('.reveal').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        el.classList.add('is-visible');
        if (revealObserver) revealObserver.unobserve(el);
      }
    });
  }

  initReveal();

  /* ================================================================
     05. LIGHTBOX GALLERY
     ================================================================ */
  const lightbox      = $('#lightbox');
  const lightboxImg   = $('#lightboxImg');
  const lightboxClose = $('#lightboxClose');
  const lightboxPrev  = $('#lightboxPrev');
  const lightboxNext  = $('#lightboxNext');
  const galleryItems  = $$('.gallery__item');

  let currentIndex = 0;

  function openLightbox(index) {
    if (!lightbox || !lightboxImg) return;
    const item = galleryItems[index];
    if (!item) return;

    const fullSrc = item.getAttribute('data-full') ||
                    $('img', item)?.src || '';

    lightboxImg.src = fullSrc;
    lightboxImg.alt = $('img', item)?.alt || 'Foto';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    currentIndex = index;
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function showPrev() {
    if (!galleryItems.length) return;
    currentIndex = (currentIndex - 1 + galleryItems.length) % galleryItems.length;
    openLightbox(currentIndex);
  }

  function showNext() {
    if (!galleryItems.length) return;
    currentIndex = (currentIndex + 1) % galleryItems.length;
    openLightbox(currentIndex);
  }

  galleryItems.forEach((item, i) => {
    item.addEventListener('click', () => openLightbox(i));
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(i);
      }
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev)  lightboxPrev.addEventListener('click', showPrev);
  if (lightboxNext)  lightboxNext.addEventListener('click', showNext);

  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      // Klik di area backdrop (bukan gambar & bukan tombol)
      if (e.target === lightbox) closeLightbox();
    });
  }

  // Navigasi keyboard
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   showPrev();
    if (e.key === 'ArrowRight')  showNext();
  });

  /* ================================================================
     06. COPY REKENING / ALAMAT
     ================================================================ */
  const toast      = $('#toast');
  const toastText  = $('#toastText');
  let toastTimer   = null;

  function showToast(message) {
    if (!toast || !toastText) return;
    toastText.textContent = message || 'Berhasil disalin!';
    toast.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('is-show');
    }, 2400);
  }

  async function copyToClipboard(text) {
    // Coba pakai Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        // fall through ke fallback
      }
    }

    // Fallback: textarea + execCommand
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (err) {
      return false;
    }
  }

  $$('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.getAttribute('data-copy') || '';
      if (!text) return;
      const ok = await copyToClipboard(text);
      showToast(ok ? 'Berhasil disalin!' : 'Gagal menyalin, silakan salin manual.');
    });
  });

  /* ================================================================
     07. RSVP FORM + DAFTAR UCAPAN
     ================================================================ */
  const rsvpForm   = $('#rsvpForm');
  const wishesList = $('#wishesList');

  // Map status ke label & class badge
  const STATUS_MAP = {
    hadir: { label: 'Hadir',       cls: 'wish__badge--hadir' },
    tidak: { label: 'Tidak Hadir', cls: 'wish__badge--tidak' },
    ragu:  { label: 'Masih Ragu',  cls: 'wish__badge--ragu'  }
  };

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getInitials(name) {
    const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function buildWishElement(wish) {
    const status = STATUS_MAP[wish.status] || STATUS_MAP.hadir;
    const el = document.createElement('div');
    el.className = 'wish';

    el.innerHTML = `
      <div class="wish__avatar">${escapeHTML(getInitials(wish.name))}</div>
      <div class="wish__body">
        <div class="wish__top">
          <span class="wish__name">${escapeHTML(wish.name)}</span>
          <span class="wish__badge ${status.cls}">${status.label}</span>
        </div>
        <p class="wish__text">${escapeHTML(wish.message || '—')}</p>
        <p class="wish__meta">
          ${wish.guests ? wish.guests + ' orang · ' : ''}${escapeHTML(wish.time || 'Baru saja')}
        </p>
      </div>
    `;
    return el;
  }

  function renderWishes(list) {
    if (!wishesList) return;
    wishesList.innerHTML = '';
    list.forEach((w) => wishesList.appendChild(buildWishElement(w)));
  }

  // Render ucapan default
  const wishesData = [...CONFIG.defaultWishes];
  renderWishes(wishesData);

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name    = ($('#rsvpName')?.value || '').trim();
      const status  = $('#rsvpStatus')?.value || 'hadir';
      const guests  = parseInt($('#rsvpGuests')?.value || '1', 10) || 1;
      const message = ($('#rsvpMessage')?.value || '').trim();

      // Validasi sederhana
      if (!name) {
        showToast('Mohon isi nama Anda.');
        $('#rsvpName')?.focus();
        return;
      }

      const newWish = {
        name,
        status,
        guests: status === 'hadir' ? guests : 0,
        message: message || 'Terima kasih atas undangannya.',
        time: 'Baru saja'
      };

      // Tambah ke atas daftar
      wishesData.unshift(newWish);
      renderWishes(wishesData);

      // Reset form
      rsvpForm.reset();
      $('#rsvpGuests').value = 1;

      showToast('Terima kasih! Konfirmasi Anda terkirim.');

      // Scroll ke daftar ucapan
      const wishesSection = $('#wishes');
      if (wishesSection) {
        wishesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ================================================================
     08. MUSIK — play/pause + fallback Web Audio API
     ================================================================ */
  const bgm      = $('#bgm');
  const musicIcon = $('#musicIcon');

  let isPlaying   = false;
  let audioCtx    = null;
  let ambientNode = null;
  let ambientGain = null;
  let useFallback = false;

  function setMusicIcon(playing) {
    if (!musicIcon) return;
    musicIcon.className = playing ? 'fa-solid fa-pause' : 'fa-solid fa-music';
    if (musicBtn) musicBtn.classList.toggle('is-playing', playing);
  }

  // Fallback: alunan ambient lembut pakai Web Audio API
  function startAmbient() {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      // Kalau sudah ada ambient, cukup naikkan gain
      if (ambientNode) {
        ambientGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 0.4);
        return;
      }

      // Buat pad chord sederhana (C mayor + nada tinggi lembut)
      ambientGain = audioCtx.createGain();
      ambientGain.gain.value = 0;
      ambientGain.connect(audioCtx.destination);

      const freqs = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

      ambientNode = audioCtx.createGain();
      ambientNode.gain.value = 0.25;
      ambientNode.connect(ambientGain);

      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;

        // LFO pelan untuk vibrato lembut
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.12 + i * 0.03;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 1.2;
        lfo.connect(lfoGain).connect(osc.frequency);

        const oscGain = audioCtx.createGain();
        oscGain.gain.value = 0.18 / freqs.length;

        osc.connect(oscGain).connect(ambientNode);
        osc.start();
        lfo.start();
      });

      // Fade in perlahan
      ambientGain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 1.2);
    } catch (err) {
      // Browser tidak mendukung, diam saja
    }
  }

  function stopAmbient() {
    if (!ambientGain || !audioCtx) return;
    try {
      ambientGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.3);
    } catch (e) {}
  }

  function startMusic() {
    if (!bgm) {
      // Tidak ada elemen audio, langsung pakai fallback
      useFallback = true;
      startAmbient();
      isPlaying = true;
      setMusicIcon(true);
      return;
    }

    bgm.volume = 0.55;

    const playPromise = bgm.play();

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          isPlaying = true;
          setMusicIcon(true);
        })
        .catch(() => {
          // File musik tidak ada / diblokir → fallback ambient
          useFallback = true;
          startAmbient();
          isPlaying = true;
          setMusicIcon(true);
        });
    } else {
      isPlaying = true;
      setMusicIcon(true);
    }
  }

  function toggleMusic() {
    if (useFallback) {
      if (isPlaying) {
        stopAmbient();
        isPlaying = false;
        setMusicIcon(false);
      } else {
        startAmbient();
        isPlaying = true;
        setMusicIcon(true);
      }
      return;
    }

    if (!bgm) return;

    if (bgm.paused) {
      bgm.play().then(() => {
        isPlaying = true;
        setMusicIcon(true);
      }).catch(() => {
        // Kalau gagal → coba fallback
        useFallback = true;
        startAmbient();
        isPlaying = true;
        setMusicIcon(true);
      });
    } else {
      bgm.pause();
      isPlaying = false;
      setMusicIcon(false);
    }
  }

  if (musicBtn) {
    musicBtn.addEventListener('click', toggleMusic);
  }

  // Deteksi jika file musik gagal dimuat
  if (bgm) {
    bgm.addEventListener('error', () => {
      useFallback = true;
      if (isPlaying) {
        // sudah dipanggil startMusic, tapi file gagal → ganti ke fallback
        startAmbient();
      }
    });
  }

  /* ================================================================
     09. FLOATING PETALS
     ================================================================ */
  function createPetals() {
    const container = $('#petals');
    if (!container) return;

    const isMobile = window.matchMedia('(max-width: 720px)').matches;
    const count = isMobile ? 10 : 18;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      petal.className = 'petal';

      const size = 8 + Math.random() * 12;
      const left = Math.random() * 100;
      const duration = 12 + Math.random() * 14;
      const delay = Math.random() * 14;
      const drift = (Math.random() - 0.5) * 160;
      const opacity = 0.35 + Math.random() * 0.4;

      petal.style.width  = size + 'px';
      petal.style.height = size + 'px';
      petal.style.left   = left + '%';
      petal.style.setProperty('--drift', drift + 'px');
      petal.style.animationDuration = duration + 's';
      petal.style.animationDelay = (-delay) + 's';
      petal.style.opacity = opacity;

      container.appendChild(petal);
    }
  }

  createPetals();

  /* ================================================================
     10. FLOATING NAV — active state
     ================================================================ */
  const floatLinks = $$('.floatnav__link');
  const sections   = floatLinks
    .map((link) => {
      const id = link.getAttribute('href');
      return id ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  function updateActiveNav() {
    if (!sections.length) return;
    const scrollY = window.scrollY + window.innerHeight * 0.35;

    let activeIndex = 0;
    sections.forEach((sec, i) => {
      if (sec.offsetTop <= scrollY) activeIndex = i;
    });

    floatLinks.forEach((link, i) => {
      link.classList.toggle('is-active', i === activeIndex);
    });
  }

  /* ================================================================
     11. SCROLL PROGRESS BAR
     ================================================================ */
  const progress = $('#progress');

  function updateProgress() {
    if (!progress) return;
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
    progress.style.width = pct + '%';
  }

  /* ================================================================
     12. SCROLL LISTENER (throttled via rAF)
     ================================================================ */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      updateActiveNav();
      updateProgress();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    updateActiveNav();
    updateProgress();
  });

  // Initial state
  updateActiveNav();
  updateProgress();

  /* ================================================================
     13. SMOOTH SCROLL untuk anchor internal (fallback)
     ================================================================ */
  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ================================================================
     14. PAUSE MUSIK SAAT TAB TIDAK AKTIF (opsional, hemat resource)
     ================================================================ */
  // (Dikomentari agar musik tetap mengalun saat tab tidak aktif)
  // document.addEventListener('visibilitychange', () => {
  //   if (document.hidden && bgm && !bgm.paused) {
  //     bgm.pause();
  //   }
  // });

})();