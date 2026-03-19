import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { intersectsPlane, sliceMeshByPlane } from './lib/mesh-slicer.js';

const canvas = document.getElementById('slice-canvas');

if (canvas) {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0b0f1f);
	scene.fog = new THREE.FogExp2(0x0b0f1f, 0.04);

	const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
	camera.position.set(0, 1.1, 7.2);
	camera.lookAt(0, 1, 0);

	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: 'high-performance'
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const hemiLight = new THREE.HemisphereLight(0xa7c4ff, 0x1a1410, 0.62);
	scene.add(hemiLight);

	const keyLight = new THREE.DirectionalLight(0xfff5d8, 1.35);
	keyLight.position.set(3, 5.8, 3.4);
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.set(2048, 2048);
	keyLight.shadow.camera.left = -7;
	keyLight.shadow.camera.right = 7;
	keyLight.shadow.camera.top = 7;
	keyLight.shadow.camera.bottom = -7;
	scene.add(keyLight);

	const rimLight = new THREE.DirectionalLight(0x68a8ff, 0.6);
	rimLight.position.set(-5, 3, -1.5);
	scene.add(rimLight);

	const floor = new THREE.Mesh(
		new THREE.CircleGeometry(12, 96),
		new THREE.MeshStandardMaterial({
			color: 0x101a2c,
			roughness: 0.95,
			metalness: 0.02
		})
	);
	floor.rotation.x = -Math.PI * 0.5;
	floor.position.y = -2.6;
	floor.receiveShadow = true;
	scene.add(floor);

	const arenaGlow = new THREE.Mesh(
		new THREE.RingGeometry(3.2, 4.5, 96),
		new THREE.MeshBasicMaterial({
			color: 0x79a9ff,
			opacity: 0.16,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false
		})
	);
	arenaGlow.rotation.x = -Math.PI * 0.5;
	arenaGlow.position.y = -2.58;
	scene.add(arenaGlow);

	const moaiGroup = new THREE.Group();
	scene.add(moaiGroup);

	const debrisGroup = new THREE.Group();
	scene.add(debrisGroup);

	const slashLine = new THREE.Line(
		new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
		new THREE.LineBasicMaterial({
			color: 0xa6d3ff,
			opacity: 0,
			transparent: true,
			linewidth: 2
		})
	);
	slashLine.visible = false;
	scene.add(slashLine);

	const hud = {
		hint: document.getElementById('slice-hint'),
		status: document.getElementById('slice-model-status'),
		score: document.getElementById('slice-score'),
		lives: document.getElementById('slice-lives'),
		best: document.getElementById('slice-best'),
		reset: document.getElementById('slice-reset')
	};

	const state = {
		modelReady: false,
		isRunning: false,
		score: 0,
		lives: 3,
		bestScore: Number(localStorage.getItem('moai-slice-best') || 0),
		spawnCooldown: 0,
		targets: [],
		debris: [],
		pointerActive: false,
		pointerCurrentWorld: new THREE.Vector3(),
		pointerPrevWorld: new THREE.Vector3(),
		slashAlpha: 0,
		lastSliceSoundAt: 0,
		maxTargets: 12,
		gravity: 5.4,
		arenaBottom: -2.9,
		moaiAsset: null
	};

	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();
	const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0.25);
	const tmpVecA = new THREE.Vector3();
	const tmpVecB = new THREE.Vector3();
	const tmpVecC = new THREE.Vector3();

	function setHint(text) {
		if (hud.hint) {
			hud.hint.textContent = text;
		}
	}

	function setStatus(text) {
		if (hud.status) {
			hud.status.textContent = text;
		}
	}

	function updateHud() {
		if (hud.score) {
			hud.score.textContent = `Score: ${state.score}`;
		}
		if (hud.lives) {
			hud.lives.textContent = `Lives: ${state.lives}`;
		}
		if (hud.best) {
			hud.best.textContent = `Best: ${state.bestScore}`;
		}
		if (hud.reset) {
			hud.reset.textContent = state.isRunning ? 'Restart Game' : 'Start Game';
		}
	}

	let audioContext;
	function playSliceSound() {
		const now = performance.now();
		if (now - state.lastSliceSoundAt < 45) {
			return;
		}
		state.lastSliceSoundAt = now;
		if (!window.AudioContext && !window.webkitAudioContext) {
			return;
		}
		audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
		const t = audioContext.currentTime;
		const osc = audioContext.createOscillator();
		const gain = audioContext.createGain();
		osc.type = 'triangle';
		osc.frequency.setValueAtTime(720, t);
		osc.frequency.exponentialRampToValueAtTime(190, t + 0.11);
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.exponentialRampToValueAtTime(0.1, t + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
		osc.connect(gain);
		gain.connect(audioContext.destination);
		osc.start(t);
		osc.stop(t + 0.18);
	}

	function pointerToWorld(clientX, clientY, out) {
		const rect = canvas.getBoundingClientRect();
		ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(ndc, camera);
		return raycaster.ray.intersectPlane(interactionPlane, out);
	}

	function disposeMesh(mesh) {
		if (!mesh) {
			return;
		}
		mesh.parent?.remove(mesh);
		mesh.geometry?.dispose();
		if (Array.isArray(mesh.material)) {
			mesh.material.forEach((mat) => mat.dispose());
		} else {
			mesh.material?.dispose();
		}
	}

	function clearEntities() {
		state.targets.forEach((target) => disposeMesh(target.mesh));
		state.debris.forEach((chunk) => disposeMesh(chunk.mesh));
		state.targets = [];
		state.debris = [];
	}

	function saveBestScoreIfNeeded() {
		if (state.score <= state.bestScore) {
			return;
		}
		state.bestScore = state.score;
		localStorage.setItem('moai-slice-best', String(state.bestScore));
	}

	function endGame() {
		state.isRunning = false;
		saveBestScoreIfNeeded();
		updateHud();
		setHint(`Game over. Final score: ${state.score}. Press Start Game to play again.`);
	}

	function startGame() {
		if (!state.modelReady) {
			setHint('Moai model is still loading. Please wait...');
			return;
		}
		clearEntities();
		state.isRunning = true;
		state.score = 0;
		state.lives = 3;
		state.spawnCooldown = 0.35;
		updateHud();
		setHint('Slice the falling Moais before they hit the bottom.');
		setStatus('Ready');
	}

	function removeTargetAt(index) {
		if (index < 0 || index >= state.targets.length) {
			return;
		}
		const target = state.targets[index];
		disposeMesh(target.mesh);
		state.targets.splice(index, 1);
	}

	function removeDebrisAt(index) {
		if (index < 0 || index >= state.debris.length) {
			return;
		}
		const chunk = state.debris[index];
		disposeMesh(chunk.mesh);
		state.debris.splice(index, 1);
	}

	function spawnMoai() {
		if (!state.moaiAsset || state.targets.length >= state.maxTargets) {
			return;
		}

		const mesh = new THREE.Mesh(
			state.moaiAsset.geometry.clone(),
			state.moaiAsset.material.clone()
		);
		mesh.castShadow = true;
		mesh.receiveShadow = true;

		const scale = THREE.MathUtils.randFloat(0.4, 0.9);
		mesh.scale.setScalar(scale);
		mesh.position.set(
			THREE.MathUtils.randFloat(-3.1, 3.1),
			THREE.MathUtils.randFloat(3.6, 5.4),
			THREE.MathUtils.randFloat(-0.8, 0.8)
		);
		mesh.rotation.copy(state.moaiAsset.rotation);
		mesh.rotation.y += THREE.MathUtils.randFloat(-0.8, 0.8);
		moaiGroup.add(mesh);

		state.targets.push({
			mesh,
			radius: state.moaiAsset.radius * scale,
			velocity: new THREE.Vector3(
				THREE.MathUtils.randFloat(-0.75, 0.75),
				THREE.MathUtils.randFloat(-1.2, -2.1),
				THREE.MathUtils.randFloat(-0.5, 0.5)
			),
			angularVelocity: new THREE.Vector3(
				THREE.MathUtils.randFloat(-1.1, 1.1),
				THREE.MathUtils.randFloat(-0.9, 0.9),
				THREE.MathUtils.randFloat(-0.8, 0.8)
			)
		});
	}

	function distancePointToSegment(point, start, end) {
		tmpVecA.copy(end).sub(start);
		const lenSq = tmpVecA.lengthSq();
		if (lenSq < 0.000001) {
			return point.distanceTo(start);
		}
		tmpVecB.copy(point).sub(start);
		const t = THREE.MathUtils.clamp(tmpVecB.dot(tmpVecA) / lenSq, 0, 1);
		tmpVecC.copy(start).addScaledVector(tmpVecA, t);
		return point.distanceTo(tmpVecC);
	}

	function scoreHit(base = 10) {
		state.score += base;
		if (state.score > state.bestScore) {
			state.bestScore = state.score;
		}
		updateHud();
	}

	function makeDebris(mesh, velocity, ttl) {
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		debrisGroup.add(mesh);
		state.debris.push({
			mesh,
			velocity,
			angularVelocity: new THREE.Vector3(
				THREE.MathUtils.randFloat(-2.5, 2.5),
				THREE.MathUtils.randFloat(-2.5, 2.5),
				THREE.MathUtils.randFloat(-2.5, 2.5)
			),
			ttl
		});
	}

	function trySliceTarget(targetIndex, worldPlane, planeNormal) {
		const target = state.targets[targetIndex];
		if (!target) {
			return false;
		}
		const original = target.mesh;

		if (!intersectsPlane(original, worldPlane)) {
			return false;
		}

		const sliced = sliceMeshByPlane(original, worldPlane);
		removeTargetAt(targetIndex);

		if (!sliced) {
			scoreHit(8);
			playSliceSound();
			return true;
		}

		const push = planeNormal.clone().multiplyScalar(1.9);
		const upward = new THREE.Vector3(0, 1.3, 0);
		makeDebris(
			sliced.positiveMesh,
			target.velocity.clone().add(push).add(upward),
			2.1
		);
		makeDebris(
			sliced.negativeMesh,
			target.velocity.clone().addScaledVector(push, -1).add(upward),
			2.1
		);

		scoreHit(12);
		playSliceSound();
		return true;
	}

	function handleSwipeSlice(start, end) {
		if (!state.isRunning || state.targets.length === 0) {
			return;
		}

		const swipeDirection = end.clone().sub(start);
		if (swipeDirection.lengthSq() < 0.03) {
			return;
		}

		const viewDir = new THREE.Vector3();
		camera.getWorldDirection(viewDir);
		const planeNormal = new THREE.Vector3().crossVectors(swipeDirection, viewDir).normalize();
		if (planeNormal.lengthSq() < 0.0001) {
			return;
		}

		const midpoint = start.clone().add(end).multiplyScalar(0.5);
		const worldPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, midpoint);

		let slicedAny = false;
		for (let i = state.targets.length - 1; i >= 0; i -= 1) {
			const target = state.targets[i];
			const corridorDistance = distancePointToSegment(target.mesh.position, start, end);
			if (corridorDistance > target.radius * 1.15) {
				continue;
			}
			slicedAny = trySliceTarget(i, worldPlane, planeNormal) || slicedAny;
		}

		if (slicedAny) {
			setHint('Nice slice! Keep the combo going.');
		}
	}

	function updateTargets(dt) {
		for (let i = state.targets.length - 1; i >= 0; i -= 1) {
			const target = state.targets[i];
			target.velocity.y -= state.gravity * dt;
			target.mesh.position.addScaledVector(target.velocity, dt);
			target.mesh.rotation.x += target.angularVelocity.x * dt;
			target.mesh.rotation.y += target.angularVelocity.y * dt;
			target.mesh.rotation.z += target.angularVelocity.z * dt;

			if (target.mesh.position.y < state.arenaBottom) {
				removeTargetAt(i);
				if (state.isRunning) {
					state.lives -= 1;
					updateHud();
					if (state.lives <= 0) {
						endGame();
					} else {
						setHint('Missed one! Slice the next Moai.');
					}
				}
			}
		}
	}

	function updateDebris(dt) {
		for (let i = state.debris.length - 1; i >= 0; i -= 1) {
			const chunk = state.debris[i];
			chunk.ttl -= dt;
			chunk.velocity.y -= state.gravity * dt * 1.2;
			chunk.mesh.position.addScaledVector(chunk.velocity, dt);
			chunk.mesh.rotation.x += chunk.angularVelocity.x * dt;
			chunk.mesh.rotation.y += chunk.angularVelocity.y * dt;
			chunk.mesh.rotation.z += chunk.angularVelocity.z * dt;

			if (chunk.ttl <= 0 || chunk.mesh.position.y < state.arenaBottom - 1.1) {
				removeDebrisAt(i);
			}
		}
	}

	function updateSpawner(dt) {
		if (!state.isRunning || !state.modelReady) {
			return;
		}
		state.spawnCooldown -= dt;
		if (state.spawnCooldown > 0) {
			return;
		}

		spawnMoai();
		const pace = Math.max(0.32, 0.95 - state.score * 0.0028);
		state.spawnCooldown = THREE.MathUtils.randFloat(pace * 0.75, pace * 1.15);
	}

	function onPointerDown(event) {
		if (event.button !== 0) {
			return;
		}
		if (!pointerToWorld(event.clientX, event.clientY, state.pointerCurrentWorld)) {
			return;
		}
		canvas.setPointerCapture(event.pointerId);
		state.pointerPrevWorld.copy(state.pointerCurrentWorld);
		state.pointerActive = true;
		slashLine.visible = true;
		state.slashAlpha = 1;
		setHint(state.isRunning ? 'Slash through Moais.' : 'Press Start Game to begin.');
	}

	function onPointerMove(event) {
		if (!state.pointerActive) {
			return;
		}
		if (!pointerToWorld(event.clientX, event.clientY, state.pointerCurrentWorld)) {
			return;
		}

		handleSwipeSlice(state.pointerPrevWorld, state.pointerCurrentWorld);

		slashLine.geometry.setFromPoints([state.pointerPrevWorld, state.pointerCurrentWorld]);
		state.slashAlpha = 0.95;
		state.pointerPrevWorld.copy(state.pointerCurrentWorld);
	}

	function onPointerUp(event) {
		if (!state.pointerActive) {
			return;
		}
		state.pointerActive = false;
		canvas.releasePointerCapture(event.pointerId);
	}

	canvas.addEventListener('pointerdown', onPointerDown);
	canvas.addEventListener('pointermove', onPointerMove);
	canvas.addEventListener('pointerup', onPointerUp);
	canvas.addEventListener('pointercancel', onPointerUp);
	canvas.addEventListener('contextmenu', (event) => event.preventDefault());

	if (hud.reset) {
		hud.reset.addEventListener('click', () => {
			startGame();
		});
	}

	function resize() {
		const rect = canvas.getBoundingClientRect();
		const width = Math.max(1, Math.floor(rect.width));
		const height = Math.max(1, Math.floor(rect.height));
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}
	window.addEventListener('resize', resize);
	resize();

	async function loadMoaiAsset() {
		const loader = new GLTFLoader();
		const fbxLoader = new FBXLoader();
		const textureLoader = new THREE.TextureLoader();
		setStatus('Loading moai...');

		try {
			const [baseColorMap, normalMap, roughnessMap] = await Promise.all([
				textureLoader.loadAsync('../../models/moai/DefaultMaterial_BaseColor.png'),
				textureLoader.loadAsync('../../models/moai/DefaultMaterial_Normal.png'),
				textureLoader.loadAsync('../../models/moai/DefaultMaterial_Roughness.png')
			]);

			baseColorMap.colorSpace = THREE.SRGBColorSpace;
			baseColorMap.flipY = false;
			normalMap.flipY = false;
			roughnessMap.flipY = false;

			let root = null;
			let loadedFromFbx = false;
			try {
				const gltf = await loader.loadAsync('../../models/moai/moai.glb');
				root = gltf.scene;
			} catch (_glbError) {
				root = await fbxLoader.loadAsync('../../models/moai/Moai.fbx');
				loadedFromFbx = true;
			}

			let sourceMesh = null;
			root.traverse((child) => {
				if (child.isMesh && !sourceMesh) {
					sourceMesh = child;
				}
			});

			if (!sourceMesh) {
				throw new Error('No mesh found in loaded asset.');
			}

			const geometry = sourceMesh.geometry.clone();
			geometry.computeBoundingSphere();
			geometry.computeVertexNormals();

			const material = new THREE.MeshStandardMaterial({
				color: 0xffffff,
				map: baseColorMap,
				normalMap,
				roughnessMap,
				roughness: 1,
				metalness: 0.03,
				side: THREE.DoubleSide
			});

			state.moaiAsset = {
				geometry,
				material,
				radius: Math.max(0.55, geometry.boundingSphere?.radius || 0.8),
				rotation: new THREE.Euler(loadedFromFbx ? -Math.PI * 0.5 : 0, Math.PI * 0.12, 0)
			};
			state.modelReady = true;
			setStatus('Moai loaded');
			setHint('Press Start Game, then slice falling Moais.');
			updateHud();
		} catch (error) {
			console.warn('Falling back to procedural moai.', error);
			const geometry = new THREE.CylinderGeometry(0.55, 0.75, 1.8, 12, 8);
			const pos = geometry.attributes.position;
			for (let i = 0; i < pos.count; i += 1) {
				tmpVecA.fromBufferAttribute(pos, i);
				const n = Math.sin(tmpVecA.y * 5.3) * Math.cos(tmpVecA.x * 4.1) * 0.09;
				tmpVecA.x *= 1 + n;
				tmpVecA.z *= 1 + n;
				pos.setXYZ(i, tmpVecA.x, tmpVecA.y + 0.1, tmpVecA.z);
			}
			pos.needsUpdate = true;
			geometry.computeBoundingSphere();
			geometry.computeVertexNormals();

			const material = new THREE.MeshStandardMaterial({
				color: 0xa4acb6,
				roughness: 0.92,
				metalness: 0.05,
				side: THREE.DoubleSide
			});

			state.moaiAsset = {
				geometry,
				material,
				radius: Math.max(0.55, geometry.boundingSphere?.radius || 0.8),
				rotation: new THREE.Euler(0, Math.PI * 0.12, 0)
			};
			state.modelReady = true;
			setStatus('Using fallback moai');
			setHint('Press Start Game, then slice falling Moais.');
			updateHud();
		}
	}

	const clock = new THREE.Clock();
	function animate() {
		const dt = Math.min(clock.getDelta(), 1 / 30);
		updateSpawner(dt);
		updateTargets(dt);
		updateDebris(dt);

		if (state.slashAlpha > 0.001) {
			state.slashAlpha = Math.max(0, state.slashAlpha - dt * 4.2);
			slashLine.visible = true;
			slashLine.material.opacity = state.slashAlpha;
		} else {
			slashLine.visible = false;
		}

		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}

	updateHud();
	loadMoaiAsset();
	animate();
}
