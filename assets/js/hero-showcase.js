import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const canvas = document.querySelector('#hero-canvas');

if (canvas) {
	const scene = new THREE.Scene();

	const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 100);
	camera.position.set(0, 0, 2);

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(window.devicePixelRatio || 1);

	// Full-screen gradient plane using a shader
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
			
			void main(){
				vec2 uv = vUv;
				float t = uTime * 0.2;
				float w = 0.25 + 0.15 * sin(t + uv.y * 6.28);
				vec3 colA = vec3(0.05, 0.02, 0.25);
				vec3 colB = vec3(0.45, 0.37, 0.95);
				vec3 col = mix(colA, colB, smoothstep(0.0, 1.0, uv.y + w * 0.5));
				gl_FragColor = vec4(col, 1.0);
			}
		`,
		depthWrite: false,
		transparent: true
	});
	const plane = new THREE.Mesh(planeGeo, planeMat);
	scene.add(plane);

	// Particle field
	const particleCount = 120;
	const positions = new Float32Array(particleCount * 3);
	for (let i = 0; i < particleCount; i++) {
		const i3 = i * 3;
		positions[i3] = (Math.random() - 0.5) * 3.0;
		positions[i3 + 1] = (Math.random() - 0.5) * 1.0 + 0.1;
		positions[i3 + 2] = (Math.random() - 0.5) * 0.5;
	}
	const pGeo = new THREE.BufferGeometry();
	pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	const pMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.035, opacity: 0.6, transparent: true });
	const particles = new THREE.Points(pGeo, pMat);
	scene.add(particles);

	const resize = () => {
		const { width, height } = canvas.getBoundingClientRect();
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		planeMat.uniforms.uResolution.value.set(width, height);
	};

	window.addEventListener('resize', resize);
	resize();

	const clock = new THREE.Clock();

	function animate() {
		requestAnimationFrame(animate);
		const elapsed = clock.getElapsedTime();
		planeMat.uniforms.uTime.value = elapsed;
		// subtle particle motion
		particles.rotation.y = elapsed * -0.02;
		renderer.render(scene, camera);
	}

	animate();
} else {
	// No hero canvas on this page
	console.warn('Hero canvas not found: #hero-canvas');
}
