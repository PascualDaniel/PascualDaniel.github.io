import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const canvas = document.querySelector('#hero-canvas');

if (canvas) {
	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
	camera.position.set(0, 0, 2);

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	// Cap DPR for consistent sizing across environments (GitHub Pages can result in very high DPR values)
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

	// Full-screen gradient plane using a shader (enhanced visuals)
	const planeGeo = new THREE.PlaneGeometry(2, 2);
	const planeMat = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0.0 },
			uResolution: { value: new THREE.Vector2() }
		},
		vertexShader: `
			varying vec2 vUv;
			void main(){
				vUv = uv;
				gl_Position = vec4(position, 1.0);
			}
		`,
		fragmentShader: `
			uniform float uTime;
			varying vec2 vUv;
			
			// subtle layered bands and animated noise-like effect
			void main(){
				vec2 uv = vUv;
				float t = uTime * 0.7;
				float band = 0.35 + 0.25 * sin((uv.y + t*0.12) * 6.28);
				vec3 a = vec3(0.03,0.01,0.12);
				vec3 b = vec3(0.4,0.28,0.85);
				vec3 c = vec3(0.95,0.6,0.15);
				vec3 col = mix(a, b, smoothstep(0.0, 1.0, uv.y + band*0.5));
				col = mix(col, c, 0.1 * sin(t + uv.x*3.14));
				// vignette
				float v = smoothstep(0.9, 0.3, distance(uv, vec2(0.5)));
				col *= v;
				gl_FragColor = vec4(col, 1.0);
			}
		`,
		depthWrite: false,
		transparent: true
	});
	const plane = new THREE.Mesh(planeGeo, planeMat);
	plane.renderOrder = -1;
	scene.add(plane);

	// Particle field (more robust and animated)
	const particleCount = 200;
	const positions = new Float32Array(particleCount * 3);
	const velocities = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i++) {
		const i3 = i * 3;
		positions[i3] = (Math.random() - 0.5) * 3.0;
		positions[i3 + 1] = (Math.random() - 0.5) * 1.0 + 0.1;
		positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
		// small per-particle drift velocities
		velocities[i3] = (Math.random() - 0.5) * 0.002;
		velocities[i3 + 1] = Math.random() * 0.006 + 0.002;
		velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;
	}
	const pGeo = new THREE.BufferGeometry();
	pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05, sizeAttenuation: true, opacity: 0.85, transparent: true });
	const particles = new THREE.Points(pGeo, pMat);
	particles.frustumCulled = false; // avoid disappearing when on edge
	scene.add(particles);

	// Resize helper – robust across different environments and late layout changes
	const resize = () => {
		const { width, height } = canvas.getBoundingClientRect();
		// Prevent zero sizes
		if (width === 0 || height === 0) return;
		renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		renderer.setSize(Math.floor(width), Math.floor(height), false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		planeMat.uniforms.uResolution.value.set(width, height);
	};

	window.addEventListener('resize', resize);
	window.addEventListener('pageshow', () => setTimeout(resize, 50)); // handle bfcache and GitHub timing
	// extra safety: call resize after a short delay
	setTimeout(resize, 120);

	const clock = new THREE.Clock();

	function animate() {
		requestAnimationFrame(animate);
		const elapsed = clock.getElapsedTime();
		planeMat.uniforms.uTime.value = elapsed;

		// animate particle positions using velocities and a subtle sinusoidal motion
		const posAttr = particles.geometry.attributes.position.array;
		for (let i = 0; i < particleCount; i++) {
			const i3 = i * 3;
			posAttr[i3] += velocities[i3] + 0.002 * Math.sin(elapsed * 0.5 + i);
			posAttr[i3 + 1] += velocities[i3 + 1] + 0.0015 * Math.cos(elapsed * 0.7 + i * 0.3);
			posAttr[i3 + 2] += velocities[i3 + 2] * 0.5;
			// wrap verticals to keep field populated
			if (posAttr[i3 + 1] > 1.2) posAttr[i3 + 1] = -0.9 - Math.random() * 0.4;
		}
		particles.geometry.attributes.position.needsUpdate = true;

		particles.rotation.y = elapsed * -0.02;
		renderer.render(scene, camera);
	}

	animate();
} else {
	// No hero canvas on this page
	console.warn('Hero canvas not found: #hero-canvas');
}
