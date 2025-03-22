class BlockInteractionEffects {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    this.createSelectionWireframe();
    this.createBreakingOverlay();
  }

  createSelectionWireframe() {
    const geometry = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
      transparent: true,
      opacity: 0.9
    });

    this.selectionWireframe = new THREE.LineSegments(edges, material);
    this.selectionWireframe.renderOrder = 999;
    this.selectionWireframe.visible = false;
    this.scene.add(this.selectionWireframe);
  }

  createBreakingOverlay() {
    const faceGeometries = this.createBreakingFaceGeometries();

    const baseMaterial = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });

    this.breakingOverlay = new THREE.Group();
    this.breakingFaces = {};
    const faceNames = ['top', 'bottom', 'left', 'right', 'front', 'back'];

    faceNames.forEach((name) => {
      const mesh = new THREE.Mesh(faceGeometries[name], baseMaterial.clone());
      this.breakingFaces[name] = mesh;
      this.breakingOverlay.add(mesh);
    });

    this.breakingOverlay.visible = false;
    this.breakingOverlay.renderOrder = 999;
    this.scene.add(this.breakingOverlay);

    this.generateBreakingTextures();
  }

  createBreakingFaceGeometries() {
    const offset = 0.001;
    const geometry = new THREE.PlaneGeometry(1 + 2 * offset, 1 + 2 * offset);

    return {
      top: geometry.clone(),
      bottom: geometry.clone(),
      left: geometry.clone(),
      right: geometry.clone(),
      front: geometry.clone(),
      back: geometry.clone()
    };
  }

  positionBreakingFaces(position) {
    if (!this.breakingOverlay) return;

    this.breakingOverlay.position.set(position.x, position.y, position.z);

    const { top, bottom, left, right, front, back } = this.breakingFaces;
    const e = 0.001;

    top.position.set(0, 0.5 + e, 0);
    top.rotation.set(-Math.PI / 2, 0, 0);

    bottom.position.set(0, -0.5 - e, 0);
    bottom.rotation.set(Math.PI / 2, 0, 0);

    left.position.set(-0.5 - e, 0, 0);
    left.rotation.set(0, -Math.PI / 2, 0);

    right.position.set(0.5 + e, 0, 0);
    right.rotation.set(0, Math.PI / 2, 0);

    front.position.set(0, 0, 0.5 + e);
    front.rotation.set(0, 0, 0);

    back.position.set(0, 0, -0.5 - e);
    back.rotation.set(0, Math.PI, 0);
  }

  generateBreakingTextures() {
    this.breakingTextures = [];
    for (let stage = 0; stage < 10; stage++) {
      this.breakingTextures.push(this.createBreakingTexture(stage));
    }
  }

  createBreakingTexture(stage) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    this.drawBreakingStage(ctx, stage);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    return texture;
  }

  drawBreakingStage(ctx, stage) {
    ctx.clearRect(0, 0, 16, 16);
    if (stage <= 0) return;

    const breakAmount = stage / 10;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
    ctx.lineWidth = 1.0 + stage * 0.2;

    const seed = stage * 57 + 13;
    const random = (n) => ((seed * (n + 1)) % 97) / 97;

    const cx = 8, cy = 8;
    const centerRadius = 0.5 + breakAmount * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
    ctx.fill();

    const mainCrackCount = 2 + Math.min(5, Math.floor(stage * 0.8));
    for (let i = 0; i < mainCrackCount; i++) {
      const angle = random(i) * Math.PI * 2;
      const length = 3 + breakAmount * 12;
      const ex = cx + Math.cos(angle) * length;
      const ey = cy + Math.sin(angle) * length;

      const ctrlX = cx + Math.cos(angle + random(i + 10) * 0.5) * length * 0.5;
      const ctrlY = cy + Math.sin(angle + random(i + 10) * 0.5) * length * 0.5;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
      ctx.stroke();

      ctx.lineWidth *= 0.6;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(ctrlX, ctrlY, ex, ey);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.lineWidth = 1.0 + stage * 0.15;

      if (stage > 2) {
        const branchCount = Math.min(4, Math.floor(stage * 0.7));
        for (let j = 0; j < branchCount; j++) {
          const t = 0.3 + random(i * 10 + j) * 0.5;
          const bx = cx + (ex - cx) * t;
          const by = cy + (ey - cy) * t;

          const bAngle = angle + (Math.PI / 2) * (random(i + j) > 0.5 ? 1 : -1) * (0.7 + random(i * j + 5) * 0.3);
          const bLength = 2 + random(i + j * 5) * 4 * breakAmount;
          const bx2 = bx + Math.cos(bAngle) * bLength;
          const by2 = by + Math.sin(bAngle) * bLength;

          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx2, by2);
          ctx.stroke();

          if (stage >= 7 && j % 2 === 0) {
            const sbAngle = bAngle + (Math.PI / 3) * (random(i + j * 2) > 0.5 ? 1 : -1);
            const sbLength = 1 + random(i + j * 7) * 3 * breakAmount;
            const sbx = bx + (bx2 - bx) * 0.6;
            const sby = by + (by2 - by) * 0.6;
            const sbx2 = sbx + Math.cos(sbAngle) * sbLength;
            const sby2 = sby + Math.sin(sbAngle) * sbLength;

            ctx.lineWidth = 0.8 + stage * 0.05;
            ctx.beginPath();
            ctx.moveTo(sbx, sby);
            ctx.lineTo(sbx2, sby2);
            ctx.stroke();
          }
        }
      }
    }

    if (stage >= 6) {
      const count = Math.floor((stage - 5) * 4);
      for (let i = 0; i < count; i++) {
        const size = 1 + random(i * 7) * 1.5;
        const x = random(i * 3) * 16;
        const y = random(i * 3 + 1) * 16;
        ctx.fillRect(x, y, size, size);
      }
    }

    if (stage >= 9) {
      const count = 8 + Math.floor(random(seed) * 7);
      for (let i = 0; i < count; i++) {
        const x1 = random(i * 2) * 16;
        const y1 = random(i * 2 + 1) * 16;
        const len = 1 + random(i + seed) * 3;
        const angle = random(i * 3) * Math.PI * 2;

        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 + Math.cos(angle) * len, y1 + Math.sin(angle) * len);
        ctx.stroke();
      }
    }
  }

  updateSelectionWireframe(position, visible) {
    if (!this.selectionWireframe) return;

    this.selectionWireframe.visible = visible;
    if (visible && position) {
      this.selectionWireframe.position.set(position.x, position.y, position.z);
    }
  }

  updateBreakingOverlay(position, progress, breakTime) {
    if (!this.breakingOverlay || !this.breakingTextures.length) return;

    if (progress > 0 && breakTime > 0 && position) {
      const stage = Math.min(9, Math.floor((progress / breakTime) * 10));
      const texture = this.breakingTextures[stage];

      Object.values(this.breakingFaces).forEach(face => {
        face.material.map = texture;
        face.material.needsUpdate = true;
        face.material.opacity = 0.7 + stage * 0.03;
      });

      this.positionBreakingFaces(position);
      this.breakingOverlay.visible = true;
    } else {
      this.breakingOverlay.visible = false;
    }
  }

  hideAll() {
    if (this.selectionWireframe) this.selectionWireframe.visible = false;
    if (this.breakingOverlay) this.breakingOverlay.visible = false;
  }

  dispose() {
    if (this.selectionWireframe) {
      this.scene.remove(this.selectionWireframe);
      this.selectionWireframe.geometry?.dispose();
      this.selectionWireframe.material?.dispose();
    }

    if (this.breakingOverlay) {
      this.scene.remove(this.breakingOverlay);
      Object.values(this.breakingFaces || {}).forEach(face => {
        face.geometry?.dispose();
        face.material?.map?.dispose();
        face.material?.dispose();
      });
    }

    this.breakingTextures?.forEach(texture => texture?.dispose());
  }
}
