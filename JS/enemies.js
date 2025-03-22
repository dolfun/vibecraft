const ENEMY_TYPE = {
  ZOMBIE: 0,
  SKELETON: 1,
  SPIDER: 2,
  CREEPER: 3
};

class Enemy {
  constructor(type, world, player) {
    this.type = type;
    this.world = world;
    this.player = player;
    this.id = generateUUID();

    switch (type) {
      case ENEMY_TYPE.ZOMBIE:
        this.health = 20;
        this.maxHealth = 20;
        this.damage = 16;
        this.speed = 2.0;
        this.attackRange = 2.0;
        this.detectionRange = 15;
        this.texture = 'zombie';
        this.burnsInDaylight = true;
        this.size = { width: 0.6, height: 1.8 };
        this.modelScale = 0.9;
        break;
      case ENEMY_TYPE.SKELETON:
        this.health = 15;
        this.maxHealth = 15;
        this.damage = 12;
        this.speed = 2.2;
        this.attackRange = 8.0;
        this.detectionRange = 20;
        this.texture = 'skeleton';
        this.burnsInDaylight = true;
        this.size = { width: 0.6, height: 1.8 };
        this.modelScale = 0.85;
        break;
      case ENEMY_TYPE.SPIDER:
        this.health = 16;
        this.maxHealth = 16;
        this.damage = 12;
        this.speed = 2.7;
        this.attackRange = 1.8;
        this.detectionRange = 12;
        this.texture = 'spider';
        this.burnsInDaylight = false;
        this.size = { width: 1.4, height: 0.9 };
        this.modelScale = 1.0;
        break;
      case ENEMY_TYPE.CREEPER:
        this.health = 20;
        this.maxHealth = 20;
        this.damage = 60;
        this.speed = 1.8;
        this.attackRange = 3.0;
        this.detectionRange = 10;
        this.texture = 'creeper';
        this.burnsInDaylight = false;
        this.size = { width: 0.6, height: 1.7 };
        this.fuseTime = 1.5;
        this.isFusing = false;
        this.modelScale = 0.85;
        break;
      default:
        this.health = 10;
        this.maxHealth = 10;
        this.damage = 8;
        this.speed = 2.0;
        this.attackRange = 2.0;
        this.detectionRange = 10;
        this.texture = 'zombie';
        this.burnsInDaylight = false;
        this.size = { width: 0.6, height: 1.8 };
        this.modelScale = 0.9;
    }

    this.applyDifficultyScaling();
    this.initializePosition();
    this.createEnhancedModel();

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.targetPosition = null;
    this.pathfindingCooldown = 0;
    this.attackCooldown = 0;
    this.burnDamageTimer = 0;
    this.knockbackTime = 0;
    this.knockbackDirection = new THREE.Vector3();
    this.knockbackStrength = 8.0;
    this.knockbackDuration = 0.3;
    this.animationTime = 0;
    this.animationSpeed = 1.0;
    this.swingAngle = 0;
    this.bobHeight = 0;
  }
  
  applyDifficultyScaling() {
    if (!this.player || !this.player.dayNightCycle) return;
    const day = this.player.dayNightCycle.day;
    const difficultyMultiplier = 1 + (day - 1) * 0.2;
    this.maxHealth = Math.ceil(this.maxHealth * difficultyMultiplier);
    this.health = this.maxHealth;
    this.damage = Math.ceil(this.damage * (1 + (day - 1) * 0.1));
    const speedMultiplier = Math.min(1.5, 1 + (day - 1) * 0.05);
    this.speed *= speedMultiplier;
    this.detectionRange *= (1 + (day - 1) * 0.1);
    if (this.type === ENEMY_TYPE.CREEPER && day > 3) {
      this.fuseTime = Math.max(0.5, 1.5 - (day - 3) * 0.2);
    }
  }
  
  initializePosition() {
    let attempts = 0;
    const maxAttempts = 50;
    let validPosition = false;
    
    while (!validPosition && attempts < maxAttempts) {
      const playerPos = this.player.position;
      const spawnDistance = 15 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      const spawnX = playerPos.x + Math.cos(angle) * spawnDistance;
      const spawnZ = playerPos.z + Math.sin(angle) * spawnDistance;
      let groundY = SEA_LEVEL;
      for (let y = MAX_HEIGHT; y > 0; y--) {
        const block = this.world.getBlock(Math.floor(spawnX), y, Math.floor(spawnZ));
        if (block.isSolid) {
          groundY = y + 1;
          break;
        }
      }
      groundY += 1 + Math.floor(Math.random() * 2);
      let hasSpace = true;
      for (let y = 0; y < Math.ceil(this.size.height); y++) {
        const block = this.world.getBlock(Math.floor(spawnX), groundY + y, Math.floor(spawnZ));
        if (block.id !== BLOCK_TYPE.AIR) {
          hasSpace = false;
          break;
        }
      }
      if (hasSpace) {
        this.position = new THREE.Vector3(spawnX, groundY, spawnZ);
        validPosition = true;
      }
      attempts++;
    }
    
    if (!validPosition) {
      const playerPos = this.player.position;
      this.position = new THREE.Vector3(
        playerPos.x + (Math.random() * 20 - 10),
        SEA_LEVEL + 3,
        playerPos.z + (Math.random() * 20 - 10)
      );
    }
  }
  
