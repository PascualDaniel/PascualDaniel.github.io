import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

// Hero: retro dithered landscape. The scene is computed as a brightness value, then
// ordered-dithered (Bayer 8x8) and quantized to a 5-colour palette, drawn at low resolution
// and scaled up with hard pixels. Mouse moves the sun and shifts the hill layers (parallax).
const canvas = document.querySelector('#hero-canvas');

if (canvas) {
	const PIXEL = 3; // CSS pixels per "art" pixel. Raise for chunkier, lower for finer.
	const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
	renderer.setPixelRatio(1);
	canvas.style.imageRendering = 'pixelated';

	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
	const uniforms = {
		uTime: { value: 0 },
		uAspect: { value: 2 },
		uMouse: { value: new THREE.Vector2(0, 0) }
	};

	const quad = new THREE.Mesh(
		new THREE.PlaneGeometry(2, 2),
		new THREE.ShaderMaterial({
			uniforms,
			depthTest: false,
			depthWrite: false,
			vertexShader: `
				varying vec2 vUv;
				void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uAspect;
				uniform vec2 uMouse;
				varying vec2 vUv;

				// ---- ordered dithering (Bayer 8x8) ----
				float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
				float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }
				float bayer8(vec2 a) { return bayer4(0.5 * a) * 0.25 + bayer2(a); }

				float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }
				float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
				float noise1(float x) {
					float i = floor(x), f = fract(x);
					f = f * f * (3.0 - 2.0 * f);
					return mix(hash(i), hash(i + 1.0), f);
				}
				float ridge(float x) { return noise1(x) * 0.6 + noise1(x * 2.1 + 5.0) * 0.3 + noise1(x * 4.3 + 9.0) * 0.1; }

				vec3 palette(float i) {
					if (i < 0.5) return vec3(0.043, 0.039, 0.031);   // near black
					if (i < 1.5) return vec3(0.114, 0.098, 0.078);   // charcoal
					if (i < 2.5) return vec3(0.360, 0.170, 0.090);   // burnt brown
					if (i < 3.5) return vec3(0.830, 0.340, 0.120);   // ember
					return vec3(0.940, 0.890, 0.780);                // bone
				}

				void main() {
					vec2 uv = vUv;
					float t = uTime;
					vec2 p = vec2(uv.x * uAspect, uv.y);

					// sky: dark at the top, warming toward the horizon
					float L = 0.04 + 0.34 * pow(1.0 - uv.y, 2.2);

					// sun (upper right, nudged by the mouse)
					vec2 sunPos = vec2(uAspect * 0.74 + uMouse.x * 0.12, 0.60 + uMouse.y * 0.06 + sin(t * 0.4) * 0.008);
					float d = distance(p, sunPos);
					float glow = exp(-d * 3.2);
					L += glow * 0.45;
					L = mix(L, 1.0, smoothstep(0.115, 0.105, d));

					// sparse twinkling stars in the upper sky
					vec2 cell = floor(gl_FragCoord.xy / 2.0);
					float star = step(0.9965, hash2(cell)) * step(0.55, uv.y);
					L += star * (0.35 + 0.35 * sin(t * 2.0 + hash2(cell) * 40.0));

					// three hill layers, scrolling at different speeds (parallax)
					float mx = uMouse.x;
					float h1 = 0.44 + ridge(p.x * 1.1 + t * 0.020 + mx * 0.20) * 0.20;
					float h2 = 0.28 + ridge(p.x * 1.6 + t * 0.045 + mx * 0.45 + 20.0) * 0.18;
					float h3 = 0.12 + ridge(p.x * 2.4 + t * 0.090 + mx * 0.80 + 40.0) * 0.14;
					float sunSide = exp(-abs(p.x - sunPos.x) * 1.4);

					if (uv.y < h1) { L = 0.26 + sunSide * 0.10; if (h1 - uv.y < 0.012) L += 0.32 * sunSide + 0.08; }
					if (uv.y < h2) { L = 0.15 + sunSide * 0.05; if (h2 - uv.y < 0.010) L += 0.14 * sunSide + 0.04; }
					if (uv.y < h3) { L = 0.05; }

					// keep the centre calmer so the title stays readable
					L *= mix(0.78, 1.0, smoothstep(0.0, 0.55, abs(uv.x - 0.5)));

					// dither + quantize to the palette
					float levels = 4.0;
					float idx = clamp(floor(L * levels + bayer8(gl_FragCoord.xy)), 0.0, levels);
					gl_FragColor = vec4(palette(idx), 1.0);
				}
			`
		})
	);
	quad.frustumCulled = false;
	scene.add(quad);

	const resize = () => {
		const { width, height } = canvas.getBoundingClientRect();
		if (width === 0 || height === 0) return;
		renderer.setSize(Math.max(1, Math.floor(width / PIXEL)), Math.max(1, Math.floor(height / PIXEL)), false);
		uniforms.uAspect.value = width / height;
		if (reduceMotion) renderer.render(scene, camera);
	};
	window.addEventListener('resize', resize);
	window.addEventListener('pageshow', () => setTimeout(resize, 50));
	setTimeout(resize, 120);
	resize();

	const target = new THREE.Vector2(0, 0);
	window.addEventListener('pointermove', (e) => {
		const r = canvas.getBoundingClientRect();
		target.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
	}, { passive: true });

	let visible = true;
	if ('IntersectionObserver' in window) {
		new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(canvas);
	}
	const clock = new THREE.Clock();

	if (reduceMotion) {
		uniforms.uTime.value = 8.0;
		renderer.render(scene, camera);
	} else {
		const animate = () => {
			requestAnimationFrame(animate);
			if (!visible || document.hidden) return;
			uniforms.uTime.value = clock.getElapsedTime();
			uniforms.uMouse.value.lerp(target, 0.05);
			renderer.render(scene, camera);
		};
		animate();
	}
}