(function () {
    var DEFAULT_FRAGMENT_SHADER = [
        "uniform float u_time;",
        "uniform vec2 u_resolution;",
        "varying vec2 v_uv;",
        "",
        "void main() {",
        "    vec2 uv = v_uv;",
        "    vec3 color = 0.5 + 0.5 * cos(u_time + uv.xyx * 6.28318 + vec3(0, 2, 4));",
        "    gl_FragColor = vec4(color, 1.0);",
        "}"
    ].join("\n");

    var VERTEX_SHADER = [
        "varying vec2 v_uv;",
        "void main() {",
        "    v_uv = uv;",
        "    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n");

    var canvas = document.getElementById("shader-canvas");
    var canvasWrap = document.getElementById("preview-canvas-wrap");
    var runButton = document.getElementById("run-shader");
    var resetButton = document.getElementById("reset-shader");
    var fullscreenButton = document.getElementById("fullscreen-shader");
    var geometryModeSelect = document.getElementById("geometry-mode");
    var consoleOutput = document.getElementById("shader-console");

    var renderer;
    var scene;
    var camera;
    var mesh;
    var material;
    var uniforms;
    var editor;
    var compileTimer = null;
    var startTime = performance.now();

    function setConsoleMessage(message, isError) {
        consoleOutput.textContent = message;
        consoleOutput.style.color = isError ? "#8f1237" : "#102840";
    }

    function createRenderer() {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 2.4);

        uniforms = {
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector2(1, 1) }
        };

        material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: DEFAULT_FRAGMENT_SHADER,
            uniforms: uniforms
        });

        mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6, 1, 1), material);
        scene.add(mesh);

        onResize();
    }

    function createGeometryForMode(mode) {
        if (mode === "sphere") {
            return new THREE.SphereGeometry(0.95, 96, 64);
        }

        if (mode === "cube") {
            return new THREE.BoxGeometry(1.45, 1.45, 1.45, 1, 1, 1);
        }

        return new THREE.PlaneGeometry(2.6, 2.6, 1, 1);
    }

    function setGeometryMode(mode) {
        var geometry = createGeometryForMode(mode);
        mesh.geometry.dispose();
        mesh.geometry = geometry;
        mesh.rotation.set(0, 0, 0);
    }

    function compileFragmentShaderSource(shaderSource) {
        var gl = renderer.getContext();
        var shader = gl.createShader(gl.FRAGMENT_SHADER);

        gl.shaderSource(shader, "precision highp float;\n" + shaderSource);
        gl.compileShader(shader);

        var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        var log = gl.getShaderInfoLog(shader) || "";

        gl.deleteShader(shader);

        return {
            success: compiled,
            log: log.trim()
        };
    }

    function applyShader() {
        var shaderSource = editor.getValue();
        var check = compileFragmentShaderSource(shaderSource);

        if (!check.success) {
            setConsoleMessage(check.log || "Shader compile failed.", true);
            return;
        }

        material.fragmentShader = shaderSource;
        material.needsUpdate = true;
        setConsoleMessage("Shader compiled successfully.", false);
    }

    function scheduleAutoCompile() {
        if (compileTimer) {
            window.clearTimeout(compileTimer);
        }

        compileTimer = window.setTimeout(function () {
            applyShader();
        }, 300);
    }

    function onResize() {
        var width = canvasWrap.clientWidth;
        var height = canvasWrap.clientHeight;
        var aspect = width / Math.max(height, 1);

        renderer.setSize(width, height, false);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        uniforms.u_resolution.value.set(width, height);
    }

    function animate() {
        requestAnimationFrame(animate);
        uniforms.u_time.value = (performance.now() - startTime) * 0.001;

        if (geometryModeSelect.value === "sphere") {
            mesh.rotation.y += 0.005;
            mesh.rotation.x += 0.002;
        } else if (geometryModeSelect.value === "cube") {
            mesh.rotation.y += 0.007;
            mesh.rotation.x += 0.004;
        }

        renderer.render(scene, camera);
    }

    function updateFullscreenButtonLabel() {
        var isFullscreen = document.fullscreenElement === canvasWrap;
        fullscreenButton.textContent = isFullscreen ? "Exit Fullscreen" : "Fullscreen Shader";
    }

    function toggleFullscreen() {
        if (document.fullscreenElement === canvasWrap) {
            document.exitFullscreen();
            return;
        }

        if (canvasWrap.requestFullscreen) {
            canvasWrap.requestFullscreen();
        }
    }

    function createEditor() {
        function buildMonacoEditor() {
            monaco.languages.register({ id: "glsl" });
            monaco.languages.setMonarchTokensProvider("glsl", {
                tokenizer: {
                    root: [
                        [/\b(uniform|void|vec[234]|float|int|if|else|for|return|main|gl_FragColor|gl_FragCoord|precision|highp|mediump|lowp)\b/, "keyword"],
                        [/\b[0-9]*\.?[0-9]+\b/, "number"],
                        [/\/[\/*].*$/, "comment"],
                        [/\{/, "delimiter.curly"],
                        [/\}/, "delimiter.curly"],
                        [/\(/, "delimiter.parenthesis"],
                        [/\)/, "delimiter.parenthesis"],
                        [/\+|\-|\*|\/|=|\.|,|;/, "operator"]
                    ]
                }
            });

            editor = monaco.editor.create(document.getElementById("shader-editor"), {
                value: DEFAULT_FRAGMENT_SHADER,
                language: "glsl",
                theme: "vs-dark",
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                scrollBeyondLastLine: false
            });

            editor.onDidChangeModelContent(function () {
                scheduleAutoCompile();
            });

            runButton.addEventListener("click", function () {
                applyShader();
            });

            resetButton.addEventListener("click", function () {
                editor.setValue(DEFAULT_FRAGMENT_SHADER);
                applyShader();
            });

            fullscreenButton.addEventListener("click", function () {
                toggleFullscreen();
            });

            geometryModeSelect.addEventListener("change", function () {
                setGeometryMode(geometryModeSelect.value);
            });

            document.addEventListener("fullscreenchange", function () {
                updateFullscreenButtonLabel();
                onResize();
            });

            setGeometryMode(geometryModeSelect.value);
            updateFullscreenButtonLabel();
            applyShader();
            animate();
        }

        function loadMonaco() {
            if (window.monaco && window.monaco.editor) {
                buildMonacoEditor();
                return;
            }

            var loaderScript = document.createElement("script");
            loaderScript.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/loader.min.js";
            loaderScript.onload = function () {
                if (!window.require) {
                    setConsoleMessage("Monaco loader did not initialize.", true);
                    return;
                }

                window.require.config({
                    paths: {
                        vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"
                    }
                });

                window.require(["vs/editor/editor.main"], function () {
                    buildMonacoEditor();
                });
            };
            loaderScript.onerror = function () {
                setConsoleMessage("Could not load Monaco Editor from CDN.", true);
            };

            document.head.appendChild(loaderScript);
        }

        loadMonaco();
    }

    function init() {
        if (!window.THREE) {
            setConsoleMessage("Three.js failed to load. Check your network or CDN access.", true);
            return;
        }

        createRenderer();
        createEditor();
        window.addEventListener("resize", onResize);
    }

    init();
})();