  createEnhancedModel() {
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    this.mesh.userData.enemy = this;
    this.mesh.scale.set(this.modelScale, this.modelScale, this.modelScale);
    
    switch (this.type) {
      case ENEMY_TYPE.ZOMBIE:
        this.createZombieModel();
        break;
      case ENEMY_TYPE.SKELETON:
        this.createSkeletonModel();
        break;
      case ENEMY_TYPE.SPIDER:
        this.createSpiderModel();
        break;
      case ENEMY_TYPE.CREEPER:
        this.createCreeperModel();
        break;
      default:
        this.createZombieModel();
    }
    this.world.scene.add(this.mesh);
  }
  
  createZombieModel() {
    const zombieBody = new THREE.MeshLambertMaterial({ color: 0x2D9E36 });
    const zombieFace = new THREE.MeshLambertMaterial({ color: 0x1B7124 });
    const zombieArms = new THREE.MeshLambertMaterial({ color: 0x2D8B36 });
    const zombieLegs = new THREE.MeshLambertMaterial({ color: 0x1E6C27 });
    
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), zombieFace);
    head.position.y = 1.5;
    this.mesh.add(head);
    
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    leftEye.position.set(-0.25, 0.1, 0.42);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    rightEye.position.set(0.25, 0.1, 0.42);
    head.add(rightEye);
    
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    mouth.position.set(0, -0.2, 0.42);
    head.add(mouth);
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.4), zombieBody);
    body.position.y = 0.7;
    this.mesh.add(body);
    
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), zombieArms);
    leftArm.position.set(-0.5, 0.7, 0);
    this.leftArm = leftArm;
    this.mesh.add(leftArm);
    
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.3), zombieArms);
    rightArm.position.set(0.5, 0.7, 0);
    this.rightArm = rightArm;
    this.mesh.add(rightArm);
    
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), zombieLegs);
    leftLeg.position.set(-0.2, 0.05, 0);
    this.leftLeg = leftLeg;
    this.mesh.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), zombieLegs);
    rightLeg.position.set(0.2, 0.05, 0);
    this.rightLeg = rightLeg;
    this.mesh.add(rightLeg);
  }
  
  createSkeletonModel() {
    const boneMaterial = new THREE.MeshLambertMaterial({ color: 0xDDDDDD });
    const darkBoneMaterial = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
    const bowMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
    
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), boneMaterial);
    head.position.y = 1.5;
    this.mesh.add(head);
    
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    leftEye.position.set(-0.2, 0.1, 0.38);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    rightEye.position.set(0.2, 0.1, 0.38);
    head.add(rightEye);
    
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    nose.position.set(0, -0.05, 0.38);
    head.add(nose);
    
    const ribcage = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3), darkBoneMaterial);
    ribcage.position.y = 0.8;
    this.mesh.add(ribcage);
    
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), boneMaterial);
    spine.position.y = 0.8;
    this.mesh.add(spine);
    
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), boneMaterial);
    leftArm.position.set(-0.4, 0.8, 0);
    this.leftArm = leftArm;
    this.mesh.add(leftArm);
    
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), boneMaterial);
    rightArm.position.set(0.4, 0.8, 0);
    this.rightArm = rightArm;
    this.mesh.add(rightArm);
    
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), boneMaterial);
    leftLeg.position.set(-0.2, 0.05, 0);
    this.leftLeg = leftLeg;
    this.mesh.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), boneMaterial);
    rightLeg.position.set(0.2, 0.05, 0);
    this.rightLeg = rightLeg;
    this.mesh.add(rightLeg);
    
    this.bow = new THREE.Group();
    const bowHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), bowMaterial);
    this.bow.add(bowHandle);
    
    const bowUpperCurve = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.05), bowMaterial);
    bowUpperCurve.position.y = 0.4;
    bowUpperCurve.rotation.x = -Math.PI / 8;
    this.bow.add(bowUpperCurve);
    
    const bowLowerCurve = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.05), bowMaterial);
    bowLowerCurve.position.y = -0.4;
    bowLowerCurve.rotation.x = Math.PI / 8;
    this.bow.add(bowLowerCurve);
    
    const bowString = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.9, 0.01), new THREE.MeshLambertMaterial({ color: 0xCCCCCC }));
    bowString.position.z = 0.1;
    this.bow.add(bowString);
    
    this.arrow = new THREE.Group();
    const arrowShaft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), new THREE.MeshLambertMaterial({ color: 0x8B4513 }));
    this.arrow.add(arrowShaft);
    
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 4), new THREE.MeshLambertMaterial({ color: 0x777777 }));
    arrowHead.position.y = 0.325;
    arrowHead.rotation.x = Math.PI / 2;
    this.arrow.add(arrowHead);
    
    const arrowFletching = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.01), new THREE.MeshLambertMaterial({ color: 0xFF0000 }));
    arrowFletching.position.y = -0.2;
    this.arrow.add(arrowFletching);
    
    this.bow.position.z = 0.3;
    this.bow.position.y = -0.3;
    this.bow.rotation.x = Math.PI / 2;
    rightArm.add(this.bow);
    
    this.arrow.visible = false;
    this.bow.add(this.arrow);
  }
  
  createSpiderModel() {
    const spiderBody = new THREE.MeshLambertMaterial({ color: 0x151515 });
    const spiderLegs = new THREE.MeshLambertMaterial({ color: 0x0A0A0A });
    
    const thorax = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 1.0), spiderBody);
    thorax.position.y = 0.5;
    this.mesh.add(thorax);
    
    const abdomen = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 1.1), spiderBody);
    abdomen.position.set(0, 0.5, -0.8);
    this.mesh.add(abdomen);
    
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
    for (let i = 0; i < 4; i++) {
      const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMaterial);
      leftEye.position.set(-0.2 + (i % 2) * 0.1, 0.6, 0.5 - Math.floor(i / 2) * 0.15);
      this.mesh.add(leftEye);
      
      const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), eyeMaterial);
      rightEye.position.set(0.2 - (i % 2) * 0.1, 0.6, 0.5 - Math.floor(i / 2) * 0.15);
      this.mesh.add(rightEye);
    }
    
    const leftMandible = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), spiderLegs);
    leftMandible.position.set(-0.3, 0.4, 0.6);
    this.mesh.add(leftMandible);
    
    const rightMandible = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.3), spiderLegs);
    rightMandible.position.set(0.3, 0.4, 0.6);
    this.mesh.add(rightMandible);
    
    this.spiderLegs = [];
    const legPositions = [
      { x: -0.4, z: 0.4 },
      { x: 0.4, z: 0.4 },
      { x: -0.4, z: 0.1 },
      { x: 0.4, z: 0.1 },
      { x: -0.4, z: -0.2 },
      { x: 0.4, z: -0.2 },
      { x: -0.4, z: -0.5 },
      { x: 0.4, z: -0.5 }
    ];
    
    for (let i = 0; i < legPositions.length; i++) {
      const pos = legPositions[i];
      const isRightSide = pos.x > 0;
      const leg = new THREE.Group();
      const upperLeg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), spiderLegs);
      upperLeg.position.set(isRightSide ? 0.3 : -0.3, 0, 0);
      leg.add(upperLeg);
      const lowerLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), spiderLegs);
      lowerLeg.position.set(isRightSide ? 0.6 : -0.6, -0.2, 0);
      leg.add(lowerLeg);
      leg.position.set(pos.x, 0.5, pos.z);
      leg.rotation.z = isRightSide ? -Math.PI / 6 : Math.PI / 6;
      this.mesh.add(leg);
      this.spiderLegs.push(leg);
    }
  }
  
  createCreeperModel() {
    const creeperBody = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
    const creeperFeet = new THREE.MeshLambertMaterial({ color: 0x388E3C });
    
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), creeperBody);
    head.position.y = 1.2;
    this.mesh.add(head);
    
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    mouth.position.set(0, -0.15, 0.42);
    head.add(mouth);
    
    const leftEye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    leftEye.position.set(-0.2, 0.15, 0.42);
    head.add(leftEye);
    
    const rightEye = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), new THREE.MeshLambertMaterial({ color: 0x000000 }));
    rightEye.position.set(0.2, 0.15, 0.42);
    head.add(rightEye);
    
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.4), creeperBody);
    body.position.y = 0.6;
    this.mesh.add(body);
    
    const frontLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), creeperFeet);
    frontLeftLeg.position.set(-0.2, 0.0, 0.1);
    this.frontLeftLeg = frontLeftLeg;
    this.mesh.add(frontLeftLeg);
    
    const frontRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), creeperFeet);
    frontRightLeg.position.set(0.2, 0.0, 0.1);
    this.frontRightLeg = frontRightLeg;
    this.mesh.add(frontRightLeg);
    
    const backLeftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), creeperFeet);
    backLeftLeg.position.set(-0.2, 0.0, -0.1);
    this.backLeftLeg = backLeftLeg;
    this.mesh.add(backLeftLeg);
    
    const backRightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), creeperFeet);
    backRightLeg.position.set(0.2, 0.0, -0.1);
    this.backRightLeg = backRightLeg;
    this.mesh.add(backRightLeg);
    
    this.fuseEffect = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.0 })
    );
    this.fuseEffect.position.y = 1.2;
    this.mesh.add(this.fuseEffect);
  }

  applyDifficultyScaling() {
    if (!this.player || !this.player.dayNightCycle) return;
    const day = this.player.dayNightCycle.day;
    
    const healthMultiplier = 1 + (day - 1) * 0.3;
    this.maxHealth = Math.ceil(this.maxHealth * healthMultiplier);
    this.health = this.maxHealth;
    
    const damageMultiplier = 1 + (day - 1) * 0.15;
    this.damage = Math.ceil(this.damage * damageMultiplier);
    
    const speedMultiplier = Math.min(1.8, 1 + (day - 1) * 0.08);
    this.speed *= speedMultiplier;
    
    this.detectionRange *= (1 + (day - 1) * 0.15);
    
    if (this.type === ENEMY_TYPE.CREEPER) {
      if (day >= 3) {
        this.fuseTime = Math.max(0.4, 1.5 - (day - 2) * 0.25);
      }
      if (day >= 4) {
        this.damage = Math.ceil(this.damage * 1.2);
      }
    }
    
    if (this.type === ENEMY_TYPE.SKELETON && day >= 3) {
      this.attackRange *= 1.2;
    }
  }
  
  update(dt) {
    const distToPlayer = distance(
      this.position.x, this.position.y, this.position.z,
      this.player.position.x, this.player.position.y, this.player.position.z
    );
    
    if (distToPlayer > 50) return;
    
    this.animationTime += dt;
    
    if (this.burnsInDaylight && this.player.dayNightCycle.isDay()) {
      let exposedToSun = true;
      for (let y = Math.ceil(this.position.y); y < MAX_HEIGHT; y++) {
        const block = this.world.getBlock(Math.floor(this.position.x), y, Math.floor(this.position.z));
        if (block.id !== BLOCK_TYPE.AIR && !block.isTransparent) {
          exposedToSun = false;
          break;
        }
      }
      if (exposedToSun) {
        this.burnDamageTimer += dt;
        if (this.burnDamageTimer >= 1.0) {
          this.takeDamage(1);
          this.burnDamageTimer = 0;
          if (this.mesh) {
            this.mesh.traverse(child => {
              if (child.isMesh && child.material && !child.material.map) {
                child.material.color.set(0xFF0000);
              }
            });
            setTimeout(() => {
              if (this.mesh) this.resetMeshColors();
            }, 100);
          }
        }
      }
    }
    
    if (this.knockbackTime > 0) {
      this.knockbackTime -= dt;
      this.velocity.x = this.knockbackDirection.x * this.knockbackStrength * (this.knockbackTime / this.knockbackDuration);
      this.velocity.z = this.knockbackDirection.z * this.knockbackStrength * (this.knockbackTime / this.knockbackDuration);
      this.pathfindingCooldown = Math.max(this.pathfindingCooldown, this.knockbackTime);
    }
    
    if (this.pathfindingCooldown > 0) this.pathfindingCooldown -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    
    if (this.knockbackTime <= 0) this.updateAI(dt, distToPlayer);
    
    this.velocity.y -= 20 * dt;
    const oldPosition = this.position.clone();
    const newPosition = this.position.clone();
    newPosition.x += this.velocity.x * dt;
    newPosition.y += this.velocity.y * dt;
    newPosition.z += this.velocity.z * dt;
    
    this.checkCollisionAndMove(oldPosition, newPosition);
    
    if (this.mesh) {
      this.mesh.position.copy(this.position);
      if (this.velocity.x !== 0 || this.velocity.z !== 0) {
        const angle = Math.atan2(this.velocity.x, this.velocity.z);
        this.mesh.rotation.y = angle;
      } else if (distToPlayer < this.detectionRange) {
        const angleToPlayer = Math.atan2(
          this.player.position.x - this.position.x,
          this.player.position.z - this.position.z
        );
        this.mesh.rotation.y = angleToPlayer;
      }
      this.updateAnimation(dt);
    }
    
    if (this.type === ENEMY_TYPE.CREEPER && this.isFusing) {
      this.updateFuseEffect(dt);
    }
  }
  
  resetMeshColors() {
    if (!this.mesh) return;
    this.mesh.traverse(child => {
      if (!child.isMesh || !child.material) return;
      switch (this.type) {
        case ENEMY_TYPE.ZOMBIE:
          if (child === this.leftArm || child === this.rightArm) {
            child.material.color.set(0x2D8B36);
          } else if (child === this.leftLeg || child === this.rightLeg) {
            child.material.color.set(0x1E6C27);
          } else {
            child.material.color.set(0x2D9E36);
          }
          break;
        case ENEMY_TYPE.SKELETON:
          child.material.color.set(0xDDDDDD);
          break;
        case ENEMY_TYPE.SPIDER:
          child.material.color.set(0x151515);
          break;
        case ENEMY_TYPE.CREEPER:
          if (child === this.frontLeftLeg || child === this.frontRightLeg ||
              child === this.backLeftLeg || child === this.backRightLeg) {
            child.material.color.set(0x388E3C);
          } else {
            child.material.color.set(0x4CAF50);
          }
          break;
        default:
          child.material.color.set(0xFFFFFF);
      }
    });
  }
  
  updateFuseEffect(dt) {
    if (!this.fuseEffect) return;
    this.fuseTime -= dt;
    const flashFrequency = 2 + 8 * (1 - this.fuseTime / 1.5);
    const flashValue = Math.sin(this.fuseTime * flashFrequency * Math.PI * 2) * 0.5 + 0.5;
    this.fuseEffect.material.opacity = flashValue * 0.7;
    if (this.fuseTime <= 0) this.explode();
  }
  
  explode() {
    const distToPlayer = distance(
      this.position.x, this.position.y, this.position.z,
      this.player.position.x, this.player.position.y, this.player.position.z
    );
    if (distToPlayer < this.attackRange) {
      const damageFactor = 1 - (distToPlayer / this.attackRange);
      const explosionDamage = Math.ceil(this.damage * damageFactor);
      this.player.takeDamage(explosionDamage);
      const knockbackDir = new THREE.Vector3(
        this.player.position.x - this.position.x,
        0,
        this.player.position.z - this.position.z
      ).normalize();
      this.player.velocity.x += knockbackDir.x * 15 * damageFactor;
      this.player.velocity.z += knockbackDir.z * 15 * damageFactor;
      this.player.velocity.y += 5 * damageFactor;
    }
    this.createExplosionEffect();
    this.health = 0;
    this.die();
  }
  
  createExplosionEffect() {
    const explosionGeometry = new THREE.SphereGeometry(3, 16, 16);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xFF5500,
      transparent: true,
      opacity: 0.8
    });
    
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosion.position.copy(this.position);
    this.world.scene.add(explosion);
    
    let size = 0.1;
    let opacity = 0.8;
    
    const expandExplosion = () => {
      if (size >= 1.0) {
        opacity -= 0.05;
        explosionMaterial.opacity = opacity;
        if (opacity <= 0) {
          clearInterval(explosionInterval);
          this.world.scene.remove(explosion);
          explosionGeometry.dispose();
          explosionMaterial.dispose();
          return;
        }
      } else {
        size += 0.05;
        explosion.scale.set(size, size, size);
      }
    };
    
    const explosionInterval = setInterval(expandExplosion, 16);
  }
  
  updateAnimation(dt) {
    switch (this.type) {
      case ENEMY_TYPE.ZOMBIE:
        this.animateZombie(dt);
        break;
      case ENEMY_TYPE.SKELETON:
        this.animateSkeleton(dt);
        break;
      case ENEMY_TYPE.SPIDER:
        this.animateSpider(dt);
        break;
      case ENEMY_TYPE.CREEPER:
        this.animateCreeper(dt);
        break;
    }
  }
  
  animateZombie(dt) {
    if (!this.leftArm || !this.rightArm || !this.leftLeg || !this.rightLeg) return;
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    if (isMoving) {
      const walkSpeed = 4;
      const swingAmount = 0.5;
      const swingAngle = Math.sin(this.animationTime * walkSpeed) * swingAmount;
      this.leftArm.rotation.x = -0.3 + swingAngle;
      this.rightArm.rotation.x = -0.3 - swingAngle;
      this.leftLeg.rotation.x = -swingAngle;
      this.rightLeg.rotation.x = swingAngle;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.animationTime * walkSpeed * 2)) * 0.05;
    } else {
      const idleSpeed = 1;
      const idleAmount = 0.1;
      const idleSway = Math.sin(this.animationTime * idleSpeed) * idleAmount;
      this.leftArm.rotation.x = -0.4 + idleSway;
      this.rightArm.rotation.x = -0.4 - idleSway;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.mesh.position.y = this.position.y + Math.sin(this.animationTime * idleSpeed * 0.5) * 0.02;
    }
  }
  
  animateSkeleton(dt) {
    if (!this.leftArm || !this.rightArm || !this.leftLeg || !this.rightLeg || !this.bow) return;
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    const distToPlayer = distance(
      this.position.x, this.position.y, this.position.z,
      this.player.position.x, this.player.position.y, this.player.position.z
    );
    if (isMoving) {
      const walkSpeed = 5;
      const swingAmount = 0.4;
      const swingAngle = Math.sin(this.animationTime * walkSpeed) * swingAmount;
      this.leftArm.rotation.x = swingAngle;
      this.rightArm.rotation.x = swingAngle * 0.3;
      this.leftLeg.rotation.x = -swingAngle;
      this.rightLeg.rotation.x = swingAngle;
      this.bow.rotation.x = Math.PI / 2;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.animationTime * walkSpeed * 2)) * 0.05;
      if (this.arrow) this.arrow.visible = false;
    } else if (distToPlayer <= this.attackRange && this.attackCooldown <= 0.2) {
      this.rightArm.rotation.x = -0.3;
      this.rightArm.rotation.y = 0;
      this.leftArm.rotation.x = 0.2;
      this.leftArm.rotation.z = -0.3;
      if (this.arrow) {
        this.arrow.visible = true;
        this.arrow.position.y = 0;
        this.arrow.position.z = 0.05;
        this.arrow.traverse(child => {
          if (child.isMesh) {
            child.material.emissive = new THREE.Color(0x555555);
          }
        });
      }
    } else {
      const idleSpeed = 0.8;
      const idleAmount = 0.07;
      const idleSway = Math.sin(this.animationTime * idleSpeed) * idleAmount;
      this.leftArm.rotation.x = idleSway;
      this.rightArm.rotation.x = -idleSway;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.mesh.position.y = this.position.y + Math.sin(this.animationTime * idleSpeed * 0.5) * 0.02;
      if (this.arrow) this.arrow.visible = false;
    }
  }
  
  animateSpider(dt) {
    if (!this.spiderLegs || this.spiderLegs.length === 0) return;
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    if (isMoving) {
      const walkSpeed = 8;
      const animScale = 0.15;
      for (let i = 0; i < this.spiderLegs.length; i++) {
        const leg = this.spiderLegs[i];
        const phase = i % 2 === 0 ? 0 : Math.PI;
        const legIndex = Math.floor(i / 2);
        const additionalPhase = legIndex * Math.PI / 2;
        const angle = Math.sin(this.animationTime * walkSpeed + phase + additionalPhase) * animScale;
        leg.rotation.x = angle;
        leg.rotation.y = angle * 0.5;
      }
      const bodyTilt = Math.sin(this.animationTime * walkSpeed * 2) * 0.05;
      this.mesh.rotation.x = bodyTilt;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.animationTime * walkSpeed)) * 0.05;
    } else {
      const idleSpeed = 1.5;
      const idleAmount = 0.05;
      for (let i = 0; i < this.spiderLegs.length; i++) {
        const leg = this.spiderLegs[i];
        const phase = i * Math.PI / 4;
        const angle = Math.sin(this.animationTime * idleSpeed + phase) * idleAmount;
        leg.rotation.x = angle;
        leg.rotation.y = angle * 0.3;
      }
      this.mesh.rotation.x = 0;
      this.mesh.position.y = this.position.y + Math.sin(this.animationTime * idleSpeed * 0.5) * 0.02;
    }
  }
  
  animateCreeper(dt) {
    if (!this.frontLeftLeg || !this.frontRightLeg || !this.backLeftLeg || !this.backRightLeg) return;
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    if (this.isFusing) {
      const fuseProgress = 1 - this.fuseTime / 1.5;
      const pulseRate = 5 + fuseProgress * 10;
      const pulseScale = 0.05 + fuseProgress * 0.1;
      const pulseFactor = 1 + Math.sin(this.animationTime * pulseRate) * pulseScale;
      this.mesh.scale.set(this.modelScale * pulseFactor, this.modelScale * pulseFactor, this.modelScale * pulseFactor);
      this.frontLeftLeg.rotation.x = 0;
      this.frontRightLeg.rotation.x = 0;
      this.backLeftLeg.rotation.x = 0;
      this.backRightLeg.rotation.x = 0;
    } else if (isMoving) {
      const walkSpeed = 4;
      const swingAmount = 0.25;
      this.mesh.scale.set(this.modelScale, this.modelScale, this.modelScale);
      const frontLeftAngle = Math.sin(this.animationTime * walkSpeed) * swingAmount;
      const frontRightAngle = Math.sin(this.animationTime * walkSpeed + Math.PI) * swingAmount;
      this.frontLeftLeg.rotation.x = frontLeftAngle;
      this.backRightLeg.rotation.x = frontLeftAngle;
      this.frontRightLeg.rotation.x = frontRightAngle;
      this.backLeftLeg.rotation.x = frontRightAngle;
      this.mesh.position.y = this.position.y + Math.abs(Math.sin(this.animationTime * walkSpeed * 2)) * 0.05;
    } else {
      const idleSpeed = 0.7;
      const idleAmount = 0.05;
      this.mesh.scale.set(this.modelScale, this.modelScale, this.modelScale);
      const frontLeftAngle = Math.sin(this.animationTime * idleSpeed) * idleAmount;
      const frontRightAngle = Math.sin(this.animationTime * idleSpeed + Math.PI / 3) * idleAmount;
      const backLeftAngle = Math.sin(this.animationTime * idleSpeed + Math.PI * 2/3) * idleAmount;
      const backRightAngle = Math.sin(this.animationTime * idleSpeed + Math.PI) * idleAmount;
      this.frontLeftLeg.rotation.x = frontLeftAngle;
      this.frontRightLeg.rotation.x = frontRightAngle;
      this.backLeftLeg.rotation.x = backLeftAngle;
      this.backRightLeg.rotation.x = backRightAngle;
      this.mesh.position.y = this.position.y + Math.sin(this.animationTime * idleSpeed * 0.5) * 0.02;
    }
  }
  
  startFuse() {
    if (this.isFusing) return;
    console.log("Creeper starting fuse!");
    this.isFusing = true;
    this.fuseTime = this.fuseTime || 1.5;
    this.velocity.x = 0;
    this.velocity.z = 0;
  }
  
  shootArrow() {
    console.log("Skeleton shooting arrow");
    const distToPlayer = distance(
      this.position.x, this.position.y, this.position.z,
      this.player.position.x, this.player.position.y, this.player.position.z
    );
    const inaccuracy = 0.1 + 0.05 * distToPlayer / this.attackRange;
    const hitChance = 0.7 - inaccuracy;
    const hit = Math.random() < hitChance;
    if (hit) {
      this.player.takeDamage(this.damage);
      console.log("Arrow hit player for", this.damage, "damage");
    } else {
      console.log("Arrow missed");
    }
  }
  
  updateAI(dt, distToPlayer) {
    if (this.pathfindingCooldown <= 0) {
      this.pathfindingCooldown = 1.0;
      if (this.type === ENEMY_TYPE.SKELETON && distToPlayer <= this.attackRange) {
        if (distToPlayer < this.attackRange * 0.5) {
          const dirFromPlayer = new THREE.Vector3(
            this.position.x - this.player.position.x,
            0,
            this.position.z - this.player.position.z
          ).normalize();
          this.velocity.x = dirFromPlayer.x * this.speed * 0.8;
          this.velocity.z = dirFromPlayer.z * this.speed * 0.8;
        } else {
          this.velocity.x = 0;
          this.velocity.z = 0;
        }
      } else if (this.type === ENEMY_TYPE.CREEPER && distToPlayer <= this.attackRange) {
        if (!this.isFusing && distToPlayer <= this.attackRange * 0.5) {
          this.startFuse();
          this.velocity.x = 0;
          this.velocity.z = 0;
        } else if (!this.isFusing) {
          const dirToPlayer = new THREE.Vector3(
            this.player.position.x - this.position.x,
            0,
            this.player.position.z - this.position.z
          ).normalize();
          this.velocity.x = dirToPlayer.x * this.speed;
          this.velocity.z = dirToPlayer.z * this.speed;
        }
      } else if (distToPlayer <= this.detectionRange) {
        const dirToPlayer = new THREE.Vector3(
          this.player.position.x - this.position.x,
          0,
          this.player.position.z - this.position.z
        ).normalize();
        this.velocity.x = dirToPlayer.x * this.speed;
        this.velocity.z = dirToPlayer.z * this.speed;
      } else {
        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          this.velocity.x = Math.sin(angle) * this.speed * 0.5;
          this.velocity.z = Math.cos(angle) * this.speed * 0.5;
        } else if (Math.random() < 0.2) {
          this.velocity.x = 0;
          this.velocity.z = 0;
        }
      }
    }
    
    if (distToPlayer <= this.attackRange && this.attackCooldown <= 0) {
      if (this.type === ENEMY_TYPE.SKELETON) {
        this.shootArrow();
        this.attackCooldown = 2.0;
      } else if (this.type === ENEMY_TYPE.CREEPER) {
        if (!this.isFusing) {
          this.startFuse();
        }
      } else {
        this.player.takeDamage(this.damage);
        this.attackCooldown = 1.0;
      }
    }
  }
  
  takeDamage(amount, knockbackSource = null) {
    this.health -= amount;
    if (knockbackSource && this.type !== ENEMY_TYPE.CREEPER) {
      this.knockbackDirection.subVectors(this.position, knockbackSource).normalize();
      this.knockbackDirection.y = 0;
      this.knockbackTime = this.knockbackDuration;
      this.velocity.y = 4;
    }
    if (this.type === ENEMY_TYPE.CREEPER && !this.isFusing) {
      const distToPlayer = distance(
        this.position.x, this.position.y, this.position.z,
        this.player.position.x, this.player.position.y, this.player.position.z
      );
      if (distToPlayer < this.attackRange) {
        this.startFuse();
        this.fuseTime = Math.max(0.5, this.fuseTime * 0.7);
      }
    }
    if (this.mesh) {
      this.mesh.traverse(child => {
        if (child.isMesh && child.material && !child.material.map) {
          child.material.color.set(0xFF0000);
        }
      });
      setTimeout(() => {
        if (this.mesh) this.resetMeshColors();
      }, 100);
    }
    if (this.health <= 0) this.die();
  }
  
  die() {
    if (this.mesh) {
      this.world.scene.remove(this.mesh);
      this.mesh.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.mesh = null;
    }
    const expReward = 5 + Math.floor(Math.random() * 5);
    this.player.grantExperience(expReward);
  }
  
  checkCollisionAndMove(oldPosition, newPosition) {
    const posX = this.position.clone();
    posX.x = newPosition.x;
    const collisionsX = this.checkBlockCollision(posX);
    if (collisionsX.length === 0) {
      this.position.x = newPosition.x;
    } else {
      this.velocity.x = 0;
    }
    
    const posY = this.position.clone();
    posY.y = newPosition.y;
    const collisionsY = this.checkBlockCollision(posY);
    if (collisionsY.length === 0) {
      this.position.y = newPosition.y;
    } else {
      if (this.velocity.y < 0) {
        this.velocity.y = 0;
        this.tryJump();
      } else {
        this.velocity.y = 0;
      }
    }
    
    const posZ = this.position.clone();
    posZ.z = newPosition.z;
    const collisionsZ = this.checkBlockCollision(posZ);
    if (collisionsZ.length === 0) {
      this.position.z = newPosition.z;
    } else {
      this.velocity.z = 0;
    }
  }
  
  tryJump() {
    const dirToPlayer = new THREE.Vector3(
      this.player.position.x - this.position.x,
      0,
      this.player.position.z - this.position.z
    ).normalize();
    const checkX = Math.floor(this.position.x + dirToPlayer.x);
    const checkZ = Math.floor(this.position.z + dirToPlayer.z);
    const checkY = Math.floor(this.position.y);
    const blockAhead = this.world.getBlock(checkX, checkY, checkZ);
    const blockAboveAhead = this.world.getBlock(checkX, checkY + 1, checkZ);
    if (blockAhead.isSolid && (!blockAboveAhead || !blockAboveAhead.isSolid)) {
      this.velocity.y = 8.0;
    }
  }
  
  checkBlockCollision(position) {
    const minX = Math.floor(position.x - this.size.width / 2);
    const maxX = Math.floor(position.x + this.size.width / 2);
    const minY = Math.floor(position.y);
    const maxY = Math.floor(position.y + this.size.height);
    const minZ = Math.floor(position.z - this.size.width / 2);
    const maxZ = Math.floor(position.z + this.size.width / 2);
    const collisions = [];
    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = this.world.getBlock(x, y, z);
          if (block && block.isSolid) {
            collisions.push({ position: { x, y, z }, block: block });
          }
        }
      }
    }
    return collisions;
  }
}

