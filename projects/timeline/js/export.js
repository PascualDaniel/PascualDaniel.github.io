/* Exportar la línea de tiempo como imagen, directamente desde el navegador.
   Dibuja el contenido con la API Canvas 2D (sin librerías externas), así que
   funciona igual en GitHub Pages que abriendo el archivo en local. */
(() => {
	const D = window.TIMELINE;
	const W = 1200;
	const DISPLAY = '"Unbounded","Arial Black",system-ui,sans-serif';
	const BODY = '"Figtree",system-ui,-apple-system,"Segoe UI",sans-serif';
	const PRINT_ACCENTS = ['#9a6b10', '#0e6b70', '#c2410c', '#8a1f3d', '#1d4ed8', '#7e22ce'];

	const THEMES = {
		color: {
			ink: '#f5f1ea', muted: 'rgba(245,241,234,0.76)', line: 'rgba(245,241,234,0.24)',
			card: 'rgba(255,255,255,0.07)',
			cats: { hw: '#ff8a9b', sw: '#7cc4ff', net: '#6fe3a6', ai: '#c9a2ff' }
		},
		print: {
			ink: '#14213d', muted: '#4b5563', line: '#cfd5de', card: '#f4f6f9', bg: '#ffffff',
			cats: { hw: '#b4233c', sw: '#1c5fa0', net: '#1a7a4a', ai: '#6b3fa8' }
		}
	};

	const COVER_TITLE = 'De los algoritmos a la inteligencia artificial';
	const COVER_SUB = 'Línea de tiempo de la evolución de la informática, las redes y la inteligencia artificial';
	const FINALE = {
		title: 'El hilo conductor',
		p1: 'La informática ha evolucionado desde los primeros algoritmos y máquinas de cálculo hasta un mundo de ordenadores conectados que procesan información y generan contenido mediante inteligencia artificial.',
		pillars: [
			['hw', 'Hardware', 'Hizo posible aumentar la capacidad de cálculo.'],
			['sw', 'Software', 'Permitió programar las máquinas.'],
			['net', 'Redes', 'Conectaron los sistemas a escala mundial.']
		],
		p2: 'La combinación de estos tres elementos ha hecho posible la sociedad digital actual.'
	};

	const mctx = document.createElement('canvas').getContext('2d');
	const pad2 = n => String(n).padStart(2, '0');
	const tick = () => new Promise(r => setTimeout(r, 0));
	const hexToRgb = h => ({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });

	/* ---------- utilidades de dibujo ---------- */
	function wrap(text, font, maxW) {
		mctx.font = font;
		const lines = [];
		let cur = '';
		text.split(' ').forEach(w => {
			const t = cur ? cur + ' ' + w : w;
			if (mctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
		});
		if (cur) lines.push(cur);
		return lines;
	}

	function rr(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.arcTo(x + w, y, x + w, y + h, r);
		ctx.arcTo(x + w, y + h, x, y + h, r);
		ctx.arcTo(x, y + h, x, y, r);
		ctx.arcTo(x, y, x + w, y, r);
		ctx.closePath();
	}

	function mulberry(seed) {
		let a = seed;
		return () => {
			a |= 0; a = (a + 0x6D2B79F5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/* ---------- maquetación ---------- */
	const CW = 500, CPAD = 26, CIW = CW - CPAD * 2;

	function layoutCard(ev, n, side) {
		const long = ev.year.length > 14;
		const c = { ev, n, side, long };
		c.yf = '700 ' + (long ? 24 : 40) + 'px ' + DISPLAY;
		c.ylh = long ? 30 : 46;
		c.yl = wrap(ev.year, c.yf, CIW);
		c.tf = '700 23px ' + BODY;
		c.tl = wrap(ev.title, c.tf, CIW);
		c.xf = '400 17px ' + BODY;
		c.xl = wrap(ev.text, c.xf, CIW);
		c.h = CPAD + c.yl.length * c.ylh + 12 + c.tl.length * 30 + 8 + c.xl.length * 26 + 18 + 24 + CPAD;
		return c;
	}

	/* parts: lista de 'cover', 'era:N', 'finale' */
	function layout(opts) {
		const print = !!opts.print;
		const T = print ? THEMES.print : THEMES.color;
		const flat = D.eras.flatMap(e => e.events);
		const num = new Map(flat.map((e, i) => [e, i + 1]));
		const match = e => !opts.filter || opts.filter === 'all' || e.cats.includes(opts.filter);
		const blocks = [];
		let y = 0;

		opts.parts.forEach(part => {
			if (part === 'cover') {
				const tf = '700 84px ' + DISPLAY, sf = '400 26px ' + BODY;
				const tl = wrap(COVER_TITLE, tf, 1040);
				let sub = COVER_SUB;
				if (opts.filter && opts.filter !== 'all') sub += '. Mostrando solo: ' + D.cats[opts.filter] + '.';
				const sl = wrap(sub, sf, 840);
				const h = 120 + tl.length * 92 + 28 + sl.length * 38 + 110;
				blocks.push({ type: 'cover', y, h, tf, sf, tl, sl, bg: print ? T.bg : D.hero.bg, accent: print ? PRINT_ACCENTS[0] : D.hero.accent });
				y += h;
			} else if (part.startsWith('era:')) {
				const i = +part.slice(4);
				const era = D.eras[i];
				const evs = era.events.filter(match);
				if (!evs.length) return;
				const nf = '800 170px ' + DISPLAY, tf = '700 38px ' + DISPLAY;
				const tl = wrap(era.title, tf, 940);
				const headH = 100 + 170 + 26 + tl.length * 50 + 14 + 30 + 84;
				const cards = evs.map((ev, k) => layoutCard(ev, num.get(ev), k % 2));
				let cy = 0;
				cards.forEach(c => { c.y = cy; cy += c.h + 38; });
				const bodyH = cy - 38;
				const h = headH + bodyH + 100;
				blocks.push({
					type: 'era', i, y, h, headH, nf, tf, tl, cards,
					span: evs[0].year + ' – ' + evs[evs.length - 1].year,
					bg: print ? T.bg : era.bg,
					accent: print ? PRINT_ACCENTS[i % PRINT_ACCENTS.length] : era.accent
				});
				y += h;
			} else if (part === 'finale') {
				const hf = '700 64px ' + DISPLAY, pf = '400 24px ' + BODY;
				const hl = wrap(FINALE.title, hf, 1000);
				const p1 = wrap(FINALE.p1, pf, 880);
				const p2 = wrap(FINALE.p2, pf, 880);
				const pw = (W - 120 - 44) / 3;
				const df = '400 18px ' + BODY;
				const pills = FINALE.pillars.map(([k, t, d]) => ({ k, t, lines: wrap(d, df, pw - 44) }));
				const ph = Math.max(...pills.map(p => 22 + 30 + 6 + p.lines.length * 27 + 22));
				const h = 130 + hl.length * 72 + 30 + p1.length * 38 + 40 + ph + 30 + p2.length * 38 + 130;
				blocks.push({ type: 'finale', y, h, hf, pf, hl, p1, p2, pills, pw, ph, df, bg: print ? T.bg : D.end.bg, accent: print ? '#14213d' : D.end.accent });
				y += h;
			}
		});

		if (!blocks.length) throw new Error('No hay hitos que exportar con el filtro actual.');
		blocks.forEach(b => { b.accRgb = hexToRgb(b.accent); });
		return { blocks, H: y, print, T };
	}

	/* ---------- pintado ---------- */
	function drawNetwork(ctx, L) {
		const rng = mulberry(11);
		const N = Math.round(L.H / 20);
		const pts = [];
		for (let i = 0; i < N; i++) pts.push({ x: rng() * W, y: L.H * Math.pow(rng(), 0.6), r: 1.3 + rng() * 1.8 });
		pts.sort((a, b) => a.y - b.y);
		const LINK = 140;
		const rgbAt = y => (L.blocks.find(b => y >= b.y && y < b.y + b.h) || L.blocks[L.blocks.length - 1]).accRgb;
		for (let i = 0; i < pts.length; i++) {
			const a = pts[i];
			const { r, g, b } = rgbAt(a.y);
			for (let j = i + 1; j < pts.length; j++) {
				const c = pts[j];
				const dy = c.y - a.y;
				if (dy > LINK) break;
				const dx = c.x - a.x;
				const d = Math.sqrt(dx * dx + dy * dy);
				if (d < LINK) {
					ctx.strokeStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + (0.26 * (1 - d / LINK)).toFixed(3) + ')';
					ctx.lineWidth = 1;
					ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.stroke();
				}
			}
			ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
			ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
		}
	}

	function paintCard(ctx, c, x, y, b, L) {
		const T = L.T;
		rr(ctx, x, y, CW, c.h, 12);
		ctx.fillStyle = b.bg; ctx.fill();
		ctx.fillStyle = T.card; ctx.fill();
		ctx.lineWidth = 1; ctx.strokeStyle = T.line; ctx.stroke();
		ctx.save();
		rr(ctx, x, y, CW, c.h, 12); ctx.clip();
		ctx.fillStyle = b.accent; ctx.fillRect(x, y, CW, 3);
		ctx.restore();

		const tx = x + CPAD;
		let ty = y + CPAD;
		ctx.textAlign = 'left'; ctx.textBaseline = 'top';
		ctx.font = c.yf; ctx.fillStyle = b.accent;
		c.yl.forEach(l => { ctx.fillText(l, tx, ty); ty += c.ylh; });
		ty += 12;
		ctx.font = c.tf; ctx.fillStyle = T.ink;
		c.tl.forEach(l => { ctx.fillText(l, tx, ty); ty += 30; });
		ty += 8;
		ctx.font = c.xf; ctx.fillStyle = T.muted;
		c.xl.forEach(l => { ctx.fillText(l, tx, ty); ty += 26; });
		ty += 18;

		// Fila de metadatos: nº de hito + categorías
		ctx.font = '400 14px ' + BODY; ctx.fillStyle = T.muted;
		const label = 'Hito ' + c.n;
		ctx.textBaseline = 'middle';
		ctx.fillText(label, tx, ty + 12);
		let cx = tx + ctx.measureText(label).width + 14;
		ctx.font = '600 13px ' + BODY;
		c.ev.cats.forEach(k => {
			const w = ctx.measureText(D.cats[k]).width + 20;
			rr(ctx, cx, ty, w, 24, 12);
			ctx.lineWidth = 1.5; ctx.strokeStyle = T.cats[k]; ctx.stroke();
			ctx.fillStyle = T.cats[k]; ctx.textAlign = 'center';
			ctx.fillText(D.cats[k], cx + w / 2, ty + 12.5);
			ctx.textAlign = 'left';
			cx += w + 6;
		});
		ctx.textBaseline = 'top';
	}

	function paint(L, scale) {
		const cv = document.createElement('canvas');
		cv.width = Math.round(W * scale);
		cv.height = Math.round(L.H * scale);
		const ctx = cv.getContext('2d');
		ctx.scale(scale, scale);
		ctx.textBaseline = 'top';
		const T = L.T;

		// Fondos por bloque
		L.blocks.forEach((b, i) => {
			ctx.fillStyle = b.bg;
			ctx.fillRect(0, b.y, W, b.h + 1);
			if (!L.print && i) {
				const g = ctx.createLinearGradient(0, b.y, 0, b.y + 160);
				g.addColorStop(0, L.blocks[i - 1].bg);
				g.addColorStop(1, b.bg);
				ctx.fillStyle = g;
				ctx.fillRect(0, b.y, W, 160);
			}
		});

		if (!L.print) drawNetwork(ctx, L);

		L.blocks.forEach(b => {
			ctx.textAlign = 'left';
			ctx.textBaseline = 'top';
			if (b.type === 'cover') {
				ctx.font = b.tf; ctx.fillStyle = T.ink;
				let y = b.y + 120;
				b.tl.forEach(l => { ctx.fillText(l, 80, y); y += 92; });
				y += 28;
				ctx.font = b.sf; ctx.fillStyle = T.muted;
				b.sl.forEach(l => { ctx.fillText(l, 80, y); y += 38; });
				ctx.fillStyle = b.accent;
				ctx.fillRect(80, b.y + b.h - 70, 90, 4);
			}

			if (b.type === 'era') {
				ctx.textAlign = 'center';
				ctx.font = b.nf;
				ctx.lineWidth = 3; ctx.strokeStyle = b.accent;
				ctx.strokeText(pad2(b.i + 1), W / 2, b.y + 100);
				let y = b.y + 100 + 170 + 26;
				ctx.font = b.tf; ctx.fillStyle = T.ink;
				b.tl.forEach(l => { ctx.fillText(l, W / 2, y); y += 50; });
				y += 14;
				ctx.font = '600 22px ' + BODY; ctx.fillStyle = b.accent;
				ctx.fillText(b.span, W / 2, y);

				const base = b.y + b.headH;
				const first = b.cards[0], last = b.cards[b.cards.length - 1];
				const y0 = base + first.y + 40, y1 = base + last.y + 40;

				// Línea central
				ctx.save();
				if (!L.print) { ctx.shadowColor = b.accent; ctx.shadowBlur = 12; }
				ctx.strokeStyle = b.accent; ctx.lineWidth = 3;
				ctx.beginPath(); ctx.moveTo(W / 2, y0); ctx.lineTo(W / 2, y1); ctx.stroke();
				ctx.restore();

				b.cards.forEach(c => {
					const cx = c.side ? W / 2 + 50 : W / 2 - 50 - CW;
					const cy = base + c.y;
					const dy = cy + 40;
					// conector
					ctx.strokeStyle = T.line; ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.moveTo(W / 2, dy);
					ctx.lineTo(c.side ? cx : cx + CW, dy);
					ctx.stroke();
					paintCard(ctx, c, cx, cy, b, L);
					// punto
					ctx.fillStyle = b.bg;
					ctx.beginPath(); ctx.arc(W / 2, dy, 13, 0, Math.PI * 2); ctx.fill();
					ctx.fillStyle = b.accent;
					ctx.beginPath(); ctx.arc(W / 2, dy, 9, 0, Math.PI * 2); ctx.fill();
				});
			}

			if (b.type === 'finale') {
				ctx.font = b.hf; ctx.fillStyle = T.ink;
				let y = b.y + 130;
				b.hl.forEach(l => { ctx.fillText(l, 80, y); y += 72; });
				y += 30;
				ctx.font = b.pf; ctx.fillStyle = T.muted;
				b.p1.forEach(l => { ctx.fillText(l, 80, y); y += 38; });
				y += 40;
				b.pills.forEach((p, k) => {
					const px = 60 + k * (b.pw + 22);
					ctx.fillStyle = b.bg; ctx.fillRect(px, y, b.pw, b.ph);
					ctx.fillStyle = T.card; ctx.fillRect(px, y, b.pw, b.ph);
					ctx.fillStyle = T.cats[p.k]; ctx.fillRect(px, y, b.pw, 5);
					ctx.font = '700 24px ' + BODY; ctx.fillText(p.t, px + 22, y + 22);
					ctx.font = b.df; ctx.fillStyle = T.muted;
					p.lines.forEach((l, li) => ctx.fillText(l, px + 22, y + 22 + 30 + 6 + li * 27));
				});
				y += b.ph + 30;
				ctx.font = b.pf; ctx.fillStyle = T.muted;
				b.p2.forEach(l => { ctx.fillText(l, 80, y); y += 38; });
			}
		});
		return cv;
	}

	/* ---------- salida: blob, escala, zip ---------- */
	function pickScale(H, desired) {
		const coarse = matchMedia('(pointer: coarse)').matches;
		const maxPix = coarse ? 16e6 : 120e6;
		const maxDim = coarse ? 16000 : 32000;
		let s = desired;
		while ((W * s) * (H * s) > maxPix || H * s > maxDim) s *= 0.92;
		return Math.max(s, 0.4);
	}

	const toBlob = (cv, mime, q) => new Promise(res => cv.toBlob(res, mime, q));

	async function renderBlob(opts, fmt) {
		await loadFonts();
		const L = layout(opts);
		const mime = fmt === 'jpg' ? 'image/jpeg' : 'image/png';
		let s = pickScale(L.H, 2);
		for (let t = 0; t < 4; t++) {
			const cv = paint(L, s);
			const blob = await toBlob(cv, mime, 0.92);
			if (blob) return blob;
			s *= 0.7;
			await tick();
		}
		throw new Error('El navegador no puede generar una imagen tan grande. Prueba a exportar por etapas.');
	}

	async function loadFonts() {
		if (!document.fonts || !document.fonts.load) return;
		try {
			await Promise.all([
				document.fonts.load('700 40px Unbounded'),
				document.fonts.load('800 170px Unbounded'),
				document.fonts.load('400 17px Figtree'),
				document.fonts.load('600 13px Figtree'),
				document.fonts.load('700 23px Figtree')
			]);
		} catch (e) { /* si fallan, se usan las fuentes de reserva */ }
	}

	const crcTable = (() => {
		const t = new Uint32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
			t[n] = c >>> 0;
		}
		return t;
	})();

	function crc32(u8) {
		let c = 0xFFFFFFFF;
		for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 255] ^ (c >>> 8);
		return (c ^ 0xFFFFFFFF) >>> 0;
	}

	/* ZIP sin compresión (las imágenes ya vienen comprimidas) */
	function makeZip(files) {
		const enc = new TextEncoder();
		const parts = [], central = [];
		let offset = 0;
		files.forEach(f => {
			const name = enc.encode(f.name);
			const crc = crc32(f.data), size = f.data.length;
			const lh = new DataView(new ArrayBuffer(30));
			lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
			lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
			lh.setUint32(14, crc, true); lh.setUint32(18, size, true); lh.setUint32(22, size, true);
			lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
			parts.push(new Uint8Array(lh.buffer), name, f.data);

			const ch = new DataView(new ArrayBuffer(46));
			ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
			ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
			ch.setUint32(16, crc, true); ch.setUint32(20, size, true); ch.setUint32(24, size, true);
			ch.setUint16(28, name.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
			ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true); ch.setUint32(42, offset, true);
			central.push(new Uint8Array(ch.buffer), name);
			offset += 30 + name.length + size;
		});
		const cdSize = central.reduce((s, p) => s + p.length, 0);
		const end = new DataView(new ArrayBuffer(22));
		end.setUint32(0, 0x06054b50, true); end.setUint16(4, 0, true); end.setUint16(6, 0, true);
		end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
		end.setUint32(12, cdSize, true); end.setUint32(16, offset, true); end.setUint16(20, 0, true);
		return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
	}

	function download(blob, name) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url; a.download = name;
		document.body.appendChild(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 5000);
	}

	/* ---------- interfaz ---------- */
	function initUI() {
		const topbar = document.getElementById('topbar');
		if (!topbar || !document.body) return;

		const dlg = document.createElement('dialog');
		dlg.className = 'export-dlg';
		dlg.innerHTML =
			'<h2>Exportar como imagen</h2>' +
			'<label>Qué exportar<select id="exPart"><option value="all">Toda la línea de tiempo</option>' +
			D.eras.map((e, i) => '<option value="' + i + '">Etapa ' + (i + 1) + ': ' + e.title + '</option>').join('') +
			'</select></label>' +
			'<label>Estilo<select id="exTheme"><option value="print">Fondo blanco (para Word o imprimir)</option><option value="color">Colores de la web</option></select></label>' +
			'<label>Formato<select id="exFmt"><option value="png">PNG (máxima calidad)</option><option value="jpg">JPG (pesa menos)</option></select></label>' +
			'<label class="check"><input type="checkbox" id="exSplit"> Una imagen por parte (portada, etapas y conclusión) en un .zip</label>' +
			'<label class="check" id="exFilterRow" hidden><input type="checkbox" id="exFilter" checked> Solo lo resaltado: <b id="exFilterName"></b></label>' +
			'<p class="ex-status" id="exStatus" role="status"></p>' +
			'<div class="ex-actions"><button type="button" id="exCancel">Cerrar</button><button type="button" class="primary" id="exGo">Descargar</button></div>';
		document.body.appendChild(dlg);

		const $ = id => dlg.querySelector('#' + id);
		const part = $('exPart'), theme = $('exTheme'), fmt = $('exFmt'), split = $('exSplit');
		const fRow = $('exFilterRow'), fChk = $('exFilter'), status = $('exStatus'), go = $('exGo');

		const sync = () => { split.disabled = part.value !== 'all'; if (split.disabled) split.checked = false; };
		part.addEventListener('change', sync);
		$('exCancel').addEventListener('click', () => dlg.close());
		dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

		function open() {
			const f = document.body.dataset.filter || 'all';
			fRow.hidden = f === 'all';
			if (f !== 'all') $('exFilterName').textContent = D.cats[f];
			status.textContent = '';
			sync();
			dlg.showModal();
		}

		const btn = document.createElement('button');
		btn.type = 'button';
		btn.className = 'export-btn';
		btn.textContent = 'Exportar imagen';
		btn.addEventListener('click', open);
		topbar.appendChild(btn);

		const toTop = document.getElementById('toTop');
		if (toTop) {
			const b2 = document.createElement('button');
			b2.type = 'button';
			b2.className = 'to-top alt reveal';
			b2.textContent = 'Exportar como imagen';
			b2.addEventListener('click', open);
			toTop.insertAdjacentElement('afterend', b2);
		}

		go.addEventListener('click', async () => {
			const filter = !fRow.hidden && fChk.checked ? (document.body.dataset.filter || 'all') : 'all';
			const print = theme.value === 'print';
			const f = fmt.value;
			const sfx = filter === 'all' ? '' : '-' + filter;
			go.disabled = true;
			try {
				if (split.checked && part.value === 'all') {
					const names = [['cover', '00-portada']]
						.concat(D.eras.map((_, i) => ['era:' + i, pad2(i + 1) + '-etapa-' + (i + 1)]))
						.concat([['finale', pad2(D.eras.length + 1) + '-conclusion']]);
					const files = [];
					for (let i = 0; i < names.length; i++) {
						status.textContent = 'Generando ' + (i + 1) + ' de ' + names.length + '…';
						await tick();
						try {
							const blob = await renderBlob({ parts: [names[i][0]], print, filter }, f);
							files.push({ name: names[i][1] + '.' + f, data: new Uint8Array(await blob.arrayBuffer()) });
						} catch (e) {
							if (!/No hay hitos/.test(e.message)) throw e;   // etapa sin hitos por el filtro
						}
					}
					download(makeZip(files), 'linea-de-tiempo' + sfx + '.zip');
				} else {
					status.textContent = 'Generando imagen…';
					await tick();
					const parts = part.value === 'all'
						? ['cover'].concat(D.eras.map((_, i) => 'era:' + i), ['finale'])
						: ['era:' + part.value];
					const blob = await renderBlob({ parts, print, filter }, f);
					const name = part.value === 'all' ? 'linea-de-tiempo' : 'linea-de-tiempo-etapa-' + (+part.value + 1);
					download(blob, name + sfx + '.' + f);
				}
				status.textContent = 'Listo. La descarga ha empezado.';
			} catch (e) {
				status.textContent = e.message || 'No se ha podido generar la imagen.';
			} finally {
				go.disabled = false;
			}
		});
	}

	window.TimelineExport = { layout, paint, makeZip, renderBlob };
	initUI();
})();
