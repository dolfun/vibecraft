class UI {
  constructor() {
    this.uiContainer = document.getElementById('ui-container');
    this.inventoryBar = document.getElementById('inventory-bar');
    this.crosshair = document.getElementById('crosshair');
    this.stats = document.getElementById('stats');
    this.dayCounter = document.getElementById('day-counter');
    this.timeIndicator = document.getElementById('time-indicator');
    this.levelIndicator = document.getElementById('level');
    this.experienceIndicator = document.getElementById('experience');
    this.createDayNightClock();

    this.inventoryScreen = document.getElementById('inventory-screen');
    this.inventorySlots = document.getElementById('inventory-slots');

    this.startScreen = document.getElementById('start-screen');
    this.gameOverScreen = document.getElementById('game-over-screen');
    this.gameOverMessage = document.getElementById('game-over-message');

    this.createHealthBar();
    this.createEnemyHealthBar();
    this.initEventListeners();

    this.draggedItem = null;
    this.draggedItemOrigin = null;
    this.dragElement = null;
    this.isInventoryOpen = false;
  }

  createDayNightClock() {
    this.clockContainer = document.createElement('div');
    this.clockContainer.id = 'day-night-clock';
    this.clockContainer.style.cssText = 'width: 80px; height: 80px; margin: 0 auto 10px auto; display: block;';
  
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 100 100");
  
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "45");
    circle.setAttribute("fill", "#FFC107");
    svg.appendChild(circle);
    
    const leftHalf = document.createElementNS(svgNS, "path");
    leftHalf.setAttribute("d", "M50,5 A45,45 0 0,0 5,50 A45,45 0 0,0 50,95 Z");
    leftHalf.setAttribute("fill", "#3F51B5");
    svg.appendChild(leftHalf);
  
    const border = document.createElementNS(svgNS, "circle");
    border.setAttribute("cx", "50");
    border.setAttribute("cy", "50");
    border.setAttribute("r", "45");
    border.setAttribute("stroke", "black");
    border.setAttribute("stroke-width", "2");
    border.setAttribute("fill", "none");
    svg.appendChild(border);
  
    this.clockHand = document.createElementNS(svgNS, "line");
    this.clockHand.setAttribute("x1", "50");
    this.clockHand.setAttribute("y1", "50");
    this.clockHand.setAttribute("x2", "50");
    this.clockHand.setAttribute("y2", "10");
    this.clockHand.setAttribute("stroke", "white");
    this.clockHand.setAttribute("stroke-width", "3");
    this.clockHand.setAttribute("stroke-linecap", "round");
    svg.appendChild(this.clockHand);
  
    const centerDot = document.createElementNS(svgNS, "circle");
    centerDot.setAttribute("cx", "50");
    centerDot.setAttribute("cy", "50");
    centerDot.setAttribute("r", "3");
    centerDot.setAttribute("fill", "white");
    svg.appendChild(centerDot);
  
    this.clockContainer.appendChild(svg);
    this.stats.insertBefore(this.clockContainer, this.dayCounter);
  }

  updateClock(timeOfDay) {
    if (!this.clockHand) return;
    const degrees = timeOfDay * 360 - 90;
    this.clockHand.setAttribute("transform", `rotate(${degrees}, 50, 50)`);
  }

  initEventListeners() {
    const startButton = document.getElementById('start-button');
    startButton.addEventListener('click', () => this.hideStartScreen());

    const restartButton = document.getElementById('restart-button');
    restartButton.addEventListener('click', () => this.hideGameOver());
  }

  createHealthBar() {
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    const healthBarFill = document.createElement('div');
    healthBarFill.id = 'health-bar-fill';
    healthBar.appendChild(healthBarFill);
    this.uiContainer.appendChild(healthBar);
    this.healthBar = healthBar;
    this.healthBarFill = healthBarFill;
  }

  createEnemyHealthBar() {
    const enemyHealthContainer = document.createElement('div');
    enemyHealthContainer.id = 'enemy-health-container';
    enemyHealthContainer.style.cssText =
      'position: absolute; top: 120px; left: 50%; transform: translateX(-50%); width: 200px; ' +
      'background-color: rgba(0, 0, 0, 0.5); border-radius: 5px; padding: 5px; display: none; z-index: 10;';

    const enemyNameElement = document.createElement('div');
    enemyNameElement.id = 'enemy-name';
    enemyNameElement.style.cssText =
      'color: white; font-size: 12px; text-align: center; margin-bottom: 3px; font-weight: bold;';
    enemyHealthContainer.appendChild(enemyNameElement);

    const enemyHealthBar = document.createElement('div');
    enemyHealthBar.style.cssText =
      'width: 100%; height: 8px; background-color: #333; border-radius: 4px; overflow: hidden;';
    const enemyHealthFill = document.createElement('div');
    enemyHealthFill.style.cssText =
      'width: 100%; height: 100%; background-color: #e74c3c; border-radius: 4px; transition: width 0.3s ease;';
    enemyHealthBar.appendChild(enemyHealthFill);
    enemyHealthContainer.appendChild(enemyHealthBar);
    this.uiContainer.appendChild(enemyHealthContainer);

    this.enemyHealthContainer = enemyHealthContainer;
    this.enemyNameElement = enemyNameElement;
    this.enemyHealthFill = enemyHealthFill;
  }

  updateEnemyHealthBar(enemy) {
    if (!enemy || !this.enemyHealthContainer) return;
    const enemyTypeNames = ['Zombie', 'Skeleton', 'Spider', 'Creeper'];
    const enemyName = enemyTypeNames[enemy.type] || 'Monster';
    this.enemyHealthContainer.style.display = 'block';
    this.enemyNameElement.textContent = enemyName;
    const healthPercentage = (enemy.health / enemy.maxHealth) * 100;
    this.enemyHealthFill.style.width = `${healthPercentage}%`;
    if (healthPercentage > 60) {
      this.enemyHealthFill.style.backgroundColor = '#2ecc71';
    } else if (healthPercentage > 30) {
      this.enemyHealthFill.style.backgroundColor = '#f39c12';
    } else {
      this.enemyHealthFill.style.backgroundColor = '#e74c3c';
    }
  }

  hideEnemyHealthBar() {
    if (this.enemyHealthContainer) {
      this.enemyHealthContainer.style.display = 'none';
    }
  }

  createHotbar(size) {
    this.inventoryBar.innerHTML = '';
    for (let i = 0; i < size; i++) {
      const slot = document.createElement('div');
      slot.className = 'inventory-slot';
      slot.dataset.slot = i;
      if (i === 0) slot.classList.add('selected');
      this.inventoryBar.appendChild(slot);
    }
  }

  selectHotbarSlot(slot) {
    const slots = this.inventoryBar.querySelectorAll('.inventory-slot');
    slots.forEach(s => s.classList.remove('selected'));
    slots[slot].classList.add('selected');
  }

  updateHotbar(inventory, selectedSlot) {
    const slots = this.inventoryBar.querySelectorAll('.inventory-slot');
    for (let i = 0; i < slots.length; i++) {
      this.updateSlot(slots[i], inventory.getItemInSlot(i));
    }
    this.selectHotbarSlot(selectedSlot);
  }

  updateHotbarSlot(slot, item) {
    const slotElement = this.inventoryBar.querySelector(`.inventory-slot[data-slot="${slot}"]`);
    if (slotElement) this.updateSlot(slotElement, item);
  }

  updateSlot(slotElement, item) {
    slotElement.innerHTML = '';
    if (item && item.id !== undefined) {
      const itemElement = document.createElement('div');
      itemElement.className = 'inventory-item';
      if (BLOCK_ICONS && BLOCK_ICONS[item.id]) {
        itemElement.innerHTML = BLOCK_ICONS[item.id];
      } else {
        const color = BLOCK_COLORS[item.id] || '#ff0000';
        itemElement.style.backgroundColor = color;
      }
      slotElement.appendChild(itemElement);
      
      if (item.count > 1) {
        const countElement = document.createElement('div');
        countElement.className = 'item-count';
        countElement.textContent = item.count;
        slotElement.appendChild(countElement);
      }
    }
  }

  updateHealthBar(health, maxHealth) {
    const percentage = (health / maxHealth) * 100;
    this.healthBarFill.style.width = `${percentage}%`;
    if (percentage > 70) {
      this.healthBarFill.style.backgroundColor = '#e74c3c';
    } else if (percentage > 30) {
      this.healthBarFill.style.backgroundColor = '#f39c12';
    } else {
      this.healthBarFill.style.backgroundColor = '#c0392b';
    }
  }

  updateDayCounter(day) {
    this.dayCounter.childNodes[0].textContent = `Day: ${day}`;
  }

  updateTimeIndicator(isDay, timeOfDay) {
    this.timeIndicator.textContent = isDay ? '☀️' : '🌙';
    this.updateClock(timeOfDay);
  }

  updateLevel(level) {
    this.levelIndicator.textContent = `Level: ${level}`;
  }

  updateExperience(experience) {
    this.experienceIndicator.textContent = `XP: ${experience}`;
  }

  showStartScreen() {
    this.startScreen.classList.remove('hidden');
  }

  hideStartScreen() {
    this.startScreen.classList.add('hidden');
    if (this.onGameStart) this.onGameStart();
  }

  showGameOver(message) {
    this.gameOverMessage.textContent = message || 'Game Over!';
    this.gameOverScreen.classList.remove('hidden');
    document.exitPointerLock();
  }

  hideGameOver() {
    this.gameOverScreen.classList.add('hidden');
    if (this.onGameRestart) this.onGameRestart();
  }

  showMessage(message, duration = 3000) {
    if (!this.messageElement) {
      this.messageElement = document.createElement('div');
      this.messageElement.style.cssText =
        'position: absolute; top: 20%; left: 50%; transform: translateX(-50%); padding: 10px; ' +
        'background-color: rgba(0, 0, 0, 0.7); color: white; border-radius: 5px; font-weight: bold; ' +
        'transition: opacity 0.3s; z-index: 100;';
      this.uiContainer.appendChild(this.messageElement);
    }
    clearTimeout(this.messageTimeout);
    this.messageElement.textContent = message;
    this.messageElement.style.opacity = '1';
    this.messageTimeout = setTimeout(() => {
      this.messageElement.style.opacity = '0';
    }, duration);
  }

  onInventorySlotClick(callback) {
    this.onInventorySlotClick = callback;
  }

  onInventoryOpen(callback) {
    this.onInventoryOpen = callback;
  }

  onInventoryClose(callback) {
    this.onInventoryClose = callback;
  }

  onGameStart(callback) {
    this.onGameStart = callback;
  }

  onGameRestart(callback) {
    this.onGameRestart = callback;
  }
}
