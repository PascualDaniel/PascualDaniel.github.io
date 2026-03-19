import * as THREE from 'three';

const EPSILON = 1e-5;
const POINT_MERGE_EPSILON = 1e-4;

function clipPolygonToHalfSpace(points, plane, keepPositive) {
	const result = [];

	for (let i = 0; i < points.length; i += 1) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		const currentDist = plane.distanceToPoint(current);
		const nextDist = plane.distanceToPoint(next);
		const currentInside = keepPositive ? currentDist >= 0 : currentDist <= 0;
		const nextInside = keepPositive ? nextDist >= 0 : nextDist <= 0;

		if (currentInside && nextInside) {
			result.push(next.clone());
		} else if (currentInside && !nextInside) {
			const t = currentDist / (currentDist - nextDist);
			const intersection = current.clone().lerp(next, THREE.MathUtils.clamp(t, 0, 1));
			result.push(intersection);
		} else if (!currentInside && nextInside) {
			const t = currentDist / (currentDist - nextDist);
			const intersection = current.clone().lerp(next, THREE.MathUtils.clamp(t, 0, 1));
			result.push(intersection);
			result.push(next.clone());
		}
	}

	return result;
}

function triangulatePolygon(points, target) {
	if (!points || points.length < 3) {
		return;
	}

	for (let i = 1; i < points.length - 1; i += 1) {
		const a = points[0];
		const b = points[i];
		const c = points[i + 1];
		target.push(a.x, a.y, a.z);
		target.push(b.x, b.y, b.z);
		target.push(c.x, c.y, c.z);
	}
}

function keyForPoint(point, epsilon = POINT_MERGE_EPSILON) {
	return [point.x, point.y, point.z]
		.map((value) => Math.round(value / epsilon))
		.join('_');
}

