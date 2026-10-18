(() => {
	const D = window.TIMELINE;
	const $ = (s, c = document) => c.querySelector(s);
	const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
	const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const finePointer = matchMedia('(pointer: fine)').matches;
	const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';
	const animate = hasGsap && !reduce;
	if (hasGsap) gsap.registerPlugin(ScrollTrigger);

	const pad = n => String(n).padStart(2, '0');
	const hexToRgb = h => ({
		r: parseInt(h.slice(1, 3), 16),
		g: parseInt(h.slice(3, 5), 16),
		b: parseInt(h.slice(5, 7), 16)
	});
	const splitWords = text =>
		text.split(' ').map(w => '<span class="word"><span>' + w + '</span></span>').join(' ');

	/* ============================================================
	   1. Construcción del DOM a partir de los datos
	   ============================================================ */
	const journey = $('#journey');
	const flat = [];          // todos los hitos en orden
	const eraEls = [];        // { section, head, list }

	D.eras.forEach((era, ei) => {
		const section = document.createElement('section');
		section.className = 'era';
		section.id = 'etapa-' + (ei + 1);

		const first = era.events[0].year;
		const last = era.events[era.events.length - 1].year;

		const head = document.createElement('header');
		head.className = 'era-head';
		head.innerHTML =
			'<span class="era-num">' + pad(ei + 1) + '</span>' +
			'<h2 class="era-title">' + splitWords(era.title) + '</h2>' +
			'<p class="era-span">' + first + ' – ' + last + '</p>';

		const list = document.createElement('ol');
		list.className = 'ev-list';
		list.innerHTML = '<span class="fill"></span>';

		era.events.forEach(ev => {
			const idx = flat.length;
			flat.push({ ...ev, era: ei });
			const li = document.createElement('li');
			li.className = 'ev' + (idx % 2 ? ' right' : '');
			li.dataset.cats = ev.cats.join(' ');
			li.dataset.index = idx;
			const chips = ev.cats.map(c => '<span class="chip ' + c + '">' + D.cats[c] + '</span>').join('');
			li.innerHTML =
				'<article class="card">' +
				'<span class="year' + (ev.year.length > 14 ? ' long' : '') + '">' + ev.year + '</span>' +
				'<h3>' + ev.title + '</h3>' +
				'<p>' + ev.text + '</p>' +
				'<div class="meta"><span class="num">Hito ' + (idx + 1) + '</span>' + chips + '</div>' +
				'</article>';
			list.appendChild(li);
		});

		section.append(head, list);
		journey.appendChild(section);
		eraEls.push({ section, head, list });
	});

	const evEls = $$('.ev');
	$('#hudTotal').textContent = flat.length;

	/* ---------- Filtros (resaltado) ---------- */
	const filtersEl = $('#filters');
	let activeFilter = 'all';

	function renderFilters() {
		const opts = [['all', 'Todos', flat.length]].concat(
			Object.keys(D.cats).map(k => [k, D.cats[k], flat.filter(e => e.cats.includes(k)).length])
		);
		filtersEl.innerHTML = '';
		opts.forEach(([key, label, count]) => {
			const b = document.createElement('button');
			b.type = 'button';
			b.setAttribute('aria-pressed', key === activeFilter);
			b.innerHTML = (key === 'all' ? '' : '<span class="dot" style="background:var(--' + key + ')"></span>') +
				label + ' (' + count + ')';
			b.addEventListener('click', () => {
				activeFilter = key;
				document.body.classList.toggle('filtering', key !== 'all');
				evEls.forEach(el => el.classList.toggle('match', key === 'all' || el.dataset.cats.split(' ').includes(key)));
				renderFilters();
			});
			filtersEl.appendChild(b);
		});
	}
	renderFilters();

	/* ---------- Navegación por etapas ---------- */
	const eraNav = $('#eraNav');
	D.eras.forEach((era, i) => {
		const b = document.createElement('button');
		b.type = 'button';
		b.setAttribute('aria-label', 'Ir a la etapa ' + (i + 1) + ': ' + era.title);
		b.innerHTML = '<span class="tip">' + era.title + '</span>' + pad(i + 1);
		b.addEventListener('click', () =>
			eraEls[i].head.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' }));
		eraNav.appendChild(b);
	});
	const eraBtns = $$('button', eraNav);

	$('#toTop').addEventListener('click', () =>
		window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

	/* ============================================================
	   2. Red de fondo (canvas): crece con el progreso del scroll
	   ============================================================ */
	const state = {
		target: 0,
		p: 0,
		rgb: hexToRgb(D.hero.accent),
		mx: -9999,
		my: -9999
	};

	const cv = $('#net');
	const ctx = cv.getContext('2d');
	let W = 0, H = 0;
	const MAX = innerWidth < 700 ? 55 : 130;
	const LINK = innerWidth < 700 ? 110 : 150;
	const nodes = Array.from({ length: MAX }, () => ({
		x: Math.random() * innerWidth,
		y: Math.random() * innerHeight,
		vx: (Math.random() - 0.5) * 0.28,
		vy: (Math.random() - 0.5) * 0.28,
		r: 1.3 + Math.random() * 1.8,
		order: Math.random(),
		a: 0
	}));

	function resize() {
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		W = innerWidth;
		H = innerHeight;
		cv.width = W * dpr;
		cv.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		if (reduce) draw(false);
	}

	function draw(step = true) {
		state.p += (state.target - state.p) * 0.06;
		const frac = 0.06 + 0.94 * state.p;
		const { r, g, b } = state.rgb;
		const col = a => 'rgba(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ',' + a + ')';
		ctx.clearRect(0, 0, W, H);

		for (const n of nodes) {
			const on = n.order < frac ? 1 : 0;
			n.a += (on - n.a) * (step ? 0.04 : 1);
			if (step) {
				n.x += n.vx;
				n.y += n.vy;
				if (n.x < -20) n.x = W + 20;
				if (n.x > W + 20) n.x = -20;
				if (n.y < -20) n.y = H + 20;
				if (n.y > H + 20) n.y = -20;
			}
		}

		for (let i = 0; i < nodes.length; i++) {
			const a = nodes[i];
			if (a.a < 0.03) continue;
			for (let j = i + 1; j < nodes.length; j++) {
				const c = nodes[j];
				if (c.a < 0.03) continue;
				const dx = a.x - c.x, dy = a.y - c.y;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < LINK) {
					ctx.strokeStyle = col((1 - d / LINK) * Math.min(a.a, c.a) * 0.45);
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(c.x, c.y);
					ctx.stroke();
				}
			}
			// enlace con el puntero
			const px = a.x - state.mx, py = a.y - state.my;
			const pd = Math.sqrt(px * px + py * py);
			if (pd < 190) {
				ctx.strokeStyle = col((1 - pd / 190) * a.a * 0.7);
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(state.mx, state.my);
				ctx.stroke();
			}
		}

		for (const n of nodes) {
			if (n.a < 0.03) continue;
			ctx.fillStyle = col(0.85 * n.a);
			ctx.beginPath();
			ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function loop() {
		draw(true);
		requestAnimationFrame(loop);
	}

	resize();
	addEventListener('resize', resize);
	if (finePointer) {
		addEventListener('pointermove', e => {
			state.mx = e.clientX;
			state.my = e.clientY;
		});
	}
	if (reduce) {
		state.target = 0.7;
		state.p = 0.7;
		draw(false);
	} else {
		loop();
	}

	/* ============================================================
	   3. Paletas por etapa, panel fijo y navegación
	   ============================================================ */
	const root = document.documentElement;
	const hud = $('#hud');
	const hudEra = $('#hudEra');
	const hudYear = $('#hudYear');
	const hudN = $('#hudN');
	const hudBar = $('#hudBar');
	const topbar = $('#topbar');
	let currentEra = null;
	let currentEv = -1;

	function setPalette(pal, label, eraIndex) {
		const key = eraIndex === null ? label : eraIndex;
		if (currentEra === key) return;
		currentEra = key;
		hudEra.textContent = label || '';
		eraBtns.forEach((b, i) => b.classList.toggle('active', i === eraIndex));
		const rgb = hexToRgb(pal.accent);
		if (hasGsap) {
			const dur = reduce ? 0 : 1.3;
			gsap.to(root, { '--bg': pal.bg, '--accent': pal.accent, duration: dur, ease: 'power2.out', overwrite: 'auto' });
			gsap.to(state.rgb, { r: rgb.r, g: rgb.g, b: rgb.b, duration: dur, ease: 'power2.out', overwrite: 'auto' });
		} else {
			root.style.setProperty('--bg', pal.bg);
			root.style.setProperty('--accent', pal.accent);
			Object.assign(state.rgb, rgb);
		}
	}

	function setCurrent(i) {
		if (i === currentEv) return;
		currentEv = i;
		const e = flat[i];
		hudYear.textContent = e.short || e.year;
		hudN.textContent = i + 1;
		hudBar.style.transform = 'scaleX(' + (i + 1) / flat.length + ')';
		if (animate) {
			gsap.fromTo(hudYear, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
		}
	}
	setCurrent(0);

	/* ============================================================
	   4. Animaciones con scroll (GSAP + ScrollTrigger)
	   ============================================================ */
	const heroTitle = $('#heroTitle');
	heroTitle.innerHTML = splitWords(heroTitle.textContent);

	if (hasGsap) {
		// Paleta y estado según la zona de la página
		ScrollTrigger.create({
			trigger: '.hero', start: 'top top', end: 'bottom 60%',
			onEnter: () => setPalette(D.hero, '', null),
			onEnterBack: () => setPalette(D.hero, '', null)
		});

		eraEls.forEach(({ section }, i) => {
			ScrollTrigger.create({
				trigger: section, start: 'top 60%', end: 'bottom 60%',
				onEnter: () => setPalette(D.eras[i], pad(i + 1) + '  ' + D.eras[i].title, i),
				onEnterBack: () => setPalette(D.eras[i], pad(i + 1) + '  ' + D.eras[i].title, i)
			});
		});

		ScrollTrigger.create({
			trigger: '.finale', start: 'top 60%',
			onEnter: () => setPalette(D.end, 'Conclusión', null),
			onEnterBack: () => setPalette(D.end, 'Conclusión', null)
		});

		// Mostrar u ocultar controles fijos durante el recorrido
		ScrollTrigger.create({
			trigger: journey, start: 'top 70%', end: 'bottom 35%',
			onToggle: self => {
				[hud, topbar, eraNav].forEach(el => el.classList.toggle('show', self.isActive));
			}
		});

		// Progreso global → crecimiento de la red
		ScrollTrigger.create({
			start: 0, end: 'max',
			onUpdate: self => { state.target = self.progress; }
		});

		// Hito actual (panel fijo) y estado de cada punto
		evEls.forEach((ev, i) => {
			ScrollTrigger.create({
				trigger: ev, start: 'top 55%', end: 'bottom 55%',
				onEnter: () => setCurrent(i),
				onEnterBack: () => setCurrent(i),
				onToggle: self => ev.classList.toggle('is-active', self.isActive)
			});
			ScrollTrigger.create({
				trigger: ev, start: 'top 55%',
				onEnter: () => ev.classList.add('is-passed'),
				onLeaveBack: () => ev.classList.remove('is-passed')
			});
		});
	}

	if (animate) {
		// Portada
		gsap.from('.hero h1 .word > span', { yPercent: 115, duration: 1.1, stagger: 0.09, ease: 'power4.out', delay: 0.2 });
		gsap.from('.hero-sub', { opacity: 0, y: 24, duration: 1, delay: 0.9, ease: 'power3.out' });
		gsap.from('.cue', { opacity: 0, duration: 1, delay: 1.4 });
		gsap.to('.hero-inner', {
			opacity: 0, y: -90, scale: 0.97, ease: 'none',
			scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom 25%', scrub: true }
		});

		// Etapas
		eraEls.forEach(({ head, list }) => {
			gsap.from($$('.era-title .word > span', head), {
				yPercent: 115, duration: 0.9, stagger: 0.07, ease: 'power4.out',
				scrollTrigger: { trigger: head, start: 'top 78%', toggleActions: 'play none none reverse' }
			});
			gsap.from($$('.era-span', head), {
				opacity: 0, y: 16, duration: 0.8, delay: 0.3,
				scrollTrigger: { trigger: head, start: 'top 78%', toggleActions: 'play none none reverse' }
			});
			gsap.fromTo($('.era-num', head), { yPercent: 40, scale: 0.92 }, {
				yPercent: -18, scale: 1.05, ease: 'none',
				scrollTrigger: { trigger: head, start: 'top bottom', end: 'bottom top', scrub: true }
			});

			// Línea que se dibuja con el scroll
			gsap.fromTo($('.fill', list), { scaleY: 0, transformOrigin: 'top center' }, {
				scaleY: 1, ease: 'none',
				scrollTrigger: { trigger: list, start: 'top 55%', end: 'bottom 55%', scrub: 0.4 }
			});
		});

		// Tarjetas
		const wide = () => innerWidth > 900;
		evEls.forEach(ev => {
			const card = $('.card', ev);
			const dir = ev.classList.contains('right') ? 1 : -1;
			gsap.from(card, {
				opacity: 0,
				x: () => (wide() ? 80 * dir : 30),
				y: 50,
				duration: 0.95,
				ease: 'power3.out',
				scrollTrigger: { trigger: ev, start: 'top 86%', toggleActions: 'play none none reverse' }
			});

			// Inclinación 3D suave con el puntero
			if (finePointer) {
				card.addEventListener('pointermove', e => {
					const rc = card.getBoundingClientRect();
					const px = (e.clientX - rc.left) / rc.width - 0.5;
					const py = (e.clientY - rc.top) / rc.height - 0.5;
					gsap.to(card, { rotationY: px * 6, rotationX: -py * 6, transformPerspective: 900, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
				});
				card.addEventListener('pointerleave', () =>
					gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.6, ease: 'power3.out' }));
			}
		});

		// Conclusión
		gsap.from('.finale .reveal', {
			opacity: 0, y: 40, duration: 0.9, stagger: 0.15, ease: 'power3.out',
			scrollTrigger: { trigger: '.finale', start: 'top 65%', toggleActions: 'play none none reverse' }
		});
	}

	// Recalcular posiciones cuando carguen las fuentes
	if (hasGsap && document.fonts && document.fonts.ready) {
		document.fonts.ready.then(() => ScrollTrigger.refresh());
	}
	addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();
