document.addEventListener("DOMContentLoaded", () => {
  // Wait for THREE.js to be available if loaded async, or just initialize if loaded synchronously
  if (window.THREE) {
    initShader();
  } else {
    // If we loaded the script asynchronously, wait for it
    const checkThree = setInterval(() => {
      if (window.THREE) {
        clearInterval(checkThree);
        initShader();
      }
    }, 100);
  }
});

function initShader() {
  const container = document.getElementById("shader-background");
  if (!container || !window.THREE) return;

  const THREE = window.THREE;

  // Clear any existing content
  container.innerHTML = "";

  // Initialize camera
  const camera = new THREE.Camera();
  camera.position.z = 1;

  // Initialize scene
  const scene = new THREE.Scene();

  // Create geometry
  const geometry = new THREE.PlaneBufferGeometry(2, 2);

  // Define uniforms
  const uniforms = {
    time: { type: "f", value: 1.0 },
    resolution: { type: "v2", value: new THREE.Vector2() },
  };

  // Vertex shader
  const vertexShader = `
    void main() {
      gl_Position = vec4( position, 1.0 );
    }
  `;

  // Fragment shader
  const fragmentShader = `
    #define TWO_PI 6.2831853072
    #define PI 3.14159265359

    precision highp float;
    uniform vec2 resolution;
    uniform float time;
      
    float random (in float x) {
        return fract(sin(x)*1e4);
    }
    float random (vec2 st) {
        return fract(sin(dot(st.xy,
                             vec2(12.9898,78.233)))*
            43758.5453123);
    }
    
    varying vec2 vUv;

    void main(void) {
      vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
      
      vec2 fMosaicScal = vec2(4.0, 2.0);
      vec2 vScreenSize = vec2(256,256);
      uv.x = floor(uv.x * vScreenSize.x / fMosaicScal.x) / (vScreenSize.x / fMosaicScal.x);
      uv.y = floor(uv.y * vScreenSize.y / fMosaicScal.y) / (vScreenSize.y / fMosaicScal.y);       
        
      float t = time*0.06+random(uv.x)*0.4;
      float lineWidth = 0.0008;

      vec3 color = vec3(0.0);
      for(int j = 0; j < 3; j++){
        for(int i=0; i < 5; i++){
          color[j] += lineWidth*float(i*i) / abs(fract(t - 0.01*float(j)+float(i)*0.01)*1.0 - length(uv));        
        }
      }

      // Calculate maximum color intensity for alpha channel
      float alpha = max(color[0], max(color[1], color[2]));
      // Clamp alpha between 0.0 and 1.0 to avoid weird blending
      alpha = clamp(alpha, 0.0, 1.0);

      gl_FragColor = vec4(color[2],color[1],color[0], alpha);
    }
  `;

  // Create material
  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    transparent: true,
  });

  // Create mesh and add to scene
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Initialize renderer
  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Handle resize
  const onWindowResize = () => {
    const rect = container.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height);
    uniforms.resolution.value.x = renderer.domElement.width;
    uniforms.resolution.value.y = renderer.domElement.height;
  };

  onWindowResize();
  window.addEventListener("resize", onWindowResize, false);

  // Animation loop
  const animate = () => {
    requestAnimationFrame(animate);
    uniforms.time.value += 0.05;
    renderer.render(scene, camera);
  };

  animate();
}
