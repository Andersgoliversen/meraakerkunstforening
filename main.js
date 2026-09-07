'use strict';

// Deferred script: every feature is independent and optional on a page.
const menuButton = document.querySelector('.mobile-menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuButton && mobileMenu) {
  const desktop = window.matchMedia('(min-width: 1024px)');
  const setMenuOpen = open => {
    mobileMenu.hidden = !open;
    // Also support an older cached page during a staged upload.
    mobileMenu.classList.remove('hidden');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Lukk meny' : 'Åpne meny');
  };
  menuButton.addEventListener('click', () => setMenuOpen(mobileMenu.hidden));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !mobileMenu.hidden && !desktop.matches) {
      setMenuOpen(false);
      menuButton.focus();
    }
  });
  mobileMenu.addEventListener('click', event => {
    if (event.target.closest('a')) setMenuOpen(false);
  });
  desktop.addEventListener('change', () => setMenuOpen(false));
  setMenuOpen(false);
  menuButton.hidden = false;
}

const year = document.getElementById('currentYear');
if (year) year.textContent = new Date().getFullYear();

const logo = document.getElementById('navLogo');
if (logo) {
  const link = logo.closest('a');
  const defaultSrc = logo.dataset.defaultSrc || logo.getAttribute('src');
  const hoverSrc = logo.dataset.hoverSrc || 'images/MeraakerLogoGreen.png';
  const updateLogo = () => {
    const active = link.matches(':hover, :focus-visible');
    logo.src = active ? hoverSrc : defaultSrc;
  };
  link.addEventListener('mouseenter', updateLogo);
  link.addEventListener('mouseleave', updateLogo);
  link.addEventListener('focus', updateLogo);
  link.addEventListener('blur', updateLogo);
}

// Facebook renders to a URL-specified width; CSS alone would crop its contents.
document.querySelectorAll('[data-facebook-embed]').forEach(frame => {
  let timer;
  const resize = () => {
    const width = Math.max(180, Math.min(500, Math.floor(frame.clientWidth)));
    const url = new URL(frame.src);
    if (url.searchParams.get('width') !== String(width)) {
      url.searchParams.set('width', width);
      frame.src = url.href;
    }
  };
  resize();
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(resize, 150);
    }).observe(frame);
  } else {
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(resize, 150);
    });
  }
});

const galleryDialog = document.getElementById('gallery-dialog');
if (galleryDialog && typeof galleryDialog.showModal === 'function') {
  const links = [...document.querySelectorAll('[data-lightbox="gallery"]')];
  const image = galleryDialog.querySelector('img');
  const caption = galleryDialog.querySelector('#gallery-caption');
  const count = galleryDialog.querySelector('#gallery-count');
  const original = galleryDialog.querySelector('.gallery-original');
  const status = galleryDialog.querySelector('.gallery-status');
  const close = galleryDialog.querySelector('.gallery-close');
  let index = 0;
  let opener;
  const showImage = next => {
    index = (next + links.length) % links.length;
    const link = links[index];
    caption.textContent = link.dataset.title || link.querySelector('img').alt;
    count.textContent = `Bilde ${index + 1} av ${links.length}`;
    original.href = link.href;
    image.alt = link.querySelector('img').alt;
    status.textContent = 'Laster bilde …';
    image.hidden = true;
    image.src = link.href;
  };
  image.addEventListener('load', () => { image.hidden = false; status.textContent = ''; });
  image.addEventListener('error', () => { status.textContent = 'Bildet kunne ikke lastes. Prøv lenken til originalbildet.'; });
  links.forEach((link, item) => link.addEventListener('click', event => {
    // Preserve opening originals in a new tab/window with modifier keys.
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    showImage(item);
    galleryDialog.showModal();
    document.body.classList.add('gallery-open');
    close.focus();
  }));
  close.addEventListener('click', () => galleryDialog.close());
  galleryDialog.querySelector('.gallery-prev').addEventListener('click', () => showImage(index - 1));
  galleryDialog.querySelector('.gallery-next').addEventListener('click', () => showImage(index + 1));
  galleryDialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const controls = [...galleryDialog.querySelectorAll('button:not([disabled]), a[href]')];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showImage(index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  // Native modal dialogs make the background inert and implement Escape dismissal.
  galleryDialog.addEventListener('click', event => {
    const bounds = galleryDialog.getBoundingClientRect();
    if (event.target === galleryDialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) galleryDialog.close();
  });
  galleryDialog.addEventListener('close', () => {
    document.body.classList.remove('gallery-open');
    opener?.focus({ preventScroll: true });
  });
}
