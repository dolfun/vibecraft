let leafAnimationState = {
  time: 0,
  strengthMultiplier: 0.8
};

class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = {};
    this.animationState = {
      leafTime: 0,
      plantTime: 0,
      waterTime: 0
    };
    this.noise = new SimplexNoise();
    this.renderedChunks = new Set();

    this.maxChunkX = Math.floor(WORLD_SIZE.WIDTH / CHUNK_SIZE) - 1;
    this.maxChunkY = Math.floor(WORLD_SIZE.HEIGHT / CHUNK_SIZE) - 1;
    this.maxChunkZ = Math.floor(WORLD_SIZE.DEPTH / CHUNK_SIZE) - 1;

    this.initializeTextures();
    this.setupLighting();
    this.skyObjects = new SkyObjects(scene);
    this.enemyManager = null;
  }
  
  initializeTextures() {
    this.textureGenerator = new TextureGenerator();
    this.blockTextures = this.textureGenerator.generateAllTextures();
  }
  
  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambientLight);
    
    this.sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
    this.sunLight.position.set(100, 100, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 512;
    this.sunLight.shadow.mapSize.height = 512;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    const shadowSize = 50;
    this.sunLight.shadow.camera.left = -shadowSize;
    this.sunLight.shadow.camera.right = shadowSize;
    this.sunLight.shadow.camera.top = shadowSize;
    this.sunLight.shadow.camera.bottom = -shadowSize;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);
    
    this.moonLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    this.moonLight.position.set(-100, 100, -100);
    this.moonLight.castShadow = false;
    this.scene.add(this.moonLight);
    
    this.hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.2);
    this.scene.add(this.hemisphereLight);
  }
  
  initialize() {
    this.generateInitialChunks();
  }
  
  generateInitialChunks() {
    const renderDistance = 6;
    const centerX = Math.floor(WORLD_SIZE.WIDTH / 2 / CHUNK_SIZE);
    const centerZ = Math.floor(WORLD_SIZE.DEPTH / 2 / CHUNK_SIZE);
    const chunksX = Math.ceil(WORLD_SIZE.WIDTH / CHUNK_SIZE);
    const chunksZ = Math.ceil(WORLD_SIZE.DEPTH / CHUNK_SIZE);
    
    for (let x = centerX - renderDistance; x <= centerX + renderDistance; x++) {
      for (let z = centerZ - renderDistance; z <= centerZ + renderDistance; z++) {
        if (x < 0 || x >= chunksX || z < 0 || z >= chunksZ) continue;
        for (let y = 0; y < Math.ceil(MAX_HEIGHT / CHUNK_SIZE); y++) {
          this.getChunk(x, y, z, true);
        }
      }
    }
  }
  
  update(player) {
    const now = performance.now() * 0.001;
    if (!this.lastUpdateTime) this.lastUpdateTime = now;
    const dt = now - this.lastUpdateTime;
    this.lastUpdateTime = now;
  
    this.updateChunksAroundPlayer(player);
    this.updateLighting(player.dayNightCycle.timeOfDay);
    
    if (this.skyObjects) {
      this.skyObjects.update(player.dayNightCycle.timeOfDay);
      this.skyObjects.updateForPlayer(player.position);
    }
    
    this.animatePlants(dt, player.dayNightCycle.timeOfDay);
    this.animateLeaves(dt, player.dayNightCycle.timeOfDay);
    
    if (player.dayNightCycle && !this.enemyManager) {
      this.enemyManager = player.enemyManager;
    }
  }
  
  animateLeaves(dt, timeOfDay) {
    this.animationState.leafTime += dt * 0.5;
    leafAnimationState.time = this.animationState.leafTime;
    
    const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
    const baseWindStrength = isDaytime ? 0.15 : 0.08;
    const windVariation = Math.sin(leafAnimationState.time * 0.2) * 0.05;
    const windStrength = baseWindStrength + windVariation;
    
    for (const chunkKey of this.renderedChunks) {
      const chunk = this.chunks[chunkKey];
      if (!chunk || !chunk.mesh) continue;
      
      chunk.mesh.traverse(child => {
        if (!child.isMesh || !child.material) return;
        
        const material = child.material;
        if (material.map !== this.blockTextures[BLOCK_TYPE.LEAVES]) return;
        
        if (!child.userData.leafAnimation) {
          const worldX = chunk.x * CHUNK_SIZE + Math.round(child.position.x);
          const worldY = chunk.y * CHUNK_SIZE + Math.round(child.position.y);
          const worldZ = chunk.z * CHUNK_SIZE + Math.round(child.position.z);
          const positionSeed = (worldX * 10000) + (worldY * 100) + worldZ;
          const hashX = Math.sin(positionSeed * 0.1) * 0.5 + 0.5;
          const hashY = Math.sin(positionSeed * 0.2) * 0.5 + 0.5;
          const hashZ = Math.sin(positionSeed * 0.3) * 0.5 + 0.5;
          
          child.userData.leafAnimation = {
            originalPosition: child.position.clone(),
            offsetFactors: {
              x: hashX * 2 - 1,
              y: hashY * 0.5,
              z: hashZ * 2 - 1
            },
            phaseOffset: hashX * Math.PI * 2,
            frequency: 0.8 + hashY * 0.4
          };
        }
        
        const animation = child.userData.leafAnimation;
        const wave = Math.sin(leafAnimationState.time * animation.frequency + animation.phaseOffset);
        
        child.position.x = animation.originalPosition.x + wave * animation.offsetFactors.x * windStrength * leafAnimationState.strengthMultiplier;
        child.position.y = animation.originalPosition.y + Math.abs(wave) * animation.offsetFactors.y * windStrength * leafAnimationState.strengthMultiplier;
        child.position.z = animation.originalPosition.z + wave * animation.offsetFactors.z * windStrength * leafAnimationState.strengthMultiplier;
        
        child.rotation.x = wave * 0.02 * windStrength;
        child.rotation.z = wave * 0.02 * windStrength;
      });
    }
  }
  
  animatePlants(dt, timeOfDay) {
    this.animationState.plantTime += dt;
    this.plantAnimationTime = this.animationState.plantTime;
    
    const isDaytime = timeOfDay > 0.25 && timeOfDay < 0.75;
    const windStrength = isDaytime
      ? (0.2 + Math.sin(this.plantAnimationTime * 0.2) * 0.05)
      : (0.1 + Math.sin(this.plantAnimationTime * 0.1) * 0.02);
    
    for (const chunkKey of this.renderedChunks) {
      const chunk = this.chunks[chunkKey];
      if (!chunk || !chunk.mesh) continue;
      
      for (const child of chunk.mesh.children || []) {
        if (!child.isMesh || !child.material) continue;
        
        const material = child.material;
        const isPlant = material.map && (
          material.map === this.blockTextures[BLOCK_TYPE.GRASS_PLANT] ||
          material.map === this.blockTextures[BLOCK_TYPE.RED_FLOWER] ||
          material.map === this.blockTextures[BLOCK_TYPE.YELLOW_FLOWER]
        );
        
        if (!isPlant && material.side !== THREE.DoubleSide) continue;
        
        if (!child.userData.animationOffset) {
          const worldX = chunk.x * CHUNK_SIZE + Math.round(child.position.x);
          const worldY = chunk.y * CHUNK_SIZE + Math.round(child.position.y);
          const worldZ = chunk.z * CHUNK_SIZE + Math.round(child.position.z);
          const positionSeed = (worldX * 10000) + (worldY * 100) + worldZ;
          child.userData.animationOffset = Math.sin(positionSeed * 0.1) * Math.PI;
          const deterministicAngle = Math.abs(Math.sin(positionSeed * 0.1)) * Math.PI * 0.25;
          child.userData.originalRotation = { y: deterministicAngle };
          child.rotation.y = deterministicAngle;
        }
        
        const uniqueOffset = child.userData.animationOffset;
        const swayFactor = Math.sin(this.plantAnimationTime + uniqueOffset) * windStrength;
        
        if (child.userData.originalRotation) {
          child.rotation.y = child.userData.originalRotation.y + swayFactor;
          child.rotation.z = swayFactor * 0.3;
        }
      }
    }
  }
  
  updateLighting(timeOfDay) {
    const dayIntensity = 0.4;
    const nightIntensity = 0.08;
    const dayFactor = Math.sin(timeOfDay * Math.PI * 2);
    const adjustedDayFactor = (dayFactor + 1) / 2;
    this.ambientLight.intensity = nightIntensity + (dayIntensity - nightIntensity) * adjustedDayFactor;
    
    if (timeOfDay < 0.25) {
      const t = timeOfDay / 0.25;
      this.ambientLight.color.set(0x3333aa).lerp(new THREE.Color(0xff9966), t);
    } else if (timeOfDay < 0.5) {
      const t = (timeOfDay - 0.25) / 0.25;
      this.ambientLight.color.set(0xff9966).lerp(new THREE.Color(0xffffff), t);
    } else if (timeOfDay < 0.75) {
      const t = (timeOfDay - 0.5) / 0.25;
      this.ambientLight.color.set(0xffffff).lerp(new THREE.Color(0xff9966), t);
    } else {
      const t = (timeOfDay - 0.75) / 0.25;
      this.ambientLight.color.set(0xff9966).lerp(new THREE.Color(0x3333aa), t);
    }
    
    const orbitRadius = 500;
    const sunAngle = (timeOfDay - 0.5) * Math.PI * 2;
    const moonAngle = timeOfDay * Math.PI * 2;
    this.sunLight.position.set(Math.sin(sunAngle) * orbitRadius, Math.cos(sunAngle) * orbitRadius, 0);
    this.moonLight.position.set(Math.sin(moonAngle) * orbitRadius, Math.cos(moonAngle) * orbitRadius, 0);
    
    let sunIntensity = 0;
    if (timeOfDay > 0.15 && timeOfDay < 0.85) {
      if (timeOfDay > 0.3 && timeOfDay < 0.7) {
        sunIntensity = 1.2;
      } else if (timeOfDay < 0.3) {
        sunIntensity = 1.2 * ((timeOfDay - 0.15) / 0.15);
      } else {
        sunIntensity = 1.2 * (1 - ((timeOfDay - 0.7) / 0.15));
      }
    }
    
    let moonIntensity = 0;
    if (timeOfDay < 0.3 || timeOfDay > 0.7) {
      if (timeOfDay > 0.85 || timeOfDay < 0.15) {
        moonIntensity = 0.5;
      } else if (timeOfDay > 0.7 && timeOfDay <= 0.85) {
        moonIntensity = 0.5 * ((timeOfDay - 0.7) / 0.15);
      } else {
        moonIntensity = 0.5 * (1 - ((timeOfDay - 0.15) / 0.15));
      }
    }
    
    let hemiIntensity;
    const dayHemiIntensity = 0.3;
    const nightHemiIntensity = 0.1;
    if (timeOfDay > 0.3 && timeOfDay < 0.7) {
      hemiIntensity = dayHemiIntensity;
    } else if (timeOfDay > 0.8 || timeOfDay < 0.2) {
      hemiIntensity = nightHemiIntensity;
    } else if (timeOfDay >= 0.2 && timeOfDay <= 0.3) {
      const t = (timeOfDay - 0.2) / 0.1;
      hemiIntensity = nightHemiIntensity + (dayHemiIntensity - nightHemiIntensity) * t;
    } else if (timeOfDay >= 0.7 && timeOfDay <= 0.8) {
      const t = (timeOfDay - 0.7) / 0.1;
      hemiIntensity = dayHemiIntensity + (nightHemiIntensity - dayHemiIntensity) * t;
    }
    
    this.hemisphereLight.intensity = hemiIntensity;
    this.sunLight.intensity = sunIntensity;
    this.moonLight.intensity = moonIntensity;
  }
  
  updateChunksAroundPlayer(player) {
    const playerX = Math.floor(player.position.x / CHUNK_SIZE);
    const playerY = Math.floor(player.position.y / CHUNK_SIZE);
    const playerZ = Math.floor(player.position.z / CHUNK_SIZE);
    const renderDistance = 2;
    const unloadDistance = renderDistance + 2;
    const chunksToRender = new Set();
    
    let chunksProcessed = 0;
    const maxChunksPerFrame = 2;
    
    for (let x = Math.max(0, playerX - renderDistance); x <= Math.min(this.maxChunkX, playerX + renderDistance); x++) {
      for (let z = Math.max(0, playerZ - renderDistance); z <= Math.min(this.maxChunkZ, playerZ + renderDistance); z++) {
        const distSq = (x - playerX) ** 2 + (z - playerZ) ** 2;
        if (distSq > renderDistance * renderDistance) continue;
        
        const minY = 0;
        const maxY = Math.min(this.maxChunkY, Math.max(playerY + 2, Math.ceil(SEA_LEVEL / CHUNK_SIZE) + 1));
        
        for (let y = minY; y <= maxY; y++) {
          const chunkKey = getChunkKey(x, y, z);
          chunksToRender.add(chunkKey);
          
          const chunk = this.getChunk(x, y, z, true);
          if (chunk && (!chunk.mesh || chunk.isDirty)) {
            if (chunksProcessed < maxChunksPerFrame) {
              if (chunk.mesh && chunk.isDirty) {
                this.scene.remove(chunk.mesh);
                this.renderedChunks.delete(chunkKey);
              }
              
              const mesh = chunk.createMesh();
              if (mesh) {
                const isNearPlayer = distSq <= 1;
                mesh.traverse(child => {
                  if (child.isMesh) {
                    child.castShadow = isNearPlayer;
                    child.receiveShadow = true;
                  }
                });
                this.scene.add(mesh);
                this.renderedChunks.add(chunkKey);
                chunksProcessed++;
              }
            }
          }
        }
      }
    }
    
    for (const chunkKey of this.renderedChunks) {
      if (!chunksToRender.has(chunkKey)) {
        const [x, , z] = chunkKey.split(',').map(Number);
        const distSq = (x - playerX) ** 2 + (z - playerZ) ** 2;
        if (distSq > unloadDistance * unloadDistance) {
          const chunk = this.chunks[chunkKey];
          if (chunk?.mesh) {
            this.scene.remove(chunk.mesh);
            if (chunk.mesh.geometry) chunk.mesh.geometry.dispose();
            if (chunk.mesh.material) {
              Array.isArray(chunk.mesh.material)
                ? chunk.mesh.material.forEach(m => m.dispose())
                : chunk.mesh.material.dispose();
            }
            chunk.mesh = null;
          }
          this.renderedChunks.delete(chunkKey);
        }
      }
    }
  }
  
  getChunk(x, y, z, generate = false) {
    const chunkKey = getChunkKey(x, y, z);
    if (!this.chunks[chunkKey]) {
      this.chunks[chunkKey] = new Chunk(x, y, z, this);
      this.chunks[chunkKey].initialize();
      if (generate) {
        this.chunks[chunkKey].generate(this.noise);
      }
    }
    return this.chunks[chunkKey];
  }
  
  worldToChunkCoords(x, y, z) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunkZ = Math.floor(z / CHUNK_SIZE);
    
    return {
      chunk: { x: chunkX, y: chunkY, z: chunkZ },
      local: { 
        x: mod(x, CHUNK_SIZE), 
        y: mod(y, CHUNK_SIZE), 
        z: mod(z, CHUNK_SIZE)
      }
    };
  }
  
  getBlock(x, y, z) {
    if (x < 0 || x >= WORLD_SIZE.WIDTH || y < 0 || y >= WORLD_SIZE.HEIGHT || z < 0 || z >= WORLD_SIZE.DEPTH) {
      return createBlock(BLOCK_TYPE.AIR);
    }
    
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.y, coords.chunk.z);
    if (!chunk) return createBlock(BLOCK_TYPE.AIR);
    
    const blockType = chunk.getLocalBlock(coords.local.x, coords.local.y, coords.local.z);
    return createBlock(blockType);
  }
  
  setBlock(x, y, z, blockType) {
    if (x < 0 || x >= WORLD_SIZE.WIDTH || y < 0 || y >= WORLD_SIZE.HEIGHT || z < 0 || z >= WORLD_SIZE.DEPTH) {
      return false;
    }
    
    if (y === 0 && blockType !== BLOCK_TYPE.BEDROCK) {
      return false;
    }
    
    const coords = this.worldToChunkCoords(x, y, z);
    const chunk = this.getChunk(coords.chunk.x, coords.chunk.y, coords.chunk.z, true);
    if (!chunk) return false;
    
    const oldBlockType = chunk.getLocalBlock(coords.local.x, coords.local.y, coords.local.z);
    
    if (oldBlockType !== blockType) {
      const chunksToUpdate = new Set();
      const currentChunkKey = getChunkKey(coords.chunk.x, coords.chunk.y, coords.chunk.z);
      chunksToUpdate.add(currentChunkKey);
      
      if (coords.local.x === 0 || coords.local.x === CHUNK_SIZE - 1 ||
          coords.local.y === 0 || coords.local.y === CHUNK_SIZE - 1 ||
          coords.local.z === 0 || coords.local.z === CHUNK_SIZE - 1) {
        const directions = [
          { x: 1, y: 0, z: 0 },
          { x: -1, y: 0, z: 0 },
          { x: 0, y: 1, z: 0 },
          { x: 0, y: -1, z: 0 },
          { x: 0, y: 0, z: 1 },
          { x: 0, y: 0, z: -1 }
        ];
        
        for (const dir of directions) {
          const nx = coords.chunk.x + dir.x;
          const ny = coords.chunk.y + dir.y;
          const nz = coords.chunk.z + dir.z;
          
          if (nx < 0 || nx > Math.ceil(WORLD_SIZE.WIDTH / CHUNK_SIZE) - 1 || 
              ny < 0 || ny > Math.ceil(WORLD_SIZE.HEIGHT / CHUNK_SIZE) - 1 || 
              nz < 0 || nz > Math.ceil(WORLD_SIZE.DEPTH / CHUNK_SIZE) - 1) {
            continue;
          }
          
          const neighborChunkKey = getChunkKey(nx, ny, nz);
          if (neighborChunkKey !== currentChunkKey) {
            chunksToUpdate.add(neighborChunkKey);
          }
        }
      }
      
      if (blockType === BLOCK_TYPE.GRASS && y < WORLD_SIZE.HEIGHT - 1) {
        const blockAbove = this.getBlock(x, y + 1, z);
        if (blockAbove.id === BLOCK_TYPE.AIR && Math.random() < 0.05) {
          let plantType;
          const plantRand = Math.random();
          if (plantRand < 0.1) {
            plantType = BLOCK_TYPE.RED_FLOWER;
          } else if (plantRand < 0.2) {
            plantType = BLOCK_TYPE.YELLOW_FLOWER;
          } else {
            plantType = BLOCK_TYPE.GRASS_PLANT;
          }
          this.setBlock(x, y + 1, z, plantType);
        }
      }
      
      chunk.setLocalBlock(coords.local.x, coords.local.y, coords.local.z, blockType);
      
      for (const chunkKey of chunksToUpdate) {
        if (this.chunks[chunkKey]) {
          const chunkToUpdate = this.chunks[chunkKey];
          chunkToUpdate.isDirty = true;
          
          if (this.renderedChunks.has(chunkKey)) {
            if (chunkToUpdate.mesh) {
              this.scene.remove(chunkToUpdate.mesh);
            }
            const newMesh = chunkToUpdate.createMesh();
            if (newMesh) {
              newMesh.traverse(child => {
                if (child.isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              this.scene.add(newMesh);
            }
          }
        }
      }
      
      return true;
    }
    
    return false;
  }
  
  breakBlock(x, y, z) {
    const block = this.getBlock(x, y, z);
    if (block.id === BLOCK_TYPE.AIR || block.id === BLOCK_TYPE.BEDROCK) return false;
    
    const drops = block.getDrops();
    
    const blockAbove = this.getBlock(x, y + 1, z);
    let additionalDrops = [];
    
    if (blockAbove.id === BLOCK_TYPE.GRASS_PLANT || 
        blockAbove.id === BLOCK_TYPE.RED_FLOWER || 
        blockAbove.id === BLOCK_TYPE.YELLOW_FLOWER) {
      additionalDrops = blockAbove.getDrops();
      this.setBlock(x, y + 1, z, BLOCK_TYPE.AIR);
    }
    
    const success = this.setBlock(x, y, z, BLOCK_TYPE.AIR);
    
    if (success) {
      return [...drops, ...additionalDrops];
    }
    
    return false;
  }
}
