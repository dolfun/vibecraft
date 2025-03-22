class Player {
  constructor(camera, world, ui) {
    this.camera = camera;
    this.world = world;
    this.ui = ui;

    const { WIDTH, DEPTH } = WORLD_SIZE;
    this.position = new THREE.Vector3(WIDTH / 2, SEA_LEVEL + 20, DEPTH / 2);

    this.findSafeSpawnPosition();
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Euler();
    this.height = 1.7;
    this.width = 0.6;

    this.baseSpeed = 30.0;
    this.baseFriction = 3.0;
    this.moveSpeed = this.baseSpeed;
    this.friction = this.baseFriction;
    this.jumpHeight = 1.5;
    this.gravity = 35.0;

    this.isOnGround = false;
    this.isJumping = false;
    this.health = 100;
    this.maxHealth = 100;
    this.experience = 0;
    this.level = 1;
    this.experienceToNextLevel = 100;

    this.inWater = false;
    this.underwaterTime = 0;
    this.underwaterDamageTimer = 0;

    this.keys = {};
    this.lookSpeed = 0.003;
    this.canLook = true;
    this.isPointerLocked = false;

    this.yaw = 0;
    this.pitch = 0;
    this.mouseSensitivity = 0.002;

    this.breakingBlock = null;
    this.breakProgress = 0;
    this.canBreak = true;
    this.canPlace = true;
    this.lastInteraction = 0;
    this.interactionCooldown = 250;

    this.attackRange = 4.0;
    this.attackDamage = 2;
    this.attackCooldown = 0;
    this.attackCooldownTime = 0.5;
    
    this.targetedEnemy = null;
    this.targetedEnemyTimer = 0;

    this.lookingAtBlock = null;

    this.inventory = new Inventory(9, ui);
    this.selectedSlot = 0;

    this.dayNightCycle = new DayNightCycle();

    this.fallStartY = 0;
    this.isFalling = false;
    
    this.healTimer = 0;
    this.healInterval = 2.0;
    this.healAmount = 2;

    this.blockEffects = new BlockInteractionEffects(this.world.scene, this.world);

    this.initControls();
    this.updateCamera();
  }

  requestPointerLockIfNeeded() {
    if (!this.isPointerLocked) {
      document.body.requestPointerLock();
      return false;
    }
    return true;
  }

  initControls() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code.startsWith('Digit')) {
        const digit = parseInt(e.code.substring(5));
        if (digit >= 1 && digit <= 9) {
          this.selectedSlot = digit - 1;
          this.ui.updateHotbar(this.inventory, this.selectedSlot);
        }
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.yaw -= e.movementX * this.mouseSensitivity;
      this.pitch -= e.movementY * this.mouseSensitivity;
      this.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.pitch));
      this.updateCameraRotation();
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.requestPointerLockIfNeeded()) return;
      if (e.button === 0) {
        if (this.breakingBlock) {
          this.continueBreakingBlock(0);
        } else {
          const hit = this.getLookedAtBlock();
          const attackedEnemy = this.attackEnemy();
          if (!attackedEnemy && hit && hit.position) {
            this.startBreakingBlock();
          }
        }
      } else if (e.button === 2) {
        this.placeBlock();
        e.preventDefault();
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.stopBreakingBlock();
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });

    document.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        document.body.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement !== null;
      console.log("Pointer lock state:", this.isPointerLocked);
    });

    document.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked) return;
      this.selectedSlot = e.deltaY > 0 ? (this.selectedSlot + 1) % 9 : (this.selectedSlot + 8) % 9;
      this.ui.updateHotbar(this.inventory, this.selectedSlot);
    });
  }

  updateCameraRotation() {
    const cosPitch = Math.cos(this.pitch);
    const direction = new THREE.Vector3(
      Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cosPitch
    );
    this.camera.position.copy(this.position).add(new THREE.Vector3(0, this.height, 0));
    this.camera.lookAt(this.camera.position.clone().add(direction));
  }

  getLookedAtBlock() {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .normalize();
    return rayCast(origin, direction, this.world, 7.0);
  }

  updateBlockHighlight() {
    const hit = this.getLookedAtBlock();
    this.lookingAtBlock = hit || null;
    
    if (this.lookingAtBlock && this.lookingAtBlock.position) {
      const block = this.world.getBlock(
        this.lookingAtBlock.position.x, 
        this.lookingAtBlock.position.y, 
        this.lookingAtBlock.position.z
      );
      const canBreak = block && block.breakTime >= 0;
      this.blockEffects.updateSelectionWireframe(this.lookingAtBlock.position, canBreak);
    } else {
      this.blockEffects.updateSelectionWireframe(null, false);
    }
    
    if (this.breakingBlock) {
      const block = this.world.getBlock(this.breakingBlock.x, this.breakingBlock.y, this.breakingBlock.z);
      const breakTime = block ? block.breakTime : 0;
      this.blockEffects.updateBreakingOverlay(this.breakingBlock, this.breakProgress, breakTime);
    } else {
      this.blockEffects.updateBreakingOverlay(null, 0, 0);
    }
  }

  startBreakingBlock() {
    if (!this.canBreak || Date.now() - this.lastInteraction < this.interactionCooldown) return;
    this.lastInteraction = Date.now();
    if (!this.requestPointerLockIfNeeded()) return;

    const hit = this.getLookedAtBlock();
    if (!hit) {
      console.log("No block targeted");
      return;
    }
    
    const blockX = Math.floor(hit.position.x);
    const blockY = Math.floor(hit.position.y);
    const blockZ = Math.floor(hit.position.z);
    
    const block = this.world.getBlock(blockX, blockY, blockZ);
    if (block.id === BLOCK_TYPE.AIR || block.breakTime < 0) {
      console.log("Cannot break this block");
      return;
    }
    
    this.breakingBlock = new THREE.Vector3(blockX, blockY, blockZ);
    this.breakProgress = 0;
    
    console.log(`Started breaking block at (${blockX}, ${blockY}, ${blockZ})`);
    
    const breakTime = block.breakTime;
    this.blockEffects.updateBreakingOverlay(this.breakingBlock, this.breakProgress, breakTime);
  }

  continueBreakingBlock(dt) {
    if (!this.breakingBlock || !this.canBreak) return;
    
    const breakBlockX = Math.floor(this.breakingBlock.x);
    const breakBlockY = Math.floor(this.breakingBlock.y);
    const breakBlockZ = Math.floor(this.breakingBlock.z);
    
    const block = this.world.getBlock(breakBlockX, breakBlockY, breakBlockZ);
    const hit = this.getLookedAtBlock();
    
    if (!hit) {
      this.stopBreakingBlock();
      return;
    }
    
    const hitBlockX = Math.floor(hit.position.x);
    const hitBlockY = Math.floor(hit.position.y);
    const hitBlockZ = Math.floor(hit.position.z);
    
    if (hitBlockX !== breakBlockX || hitBlockY !== breakBlockY || hitBlockZ !== breakBlockZ) {
      this.stopBreakingBlock();
      return;
    }
    
    this.breakProgress += dt;
    let breakTime = block.breakTime;
    const selectedItem = this.inventory.getItemInSlot(this.selectedSlot);
    
    // Tool speed calculation
    if (selectedItem && ITEM_PROPERTIES[selectedItem.id]?.tool) {
      // Base tool mining speed
      const baseToolSpeedMultiplier = ITEM_PROPERTIES[selectedItem.id].miningSpeed;
      let finalSpeedMultiplier = baseToolSpeedMultiplier;
      
      // Additional bonus for using the right tool for the job
      const toolType = ITEM_PROPERTIES[selectedItem.id].toolType;
      
      // Pickaxe is more effective on stone (3x bonus)
      if (toolType === "pickaxe" && block.id === BLOCK_TYPE.STONE) {
        finalSpeedMultiplier *= 3;
        console.log("Pickaxe bonus on stone! Speed multiplier:", finalSpeedMultiplier);
      }
      // Axe is more effective on wood (3x bonus)
      else if (toolType === "axe" && block.id === BLOCK_TYPE.WOOD) {
        finalSpeedMultiplier *= 3;
        console.log("Axe bonus on wood! Speed multiplier:", finalSpeedMultiplier);
      }
      
      breakTime /= finalSpeedMultiplier;
    }
    
    this.blockEffects.updateBreakingOverlay(this.breakingBlock, this.breakProgress, breakTime);
    
    if (this.breakProgress >= breakTime) {
      this.breakBlock();
    }
  }

  stopBreakingBlock() {
    if (this.breakingBlock) {
      console.log(`Stopped breaking block at (${this.breakingBlock.x}, ${this.breakingBlock.y}, ${this.breakingBlock.z})`);
    }
    this.blockEffects.updateBreakingOverlay(null, 0, 0);
    this.breakingBlock = null;
    this.breakProgress = 0;
  }

  breakBlock() {
    if (!this.breakingBlock) return;
    
    const blockX = Math.floor(this.breakingBlock.x);
    const blockY = Math.floor(this.breakingBlock.y);
    const blockZ = Math.floor(this.breakingBlock.z);
    
    console.log(`Breaking block at (${blockX}, ${blockY}, ${blockZ})`);
    
    this.blockEffects.updateBreakingOverlay(this.breakingBlock, 100, 10);
    
    setTimeout(() => {
      if (!this.breakingBlock) return;
      
      const drops = this.world.breakBlock(blockX, blockY, blockZ);
      
      if (drops) {
        for (const drop of drops) {
          this.inventory.addItem(drop.type, drop.count);
        }
        this.grantExperience(1);
        console.log(`Block broken successfully, received ${drops.length} item(s)`);
      } else {
        console.log("Failed to break block");
      }
      
      this.stopBreakingBlock();
    }, 50);
  }

  attackEnemy() {
    if (this.attackCooldown > 0) return false;
    
    this.attackCooldown = this.attackCooldownTime;
    
    const direction = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .normalize();
    const attackPos = this.camera.position.clone();
    const checkPos = attackPos.clone().add(direction.clone().multiplyScalar(this.attackRange / 2));
    
    if (!this.world.enemyManager && window.game && window.game.enemyManager) {
      this.world.enemyManager = window.game.enemyManager;
    }
    
    const enemyManager = this.world.enemyManager;
    if (!enemyManager) {
      console.warn("No enemy manager found for attack");
      return false;
    }
    
    const enemy = enemyManager.findEnemyAt(checkPos, this.attackRange);
    
    if (enemy) {
      let weaponDamage = this.attackDamage;
      const selectedItem = this.inventory.getItemInSlot(this.selectedSlot);
      
      if (selectedItem && ITEM_PROPERTIES[selectedItem.id]?.toolType === "sword") {
        weaponDamage = ITEM_PROPERTIES[selectedItem.id].damage;
      }
      
      console.log(`Attacking ${ENEMY_TYPE[enemy.type]} enemy with ${weaponDamage} damage`);
      const knockbackSource = this.position.clone();
      enemy.takeDamage(weaponDamage, knockbackSource);
      
      this.targetedEnemy = enemy;
      this.targetedEnemyTimer = 5.0;
      
      if (this.ui && this.ui.updateEnemyHealthBar) {
        this.ui.updateEnemyHealthBar(enemy);
      }
      
      return true;
    } else {
      console.log("Attack swing (no hit)");
    }
    
    return false;
  }

  checkPlayerCollision(x, y, z) {
    const minX = this.position.x - 0.25,
          maxX = this.position.x + 0.25;
    const minY = this.position.y,
          maxY = this.position.y + this.height;
    const minZ = this.position.z - 0.25,
          maxZ = this.position.z + 0.25;
    return (
      x + 1 > minX &&
      x < maxX &&
      y + 1 > minY &&
      y < maxY &&
      z + 1 > minZ &&
      z < maxZ
    );
  }

  placeBlock() {
    if (!this.canPlace || Date.now() - this.lastInteraction < this.interactionCooldown) return;
    this.lastInteraction = Date.now();
    if (!this.requestPointerLockIfNeeded()) return;

    const hit = this.getLookedAtBlock();
    if (!hit) return;
    console.log(`Placement hit block at (${hit.position.x}, ${hit.position.y}, ${hit.position.z})`);
    const selectedItem = this.inventory.getItemInSlot(this.selectedSlot);
    if (!selectedItem || selectedItem.id >= ITEM_TYPE.STICK || !BLOCK_PROPERTIES[selectedItem.id]) return;

    const placeX = hit.position.x + hit.normal.x;
    const placeY = hit.position.y + hit.normal.y;
    const placeZ = hit.position.z + hit.normal.z;
    console.log(`Attempting to place block at (${placeX}, ${placeY}, ${placeZ})`);

    if (this.checkPlayerCollision(placeX, placeY, placeZ)) {
      console.log("Can't place block - would intersect with player");
      return;
    }
    if (
      placeX < 0 ||
      placeX >= WORLD_SIZE.WIDTH ||
      placeY < 0 ||
      placeY >= WORLD_SIZE.HEIGHT ||
      placeZ < 0 ||
      placeZ >= WORLD_SIZE.DEPTH
    ) {
      console.log("Can't place block - outside world bounds");
      return;
    }
    const existingBlock = this.world.getBlock(placeX, placeY, placeZ);
    if (existingBlock && existingBlock.id !== BLOCK_TYPE.AIR) {
      console.log("Can't place block - space already occupied");
      return;
    }
    const success = this.world.setBlock(placeX, placeY, placeZ, selectedItem.id);
    if (success) {
      console.log(`Successfully placed ${selectedItem.id} at (${placeX}, ${placeY}, ${placeZ})`);
      this.inventory.removeItem(this.selectedSlot, 1);
      this.grantExperience(1);
    } else {
      console.log("Failed to place block");
    }
  }

  checkToolUpgrades() {
    const currentDay = this.dayNightCycle.day;
    
    if (currentDay === 2) {
      const toolUpgrades = [
        { slot: 0, oldType: ITEM_TYPE.WOODEN_SWORD, newType: ITEM_TYPE.STONE_SWORD },
        { slot: 1, oldType: ITEM_TYPE.WOODEN_PICKAXE, newType: ITEM_TYPE.STONE_PICKAXE },
        { slot: 2, oldType: ITEM_TYPE.WOODEN_AXE, newType: ITEM_TYPE.STONE_AXE }
      ];
      
      this.performToolUpgrades(toolUpgrades, "Stone");
    } 
    else if (currentDay === 3) {
      const toolUpgrades = [
        { slot: 0, oldType: ITEM_TYPE.STONE_SWORD, newType: ITEM_TYPE.IRON_SWORD },
        { slot: 1, oldType: ITEM_TYPE.STONE_PICKAXE, newType: ITEM_TYPE.IRON_PICKAXE },
        { slot: 2, oldType: ITEM_TYPE.STONE_AXE, newType: ITEM_TYPE.IRON_AXE }
      ];
      
      this.performToolUpgrades(toolUpgrades, "Iron");
    } 
    else if (currentDay === 4) {
      const toolUpgrades = [
        { slot: 0, oldType: ITEM_TYPE.IRON_SWORD, newType: ITEM_TYPE.DIAMOND_SWORD },
        { slot: 1, oldType: ITEM_TYPE.IRON_PICKAXE, newType: ITEM_TYPE.DIAMOND_PICKAXE },
        { slot: 2, oldType: ITEM_TYPE.IRON_AXE, newType: ITEM_TYPE.DIAMOND_AXE }
      ];
      
      this.performToolUpgrades(toolUpgrades, "Diamond");
    }
  }

  performToolUpgrades(upgrades, tierName) {
    let anyUpgraded = false;
    
    for (const upgrade of upgrades) {
      const item = this.inventory.getItemInSlot(upgrade.slot);
      
      if (item && item.id === upgrade.oldType) {
        this.inventory.upgradeTool(upgrade.slot, upgrade.newType);
        anyUpgraded = true;
      }
    }
    
    if (anyUpgraded) {
      this.ui.showMessage(`Your tools have been upgraded to ${tierName}!`, 5000);
    }
  }

  update(dt) {
    this.updateMovement(dt);
    this.constrainToWorldBoundaries();
    this.updateCameraRotation();
    this.updateDayNightCycle(dt);
    this.updateBlockHighlight();
    this.checkWaterDamage(dt);
    if (this.breakingBlock) this.continueBreakingBlock(dt);
    
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }
    
    this.updateHealing(dt);
    this.updateTargetedEnemy(dt);
  }
  
  updateTargetedEnemy(dt) {
    if (this.targetedEnemy) {
      if (this.targetedEnemyTimer > 0) {
        this.targetedEnemyTimer -= dt;
        
        if (this.targetedEnemy.health <= 0) {
          this.targetedEnemy = null;
          this.ui.hideEnemyHealthBar();
          return;
        }
        
        const distToEnemy = distance(
          this.position.x, this.position.y, this.position.z,
          this.targetedEnemy.position.x, this.targetedEnemy.position.y, this.targetedEnemy.position.z
        );
        
        if (distToEnemy < 10) {
          this.ui.updateEnemyHealthBar(this.targetedEnemy);
        } else {
          this.targetedEnemy = null;
          this.ui.hideEnemyHealthBar();
        }
      } else {
        this.targetedEnemy = null;
        this.ui.hideEnemyHealthBar();
      }
    }
  }
  
  updateHealing(dt) {
    if (this.health < this.maxHealth) {
      this.healTimer += dt;
      if (this.healTimer >= this.healInterval) {
        this.healTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + this.healAmount);
        this.ui.updateHealthBar(this.health, this.maxHealth);
      }
    } else {
      this.healTimer = 0;
    }
  }

  updateDayNightCycle(dt) {
    const previousDay = this.dayNightCycle.day;
    this.dayNightCycle.update(dt);
    const currentDay = this.dayNightCycle.day;
    
    if (currentDay !== previousDay) {
      this.checkToolUpgrades();
    }

    this.ui.updateDayCounter(this.dayNightCycle.day);
    this.ui.updateTimeIndicator(this.dayNightCycle.isDay(), this.dayNightCycle.timeOfDay);
  }

  checkWaterDamage(dt) {
    const headPos = {
      x: Math.floor(this.position.x),
      y: Math.floor(this.position.y + this.height * 0.8),
      z: Math.floor(this.position.z)
    };
    const feetPos = {
      x: Math.floor(this.position.x),
      y: Math.floor(this.position.y + 0.1),
      z: Math.floor(this.position.z)
    };
    const headBlock = this.world.getBlock(headPos.x, headPos.y, headPos.z);
    const feetBlock = this.world.getBlock(feetPos.x, feetPos.y, feetPos.z);
    this.inWater = headBlock.id === BLOCK_TYPE.WATER || feetBlock.id === BLOCK_TYPE.WATER;
    if (headBlock.id === BLOCK_TYPE.WATER) {
      this.underwaterTime += dt;
      this.underwaterDamageTimer += dt;
      if (this.underwaterDamageTimer >= 1.0) {
        this.underwaterDamageTimer = 0;
        this.takeDamage(20);
      }
    } else {
      this.underwaterTime = 0;
      this.underwaterDamageTimer = 0;
    }
  }

  updateMovement(dt) {
    const forward = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.quaternion)
      .setY(0)
      .normalize();
    const right = new THREE.Vector3(1, 0, 0)
      .applyQuaternion(this.camera.quaternion)
      .setY(0)
      .normalize();
    const moveDirection = new THREE.Vector3();
    if (this.keys['KeyW']) moveDirection.add(forward);
    if (this.keys['KeyS']) moveDirection.sub(forward);
    if (this.keys['KeyA']) moveDirection.sub(right);
    if (this.keys['KeyD']) moveDirection.add(right);
    if (moveDirection.lengthSq() > 0) moveDirection.normalize();

    this.velocity.x += moveDirection.x * this.moveSpeed * dt;
    this.velocity.z += moveDirection.z * this.moveSpeed * dt;
    this.velocity.x -= this.velocity.x * this.friction * dt;
    this.velocity.z -= this.velocity.z * this.friction * dt;

    if (!this.isOnGround && this.velocity.y < 0) {
      if (!this.isFalling) {
        this.isFalling = true;
        this.fallStartY = this.position.y;
      }
    }

    if (this.keys['Space'] && this.isOnGround) {
      this.velocity.y = Math.sqrt(2 * this.gravity * this.jumpHeight);
      this.isOnGround = false;
      this.isJumping = true;
    }
    this.velocity.y -= this.gravity * dt;
    const newPos = this.position.clone().addScaledVector(this.velocity, dt);
    this.checkCollisionAndMove(this.position.clone(), newPos);
    this.checkUnderwater();
  }

  constrainToWorldBoundaries() {
    const margin = 2;
    this.position.x = Math.max(margin, Math.min(WORLD_SIZE.WIDTH - margin, this.position.x));
    this.position.z = Math.max(margin, Math.min(WORLD_SIZE.DEPTH - margin, this.position.z));
    this.position.y = Math.max(1, Math.min(WORLD_SIZE.HEIGHT - margin, this.position.y));
  }

  checkUnderwater() {
    const eyePos = {
      x: Math.floor(this.position.x),
      y: Math.floor(this.position.y + this.height),
      z: Math.floor(this.position.z)
    };
    const block = this.world.getBlock(eyePos.x, eyePos.y, eyePos.z);
    if (block.id === BLOCK_TYPE.WATER) {
      this.friction = this.baseFriction * 2.0;
      this.moveSpeed = this.baseSpeed * 0.25;
    } else {
      const feetPos = {
        x: Math.floor(this.position.x),
        y: Math.floor(this.position.y + 0.1),
        z: Math.floor(this.position.z)
      };
      const feetBlock = this.world.getBlock(feetPos.x, feetPos.y, feetPos.z);
      if (feetBlock.id === BLOCK_TYPE.WATER) {
        this.friction = this.baseFriction * 1.5;
        this.moveSpeed = this.baseSpeed * 0.4;
      } else {
        this.friction = this.baseFriction;
        this.moveSpeed = this.baseSpeed;
      }
    }
  }

  checkCollisionAndMove(oldPos, newPos) {
    const posY = new THREE.Vector3(this.position.x, newPos.y, this.position.z);
    const collisionsY = checkBlockCollision(posY, this.world);
    if (collisionsY.length === 0) {
      this.position.y = newPos.y;
      this.isOnGround = false;
    } else {
      if (this.velocity.y < 0) {
        if (this.isFalling) {
          const fallDistance = this.fallStartY - this.position.y;
          if (fallDistance > 3) {
            const safeFallDistance = 3;
            const damagePerBlock = 5;
            const fallDamage = Math.floor((fallDistance - safeFallDistance) * damagePerBlock);
            if (fallDamage > 0) {
              this.takeDamage(fallDamage);
              console.log(`Fall damage: ${fallDamage}, fell ${fallDistance.toFixed(1)} blocks`);
            }
          }
        }
        
        this.isOnGround = true;
        this.isJumping = false;
        this.isFalling = false;
      }
      this.velocity.y = 0;
    }

    const posXZ = new THREE.Vector3(newPos.x, this.position.y, newPos.z);
    const collisionsXZ = checkBlockCollision(posXZ, this.world);
    if (collisionsXZ.length === 0) {
      this.position.x = newPos.x;
      this.position.z = newPos.z;
    } else {
      const posX = new THREE.Vector3(newPos.x, this.position.y, this.position.z);
      const collisionsX = checkBlockCollision(posX, this.world);
      if (collisionsX.length === 0) {
        this.position.x = newPos.x;
      } else {
        this.velocity.x = 0;
      }
      const posZ = new THREE.Vector3(this.position.x, this.position.y, newPos.z);
      const collisionsZ = checkBlockCollision(posZ, this.world);
      if (collisionsZ.length === 0) {
        this.position.z = newPos.z;
      } else {
        this.velocity.z = 0;
      }
    }
  }

  updateCamera() {
    this.updateCameraRotation();
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.ui.updateHealthBar(this.health, this.maxHealth);
    if (this.health <= 0) this.die();
  }

  die() {
    if (this.blockEffects) {
      this.blockEffects.dispose();
    }
    this.ui.showGameOver(this.inWater ? 'You drowned!' : 'You died!');
  }

  grantExperience(amount) {
    this.experience += amount;
    if (this.experience >= this.experienceToNextLevel) this.levelUp();
    this.ui.updateExperience(this.experience, this.level);
  }

  levelUp() {
    this.level++;
    this.experience -= this.experienceToNextLevel;
    this.experienceToNextLevel = Math.floor(this.experienceToNextLevel * 1.5);
    this.maxHealth += 10;
    this.health = this.maxHealth;
    this.ui.updateLevel(this.level);
    this.ui.updateHealthBar(this.health, this.maxHealth);
  }

  findSafeSpawnPosition() {
    const centerX = WORLD_SIZE.WIDTH / 2;
    const centerZ = WORLD_SIZE.DEPTH / 2;
    let spawnY = SEA_LEVEL + 20;
    let foundSafe = false;

    const isSafe = (x, y, z) => {
      const fx = Math.floor(x), fz = Math.floor(z);
      const blockBelow = this.world.getBlock(fx, y - 1, fz);
      const blockAtFeet = this.world.getBlock(fx, y, fz);
      const blockAtBody = this.world.getBlock(fx, y + 1, fz);
      const blockAtHead = this.world.getBlock(fx, y + 2, fz);
      const surroundingsClear =
        !this.world.getBlock(fx + 1, y, fz).isSolid &&
        !this.world.getBlock(fx - 1, y, fz).isSolid &&
        !this.world.getBlock(fx, y, fz + 1).isSolid &&
        !this.world.getBlock(fx, y, fz - 1).isSolid;
      return blockBelow.isSolid &&
        !blockAtFeet.isSolid &&
        !blockAtBody.isSolid &&
        !blockAtHead.isSolid &&
        surroundingsClear;
    };

    for (let y = SEA_LEVEL + 30; y > SEA_LEVEL; y--) {
      if (isSafe(centerX, y, centerZ)) {
        spawnY = y;
        foundSafe = true;
        console.log(`Found safe spawn at center: (${centerX}, ${spawnY}, ${centerZ})`);
        break;
      }
    }

    if (!foundSafe) {
      console.log("Center unsafe, trying spiral search...");
      const searchRadius = 25;
      const maxSpiral = searchRadius * 8;
      for (let i = 1; i <= maxSpiral && !foundSafe; i++) {
        const angle = 0.5 * i;
        const radius = 0.5 * angle;
        const offsetX = Math.floor(Math.cos(angle) * radius);
        const offsetZ = Math.floor(Math.sin(angle) * radius);
        const checkX = Math.floor(centerX) + offsetX;
        const checkZ = Math.floor(centerZ) + offsetZ;
        if (checkX < 5 || checkX >= WORLD_SIZE.WIDTH - 5 || checkZ < 5 || checkZ >= WORLD_SIZE.DEPTH - 5) continue;
        for (let y = SEA_LEVEL + 20; y > SEA_LEVEL; y--) {
          if (isSafe(checkX, y, checkZ)) {
            spawnY = y;
            foundSafe = true;
            this.position.set(checkX + 0.5, spawnY + 0.1, checkZ + 0.5);
            console.log(`Found safe spawn in spiral: (${this.position.x}, ${spawnY}, ${this.position.z})`);
            break;
          }
        }
      }
    }

    if (!foundSafe) {
      console.warn("No safe spawn found! Using emergency high spawn.");
      this.position.set(centerX, SEA_LEVEL + 40, centerZ);
    } else {
      this.position.y = spawnY + 1;
    }
    if (this.velocity) this.velocity.set(0, 0, 0);
  }
 
  respawn() {
    if (!this.blockEffects) {
      this.blockEffects = new BlockInteractionEffects(this.world.scene, this.world);
    }
    this.findSafeSpawnPosition();
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.underwaterTime = 0;
    this.underwaterDamageTimer = 0;
    this.ui.updateHealthBar(this.health, this.maxHealth);
    this.ui.hideGameOver();
  }
}