class EnemyManager {
  constructor(world, player) {
    this.world = world;
    this.player = player;
    this.enemies = [];
    this.spawnCooldown = 0;
  }

  getMaxEnemies() {
    const day = this.player.dayNightCycle ? this.player.dayNightCycle.day : 1;
    return 10 + Math.floor(day * 2.5);  // Increased from 1.5
  }
  
  update(dt) {
    if (this.spawnCooldown > 0) this.spawnCooldown -= dt;
    
    if (!this.player.dayNightCycle.isDay()) {
      this.trySpawnEnemy(dt);
      if (Math.random() < 0.3) this.trySpawnEnemy(dt);
    }
    
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.health <= 0) {
        this.enemies.splice(i, 1);
      } else {
        enemy.update(dt);
      }
    }
  }
  
  trySpawnEnemy(dt) {
    const maxEnemies = this.getMaxEnemies();
    if (this.enemies.length >= maxEnemies || this.spawnCooldown > 0) return;
    
    const timeOfDay = this.player.dayNightCycle.timeOfDay;
    const nightProgress = (timeOfDay < 0.25) ? (timeOfDay + 0.75) / 1 : (1.25 - timeOfDay) / 0.5;
    const day = this.player.dayNightCycle.day;
    const dayFactor = (day - 1) * 0.3;
    const spawnChance = (0.25 + nightProgress * 0.5 + dayFactor) * dt;
    
    if (Math.random() < spawnChance) {
      let enemyType;
      const rand = Math.random();
      if (day >= 4) {
        if (rand < 0.2) enemyType = ENEMY_TYPE.ZOMBIE;
        else if (rand < 0.5) enemyType = ENEMY_TYPE.SKELETON;
        else if (rand < 0.65) enemyType = ENEMY_TYPE.SPIDER;
        else enemyType = ENEMY_TYPE.CREEPER;
      } else if (day >= 3) {
        if (rand < 0.25) enemyType = ENEMY_TYPE.ZOMBIE;
        else if (rand < 0.55) enemyType = ENEMY_TYPE.SKELETON;
        else if (rand < 0.8) enemyType = ENEMY_TYPE.SPIDER;
        else enemyType = ENEMY_TYPE.CREEPER;
      } else {
        if (rand < 0.25) enemyType = ENEMY_TYPE.ZOMBIE;
        else if (rand < 0.5) enemyType = ENEMY_TYPE.SKELETON;
        else if (rand < 0.75) enemyType = ENEMY_TYPE.SPIDER;
        else enemyType = ENEMY_TYPE.CREEPER;
      }
      
      const enemy = new Enemy(enemyType, this.world, this.player);
      this.enemies.push(enemy);
      
      const cooldownReduction = Math.min(1.0, (day - 1) * 0.25);
      this.spawnCooldown = Math.max(0.2, (1.0 - cooldownReduction) + Math.random() * 0.6);
    }
  }
  
  clearEnemies() {
    for (const enemy of this.enemies) {
      if (enemy.mesh) {
        this.world.scene.remove(enemy.mesh);
        enemy.mesh.traverse(child => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }
    this.enemies = [];
  }
  
  findEnemyAt(position, maxDistance) {
    let closestEnemy = null;
    let closestDistance = maxDistance;
    for (const enemy of this.enemies) {
      if (enemy.health <= 0) continue;
      const dist = distance(
        position.x, position.y, position.z,
        enemy.position.x, enemy.position.y, enemy.position.z
      );
      if (dist < closestDistance) {
        closestDistance = dist;
        closestEnemy = enemy;
      }
    }
    return closestEnemy;
  }
}
