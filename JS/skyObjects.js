class SkyObjects {
  constructor(scene) {
    this.scene = scene;
    this.createSun();
    this.createMoon();
    this.createStars();
    this.orbitRadius = 500;
    this.sunOrbitalPosition = { x: 0, y: 0, z: 0 };
    this.moonOrbitalPosition = { x: 0, y: 0, z: 0 };
    this.update(0.5);
  }
  
  createSun() {
    this.sunObject = new THREE.Object3D();
    const sunTexture = new THREE.CanvasTexture(this.createSunTexture());
    const sunMaterial = new THREE.SpriteMaterial({
      map: sunTexture,
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0,
      fog: false,
      depthWrite: true,
      depthTest: true
    });
    
    this.sun = new THREE.Sprite(sunMaterial);
    this.sun.scale.set(120, 120, 1);
    this.sunObject.add(this.sun);
    this.sun.renderOrder = -1;
    this.scene.add(this.sunObject);
    this.sunObject.position.set(0, -1000, 0);
  }
  
  createSunTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 160;
    const halfSize = size / 2;
    const pixelSize = size / 8;
    
    ctx.fillStyle = '#FFDD00';
    ctx.fillRect(centerX - halfSize, centerY - halfSize, size, size);
    
    ctx.fillStyle = '#FF8800';
    
    ctx.fillRect(centerX - halfSize, centerY - halfSize, pixelSize * 2, pixelSize * 2);
    ctx.fillRect(centerX + halfSize - pixelSize * 2, centerY - halfSize, pixelSize * 2, pixelSize * 2);
    ctx.fillRect(centerX - halfSize, centerY + halfSize - pixelSize * 2, pixelSize * 2, pixelSize * 2);
    ctx.fillRect(centerX + halfSize - pixelSize * 2, centerY + halfSize - pixelSize * 2, pixelSize * 2, pixelSize * 2);
    
    ctx.fillRect(centerX - halfSize, centerY - pixelSize, size, pixelSize * 2);
    ctx.fillRect(centerX - pixelSize, centerY - halfSize, pixelSize * 2, size);
    
    ctx.fillRect(centerX - halfSize, centerY - halfSize + pixelSize * 2, pixelSize, pixelSize);
    ctx.fillRect(centerX - halfSize + pixelSize * 2, centerY - halfSize, pixelSize, pixelSize);
    
    ctx.fillRect(centerX + halfSize - pixelSize, centerY - halfSize + pixelSize * 2, pixelSize, pixelSize);
    ctx.fillRect(centerX + halfSize - pixelSize * 3, centerY - halfSize, pixelSize, pixelSize);
    
    ctx.fillRect(centerX - halfSize, centerY + halfSize - pixelSize * 3, pixelSize, pixelSize);
    ctx.fillRect(centerX - halfSize + pixelSize * 2, centerY + halfSize - pixelSize, pixelSize, pixelSize);
    
    ctx.fillRect(centerX + halfSize - pixelSize, centerY + halfSize - pixelSize * 3, pixelSize, pixelSize);
    ctx.fillRect(centerX + halfSize - pixelSize * 3, centerY + halfSize - pixelSize, pixelSize, pixelSize);
    
    return canvas;
  }
  
  createMoon() {
    this.moonObject = new THREE.Object3D();
    const moonTexture = new THREE.CanvasTexture(this.createMoonTexture());
    const moonMaterial = new THREE.SpriteMaterial({
      map: moonTexture,
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0,
      fog: false,
      depthWrite: true,
      depthTest: true
    });
    
    this.moon = new THREE.Sprite(moonMaterial);
    this.moon.scale.set(100, 100, 1);
    this.moonObject.add(this.moon);
    this.moon.renderOrder = -1;
    this.scene.add(this.moonObject);
    this.moonObject.position.set(0, -1000, 0);
  }
  
  createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 160;
    const halfSize = size / 2;
    const pixelSize = size / 8;
    
    ctx.fillStyle = '#E0E0E0';
    ctx.fillRect(centerX - halfSize, centerY - halfSize, size, size);
    
    ctx.fillStyle = '#AAAAAA';
    
    ctx.fillRect(centerX - halfSize + pixelSize, centerY - halfSize + pixelSize, pixelSize, pixelSize);
    ctx.fillRect(centerX - halfSize + pixelSize * 3, centerY - halfSize + pixelSize, pixelSize, pixelSize);
    
    ctx.fillRect(centerX + halfSize - pixelSize * 2, centerY - halfSize + pixelSize * 2, pixelSize, pixelSize);
    
    ctx.fillRect(centerX - halfSize + pixelSize * 2, centerY + pixelSize, pixelSize * 2, pixelSize);
    ctx.fillRect(centerX - halfSize + pixelSize, centerY + pixelSize * 3, pixelSize, pixelSize);
    
    ctx.fillRect(centerX + pixelSize, centerY + halfSize - pixelSize * 3, pixelSize * 2, pixelSize);
    ctx.fillRect(centerX + halfSize - pixelSize * 3, centerY + halfSize - pixelSize * 2, pixelSize, pixelSize * 2);
    
    ctx.fillRect(centerX - pixelSize, centerY - pixelSize, pixelSize * 2, pixelSize);
    ctx.fillRect(centerX, centerY, pixelSize * 2, pixelSize * 2);
    
    return canvas;
  }
  
  createStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1.5,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: false,
      fog: false,
      depthWrite: true,
      depthTest: true
    });
    
    const starCount = 3000;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 500;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    this.stars = new THREE.Points(starsGeometry, starsMaterial);
    this.stars.renderOrder = -2;
    this.scene.add(this.stars);
    this.stars.visible = false;
  }
  
  update(timeOfDay) {
    const sunAngle = (timeOfDay - 0.5) * Math.PI * 2;
    this.sunOrbitalPosition = {
      x: Math.sin(sunAngle) * this.orbitRadius,
      y: Math.cos(sunAngle) * this.orbitRadius,
      z: 0
    };
    
    const moonAngle = timeOfDay * Math.PI * 2;
    this.moonOrbitalPosition = {
      x: Math.sin(moonAngle) * this.orbitRadius,
      y: Math.cos(moonAngle) * this.orbitRadius,
      z: 0
    };
    
    if (this.stars) {
      this.stars.visible = this.moonObject.visible;
      if (timeOfDay > 0.7 && timeOfDay < 0.8) {
        const fadeInFactor = (timeOfDay - 0.7) / 0.1;
        this.stars.material.opacity = Math.min(0.8, fadeInFactor);
      } else if (timeOfDay > 0.2 && timeOfDay < 0.3) {
        const fadeOutFactor = 1 - ((timeOfDay - 0.2) / 0.1);
        this.stars.material.opacity = Math.min(0.8, fadeOutFactor);
      } else if (this.moonObject.visible) {
        this.stars.material.opacity = 0.8;
      }
    }
  }
  
  updateForPlayer(playerPosition) {
    if (this.sunObject && this.sunObject.visible) {
      this.sunObject.position.set(
        this.sunOrbitalPosition.x + playerPosition.x,
        this.sunOrbitalPosition.y,
        this.sunOrbitalPosition.z + playerPosition.z
      );
    }
    
    if (this.moonObject && this.moonObject.visible) {
      this.moonObject.position.set(
        this.moonOrbitalPosition.x + playerPosition.x,
        this.moonOrbitalPosition.y,
        this.moonOrbitalPosition.z + playerPosition.z
      );
    }
    
    if (this.stars && this.stars.visible) {
      this.stars.position.set(
        playerPosition.x,
        0,
        playerPosition.z
      );
    }
  }
}