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
	const shaderMaterial = new THREE.ShaderMaterial({
		uniforms: {
			uTime: { value: 0 }
		},
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
	});
	const heroMesh = new THREE.Mesh(geometry, shaderMaterial);
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

	const animate = () => {
		requestAnimationFrame(animate);
		shaderMaterial.uniforms.uTime.value += 0.02;
		heroMesh.rotation.x += 0.003;
		heroMesh.rotation.y += 0.006;
		particles.rotation.y -= 0.0008;
		renderer.render(scene, camera);
	};

	resizeRenderer();
	window.addEventListener('resize', resizeRenderer);
	animate();
}
