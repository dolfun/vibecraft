class Chunk {
  constructor(x, y, z, world) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.world = world;
    this.key = getChunkKey(x, y, z);
    this.blocks = new Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
    this.isDirty = true;
    this.mesh = null;
    this.isGenerated = false;
    this.visibilityCache = null;
    this.lastVisibilityCacheTime = 0;
    this.waterMeshes = [];
  }
  
  initialize() {
    this.blocks.fill(BLOCK_TYPE.AIR);
    this.isGenerated = false;
    this.isDirty = true;
    this.visibilityCache = null;
  }
  
  localToIndex(x, y, z) {
    return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
  }
  
  getLocalBlock(x, y, z) {
    return this.blocks[this.localToIndex(x, y, z)] || BLOCK_TYPE.AIR;
  }
  
  setLocalBlock(x, y, z, blockType) {
    const idx = this.localToIndex(x, y, z);
    if (this.blocks[idx] !== blockType) {
      this.blocks[idx] = blockType;
      this.isDirty = true;
      this.visibilityCache = null;
    }
  }
  
  generate(noise) {
    if (this.isGenerated) return;
    
    const worldX = this.x * CHUNK_SIZE;
    const worldY = this.y * CHUNK_SIZE;
    const worldZ = this.z * CHUNK_SIZE;
    const centerX = WORLD_SIZE.WIDTH / 2;
    const centerZ = WORLD_SIZE.DEPTH / 2;
    const islandRadius = ISLAND_SIZE / 2;
    
    const noiseSize = CHUNK_SIZE * CHUNK_SIZE;
    const edgeNoiseValues = new Float32Array(noiseSize);
    const beachNoiseValues = new Float32Array(noiseSize);
    const baseNoiseValues = new Float32Array(noiseSize);
    const oceanFloorNoiseValues = new Float32Array(noiseSize);
    const inBoundsFlags = new Array(noiseSize).fill(false);
    
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
        const absX = worldX + localX;
        const absZ = worldZ + localZ;
        const idx = localX * CHUNK_SIZE + localZ;
        if (absX < 0 || absX >= WORLD_SIZE.WIDTH || absZ < 0 || absZ >= WORLD_SIZE.DEPTH) continue;
        inBoundsFlags[idx] = true;
        edgeNoiseValues[idx] = (noise.noise2D(absX / 20, absZ / 20) + 1) * 0.5;
        beachNoiseValues[idx] = (noise.noise2D(absX / 15, absZ / 15) + 1) * 0.5;
        baseNoiseValues[idx] = (noise.noise2D(absX / 50, absZ / 50) + 1) * 0.5;
        oceanFloorNoiseValues[idx] = (noise.noise2D(absX / 30, absZ / 30) + 1) * 0.5;
      }
    }
    
    for (let localX = 0; localX < CHUNK_SIZE; localX++) {
      for (let localZ = 0; localZ < CHUNK_SIZE; localZ++) {
        const absX = worldX + localX;
        const absZ = worldZ + localZ;
        const idx = localX * CHUNK_SIZE + localZ;
        if (!inBoundsFlags[idx]) continue;
        
        const edgeNoise = edgeNoiseValues[idx];
        const beachNoiseVal = beachNoiseValues[idx];
        const baseNoiseVal = baseNoiseValues[idx];
        const oceanFloorNoise = oceanFloorNoiseValues[idx];
        
        const distFromCenter = Math.hypot(absX - centerX, absZ - centerZ);
        const distortionAmount = 5 + edgeNoise * 3;
        const distortedRadius = islandRadius + (edgeNoise - 0.5) * distortionAmount;
        const isInsideIsland = distFromCenter <= distortedRadius;
        const beachOuterVariation = distortedRadius * (0.97 + beachNoiseVal * 0.06);
        const beachInnerVariation = distortedRadius * (0.75 - beachNoiseVal * 0.1);
        const isInBeachZone = distFromCenter > beachInnerVariation && distFromCenter <= beachOuterVariation;
        
        let terrainHeight = SEA_LEVEL;
        if (isInsideIsland) {
          let islandFalloff = 1.0;
          if (distFromCenter > distortedRadius * 0.6) {
            islandFalloff = Math.max(0, 1.0 - (distFromCenter - distortedRadius * 0.6) / (distortedRadius * 0.4));
          }
          if (isInBeachZone) {
            const beachFactor = (distFromCenter - beachInnerVariation) / (beachOuterVariation - beachInnerVariation);
            const beachHeight = SEA_LEVEL + (1 - beachFactor * 2) + (beachNoiseVal - 0.5);
            const normalHeight = SEA_LEVEL + Math.floor((MAX_HEIGHT - SEA_LEVEL) * baseNoiseVal * islandFalloff);
            terrainHeight = Math.floor(normalHeight * (1 - beachFactor) + beachHeight * beachFactor);
          } else {
            terrainHeight = SEA_LEVEL + Math.floor((MAX_HEIGHT - SEA_LEVEL) * baseNoiseVal * islandFalloff);
          }
        } else {
          terrainHeight = SEA_LEVEL - 12 + Math.floor(oceanFloorNoise * 8);
        }
        
        const baseIdx = this.localToIndex(localX, 0, localZ);
        for (let localY = 0; localY < CHUNK_SIZE; localY++) {
          const absY = worldY + localY;
          let blockType = BLOCK_TYPE.AIR;
          if (absY < 0 || absY >= WORLD_SIZE.HEIGHT) {
            blockType = BLOCK_TYPE.AIR;
          } else if (absY === 0) {
            blockType = BLOCK_TYPE.BEDROCK;
          } else if (absY <= terrainHeight) {
            if (isInsideIsland) {
              if (absY < SEA_LEVEL - 5) blockType = BLOCK_TYPE.STONE;
              else if (absY < SEA_LEVEL) blockType = Math.random() < 0.7 ? BLOCK_TYPE.STONE : BLOCK_TYPE.DIRT;
              else if (absY === terrainHeight) {
                blockType = isInBeachZone
                  ? (absY <= SEA_LEVEL ? BLOCK_TYPE.SAND : (Math.random() < beachNoiseVal * 0.4 ? BLOCK_TYPE.GRASS : BLOCK_TYPE.SAND))
                  : (absY <= SEA_LEVEL + 1 && Math.random() < 0.8 ? BLOCK_TYPE.SAND : BLOCK_TYPE.GRASS);
              } else blockType = BLOCK_TYPE.DIRT;
            } else {
              blockType = absY < terrainHeight - 3
                ? BLOCK_TYPE.STONE
                : (Math.random() < (0.7 + oceanFloorNoise * 0.2) ? BLOCK_TYPE.SAND : BLOCK_TYPE.STONE);
            }
          } else if (absY <= SEA_LEVEL) {
            blockType = BLOCK_TYPE.WATER;
          }
          this.blocks[baseIdx + localY * (CHUNK_SIZE * CHUNK_SIZE)] = blockType;
        }
      }
    }
    
    if (worldY <= SEA_LEVEL + MAX_HEIGHT && worldY >= SEA_LEVEL) {
      this.generateTrees(noise);
    }
    if (worldY >= SEA_LEVEL && worldY <= SEA_LEVEL + 10) {
      this.generatePlants(noise);
    }
    
    this.isGenerated = true;
    this.isDirty = true;
    this.visibilityCache = null;
  }
  
  findSurfaceY(localX, localZ) {
    const worldY = this.y * CHUNK_SIZE;
    for (let y = CHUNK_SIZE - 1; y >= 0; y--) {
      const absY = worldY + y;
      if (absY < 0 || absY >= WORLD_SIZE.HEIGHT) continue;
      if (this.getLocalBlock(localX, y, localZ) === BLOCK_TYPE.GRASS) return y;
    }
    return -1;
  }
  
  generateTrees(noise) {
    const worldX = this.x * CHUNK_SIZE;
    const worldY = this.y * CHUNK_SIZE;
    const worldZ = this.z * CHUNK_SIZE;
    const centerX = WORLD_SIZE.WIDTH / 2;
    const centerZ = WORLD_SIZE.DEPTH / 2;
    const islandRadius = ISLAND_SIZE / 2;
    const treeAttempts = 6;
    
    if (worldY < SEA_LEVEL || worldY > SEA_LEVEL + 30) return;
    
    for (let i = 0; i < treeAttempts; i++) {
      const localX = Math.floor(Math.random() * CHUNK_SIZE);
      const localZ = Math.floor(Math.random() * CHUNK_SIZE);
      const absX = worldX + localX;
      const absZ = worldZ + localZ;
      const edgeNoise = (noise.noise2D(absX / 20, absZ / 20) + 1) * 0.5;
      const treeDensity = (noise.noise2D(absX / 100, absZ / 100) + 1) * 0.3 + 0.3;
      const distFromCenter = Math.hypot(absX - centerX, absZ - centerZ);
      const distortedRadius = islandRadius + (edgeNoise - 0.5) * 5;
      if (distFromCenter > distortedRadius * 0.8) continue;
      if (edgeNoise > (1.0 - treeDensity)) {
        const surfaceY = this.findSurfaceY(localX, localZ);
        if (surfaceY !== -1) this.placeTree(localX, surfaceY, localZ);
      }
    }
  }
  
  generatePlants(noise) {
    const worldX = this.x * CHUNK_SIZE;
    const worldY = this.y * CHUNK_SIZE;
    const worldZ = this.z * CHUNK_SIZE;
    const plantAttempts = 30;
    
    if (worldY < SEA_LEVEL || worldY > SEA_LEVEL + 10) return;
    
    for (let i = 0; i < plantAttempts; i++) {
      const localX = Math.floor(Math.random() * CHUNK_SIZE);
      const localZ = Math.floor(Math.random() * CHUNK_SIZE);
      const absX = worldX + localX;
      const absZ = worldZ + localZ;
      const plantNoise = (noise.noise2D(absX / 10, absZ / 10) + 1) * 0.5;
      const surfaceY = this.findSurfaceY(localX, localZ);
      if (surfaceY !== -1) {
        const absY = this.y * CHUNK_SIZE + surfaceY + 1;
        if (absY < WORLD_SIZE.HEIGHT &&
            this.getLocalBlock(localX, surfaceY + 1, localZ) === BLOCK_TYPE.AIR &&
            absY > SEA_LEVEL) {
          let plantType = BLOCK_TYPE.GRASS_PLANT;
          if (plantNoise < 0.2) plantType = BLOCK_TYPE.RED_FLOWER;
          else if (plantNoise < 0.35) plantType = BLOCK_TYPE.YELLOW_FLOWER;
          this.setLocalBlock(localX, surfaceY + 1, localZ, plantType);
        }
      }
    }
  }
  
  placeTree(localX, localY, localZ) {
    const worldX = this.x * CHUNK_SIZE + localX;
    const worldY = this.y * CHUNK_SIZE + localY;
    const worldZ = this.z * CHUNK_SIZE + localZ;
    const trunkHeight = 3 + Math.floor(Math.random() * 3);
    
    for (let tY = 1; tY <= trunkHeight; tY++) {
      this.world.setBlock(worldX, worldY + tY, worldZ, BLOCK_TYPE.WOOD);
    }
    
    const leafRadius = 2;
    const leafStartHeight = trunkHeight - 1;
    const leafTopHeight = trunkHeight + 2;
    const leafPositions = [];
    
    for (let lY = leafStartHeight; lY <= leafTopHeight; lY++) {
      const currentRadius = lY === leafTopHeight ? 0 :
                            lY === leafStartHeight ? leafRadius : leafRadius - 1;
      for (let lX = -currentRadius; lX <= currentRadius; lX++) {
        for (let lZ = -currentRadius; lZ <= currentRadius; lZ++) {
          if (Math.abs(lX) === currentRadius && Math.abs(lZ) === currentRadius) continue;
          leafPositions.push({ x: worldX + lX, y: worldY + lY, z: worldZ + lZ });
        }
      }
    }
    
    for (const pos of leafPositions) {
      this.world.setBlock(pos.x, pos.y, pos.z, BLOCK_TYPE.LEAVES);
    }
  }
  
  disposeMesh() {
    if (!this.mesh) return;
    const disposeMaterial = (material) => {
      if (Array.isArray(material)) material.forEach(m => m.dispose());
      else material.dispose();
    };
    if (this.mesh.isGroup) {
      while (this.mesh.children.length) {
        const child = this.mesh.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) disposeMaterial(child.material);
        this.mesh.remove(child);
      }
    } else {
      if (this.mesh.geometry) this.mesh.geometry.dispose();
      if (this.mesh.material) disposeMaterial(this.mesh.material);
    }
    this.mesh = null;
  }
  
  createMesh() {
    if (!this.isDirty && this.mesh) return this.mesh;
    this.disposeMesh();
    this.waterMeshes = [];
    
    const solidBlocks = {};
    const transparentBlocks = {};
    
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockType = this.getLocalBlock(x, y, z);
          if (blockType === BLOCK_TYPE.AIR || !this.isBlockVisible(x, y, z)) continue;
          
          const isTransparent = BLOCK_PROPERTIES[blockType]?.isTransparent;
          const collection = isTransparent ? transparentBlocks : solidBlocks;
          if (!collection[blockType]) collection[blockType] = [];
          collection[blockType].push({
            x: this.x * CHUNK_SIZE + x,
            y: this.y * CHUNK_SIZE + y,
            z: this.z * CHUNK_SIZE + z
          });
        }
      }
    }
    
    const totalSolid = Object.values(solidBlocks).reduce((sum, arr) => sum + arr.length, 0);
    const totalTransparent = Object.values(transparentBlocks).reduce((sum, arr) => sum + arr.length, 0);
    if (totalSolid + totalTransparent === 0) {
      this.isDirty = false;
      return null;
    }
    
    const chunkGroup = new THREE.Group();
    const geometries = {
      cube: new THREE.BoxGeometry(1, 1, 1),
      cross: this.createCrossGeometry()
    };
    
    this.createBlockMeshes(solidBlocks, geometries, chunkGroup, false);
    this.createBlockMeshes(transparentBlocks, geometries, chunkGroup, true);
    
    this.mesh = chunkGroup;
    this.isDirty = false;
    return this.mesh;
  }
  
  getVisibleWaterFaces(x, y, z) {
    const worldX = this.x * CHUNK_SIZE + x;
    const worldY = this.y * CHUNK_SIZE + y;
    const worldZ = this.z * CHUNK_SIZE + z;
    const visibleFaces = { right: false, left: false, top: false, bottom: false, front: false, back: false };
    const directions = [
      { dir: [1, 0, 0], face: 'right' },
      { dir: [-1, 0, 0], face: 'left' },
      { dir: [0, 1, 0], face: 'top' },
      { dir: [0, -1, 0], face: 'bottom' },
      { dir: [0, 0, 1], face: 'front' },
      { dir: [0, 0, -1], face: 'back' }
    ];
    for (const { dir, face } of directions) {
      const [dx, dy, dz] = dir;
      const neighbor = this.getAdjacentWorldBlock(worldX + dx, worldY + dy, worldZ + dz);
      visibleFaces[face] = (neighbor === BLOCK_TYPE.AIR || (neighbor !== BLOCK_TYPE.WATER && BLOCK_PROPERTIES[neighbor]?.isTransparent));
    }
    return visibleFaces;
  }
  
  createBlockMeshes(blockGroups, geometries, group, isTransparent) {
    const blockTextures = this.world.blockTextures;
    for (const [blockTypeStr, positions] of Object.entries(blockGroups)) {
      if (!positions.length) continue;
      const blockType = parseInt(blockTypeStr, 10);
      const blockProps = BLOCK_PROPERTIES[blockType] || {};
      const geometry = geometries[blockProps.model] || geometries.cube;
      
      let material;
      const texture = blockTextures[blockType];
      if (texture) {
        if (texture.top) {
          material = [
            new THREE.MeshLambertMaterial({ map: texture.side, transparent: isTransparent }),
            new THREE.MeshLambertMaterial({ map: texture.side, transparent: isTransparent }),
            new THREE.MeshLambertMaterial({ map: texture.top, transparent: isTransparent }),
            new THREE.MeshLambertMaterial({ map: texture.bottom || texture.top, transparent: isTransparent }),
            new THREE.MeshLambertMaterial({ map: texture.side, transparent: isTransparent }),
            new THREE.MeshLambertMaterial({ map: texture.side, transparent: isTransparent })
          ];
        } else {
          material = new THREE.MeshLambertMaterial({
            map: texture,
            transparent: isTransparent || blockProps.model === 'cross',
            side: blockProps.model === 'cross' ? THREE.DoubleSide : THREE.FrontSide,
            alphaTest: blockProps.model === 'cross' ? 0.1 : 0
          });
        }
      } else {
        material = new THREE.MeshLambertMaterial({
          color: BLOCK_COLORS[blockType] || 0xFFFFFF,
          transparent: isTransparent || blockProps.model === 'cross',
          side: blockProps.model === 'cross' ? THREE.DoubleSide : THREE.FrontSide
        });
      }
      
      if (blockType === BLOCK_TYPE.WATER) {
        const waterMaterial = new THREE.MeshLambertMaterial({
          map: texture,
          transparent: true,
          opacity: 0.9,
          color: 0x3F8FFF,
          depthWrite: false
        });
        const faceGeometries = {
          right: new THREE.PlaneGeometry(1, 1),
          left: new THREE.PlaneGeometry(1, 1),
          top: new THREE.PlaneGeometry(1, 1),
          bottom: new THREE.PlaneGeometry(1, 1),
          front: new THREE.PlaneGeometry(1, 1),
          back: new THREE.PlaneGeometry(1, 1)
        };
        faceGeometries.right.rotateY(Math.PI / 2); faceGeometries.right.translate(0.5, 0, 0);
        faceGeometries.left.rotateY(-Math.PI / 2); faceGeometries.left.translate(-0.5, 0, 0);
        faceGeometries.top.rotateX(-Math.PI / 2); faceGeometries.top.translate(0, 0.5, 0);
        faceGeometries.bottom.rotateX(Math.PI / 2); faceGeometries.bottom.translate(0, -0.5, 0);
        faceGeometries.front.translate(0, 0, 0.5);
        faceGeometries.back.rotateY(Math.PI); faceGeometries.back.translate(0, 0, -0.5);
        
        const faceGroups = { right: [], left: [], top: [], bottom: [], front: [], back: [] };
        positions.forEach(pos => {
          const localX = pos.x - this.x * CHUNK_SIZE;
          const localY = pos.y - this.y * CHUNK_SIZE;
          const localZ = pos.z - this.z * CHUNK_SIZE;
          const visibleFaces = this.getVisibleWaterFaces(localX, localY, localZ);
          for (const [face, visible] of Object.entries(visibleFaces)) {
            if (visible) faceGroups[face].push(pos);
          }
        });
        
        for (const [face, positions] of Object.entries(faceGroups)) {
          if (!positions.length) continue;
          try {
            const faceMesh = new THREE.InstancedMesh(faceGeometries[face], waterMaterial, positions.length);
            const matrix = new THREE.Matrix4();
            positions.forEach((pos, i) => {
              matrix.setPosition(pos.x, pos.y, pos.z);
              faceMesh.setMatrixAt(i, matrix);
            });
            faceMesh.instanceMatrix.needsUpdate = true;
            faceMesh.renderOrder = 1;
            this.waterMeshes.push(faceMesh);
            group.add(faceMesh);
          } catch (error) {
            console.error(`Error creating water face ${face} instanced mesh:`, error);
            positions.forEach(pos => {
              const faceMesh = new THREE.Mesh(faceGeometries[face], waterMaterial);
              faceMesh.position.set(pos.x, pos.y, pos.z);
              faceMesh.renderOrder = 1;
              group.add(faceMesh);
            });
          }
        }
      } else if (blockProps.model === 'cross') {
        for (const pos of positions) {
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(pos.x, pos.y, pos.z);
          mesh.renderOrder = 2;
          const positionSeed = (pos.x * 10000) + (pos.y * 100) + pos.z;
          const deterministicAngle = Math.abs(Math.sin(positionSeed * 0.1)) * Math.PI * 0.25;
          mesh.rotation.y = deterministicAngle;
          mesh.userData.originalRotation = { y: deterministicAngle };
          group.add(mesh);
        }
      } else {
        try {
          const instancedMesh = new THREE.InstancedMesh(geometry, material, positions.length);
          const matrix = new THREE.Matrix4();
          positions.forEach((pos, i) => {
            matrix.setPosition(pos.x, pos.y, pos.z);
            instancedMesh.setMatrixAt(i, matrix);
          });
          instancedMesh.instanceMatrix.needsUpdate = true;
          if (isTransparent) instancedMesh.renderOrder = 1;
          group.add(instancedMesh);
        } catch (error) {
          console.error("Error creating instanced mesh:", error);
          positions.forEach(pos => {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(pos.x, pos.y, pos.z);
            if (isTransparent) mesh.renderOrder = 1;
            group.add(mesh);
          });
        }
      }
    }
  }
  
  createCrossGeometry() {
    const geometry = new THREE.BufferGeometry();
    const size = 1.2;
    const vertices = new Float32Array([
      -size/2, -size/2, -size/2,
       size/2, -size/2,  size/2,
      -size/2, size,   -size/2,
       size/2, -size/2,  size/2,
       size/2, size,    size/2,
      -size/2, size,   -size/2,
      -size/2, -size/2,  size/2,
       size/2, -size/2, -size/2,
      -size/2, size,    size/2,
       size/2, -size/2, -size/2,
       size/2, size,   -size/2,
      -size/2, size,    size/2
    ]);
    
    const uvs = new Float32Array([
      0, 0, 1, 0, 0, 1,
      1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 0, 1,
      1, 0, 1, 1, 0, 1
    ]);
    
    const normals = new Float32Array([
      -1, 0, -1,  1, 0, 1,  -1, 0, -1,
       1, 0, 1,   1, 0, 1,  -1, 0, -1,
      -1, 0,  1,  1, 0, -1, -1, 0,  1,
       1, 0, -1,  1, 0, -1, -1, 0,  1
    ]);
    
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.hypot(normals[i], normals[i+1], normals[i+2]);
      if (len > 0) {
        normals[i]   /= len;
        normals[i+1] /= len;
        normals[i+2] /= len;
      }
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    return geometry;
  }
  
  isBlockVisible(x, y, z) {
    const blockType = this.getLocalBlock(x, y, z);
    if (blockType === BLOCK_TYPE.AIR) return false;
    
    if (blockType === BLOCK_TYPE.WATER) {
      const worldX = this.x * CHUNK_SIZE + x;
      const worldY = this.y * CHUNK_SIZE + y;
      const worldZ = this.z * CHUNK_SIZE + z;
      const blockAbove = this.getAdjacentWorldBlock(worldX, worldY + 1, worldZ);
      if (blockAbove === BLOCK_TYPE.AIR ||
          (blockAbove !== BLOCK_TYPE.WATER && BLOCK_PROPERTIES[blockAbove]?.isTransparent))
        return true;
      const directions = [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,-1,0]];
      for (const [dx,dy,dz] of directions) {
        const neighbor = this.getAdjacentWorldBlock(worldX+dx, worldY+dy, worldZ+dz);
        if (neighbor === BLOCK_TYPE.AIR ||
            (neighbor !== BLOCK_TYPE.WATER && BLOCK_PROPERTIES[neighbor]?.isTransparent))
          return true;
      }
      return false;
    }
    
    if (BLOCK_PROPERTIES[blockType]?.isTransparent) {
      const directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
      for (const [dx,dy,dz] of directions) {
        let neighbor;
        const nx = x + dx, ny = y + dy, nz = z + dz;
        if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
          const worldX = this.x * CHUNK_SIZE + x + dx;
          const worldY = this.y * CHUNK_SIZE + y + dy;
          const worldZ = this.z * CHUNK_SIZE + z + dz;
          neighbor = this.getAdjacentWorldBlock(worldX, worldY, worldZ);
        } else {
          neighbor = this.getLocalBlock(nx, ny, nz);
        }
        if (neighbor === BLOCK_TYPE.AIR ||
            (neighbor !== blockType && BLOCK_PROPERTIES[neighbor]?.isTransparent))
          return true;
      }
      return false;
    }
    
    const directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for (const [dx,dy,dz] of directions) {
      let neighbor;
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < 0 || nx >= CHUNK_SIZE || ny < 0 || ny >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
        const worldX = this.x * CHUNK_SIZE + x + dx;
        const worldY = this.y * CHUNK_SIZE + y + dy;
        const worldZ = this.z * CHUNK_SIZE + z + dz;
        neighbor = this.getAdjacentWorldBlock(worldX, worldY, worldZ);
      } else {
        neighbor = this.getLocalBlock(nx, ny, nz);
      }
      if (neighbor === BLOCK_TYPE.AIR || (BLOCK_PROPERTIES[neighbor]?.isTransparent))
        return true;
    }
    return false;
  }
  
  getAdjacentWorldBlock(worldX, worldY, worldZ) {
    if (worldX < 0 || worldX >= WORLD_SIZE.WIDTH ||
        worldY < 0 || worldY >= WORLD_SIZE.HEIGHT ||
        worldZ < 0 || worldZ >= WORLD_SIZE.DEPTH)
      return BLOCK_TYPE.AIR;
    
    const chunkX = Math.floor(worldX / CHUNK_SIZE);
    const chunkY = Math.floor(worldY / CHUNK_SIZE);
    const chunkZ = Math.floor(worldZ / CHUNK_SIZE);
    const chunkKey = getChunkKey(chunkX, chunkY, chunkZ);
    const chunk = this.world.chunks[chunkKey];
    if (!chunk) return BLOCK_TYPE.AIR;
    
    const localX = worldX - chunkX * CHUNK_SIZE;
    const localY = worldY - chunkY * CHUNK_SIZE;
    const localZ = worldZ - chunkZ * CHUNK_SIZE;
    return chunk.getLocalBlock(localX, localY, localZ);
  }
}
