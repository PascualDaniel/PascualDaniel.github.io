(function () {
    var FALLBACK_EXAMPLES = {
        plasma: [
            "uniform float u_time;",
            "uniform vec2 u_resolution;",
            "uniform float u_scale;",
            "uniform float u_speed;",
            "",
            "void main() {",
            "    vec2 uv = gl_FragCoord.xy / u_resolution.xy;",
            "    vec3 color = 0.5 + 0.5 * cos(u_time * u_speed + uv.xyx * (u_scale * 6.28318) + vec3(0.0, 2.0, 4.0));",
            "    gl_FragColor = vec4(color, 1.0);",
            "}"
        ].join("\n")
    };

    var VERTEX_SHADER = [
        "varying vec2 v_uv;",
        "void main() {",
        "    v_uv = uv;",
        "    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
        "}"
    ].join("\n");

    var examples = window.ShaderPlaygroundExamples || FALLBACK_EXAMPLES;
    var defaultShader = examples.plasma || FALLBACK_EXAMPLES.plasma;

    var canvas = document.getElementById("shader-canvas");
    var canvasWrap = document.getElementById("preview-canvas-wrap");
    var runButton = document.getElementById("run-shader");
    var resetButton = document.getElementById("reset-shader");
    var fullscreenButton = document.getElementById("fullscreen-shader");
    var geometryModeSelect = document.getElementById("geometry-mode");
    var consoleOutput = document.getElementById("shader-console");
    var exampleSelect = document.getElementById("shader-example");
    var loadExampleButton = document.getElementById("load-example");
    var scaleSlider = document.getElementById("uniform-scale");
    var speedSlider = document.getElementById("uniform-speed");
    var scaleValue = document.getElementById("uniform-scale-value");
    var speedValue = document.getElementById("uniform-speed-value");

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

    function formatShaderLog(log) {
        var source = (log || "").trim();

        if (!source) {
            return "Shader compile failed. No compiler output available.";
        }

        var pattern = /ERROR:\s*\d+:(\d+):\s*(.*)/g;
        var match;
        var lines = [];

        while ((match = pattern.exec(source)) !== null) {
            lines.push("Line " + match[1] + ": " + match[2].trim());
        }

        if (lines.length > 0) {
            return lines.join("\n");
        }

        return source;
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
        if (!mesh) {
            return;
        }

        var geometry = createGeometryForMode(mode);
        mesh.geometry.dispose();
        mesh.geometry = geometry;
        mesh.rotation.set(0, 0, 0);
    }

    function createRenderer() {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 0, 2.4);

        uniforms = {
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector2(1, 1) },
            u_scale: { value: Number(scaleSlider.value) },
            u_speed: { value: Number(speedSlider.value) }
        };

        material = new THREE.ShaderMaterial({
            vertexShader: VERTEX_SHADER,
            fragmentShader: defaultShader,
            uniforms: uniforms
        });

        mesh = new THREE.Mesh(createGeometryForMode(geometryModeSelect.value), material);
        scene.add(mesh);

        onResize();
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
            log: log
        };
    }

    function applyShader() {
        if (!editor) {
            return;
        }

        var shaderSource = editor.getValue();
        var check = compileFragmentShaderSource(shaderSource);

        if (!check.success) {
            setConsoleMessage(formatShaderLog(check.log), true);
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
        }, 280);
    }

    function onResize() {
        var width = canvasWrap.clientWidth;
        var height = canvasWrap.clientHeight;

        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        uniforms.u_resolution.value.set(width, height);
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

    function setUniformLabels() {
        scaleValue.textContent = Number(scaleSlider.value).toFixed(1);
        speedValue.textContent = Number(speedSlider.value).toFixed(1);
    }

    function bindUniformControls() {
        setUniformLabels();

        scaleSlider.addEventListener("input", function () {
            uniforms.u_scale.value = Number(scaleSlider.value);
            setUniformLabels();
        });

        speedSlider.addEventListener("input", function () {
            uniforms.u_speed.value = Number(speedSlider.value);
            setUniformLabels();
        });
    }

    function loadSelectedExample() {
        var key = exampleSelect.value;
        var nextSource = examples[key] || defaultShader;
        editor.setValue(nextSource);
        applyShader();
    }

    function bindControls() {
        runButton.addEventListener("click", function () {
            applyShader();
        });

        resetButton.addEventListener("click", function () {
            editor.setValue(defaultShader);
            applyShader();
        });

        loadExampleButton.addEventListener("click", function () {
            loadSelectedExample();
        });

        exampleSelect.addEventListener("change", function () {
            loadSelectedExample();
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

    function createEditor() {
        function buildMonacoEditor() {
            monaco.languages.register({ id: "glsl" });
            monaco.languages.setMonarchTokensProvider("glsl", {
                tokenizer: {
                    root: [
                        [/\b(uniform|void|vec[234]|float|int|if|else|for|return|main|gl_FragColor|gl_FragCoord|precision|highp|mediump|lowp|sin|cos|fract|dot|mix)\b/, "keyword"],
                        [/\b[0-9]*\.?[0-9]+\b/, "number"],
                        [/\/[\/*].*$/, "comment"],
                        [/\{|\}/, "delimiter.curly"],
                        [/\(|\)/, "delimiter.parenthesis"],
                        [/\+|\-|\*|\/|=|\.|,|;|:/, "operator"]
                    ]
                }
            });

            editor = monaco.editor.create(document.getElementById("shader-editor"), {
                value: defaultShader,
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

            bindControls();
            bindUniformControls();
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
