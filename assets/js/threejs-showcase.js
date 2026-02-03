import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const canvas = document.querySelector('#threejs-canvas');

if (canvas) {
	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
	camera.position.set(0, 0.6, 4.2);

	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		alpha: true
	});
	renderer.setPixelRatio(window.devicePixelRatio || 1);

	const ambient = new THREE.AmbientLight(0xffffff, 0.65);
	scene.add(ambient);

	const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
	keyLight.position.set(2, 3, 4);
	scene.add(keyLight);

	const fillLight = new THREE.PointLight(0xff9f1c, 0.9, 10);
	fillLight.position.set(-2, -1, 2);
	scene.add(fillLight);

	const geometry = new THREE.TorusKnotGeometry(0.75, 0.28, 180, 16);
	const shaderPresets = [
		{
			name: 'Aurora Gradient',
			vertexShader: `
				varying vec2 vUv;
				varying float vWave;

				void main() {
					vUv = uv;
					vWave = sin(position.y * 4.0);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				varying vec2 vUv;
				varying float vWave;

				void main() {
					float wave = sin(uTime + vUv.y * 6.2831) * 0.5 + 0.5;
					vec3 base = mix(vec3(0.15, 0.05, 0.45), vec3(0.45, 0.37, 0.95), vUv.y);
					vec3 highlight = mix(vec3(1.0, 0.62, 0.11), vec3(0.41, 0.36, 0.9), wave);
					vec3 color = mix(base, highlight, wave * 0.8) + vWave * 0.08;
					gl_FragColor = vec4(color, 1.0);
				}
			`
		},
		{
			name: 'Toon Ramp',
			vertexShader: `
				varying vec3 vNormal;

				void main() {
					vNormal = normalize(normalMatrix * normal);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				varying vec3 vNormal;

				void main() {
					vec3 lightDir = normalize(vec3(0.6, 0.8, 0.3));
					float diff = max(dot(vNormal, lightDir), 0.0);
					float bands = floor(diff * 4.0) / 4.0;
					vec3 base = mix(vec3(0.15, 0.12, 0.4), vec3(0.9, 0.6, 0.15), bands);
					float pulse = 0.5 + 0.5 * sin(uTime);
					gl_FragColor = vec4(base * (0.8 + pulse * 0.2), 1.0);
				}
			`
		},
		{
			name: 'Hologram Scanline',
			vertexShader: `
				varying vec2 vUv;
				varying vec3 vNormal;

				void main() {
					vUv = uv;
					vNormal = normalize(normalMatrix * normal);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uTime;
				varying vec2 vUv;
				varying vec3 vNormal;

				void main() {
					float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
					float scan = sin((vUv.y + uTime * 0.5) * 60.0) * 0.04;
					float flicker = 0.9 + 0.1 * sin(uTime * 6.0);
					vec3 color = vec3(0.2, 0.9, 1.0) + fresnel * vec3(0.1, 0.6, 1.0);
					color += scan;
					gl_FragColor = vec4(color * flicker, 1.0);
				}
			`
		}, {
			name: 'PS1 Retro',
			vertexShader: `
		varying vec2 vUv;
		varying float vLight;

		void main() {
			vUv = uv;

			// Fake low-poly lighting
			vec3 n = normalize(normalMatrix * normal);
			vec3 lightDir = normalize(vec3(0.4, 0.8, 0.2));
			vLight = dot(n, lightDir) * 0.5 + 0.5;

			// PS1-style vertex snapping (screen-space wobble)
			vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
			float snap = 120.0;
			mvPosition.xy = floor(mvPosition.xy * snap) / snap;

			gl_Position = projectionMatrix * mvPosition;
		}
	`,
			fragmentShader: `
		uniform float uTime;
		varying vec2 vUv;
		varying float vLight;

		void main() {
			// Affine-style UV wobble
			vec2 uv = vUv;
			uv.x += sin(uv.y * 12.0 + uTime) * 0.03;
			uv.y += sin(uv.x * 10.0 + uTime * 0.7) * 0.03;

			// Base PS1-ish colors
			vec3 colorA = vec3(0.6, 0.2, 0.8);
			vec3 colorB = vec3(0.1, 0.7, 0.5);
			vec3 color = mix(colorA, colorB, uv.y);

			// Cheap lighting
			color *= vLight;

			// Color banding (5-bit color)
			color = floor(color * 32.0) / 32.0;

			gl_FragColor = vec4(color, 1.0);
		}
	`
		}, {

			name: 'Water',
			vertexShader: `
		varying vec2 vUv;

void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

	`,
			fragmentShader: `
		uniform float uTime;
varying vec2 vUv;

#define TAU 6.28318530718
#define MAX_ITER 5

void main() {

    float time = uTime * 0.5 + 23.0;

    // UV 
    vec2 uv = vUv;

    vec2 p = mod(uv * TAU, TAU) - 250.0;

    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;

    for (int n = 0; n < MAX_ITER; n++) {
        float t = time * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(
            cos(t - i.x) + sin(t + i.y),
            sin(t - i.y) + cos(t + i.x)
        );
        c += 1.0 / length(vec2(
            p.x / (sin(i.x + t) / inten),
            p.y / (cos(i.y + t) / inten)
        ));
    }

    c /= float(MAX_ITER);
    c = 1.17 - pow(c, 1.4);

    vec3 colour = vec3(pow(abs(c), 8.0));
    colour = clamp(colour + vec3(0.0, 0.35, 0.5), 0.0, 1.0);

    gl_FragColor = vec4(colour, 1.0);
}

	`


		}
	];

	const buildMaterial = (preset) => new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 }
		},
		vertexShader: preset.vertexShader,
		fragmentShader: preset.fragmentShader
	});

	let activePresetIndex = 0;
	let activeMaterial = buildMaterial(shaderPresets[activePresetIndex]);
	const heroMesh = new THREE.Mesh(geometry, activeMaterial);
	scene.add(heroMesh);

	const particleCount = 220;
	const positions = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i += 1) {
		const i3 = i * 3;
		positions[i3] = (Math.random() - 0.5) * 8;
		positions[i3 + 1] = (Math.random() - 0.5) * 4;
		positions[i3 + 2] = (Math.random() - 0.5) * 6;
	}

	const particleGeometry = new THREE.BufferGeometry();
	particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const particleMaterial = new THREE.PointsMaterial({
		color: 0xffffff,
		opacity: 0.55,
		transparent: true,
		size: 0.04
	});
	const particles = new THREE.Points(particleGeometry, particleMaterial);
	scene.add(particles);

	const resizeRenderer = () => {
		const { width, height } = canvas.getBoundingClientRect();
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	};

	const carouselSlides = Array.from(document.querySelectorAll('.threejs-slide'));
	const carouselButtons = document.querySelectorAll('.threejs-btn');

	const setActivePreset = (index) => {
		activePresetIndex = (index + shaderPresets.length) % shaderPresets.length;
		heroMesh.material.dispose();
		activeMaterial = buildMaterial(shaderPresets[activePresetIndex]);
		heroMesh.material = activeMaterial;
		carouselSlides.forEach((slide, slideIndex) => {
			slide.classList.toggle('is-active', slideIndex === activePresetIndex);
		});
	};

	carouselButtons.forEach((button) => {
		button.addEventListener('click', () => {
			const direction = button.dataset.direction;
			const offset = direction === 'next' ? 1 : -1;
			setActivePreset(activePresetIndex + offset);
		});
	});

	carouselSlides.forEach((slide, index) => {
		slide.addEventListener('click', () => setActivePreset(index));
	});

	const clock = new THREE.Clock();

	const animate = () => {
		requestAnimationFrame(animate);
		const elapsed = clock.getElapsedTime();
		if (heroMesh.material.uniforms?.uTime) {
			heroMesh.material.uniforms.uTime.value = elapsed;
		}
		heroMesh.rotation.x += 0.003;
		heroMesh.rotation.y += 0.006;
		particles.rotation.y -= 0.0008;
		renderer.render(scene, camera);
	};

	resizeRenderer();
	window.addEventListener('resize', resizeRenderer);
	animate();
}
