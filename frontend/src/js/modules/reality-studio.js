/* ============================================================
   OMNI — modules/reality-studio.js
   4D REALITY STUDIO (RS)
   Creating ads that exist beyond dimensions.
   Uses Three.js when available; otherwise falls back to a canvas
   "light studio" so the page still works without the CDN lib.
   ============================================================= */
(function (global) {
  'use strict';
  var U = global.OMNI_UTILS || {};

  var scene, camera, renderer, productMesh, envMesh;
  var isThree = false;
  var rotationEnabled = true;

  var ENVIRONMENTS = [
    { name: 'Cyber City', light: 0x00d4ff, fog: 0x0a0a0f },
    { name: 'Tropical',   light: 0xffd166, fog: 0x102a1e },
    { name: 'Alpine',     light: 0xffffff, fog: 0xcfe6ff },
    { name: 'Desert',     light: 0xffaa55, fog: 0x3a2a1a },
    { name: 'Deep Space', light: 0x7b2ffc, fog: 0x05010f }
  ];

  /* 1. initThreeJS(container) — initialize the 3D scene */
  function initThreeJS(container) {
    if (!container) throw new Error('reality-studio: container element required');
    container.innerHTML = '';

    if (global.THREE) {
      try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(global.devicePixelRatio || 1);
        container.appendChild(renderer.domElement);
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        var key = new THREE.DirectionalLight(0xffffff, 1);
        key.position.set(3, 5, 4);
        scene.add(key);
        camera.position.z = 5;
        productMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 1.6, 1.6),
          new THREE.MeshStandardMaterial({ color: 0x00d4ff, metalness: 0.4, roughness: 0.3 })
        );
        scene.add(productMesh);
        isThree = true;
      } catch (e) { isThree = false; }
    }

    if (!isThree) initCanvasStudio(container);

    function resize() {
      var w = container.clientWidth || 420;
      var h = container.clientHeight || 360;
      if (isThree && renderer) { renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      else fitCanvas(w, h);
    }
    global.addEventListener('resize', resize);
    resize();
    animate();
    return { type: isThree ? 'three-js' : 'canvas-studio', container: container };
  }

  /* ---- canvas fallback ---- */
  var c2d, cv;
  function initCanvasStudio(container) {
    cv = document.createElement('canvas');
    cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block';
    container.appendChild(cv);
    c2d = cv.getContext('2d');
  }
  function fitCanvas(w, h) {
    if (!cv) { return; }
    cv.width = w; cv.height = h;
  }

  /* 2. generateEnvironment(type) */
  function generateEnvironment(type) {
    var env = ENVIRONMENTS.find(function (e) { return e.name === type; }) || ENVIRONMENTS[0];
    if (isThree && scene) {
      if (envMesh) scene.remove(envMesh);
      envMesh = new THREE.Mesh(
        new THREE.SphereGeometry(30, 24, 24),
        new THREE.MeshBasicMaterial({ color: env.fog, wireframe: true })
      );
      scene.add(envMesh);
      scene.fog = new THREE.Fog(env.fog, 8, 40);
    }
    return { type: env.name, light: env.light, environment: env };
  }

  /* 3. animateProduct() — continuous rotation */
  function animateProduct() {
    rotationEnabled = !rotationEnabled;
    return rotationEnabled;
  }
  function animate() {
    if (productMesh && isThree) {
      if (rotationEnabled) {
        productMesh.rotation.x += 0.012;
        productMesh.rotation.y += 0.02;
      }
      renderer.render(scene, camera);
    } else if (c2d && cv) {
      drawCanvasScene();
    }
    requestAnimationFrame(animate);
  }
  function drawCanvasScene() {
    var w = cv.width, h = cv.height;
    c2d.clearRect(0, 0, w, h);
    var t = Date.now() / 1000;
    c2d.save();
    c2d.translate(w / 2, h / 2);
    c2d.rotate(t * 0.4);
    var s = Math.min(w, h) * 0.3;
    var grad = c2d.createLinearGradient(-s, -s, s, s);
    grad.addColorStop(0, '#00d4ff');
    grad.addColorStop(1, '#7b2ffc');
    c2d.fillStyle = grad;
    c2d.shadowColor = 'rgba(0,212,255,0.7)';
    c2d.shadowBlur = 24;
    c2d.fillRect(-s / 2, -s / 2, s, s);
    c2d.restore();
  }

  /* 4. exportAd(format) */
  function exportAd(format) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        var specs = {
          tiktok:      '1080x1920 / 9:16 / 15-30s',
          instagram:   '1080x1920 / 9:16 / 15-30s',
          instaFeed:   '1080x1080 / 1:1 / 30s',
          facebook:    '1080x1080 / 1:1 / 30-60s',
          youtube:     '1920x1080 / 16:9 / 60-120s',
          gif:         'animated GIF / display'
        };
        var file = {
          format: format,
          spec: specs[format] || specs.tiktok,
          filename: 'omni-ad-' + (U.uid ? U.uid('v') : 'v1') + '.' + (format === 'gif' ? 'gif' : 'mp4'),
          url: '',
          exportedAt: new Date().toISOString()
        };
        resolve(file);
      }, U.rand ? U.rand(800, 1500) : 1000);
    });
  }

  /* 5. generateVoiceover(text, style) */
  function generateVoiceover(text, style) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({
          text: text || 'Meet the product that changes everything.',
          style: style || 'Engaging',
          duration: Math.max(4, Math.round(String(text || '').split(' ').length / 2.5)),
          voice: U.pick ? U.pick(['Aria', 'Daniel', 'Maya', 'Liam']) : 'Aria',
          url: '',
          generatedAt: new Date().toISOString()
        });
      }, U.rand ? U.rand(700, 1200) : 900);
    });
  }

  global.RealityStudio = {
    initThreeJS: initThreeJS,
    generateEnvironment: generateEnvironment,
    animateProduct: animateProduct,
    exportAd: exportAd,
    generateVoiceover: generateVoiceover,
    ENVIRONMENTS: ENVIRONMENTS
  };
  if (global.OMNI) global.OMNI.modules = Object.assign(global.OMNI.modules || {}, { realityStudio: global.RealityStudio });
})(window);