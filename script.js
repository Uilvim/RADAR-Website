(() => {
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // Theme toggle
  $('#theme-toggle').addEventListener('click', () => {
    const dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('radar-theme', next);
  });

  // Mobile menu
  const menuBtn = $('#menu-btn');
  const links = $('#nav-links');
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      links.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Scroll progress + active nav link
  const bar = $('.progress');
  const onScroll = () => {
    const h = root.scrollHeight - innerHeight;
    bar.style.setProperty('--p', h > 0 ? scrollY / h : 0);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const navLinks = $$('.nav-links a');
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + en.target.id));
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => spy.observe(s));

  // Reveal on scroll with light staggering
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el, i) => {
    el.style.setProperty('--delay', `${(i % 4) * 0.08}s`);
    io.observe(el);
  });

  // Cursor-follow glow on service cards
  $$('.service').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  });

  // Next office-hours session (Tuesdays 10-12, 1-3, Rice local time)
  const nextEl = $('#next-session');
  const nextSession = () => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const mins = +parts.hour * 60 + +parts.minute;
    if (day === 2) {
      if (mins >= 600 && mins < 720) return 'Happening now · until 12:00 pm';
      if (mins >= 780 && mins < 900) return 'Happening now · until 3:00 pm';
      if (mins < 600) return 'Next: today at 10:00 am';
      if (mins < 780) return 'Next: today at 1:00 pm';
    }
    return `Next: ${day === 1 ? 'tomorrow' : 'Tuesday'} at 10:00 am`;
  };
  nextEl.textContent = nextSession();

  // Interactive floor plan
  const rooms = {
    '200': {
      kind: 'Open gathering area', title: 'Fondren 200', meta: '1,970 sq ft · bookable',
      desc: 'A large, open space that serves several functions: consultations at one large and two smaller huddle tables with screens, soft seating along the glass wall overlooking the first floor, and a large wall screen for workshops and events. A stock of tables and chairs on wheels can be moved in as needed.',
      tags: ['Huddle tables with screens', 'Soft seating', 'Large event screen', 'Movable furniture', 'Study tables'],
    },
    '201': {
      kind: 'Large conference room', title: 'Fondren 201', meta: 'Hybrid-ready · bookable',
      desc: 'Supports hybrid meetings, hands-on workshops, and gatherings. A large screen on the south wall and smaller screens on either side, plus a 360-degree video conferencing system (like the Owl). Furniture reconfigures for meetings, classes, or lectures.',
      tags: ['Large + side screens', '360° video conferencing', 'Reconfigurable furniture', 'Workshops'],
    },
    '200B': {
      kind: 'Small conference room', title: 'Fondren 200B', meta: 'Up to 6 people · bookable',
      desc: 'A small room for meetings and consultations, keeping the existing monitor, table, and chairs.',
      tags: ['Seats up to 6', 'Monitor', 'Consultations'],
    },
    '200A': { kind: 'Office', title: 'Fondren 200A', meta: 'Library staff', desc: 'Office for a library staff member.', tags: ['Library staff'] },
    '200C': { kind: 'Office', title: 'Fondren 200C', meta: 'Two-person office', desc: 'A two-person office likely to be used by Center for Research Computing staff.', tags: ['CRC staff', 'Two-person'] },
    '200D': { kind: 'Shared office', title: 'Fondren 200D', meta: 'One or two people', desc: 'Office for one or two library staff members or graduate consultants, possibly using a hot-desking strategy.', tags: ['Library staff', 'Graduate consultants', 'Hot-desking'] },
    '200E': { kind: 'Office', title: 'Fondren 200E', meta: 'Library staff', desc: 'Office for a library staff member.', tags: ['Library staff'] },
    '200F': { kind: 'Storage', title: 'Fondren 200F', meta: 'Storage room', desc: 'Storage room with shelving for supplies and event equipment.', tags: ['Shelving'] },
  };
  const detail = $('.room-detail');
  const show = (id) => {
    const r = rooms[id];
    $$('.room').forEach((b) => b.setAttribute('aria-pressed', b.dataset.room === id));
    $('#rd-kind').textContent = r.kind;
    $('#rd-title').textContent = r.title;
    $('#rd-meta').textContent = r.meta;
    $('#rd-desc').textContent = r.desc;
    $('#rd-tags').replaceChildren(...r.tags.map((t) => Object.assign(document.createElement('li'), { textContent: t })));
    detail.classList.remove('swap');
    void detail.offsetWidth;
    detail.classList.add('swap');
  };
  $$('.room').forEach((b) => b.addEventListener('click', () => show(b.dataset.room)));
  show('200');

  // Contact form (front-end only: wire up to your backend or form service)
  const form = $('#contact-form');
  const status = $('#form-status');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    status.textContent = 'Thanks! Your request has been noted. The RADAR team will be in touch.';
    form.reset();
  });
})();
