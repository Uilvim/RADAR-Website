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

  // Mobile menu + grouped dropdowns
  const menuBtn = $('#menu-btn');
  const links = $('#nav-links');
  const groups = $$('.nav-item.has-menu');
  const desktop = matchMedia('(min-width: 1081px)');
  const setGroup = (g, open, by = 'click') => {
    g.classList.toggle('open', open);
    g.dataset.by = open ? by : '';
    $('.nav-trigger', g).setAttribute('aria-expanded', open);
  };
  const closeGroups = (except) => groups.forEach((g) => g !== except && setGroup(g, false));
  const closeMenu = () => {
    links.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  };
  menuBtn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    if (!open) closeGroups();
  });
  groups.forEach((g) => {
    $('.nav-trigger', g).addEventListener('click', () => {
      // A click right after a hover-open keeps the menu open instead of flicking it shut.
      const keep = g.classList.contains('open') && g.dataset.by === 'hover';
      closeGroups(g);
      setGroup(g, keep || !g.classList.contains('open'));
    });
    g.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse' && desktop.matches) { closeGroups(g); setGroup(g, true, 'hover'); }
    });
    g.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse' && desktop.matches && g.dataset.by === 'hover') setGroup(g, false);
    });
    g.addEventListener('focusout', (e) => {
      if (!g.contains(e.relatedTarget)) setGroup(g, false);
    });
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      closeGroups();
      closeMenu();
    }
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item.has-menu')) closeGroups();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = groups.find((g) => g.classList.contains('open'));
    if (open) {
      setGroup(open, false);
      $('.nav-trigger', open).focus();
    } else if (links.classList.contains('open')) {
      closeMenu();
      menuBtn.focus();
    }
  });
  desktop.addEventListener('change', () => { closeGroups(); closeMenu(); });

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
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => {
        const here = a.getAttribute('href') === '#' + en.target.id;
        a.classList.toggle('active', here);
        if (here) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      groups.forEach((g) => g.classList.toggle('active', !!$('a.active', g)));
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

  // AI resource catalog + points of contact (data from data/radar-data.js)
  const data = window.RADAR_DATA;
  if (data) {
    const h = (tag, props, ...kids) => {
      const el = Object.assign(document.createElement(tag), props);
      el.append(...kids.filter((k) => k != null && k !== false));
      return el;
    };
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const STATUS_LABEL = { 'Not Available (opportunity)': 'Not yet available' };
    const statusLabel = (s) => STATUS_LABEL[s] || s;
    const people = new Map(data.people.map((p) => [p.name, p]));
    const allAudiences = [...new Set(data.resources.flatMap((r) => r.audience))];

    const nameLink = (name) => {
      const p = people.get(name);
      return p ? h('a', { href: `mailto:${p.email}`, textContent: name }) : name;
    };
    const nameList = (names) => names.flatMap((n, i) => (i ? [', ', nameLink(n)] : [nameLink(n)]));
    const extLink = (href, label) => h('a', { className: 'rb-ext', href, target: '_blank', rel: 'noopener noreferrer', textContent: label });
    const audienceText = (a) => (a.length === allAudiences.length ? 'Everyone at Rice' : a.join(', '));

    const serviceItem = (s) => {
      const contacts = [['Primary', s.primary], ['Secondary', s.secondary], ['Other', s.other]].filter(([, n]) => n.length);
      return h('li', { className: 'rb-service' },
        h('div', { className: 'rb-service-head' },
          h('strong', { textContent: s.type }),
          h('span', { className: `rb-badge rb-badge-${slug(s.status)}`, textContent: statusLabel(s.status) })),
        s.description && h('p', { textContent: s.description }),
        contacts.length > 0 && h('p', { className: 'rb-meta' },
          ...contacts.flatMap(([label, n], i) => [i ? ' · ' : '', `${label}: `, ...nameList(n)])),
        s.workshops.length > 0 && h('ul', { className: 'rb-workshops', 'aria-label': 'Workshops' },
          ...s.workshops.map((w) => h('li', { textContent: w }))));
    };

    const resourceCard = (r) => {
      const types = [...new Set(r.services.map((s) => s.type))];
      return h('article', { className: 'rb-res' },
        h('div', { className: 'rb-res-top' },
          h('span', { className: 'rb-tag', textContent: r.type }),
          h('span', { className: `rb-badge rb-badge-${slug(r.availability)}`, textContent: r.availability })),
        h('h3', { textContent: r.name }),
        h('p', { className: 'rb-meta' }, h('strong', { textContent: 'For: ' }), audienceText(r.audience)),
        types.length > 0 && h('ul', { className: 'rb-chips', 'aria-label': 'What we offer' },
          ...types.map((t) => h('li', { textContent: t }))),
        r.contacts.length > 0 && h('p', { className: 'rb-meta' }, h('strong', { textContent: 'Contact: ' }), ...nameList(r.contacts)),
        (r.url || r.docs) && h('p', { className: 'rb-res-links' },
          r.url && extLink(r.url, 'Access'), r.docs && extLink(r.docs, 'Documentation')),
        r.services.length > 0 && h('details', { className: 'rb-more' },
          h('summary', { textContent: `Services & workshops (${r.services.length})` }),
          h('ul', { className: 'rb-services' }, ...r.services.map(serviceItem))));
    };

    const searchText = (r) => [
      r.name, r.type, r.availability, ...r.contacts,
      ...r.services.flatMap((s) => [s.type, s.description, ...s.workshops]),
    ].join(' ').toLowerCase();
    const index = data.resources.map((r) => ({ r, text: searchText(r), card: resourceCard(r) }));

    const list = $('#res-list');
    const qEl = $('#res-q');
    const fType = $('#res-type');
    const fAvail = $('#res-avail');
    const fAud = $('#res-aud');
    const fill = (select, values) => values.forEach((v) => select.append(h('option', { value: v, textContent: v })));
    const AVAIL_ORDER = ['Available', 'Limited', 'By Request'];
    fill(fType, [...new Set(data.resources.map((r) => r.type))]);
    fill(fAvail, [...new Set(data.resources.map((r) => r.availability))].sort((a, b) => AVAIL_ORDER.indexOf(a) - AVAIL_ORDER.indexOf(b)));
    fill(fAud, allAudiences);

    const apply = () => {
      const q = qEl.value.trim().toLowerCase();
      const hits = index.filter(({ r, text }) =>
        (!fType.value || r.type === fType.value) &&
        (!fAvail.value || r.availability === fAvail.value) &&
        (!fAud.value || r.audience.includes(fAud.value)) &&
        (!q || q.split(/\s+/).every((w) => text.includes(w))));
      list.replaceChildren(...hits.map((x) => x.card));
      if (!hits.length) list.append(h('p', { className: 'rb-empty', textContent: 'No resources match your filters.' }));
      $('#res-count').textContent = `Showing ${hits.length} of ${index.length} resources`;
    };
    [qEl, fType, fAvail, fAud].forEach((el) => el.addEventListener('input', apply));
    apply();

    // Only published workshops are listed; "Not offered" entries are ideas still in the backlog.
    const fmtDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
    const STATUS_RANK = { 'Planned offering': 0, Offered: 1 };
    const shown = (data.workshops || []).filter((w) => w.status in STATUS_RANK)
      .sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.lastOffered.localeCompare(a.lastOffered));
    $('#wk-list').replaceChildren(...shown.map((w) => h('li', { className: 'rb-wk' },
      h('div', { className: 'rb-res-top' },
        h('span', { className: 'rb-tag', textContent: w.status === 'Offered' ? 'Past workshop' : 'Coming soon' }),
        h('span', { className: `rb-badge rb-badge-${slug(w.status)}`, textContent: w.status === 'Offered' ? 'Offered' : 'Planned' })),
      h('h3', { textContent: w.name }),
      w.lastOffered && h('p', { className: 'rb-meta' }, h('strong', { textContent: 'Last offered: ' }), h('time', { dateTime: w.lastOffered, textContent: fmtDate(w.lastOffered) })),
      w.owners.length > 0 && h('p', { className: 'rb-meta' }, h('strong', { textContent: 'Led by: ' }), ...nameList(w.owners)),
      w.resources.length > 0 && h('ul', { className: 'rb-chips', 'aria-label': 'Related AI resources' }, ...w.resources.map((t) => h('li', { textContent: t }))),
      w.materials && h('p', { className: 'rb-res-links' }, extLink(w.materials, 'View materials')))));

    $('#people-list').replaceChildren(...data.people.map((p) => h('li', { className: 'rb-person' },
      h('h3', { textContent: p.name }),
      h('p', { className: 'rb-meta' }, `${p.title} · ${p.department}`),
      h('p', {}, h('a', { className: 'rb-ext', href: `mailto:${p.email}`, textContent: p.email })),
      p.expertise.length > 0 && h('ul', { className: 'rb-chips', 'aria-label': 'AI expertise' }, ...p.expertise.map((t) => h('li', { textContent: t }))),
      p.workshops.length > 0 && h('details', { className: 'rb-more' },
        h('summary', { textContent: `Workshops offered (${p.workshops.length})` }),
        h('ul', { className: 'rb-workshops' }, ...p.workshops.map((w) => h('li', { textContent: w })))))));
  }

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