function edgeKey(a, b) {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function dedupePoints(points, epsilon = POINT_MERGE_EPSILON) {
	const unique = [];
	for (const point of points) {
		let found = false;
		for (const current of unique) {
			if (current.distanceToSquared(point) <= epsilon * epsilon) {
				found = true;
				break;
			}
		}
		if (!found) {
			unique.push(point.clone());
		}
	}
	return unique;
}

function collectTriangleSegment(triangle, plane) {
	const intersections = [];
	const edges = [
		[triangle[0], triangle[1]],
		[triangle[1], triangle[2]],
		[triangle[2], triangle[0]]
	];

	for (const [a, b] of edges) {
		const da = plane.distanceToPoint(a);
		const db = plane.distanceToPoint(b);

		const aOn = Math.abs(da) <= EPSILON;
		const bOn = Math.abs(db) <= EPSILON;
		if (aOn && bOn) {
			continue;
		}

		if ((da > EPSILON && db < -EPSILON) || (da < -EPSILON && db > EPSILON)) {
			const t = da / (da - db);
			intersections.push(a.clone().lerp(b, THREE.MathUtils.clamp(t, 0, 1)));
		} else if (aOn) {
			intersections.push(a.clone());
		} else if (bOn) {
			intersections.push(b.clone());
		}
	}

	const unique = dedupePoints(intersections);
	if (unique.length < 2) {
		return null;
	}

	if (unique.length === 2) {
		return [unique[0], unique[1]];
	}

	let bestA = unique[0];
	let bestB = unique[1];
	let bestDistance = bestA.distanceToSquared(bestB);
	for (let i = 0; i < unique.length; i += 1) {
		for (let j = i + 1; j < unique.length; j += 1) {
			const distance = unique[i].distanceToSquared(unique[j]);
			if (distance > bestDistance) {
				bestDistance = distance;
				bestA = unique[i];
				bestB = unique[j];
			}
		}
	}

	return [bestA, bestB];
}

function buildLoopsFromSegments(segments) {
	const nodes = new Map();
	const edges = new Set();

	for (const [a, b] of segments) {
		if (a.distanceToSquared(b) <= POINT_MERGE_EPSILON * POINT_MERGE_EPSILON) {
			continue;
		}

		const keyA = keyForPoint(a);
		const keyB = keyForPoint(b);
		if (keyA === keyB) {
			continue;
		}

		if (!nodes.has(keyA)) {
			nodes.set(keyA, { point: a.clone(), neighbors: new Set() });
		}
		if (!nodes.has(keyB)) {
			nodes.set(keyB, { point: b.clone(), neighbors: new Set() });
		}

		nodes.get(keyA).neighbors.add(keyB);
		nodes.get(keyB).neighbors.add(keyA);
		edges.add(edgeKey(keyA, keyB));
	}

	const visitedEdges = new Set();
	const loops = [];

	for (const edge of edges) {
		if (visitedEdges.has(edge)) {
			continue;
		}

		const [start, first] = edge.split('|');
		const loop = [nodes.get(start).point.clone()];
		let previous = start;
		let current = first;
		let guard = 0;

		visitedEdges.add(edgeKey(previous, current));

		while (guard < 10000) {
			guard += 1;
			loop.push(nodes.get(current).point.clone());

			if (current === start) {
				break;
			}

			const neighbors = [...nodes.get(current).neighbors];
			let next = null;
			for (const candidate of neighbors) {
				const candidateEdge = edgeKey(current, candidate);
				if (!visitedEdges.has(candidateEdge)) {
					next = candidate;
					break;
				}
			}

			if (!next) {
				break;
			}

			visitedEdges.add(edgeKey(current, next));
			previous = current;
			current = next;
		}

		if (loop.length >= 4) {
			if (loop[0].distanceToSquared(loop[loop.length - 1]) <= POINT_MERGE_EPSILON * POINT_MERGE_EPSILON) {
				loop.pop();
			}
			if (loop.length >= 3) {
				loops.push(loop);
			}
		}
	}

	return loops;
}

function pushTriangleFacing(a, b, c, desiredNormal, target) {
	const ab = b.clone().sub(a);
	const ac = c.clone().sub(a);
	const normal = ab.cross(ac);
	if (normal.dot(desiredNormal) < 0) {
		target.push(a.x, a.y, a.z);
		target.push(c.x, c.y, c.z);
		target.push(b.x, b.y, b.z);
		return;
	}

	target.push(a.x, a.y, a.z);
	target.push(b.x, b.y, b.z);
	target.push(c.x, c.y, c.z);
}

function triangulateCapLoop(loop, planeNormal, positiveTarget, negativeTarget) {
	if (!loop || loop.length < 3) {
		return;
	}

	const helper = Math.abs(planeNormal.y) > 0.9
		? new THREE.Vector3(1, 0, 0)
		: new THREE.Vector3(0, 1, 0);
	const tangent = new THREE.Vector3().crossVectors(helper, planeNormal).normalize();
	const bitangent = new THREE.Vector3().crossVectors(planeNormal, tangent).normalize();

	const shapePoints = loop.map((point) => new THREE.Vector2(point.dot(tangent), point.dot(bitangent)));
	let triangles = THREE.ShapeUtils.triangulateShape(shapePoints, []);

	if (!triangles || triangles.length === 0) {
		triangles = [];
		for (let i = 1; i < loop.length - 1; i += 1) {
			triangles.push([0, i, i + 1]);
		}
	}

	const positiveNormal = planeNormal.clone().negate();
	const negativeNormal = planeNormal.clone();

	for (const [i0, i1, i2] of triangles) {
		const a = loop[i0];
		const b = loop[i1];
		const c = loop[i2];
		pushTriangleFacing(a, b, c, positiveNormal, positiveTarget);
		pushTriangleFacing(a, b, c, negativeNormal, negativeTarget);
	}
}

function buildGeometryFromPositions(positions) {
	if (!positions || positions.length < 9) {
		return null;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
	geometry.computeBoundingBox();

	const bbox = geometry.boundingBox;
	const size = bbox.getSize(new THREE.Vector3());
	const spanX = Math.max(size.x, EPSILON);
	const spanZ = Math.max(size.z, EPSILON);
	const uv = new Float32Array((positions.length / 3) * 2);

	for (let i = 0, vi = 0; i < positions.length; i += 3, vi += 2) {
		const x = positions[i];
		const z = positions[i + 2];
		uv[vi] = (x - bbox.min.x) / spanX;
		uv[vi + 1] = (z - bbox.min.z) / spanZ;
	}

	geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
	geometry.computeVertexNormals();
	geometry.computeBoundingSphere();
	return geometry;
}

function cloneMaterial(material) {
	const configure = (mat) => {
		mat.side = THREE.DoubleSide;
		mat.transparent = false;
		mat.depthWrite = true;
		return mat;
	};

	if (Array.isArray(material)) {
		return material.map((entry) => configure(entry.clone()));
	}
	return configure(material.clone());
}

export function intersectsPlane(mesh, plane, epsilon = 0.001) {
	const geometry = mesh.geometry;
	if (!geometry.boundingSphere) {
		geometry.computeBoundingSphere();
	}

	const sphere = geometry.boundingSphere;
	const center = sphere.center.clone().applyMatrix4(mesh.matrixWorld);
	const scale = mesh.getWorldScale(new THREE.Vector3());
	const radius = sphere.radius * Math.max(scale.x, scale.y, scale.z);
	return Math.abs(plane.distanceToPoint(center)) < radius + epsilon;
}

export function sliceMeshByPlane(mesh, worldPlane) {
	const source = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
	const positions = source.getAttribute('position');
	if (!positions || positions.count < 3) {
		source.dispose();
		return null;
	}

	const inverseMatrix = mesh.matrixWorld.clone().invert();
	const localPlane = worldPlane.clone();
	const normalMatrix = new THREE.Matrix3().getNormalMatrix(inverseMatrix);
	localPlane.applyMatrix4(inverseMatrix, normalMatrix);

	const positivePositions = [];
	const negativePositions = [];
	const intersectionSegments = [];

	for (let i = 0; i < positions.count; i += 3) {
		const a = new THREE.Vector3().fromBufferAttribute(positions, i);
		const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1);
		const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2);

		const triangle = [a, b, c];
		const positivePoly = clipPolygonToHalfSpace(triangle, localPlane, true);
		const negativePoly = clipPolygonToHalfSpace(triangle, localPlane, false);
		const segment = collectTriangleSegment(triangle, localPlane);

		triangulatePolygon(positivePoly, positivePositions);
		triangulatePolygon(negativePoly, negativePositions);
		if (segment) {
			intersectionSegments.push(segment);
		}
	}

	const capLoops = buildLoopsFromSegments(intersectionSegments);
	for (const loop of capLoops) {
		triangulateCapLoop(loop, localPlane.normal, positivePositions, negativePositions);
	}

	source.dispose();

	const positiveGeometry = buildGeometryFromPositions(positivePositions);
	const negativeGeometry = buildGeometryFromPositions(negativePositions);

	if (!positiveGeometry || !negativeGeometry) {
		positiveGeometry?.dispose();
		negativeGeometry?.dispose();
		return null;
	}

	const positiveMesh = new THREE.Mesh(positiveGeometry, cloneMaterial(mesh.material));
	const negativeMesh = new THREE.Mesh(negativeGeometry, cloneMaterial(mesh.material));

	positiveMesh.position.copy(mesh.position);
	positiveMesh.quaternion.copy(mesh.quaternion);
	positiveMesh.scale.copy(mesh.scale);
	negativeMesh.position.copy(mesh.position);
	negativeMesh.quaternion.copy(mesh.quaternion);
	negativeMesh.scale.copy(mesh.scale);

	positiveMesh.castShadow = true;
	positiveMesh.receiveShadow = true;
	negativeMesh.castShadow = true;
	negativeMesh.receiveShadow = true;

	return {
		positiveMesh,
		negativeMesh,
		planeNormal: worldPlane.normal.clone()
	};
}
