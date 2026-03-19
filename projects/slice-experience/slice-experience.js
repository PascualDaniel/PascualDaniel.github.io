import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { intersectsPlane, sliceMeshByPlane } from './lib/mesh-slicer.js';

const canvas = document.getElementById('slice-canvas');

if (canvas) {
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(0x0b0f1f);
	scene.fog = new THREE.FogExp2(0x0b0f1f, 0.035);

	const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
	camera.position.set(0, 1.8, 5.6);

	const renderer = new THREE.WebGLRenderer({
		canvas,
		antialias: true,
		powerPreference: 'high-performance'
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.05;
	controls.minDistance = 2.5;
	controls.maxDistance = 10;
	controls.maxPolarAngle = Math.PI * 0.49;
	controls.target.set(0, 1, 0);

	const hemiLight = new THREE.HemisphereLight(0xa7c4ff, 0x1f160f, 0.55);
	scene.add(hemiLight);

	const keyLight = new THREE.DirectionalLight(0xfff5d8, 1.45);
	keyLight.position.set(3.2, 5.2, 3.5);
	keyLight.castShadow = true;
	keyLight.shadow.mapSize.set(2048, 2048);
	keyLight.shadow.camera.left = -6;
	keyLight.shadow.camera.right = 6;
	keyLight.shadow.camera.top = 6;
	keyLight.shadow.camera.bottom = -6;
	scene.add(keyLight);

	const rimLight = new THREE.DirectionalLight(0x5fa3ff, 0.75);
	rimLight.position.set(-4, 2.5, -2);
	scene.add(rimLight);

	const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
	const floor = new THREE.Mesh(new THREE.CircleGeometry(10, 96), floorMat);
	floor.rotation.x = -Math.PI * 0.5;
	floor.position.y = -0.02;
	floor.receiveShadow = true;
	scene.add(floor);

	const piecesGroup = new THREE.Group();
	scene.add(piecesGroup);

	const state = {
		meshPieces: [],
		isDragging: false,
		dragStartWorld: new THREE.Vector3(),
		dragCurrentWorld: new THREE.Vector3(),
		lastCutTime: 0,
		maxPieces: 64
	};

	const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1);
	const raycaster = new THREE.Raycaster();
	const ndc = new THREE.Vector2();

	const planeGuide = new THREE.Mesh(
		new THREE.PlaneGeometry(2.6, 2.6),
		new THREE.MeshBasicMaterial({
			color: 0x8ab8ff,
			opacity: 0.2,
			transparent: true,
			side: THREE.DoubleSide,
			depthWrite: false
		})
	);
	planeGuide.visible = false;
	scene.add(planeGuide);

	const dragLine = new THREE.Line(
		new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
		new THREE.LineBasicMaterial({ color: 0x9ec6ff, transparent: true, opacity: 0.8 })
	);
	dragLine.visible = false;
	scene.add(dragLine);

	const cutHint = document.getElementById('slice-hint');
	const stats = document.getElementById('slice-stats');
	const modelStatus = document.getElementById('slice-model-status');
	const resetButton = document.getElementById('slice-reset');

	function setModelStatus(text) {
		if (modelStatus) {
			modelStatus.textContent = text;
		}
	}

	let audioContext;
	function playSliceSound() {
		if (!window.AudioContext && !window.webkitAudioContext) {
			return;
		}
		audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
		const now = audioContext.currentTime;
		const oscillator = audioContext.createOscillator();
		const gain = audioContext.createGain();
		oscillator.type = 'triangle';
		oscillator.frequency.setValueAtTime(600, now);
		oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.12);
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(0.09, now + 0.015);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
		oscillator.connect(gain);
		gain.connect(audioContext.destination);
		oscillator.start(now);
		oscillator.stop(now + 0.18);
	}

	function updateStats() {
		if (stats) {
			stats.textContent = `Pieces: ${state.meshPieces.length}`;
		}
	}

	function createFallbackRock() {
		const geometry = new THREE.IcosahedronGeometry(1, 3);
		const pos = geometry.attributes.position;
		const v = new THREE.Vector3();
		for (let i = 0; i < pos.count; i += 1) {
			v.fromBufferAttribute(pos, i);
			const noise = Math.sin(v.x * 4.2) * Math.cos(v.y * 5.1) * Math.sin(v.z * 3.6);
			v.multiplyScalar(1 + noise * 0.12);
			pos.setXYZ(i, v.x, v.y + 0.8, v.z);
		}
		pos.needsUpdate = true;
		geometry.computeVertexNormals();

		const material = new THREE.MeshStandardMaterial({
			color: 0xa4acb6,
			roughness: 0.9,
			metalness: 0.1,
			side: THREE.DoubleSide
		});
		const mesh = new THREE.Mesh(geometry, material);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.userData.velocity = new THREE.Vector3();
		piecesGroup.add(mesh);
		state.meshPieces = [mesh];
		updateStats();
	}

	function frameObject(mesh) {
		const box = new THREE.Box3().setFromObject(mesh);
		const size = box.getSize(new THREE.Vector3()).length();
		const center = box.getCenter(new THREE.Vector3());
		controls.target.copy(center);
		camera.near = Math.max(size / 100, 0.1);
		camera.far = Math.max(size * 12, 30);
		camera.position.copy(center).add(new THREE.Vector3(size * 0.35, size * 0.3, size * 0.8));
		camera.updateProjectionMatrix();
	}

	function registerPiece(mesh) {
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.userData.velocity = mesh.userData.velocity || new THREE.Vector3();
		piecesGroup.add(mesh);
	}

	function clearPieces() {
		state.meshPieces.forEach((mesh) => {
			piecesGroup.remove(mesh);
			mesh.geometry.dispose();
			if (Array.isArray(mesh.material)) {
				mesh.material.forEach((mat) => mat.dispose());
			} else {
				mesh.material.dispose();
			}
		});
		state.meshPieces = [];
	}

	async function loadMainMesh() {
		clearPieces();
		const loader = new GLTFLoader();
		const fbxLoader = new FBXLoader();
		const textureLoader = new THREE.TextureLoader();
		setModelStatus('Loading Moai mesh...');

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
				throw new Error('No mesh found in moai.glb');
			}

			const geometry = sourceMesh.geometry.clone();
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

			const mesh = new THREE.Mesh(geometry, material);
			mesh.position.set(0, 0.1, 0);
			mesh.scale.setScalar(1.5);
			mesh.rotation.set(loadedFromFbx ? -Math.PI * 0.5 : 0, Math.PI * 0.13, 0);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			mesh.userData.velocity = new THREE.Vector3();
			registerPiece(mesh);
			state.meshPieces = [mesh];
			frameObject(mesh);
			updateStats();
			setModelStatus('Moai loaded');
		} catch (error) {
			console.warn('Falling back to procedural rock. Put moai model at models/moai/moai.glb', error);
			setModelStatus('Moai mesh missing: add models/moai/moai.glb');
			createFallbackRock();
			if (state.meshPieces[0]) {
				frameObject(state.meshPieces[0]);
			}
		}
	}

	function pointerToWorld(clientX, clientY, target) {
		const rect = canvas.getBoundingClientRect();
		ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
		ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
		raycaster.setFromCamera(ndc, camera);
		return raycaster.ray.intersectPlane(interactionPlane, target);
	}

	function updateGuide(startPoint, endPoint) {
		const dragVector = endPoint.clone().sub(startPoint);
		const dragLength = dragVector.length();
		if (dragLength < 0.15) {
			planeGuide.visible = false;
			dragLine.visible = false;
			return null;
		}

		dragLine.visible = true;
		dragLine.geometry.setFromPoints([startPoint, endPoint]);

		const midpoint = startPoint.clone().add(endPoint).multiplyScalar(0.5);
		const planeNormal = new THREE.Vector3().crossVectors(dragVector, new THREE.Vector3(0, 1, 0)).normalize();
		if (planeNormal.lengthSq() < 0.0001) {
			planeGuide.visible = false;
			return null;
		}

		const worldPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(planeNormal, midpoint);
		const lookTarget = midpoint.clone().add(planeNormal);
		planeGuide.visible = true;
		planeGuide.position.copy(midpoint);
		planeGuide.lookAt(lookTarget);

		return worldPlane;
	}

	function applyPhysics(dt) {
		for (const mesh of state.meshPieces) {
			const velocity = mesh.userData.velocity;
			if (!velocity) {
				continue;
			}

			velocity.y -= 6.5 * dt;
			mesh.position.addScaledVector(velocity, dt);
			mesh.rotation.x += velocity.z * dt * 0.35;
			mesh.rotation.z += velocity.x * dt * 0.35;

			if (mesh.position.y < 0.2) {
				mesh.position.y = 0.2;
				velocity.y *= -0.32;
				velocity.x *= 0.82;
				velocity.z *= 0.82;
			}
		}
	}

	function sliceWithPlane(worldPlane) {
		const now = performance.now();
		if (now - state.lastCutTime < 120) {
			return;
		}
		state.lastCutTime = now;

		const nextPieces = [];
		let splitCount = 0;
		for (const mesh of state.meshPieces) {
			if (!intersectsPlane(mesh, worldPlane) || state.meshPieces.length + splitCount >= state.maxPieces) {
				nextPieces.push(mesh);
				continue;
			}

			const sliced = sliceMeshByPlane(mesh, worldPlane);
			if (!sliced) {
				nextPieces.push(mesh);
				continue;
			}

			piecesGroup.remove(mesh);
			mesh.geometry.dispose();
			if (Array.isArray(mesh.material)) {
				mesh.material.forEach((mat) => mat.dispose());
			} else {
				mesh.material.dispose();
			}

			const impulse = sliced.planeNormal.clone().multiplyScalar(1.4);
			sliced.positiveMesh.userData.velocity = (mesh.userData.velocity || new THREE.Vector3()).clone().add(impulse);
			sliced.negativeMesh.userData.velocity = (mesh.userData.velocity || new THREE.Vector3()).clone().addScaledVector(impulse, -1);

			registerPiece(sliced.positiveMesh);
			registerPiece(sliced.negativeMesh);
			nextPieces.push(sliced.positiveMesh, sliced.negativeMesh);
			splitCount += 1;
		}

		state.meshPieces = nextPieces;
		updateStats();
		if (splitCount > 0) {
			playSliceSound();
		}
	}

	function onPointerDown(event) {
		if (event.button !== 0) {
			return;
		}
		if (!pointerToWorld(event.clientX, event.clientY, state.dragStartWorld)) {
			return;
		}
		state.dragCurrentWorld.copy(state.dragStartWorld);
		state.isDragging = true;
		dragLine.visible = true;
		if (cutHint) {
			cutHint.textContent = 'Release to cut. Drag direction defines the slice plane.';
		}
	}

	function onPointerMove(event) {
		if (!state.isDragging) {
			return;
		}
		if (!pointerToWorld(event.clientX, event.clientY, state.dragCurrentWorld)) {
			return;
		}
		updateGuide(state.dragStartWorld, state.dragCurrentWorld);
	}

	function onPointerUp(event) {
		if (!state.isDragging) {
			return;
		}
		state.isDragging = false;
		if (!pointerToWorld(event.clientX, event.clientY, state.dragCurrentWorld)) {
			planeGuide.visible = false;
			dragLine.visible = false;
			return;
		}

		const worldPlane = updateGuide(state.dragStartWorld, state.dragCurrentWorld);
		if (worldPlane) {
			sliceWithPlane(worldPlane);
		}

		setTimeout(() => {
			planeGuide.visible = false;
			dragLine.visible = false;
		}, 130);

		if (cutHint) {
			cutHint.textContent = 'Click and drag across the model to slice it again.';
		}
	}

	canvas.addEventListener('pointerdown', onPointerDown);
	window.addEventListener('pointermove', onPointerMove);
	window.addEventListener('pointerup', onPointerUp);

	if (resetButton) {
		resetButton.addEventListener('click', () => {
			loadMainMesh();
			if (cutHint) {
				cutHint.textContent = 'Click and drag across the model to define a slicing plane.';
			}
		});
	}

	const clock = new THREE.Clock();
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

	function animate() {
		const dt = Math.min(clock.getDelta(), 1 / 30);
		applyPhysics(dt);
		controls.update();
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	}

	loadMainMesh();
	animate();
}
