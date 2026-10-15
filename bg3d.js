/**
 * 3D Background Engine - Crimson Red & Obsidian Black Cyber Theme
 * Features:
 * - Floating 3D Cyber AI Robot / Drone Companions with mouse-tracking red visors
 * - Thruster particle sparks & smooth anti-gravity hover drift
 * - Calm, steady 3D stars & dot bubbles without blinking/flickering
 * - Subtle crimson constellation energy connections
 * - Interactive Mouse Parallax (3D camera tilt with smooth lerp)
 * - 60 FPS performance optimized with requestAnimationFrame
 */

(function () {
  'use strict';

  const canvas = document.getElementById('bg3dCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Viewport & Canvas Sizing
  let width = 0;
  let height = 0;
  let dpr = 1;
  let centerX = 0;
  let centerY = 0;
  const FOCAL_LENGTH = 800; // Perspective depth field

  // Camera & Mouse Parallax State
  let rawMouseX = 0;
  let rawMouseY = 0;
  let targetCamRotX = 0;
  let targetCamRotY = 0;
  let camRotX = 0;
  let camRotY = 0;
  let camOffsetX = 0;
  let camOffsetY = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    centerX = width / 2;
    centerY = height / 2;
    if (rawMouseX === 0) {
      rawMouseX = centerX;
      rawMouseY = centerY;
    }
    if (typeof updateBotPositions === 'function') {
      updateBotPositions();
    }
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Mouse Move Event
  window.addEventListener('mousemove', (e) => {
    rawMouseX = e.clientX;
    rawMouseY = e.clientY;
    const normX = (e.clientX - centerX) / centerX; // -1 to +1
    const normY = (e.clientY - centerY) / centerY; // -1 to +1
    targetCamRotY = normX * 0.35; // Pan left/right
    targetCamRotX = -normY * 0.25; // Tilt up/down
  }, { passive: true });

  // Touch Parallax for Mobile
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const touch = e.touches[0];
      rawMouseX = touch.clientX;
      rawMouseY = touch.clientY;
      const normX = (touch.clientX - centerX) / centerX;
      const normY = (touch.clientY - centerY) / centerY;
      targetCamRotY = normX * 0.25;
      targetCamRotX = -normY * 0.18;
    }
  }, { passive: true });

  // -------------------------------------------------------------
  // 3D Math Utilities
  // -------------------------------------------------------------
  function project3D(x, y, z, rotX, rotY) {
    // 1. Rotate around Y axis
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;

    // 2. Rotate around X axis
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    // 3. Perspective Projection
    const distance = FOCAL_LENGTH + z2;
    if (distance <= 20) return null; // Behind camera
    const scale = FOCAL_LENGTH / distance;

    return {
      x: centerX + (x1 + camOffsetX) * scale,
      y: centerY + (y2 + camOffsetY) * scale,
      z: z2,
      scale: scale
    };
  }

  // -------------------------------------------------------------
  // 3D Cyber AI Robot / Drone Assistant
  // -------------------------------------------------------------
  class CyberBot3D {
    constructor(x, y, z, size, isLeader = false) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.baseX = x;
      this.baseY = y;
      this.size = size;
      this.isLeader = isLeader;
      this.hoverPhase = Math.random() * Math.PI * 2;
      this.eyeAngle = 0;
      this.eyeDist = 0;
      this.thrusterParticles = [];
      this.proj = null;
    }

    update(time) {
      // Smooth calm hover bobbing - NO shaking
      this.y = this.baseY + Math.sin(time * 0.0018 + this.hoverPhase) * (this.isLeader ? 15 : 9);
      this.x = this.baseX + Math.cos(time * 0.0011 + this.hoverPhase) * (this.isLeader ? 10 : 6);

      // Track mouse position for glowing optic eye
      if (this.proj) {
        const dx = rawMouseX - this.proj.x;
        const dy = rawMouseY - this.proj.y;
        this.eyeAngle = Math.atan2(dy, dx);
        this.eyeDist = Math.min(1, Math.hypot(dx, dy) / 380);
      }

      // Spawn thruster plasma exhaust sparks
      if (Math.random() > 0.42) {
        this.thrusterParticles.push({
          x: (Math.random() - 0.5) * (this.size * 0.35),
          y: this.size * 0.55,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 1.2 + Math.random() * 1.6,
          life: 1.0,
          decay: 0.038 + Math.random() * 0.02,
          radius: 1.8 + Math.random() * 2.2
        });
      }

      // Update thruster particles
      for (let i = this.thrusterParticles.length - 1; i >= 0; i--) {
        const p = this.thrusterParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) {
          this.thrusterParticles.splice(i, 1);
        }
      }
    }

    draw(camX, camY) {
      this.proj = project3D(this.x, this.y, this.z, camX, camY);
      if (!this.proj) return;

      const s = this.size * this.proj.scale;
      const px = this.proj.x;
      const py = this.proj.y;
      const alpha = Math.max(0.35, Math.min(1, this.proj.scale));

      ctx.save();
      ctx.translate(px, py);

      // 1. Draw Thruster Plasma Exhaust Sparks
      for (let p of this.thrusterParticles) {
        const pAlpha = p.life * alpha * 0.85;
        ctx.fillStyle = `rgba(239, 68, 68, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x * this.proj.scale, p.y * this.proj.scale, p.radius * this.proj.scale, 0, Math.PI * 2);
        ctx.fill();

        // White ember spark core
        if (p.life > 0.6) {
          ctx.fillStyle = `rgba(255, 255, 255, ${pAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x * this.proj.scale, p.y * this.proj.scale, p.radius * 0.4 * this.proj.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Thruster Nozzle & Glowing Anti-Gravity Ring
      ctx.fillStyle = '#140c15';
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.85})`;
      ctx.lineWidth = Math.max(1, 1.8 * this.proj.scale);
      ctx.beginPath();
      ctx.ellipse(0, s * 0.52, s * 0.34, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Thruster fiery plasma core
      ctx.fillStyle = `rgba(255, 75, 75, ${alpha * 0.9})`;
      ctx.beginPath();
      ctx.ellipse(0, s * 0.52, s * 0.2, s * 0.05, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3. Ear Cyber Fins / Stabilizers
      ctx.fillStyle = '#22141d';
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.6})`;
      ctx.lineWidth = Math.max(1, 1.3 * this.proj.scale);
      // Left ear fin
      ctx.beginPath();
      ctx.roundRect(-s * 0.62, -s * 0.15, s * 0.14, s * 0.3, [3]);
      ctx.fill();
      ctx.stroke();
      // Right ear fin
      ctx.beginPath();
      ctx.roundRect(s * 0.48, -s * 0.15, s * 0.14, s * 0.3, [3]);
      ctx.fill();
      ctx.stroke();

      // 4. Robot Metallic Head / Shell (Dark Obsidian with Red Rim Glow)
      const hullGrad = ctx.createRadialGradient(-s * 0.18, -s * 0.2, s * 0.08, 0, 0, s * 0.6);
      hullGrad.addColorStop(0, '#361d28');
      hullGrad.addColorStop(0.5, '#1e111a');
      hullGrad.addColorStop(1, '#0e080d');

      ctx.fillStyle = hullGrad;
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.75})`;
      ctx.lineWidth = Math.max(1.2, 1.7 * this.proj.scale);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.48, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 5. Antenna with Glowing Signal Beacon
      ctx.strokeStyle = `rgba(161, 161, 170, ${alpha * 0.75})`;
      ctx.lineWidth = Math.max(1, 1.4 * this.proj.scale);
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.48);
      ctx.lineTo(0, -s * 0.76);
      ctx.stroke();

      // Beacon tip glow
      ctx.fillStyle = `rgba(255, 75, 75, ${alpha})`;
      ctx.beginPath();
      ctx.arc(0, -s * 0.78, s * 0.07, 0, Math.PI * 2);
      ctx.fill();

      // 6. Glowing Red Cyber Visor
      ctx.fillStyle = '#0a0508';
      ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.85})`;
      ctx.lineWidth = Math.max(1, 1.3 * this.proj.scale);
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.32, s * 0.19, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // 7. Optic Eye Tracking Cursor
      const eyeOffsetX = Math.cos(this.eyeAngle) * (s * 0.11 * this.eyeDist);
      const eyeOffsetY = Math.sin(this.eyeAngle) * (s * 0.07 * this.eyeDist);

      // Glowing Crimson Optic Iris
      ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.95})`;
      ctx.beginPath();
      ctx.arc(eyeOffsetX, eyeOffsetY, s * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Bright White Pupil Center
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(eyeOffsetX, eyeOffsetY, s * 0.04, 0, Math.PI * 2);
      ctx.fill();

      // Visor Glass Specular Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.ellipse(-s * 0.1, -s * 0.07, s * 0.14, s * 0.05, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // -------------------------------------------------------------
  // Calm, Steady 3D Stars & Dot Bubbles (No blinking / No pulsing)
  // -------------------------------------------------------------
  const COLOR_PALETTE = [
    '239, 68, 68',   // Bright Crimson Red
    '255, 75, 75',   // Fiery Scarlet
    '220, 38, 38',   // Deep Ruby Red
    '251, 113, 133', // Rose Coral
    '248, 113, 113', // Soft Carmine
    '249, 115, 22'   // Warm Ember
  ];

  class CalmStar3D {
    constructor(initial = false) {
      this.reset(initial);
    }

    reset(initial = false) {
      this.x = (Math.random() - 0.5) * 1600;
      this.y = (Math.random() - 0.5) * 1200;
      this.z = initial ? (Math.random() - 0.5) * 1000 : 500 + Math.random() * 250;
      this.vx = (Math.random() - 0.5) * 0.28;
      this.vy = (Math.random() - 0.5) * 0.28;
      this.vz = -0.35 - Math.random() * 0.5; // Calm, steady forward drift
      this.radius = 1.3 + Math.random() * 2.4; // Fixed radius - NO pulsing
      this.color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
      this.proj = null;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.z += this.vz;

      // Wrap around in Z space
      if (this.z < -450) {
        this.reset(false);
      }
    }

    project(camX, camY) {
      this.proj = project3D(this.x, this.y, this.z, camX, camY);
      return this.proj;
    }
  }

  // -------------------------------------------------------------
  // Initialize World Scene
  // -------------------------------------------------------------
  // 1. Cyber AI Robot Companions
  const robots = [
    // Primary Cyber Assistant Bot (Hovering in upper right, tracks mouse with glowing red eye)
    new CyberBot3D(420, -180, 60, 52, true),
    // Secondary Scout Drone (Floating in left midground)
    new CyberBot3D(-460, 140, 160, 36, false),
    // Deep Patrol Drone (Cruising in deep 3D perspective space)
    new CyberBot3D(-80, -260, 340, 26, false)
  ];

  function updateBotPositions() {
    if (!robots || robots.length < 3) return;
    if (width < 640) {
      // Mobile screen: bring robots within visible mobile frame
      robots[0].baseX = Math.min(140, width * 0.28);
      robots[0].baseY = -130;
      robots[0].size = 38;

      robots[1].baseX = -Math.min(140, width * 0.28);
      robots[1].baseY = 170;
      robots[1].size = 28;

      robots[2].baseX = 0;
      robots[2].baseY = -230;
      robots[2].size = 22;
    } else {
      // Laptop / Lab Desktop screen
      robots[0].baseX = 420;
      robots[0].baseY = -180;
      robots[0].size = 52;

      robots[1].baseX = -460;
      robots[1].baseY = 140;
      robots[1].size = 36;

      robots[2].baseX = -80;
      robots[2].baseY = -260;
      robots[2].size = 26;
    }
  }

  updateBotPositions();

  // 2. Calm, Non-Blinking Stars
  const STAR_COUNT = 65;
  const stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push(new CalmStar3D(true));
  }

  // -------------------------------------------------------------
  // Main Render Loop (60 FPS)
  // -------------------------------------------------------------
  function render(time) {
    requestAnimationFrame(render);

    // Pause when tab is hidden
    if (document.hidden) return;

    // Smooth camera damping (lerp)
    camRotX += (targetCamRotX - camRotX) * 0.045;
    camRotY += (targetCamRotY - camRotY) * 0.045;
    camOffsetX += (targetCamRotY * 180 - camOffsetX) * 0.04;
    camOffsetY += (-targetCamRotX * 140 - camOffsetY) * 0.04;

    ctx.clearRect(0, 0, width, height);

    // 1. Update and Project Stars
    for (let i = 0; i < stars.length; i++) {
      stars[i].update();
      stars[i].project(camRotX, camRotY);
    }

    // 2. Draw Subtle 3D Constellation Connections
    const maxConnectDist = 150;
    for (let i = 0; i < stars.length; i++) {
      const s1 = stars[i];
      if (!s1.proj) continue;

      for (let j = i + 1; j < stars.length; j++) {
        const s2 = stars[j];
        if (!s2.proj) continue;

        const dx = s1.x - s2.x;
        const dy = s1.y - s2.y;
        const dz = s1.z - s2.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < maxConnectDist) {
          const alpha = (1 - dist / maxConnectDist) * 0.22 * Math.min(s1.proj.scale, s2.proj.scale);
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = Math.min(1.1, 0.7 * s1.proj.scale);
          ctx.beginPath();
          ctx.moveTo(s1.proj.x, s1.proj.y);
          ctx.lineTo(s2.proj.x, s2.proj.y);
          ctx.stroke();
        }
      }
    }

    // 3. Draw Calm, Non-Blinking Stars
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      if (!s.proj) continue;

      // Steady alpha & radius - NO BLINKING/PULSING
      const alpha = Math.max(0.2, Math.min(0.85, (s.proj.scale * 1.1)));
      const rad = Math.max(1.2, s.radius * s.proj.scale);

      // Outer soft glow
      ctx.fillStyle = `rgba(${s.color}, ${alpha * 0.22})`;
      ctx.beginPath();
      ctx.arc(s.proj.x, s.proj.y, rad * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Steady luminous core
      ctx.fillStyle = `rgba(${s.color}, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(s.proj.x, s.proj.y, rad * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Sharp center pin-point
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha * 1.1)})`;
      ctx.beginPath();
      ctx.arc(s.proj.x, s.proj.y, rad * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Update and Draw 3D Cyber AI Robots (Sorted by Z depth)
    robots.forEach(bot => bot.update(time));
    const sortedRobots = [...robots].sort((a, b) => b.z - a.z);

    for (let bot of sortedRobots) {
      bot.draw(camRotX, camRotY);
    }
  }

  requestAnimationFrame(render);
})();
