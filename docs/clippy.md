required attribution note: "Clippy" (https://skfb.ly/ousxv) by ironflower is licensed under CC Attribution-NonCommercial-ShareAlike (http://creativecommons.org/licenses/by-nc-sa/4.0/).

files in public/clippy.glb and public/texture.jpeg (a yellow piece of paper that clippy sits on)



TL;DR

Download the .glb (binary-glTF) version of the model.
Then drop it into your project and display it with Google’s <model-viewer> web component, which works in every evergreen desktop and mobile browser out-of-the-box.

⸻

1  Why .glb?

Format	Good for	Drawbacks
.glb (binary-glTF)	• One self-contained file (geometry, textures, animations)• Loads with one HTTP request• Fully supported by <model-viewer> and Three.js	Slightly larger on disk than split .gltf
.gltf (JSON)	Human-readable, easy to edit	Needs separate .bin + image files → more requests
.usdz	Quick Look / AR on Apple devices	Safari-only (no Android/Windows)

<model-viewer> officially supports only glTF / GLB  ￼, so .glb is the most portable choice.

⸻

2  Quick embed with <model-viewer>
	1.	Install the component (one script tag):

<!-- place this once, anywhere before </body> -->
<script type="module"
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js">
</script>

	2.	Add the model element:

<model-viewer
  src="/assets/clippy.glb"      <!-- path to your .glb -->
  alt="Clippy, your AI helper"
  autoplay                      <!-- play default animation -->
  camera-controls               <!-- mouse/touch orbit -->
  interaction-prompt="none"     <!-- hide the tutorial hint -->
  shadow-intensity="1"
  style="width:180px; height:180px;">
</model-viewer>

That’s it—no build tools, no extra JS. All modern Chromium, Firefox, Safari and Edge releases ship the Web Components, WebGL 2 and WASM features <model-viewer> relies on  ￼.

⸻

Optional polish

Goal	What to add
Lazy-load when on screen	<model-viewer loading="lazy">
Transparent background	style="background: transparent"
React / Vue / Svelte	Import once, then use <model-viewer> like any other DOM tag
Accessibility	Provide a meaningful alt and ARIA label
Fallback screenshot	Put an <img> inside the tag: <model-viewer> <img src="clippy.png" alt=""> </model-viewer>


⸻

3  Alternative: Three.js (if you need full 3-D control)

<script src="https://unpkg.com/three@0.166.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.166.0/examples/jsm/loaders/GLTFLoader.js" type="module"></script>

<script type="module">
  import { GLTFLoader } from 'https://unpkg.com/three@0.166.0/examples/jsm/loaders/GLTFLoader.js';

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 1.4, 2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  new GLTFLoader().load('/assets/clippy.glb', gltf => {
    scene.add(gltf.scene);
    animate();
  });

  function animate() { requestAnimationFrame(animate); renderer.render(scene, camera); }
</script>

Three.js gives you lighting, post-processing or procedural animations, but <model-viewer> is simpler if you just need a talking head.  (Three.js GLTFLoader handles .glb exactly the same way  ￼.)

⸻

4  License reminder

The screenshot shows CC BY-NC-SA. That forbids commercial use and requires attribution plus share-alike distribution. Make sure this license fits your project or obtain a different one.

⸻

Hand-off to your Cursor AI agent

	1.	Download the 470 kB clippy.glb from Sketchfab.
	2.	Place it at /assets/clippy.glb (or adjust the path).
	3.	Insert the 2-tag snippet above into the app’s root HTML/React component.
	4.	Verify it autoplays and orbits on Chrome, Safari and Firefox.
	5.	Add proper attribution text somewhere visible to satisfy CC BY-NC-SA.

That’s all it takes—Clippy should now greet users in 3-D on every modern browser! 🎉