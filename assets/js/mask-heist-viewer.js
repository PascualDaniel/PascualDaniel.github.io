import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js';

const canvas = document.querySelector('#mask-sprite-canvas');

if (canvas) {
	const sheetSelect = document.querySelector('#sprite-sheet-select');
	const animationSelect = document.querySelector('#sprite-animation-select');
	const fpsInput = document.querySelector('#sprite-fps');
	const scaleInput = document.querySelector('#sprite-scale');
	const toggleButton = document.querySelector('#sprite-toggle');
	const metaOutput = document.querySelector('#sprite-meta');

	const spriteSheets = [
		{ label: 'Guard', metaUrl: '../images/pixel-Art/Guard.json' },
		{ label: 'Thief', metaUrl: '../images/pixel-Art/ThiefSheet.json' },
		{ label: 'Sumerian Mask', metaUrl: '../images/pixel-Art/MascaraSumeria.json' }
	];

	const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
	camera.position.z = 2;

	const planeGeometry = new THREE.PlaneGeometry(1, 1);
	const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
	const spritePlane = new THREE.Mesh(planeGeometry, planeMaterial);
	scene.add(spritePlane);

	const textureLoader = new THREE.TextureLoader();

	let currentMeta = null;
	let currentAnimation = null;
	let currentFrame = 0;
	let isPlaying = true;
	let lastFrameTime = 0;
	let frameDuration = 1000 / Number(fpsInput.value);
	let columns = 1;
	let rows = 1;

	const setCanvasSize = () => {
		const rect = canvas.getBoundingClientRect();
		renderer.setSize(rect.width, rect.height, false);
	};

	const updateTextureFrame = () => {
		if (!planeMaterial.map || !currentAnimation) {
			return;
		}
		const frameWidth = currentMeta.frameWidth;
		const frameHeight = currentMeta.frameHeight;
		columns = Math.floor(planeMaterial.map.image.width / frameWidth);
		rows = Math.floor(planeMaterial.map.image.height / frameHeight);

		planeMaterial.map.repeat.set(1 / columns, 1 / rows);
		const columnIndex = currentFrame % columns;
		const rowIndex = currentAnimation.row;
		planeMaterial.map.offset.set(
			columnIndex / columns,
			1 - (rowIndex + 1) / rows
		);
	};

	const updatePlaneScale = () => {
		if (!currentMeta) {
			return;
		}
		const aspect = currentMeta.frameWidth / currentMeta.frameHeight;
		const scale = Number(scaleInput.value);
		spritePlane.scale.set(aspect * scale, scale, 1);
	};

	const refreshMetaText = () => {
		if (!currentMeta || !currentAnimation) {
			metaOutput.textContent = 'Select a sprite sheet to start previewing.';
			return;
		}
		metaOutput.textContent = `${currentMeta.name} · ${currentAnimation.name} · ${currentAnimation.frames} frames @ ${Math.round(frameDuration)}ms`;
	};

	const loadSpriteSheet = async (metaUrl) => {
		const response = await fetch(metaUrl);
		currentMeta = await response.json();

		animationSelect.innerHTML = '';
		currentMeta.animations.forEach((animation, index) => {
			const option = document.createElement('option');
			option.value = String(index);
			option.textContent = animation.name;
			animationSelect.appendChild(option);
		});

		currentAnimation = currentMeta.animations[0];
		currentFrame = 0;

		await new Promise((resolve, reject) => {
			textureLoader.load(
				`../${currentMeta.image}`,
				(texture) => {
					texture.magFilter = THREE.NearestFilter;
					texture.minFilter = THREE.NearestFilter;
					texture.wrapS = THREE.ClampToEdgeWrapping;
					texture.wrapT = THREE.ClampToEdgeWrapping;
					texture.flipY = false;
					planeMaterial.map = texture;
					planeMaterial.needsUpdate = true;
					updatePlaneScale();
					updateTextureFrame();
					refreshMetaText();
					resolve();
				},
				undefined,
				(error) => reject(error)
			);
		});
	};

	const updateAnimation = () => {
		const animationIndex = Number(animationSelect.value || 0);
		currentAnimation = currentMeta.animations[animationIndex];
		currentFrame = 0;
		updateTextureFrame();
		refreshMetaText();
	};

	const animate = (time) => {
		setCanvasSize();
		if (isPlaying && currentAnimation) {
			if (time - lastFrameTime > frameDuration) {
				currentFrame = (currentFrame + 1) % currentAnimation.frames;
				lastFrameTime = time;
				updateTextureFrame();
			}
		}
		renderer.render(scene, camera);
		requestAnimationFrame(animate);
	};

	spriteSheets.forEach((sheet, index) => {
		const option = document.createElement('option');
		option.value = sheet.metaUrl;
		option.textContent = sheet.label;
		if (index === 0) {
			option.selected = true;
		}
		sheetSelect.appendChild(option);
	});

	sheetSelect.addEventListener('change', async (event) => {
		await loadSpriteSheet(event.target.value);
	});

	animationSelect.addEventListener('change', updateAnimation);

	fpsInput.addEventListener('input', () => {
		frameDuration = 1000 / Number(fpsInput.value);
		refreshMetaText();
	});

	scaleInput.addEventListener('input', () => {
		updatePlaneScale();
	});

	toggleButton.addEventListener('click', () => {
		isPlaying = !isPlaying;
		toggleButton.textContent = isPlaying ? 'Pause' : 'Play';
	});

	window.addEventListener('resize', setCanvasSize);

	loadSpriteSheet(spriteSheets[0].metaUrl).then(() => {
		requestAnimationFrame(animate);
	});
}
