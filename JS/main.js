class Game {
  constructor() {
    this.colors = {
      day: new THREE.Color(0x87CEEB),
      sunrise: new THREE.Color(0xFFA07A),
      sunset: new THREE.Color(0xFF7F50),
      night: new THREE.Color(0x191970)
    };

    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initUI();

    this.isRunning = false;
    this.lastTime = performance.now();

    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.registerUICallbacks();
    this.animate();
  }
  
  initRenderer() {
    const canvas = document.getElementById('game-canvas');

    if (!THREE.WEBGL.isWebGLAvailable()) {
      const warning = THREE.WEBGL.getWebGLErrorMessage();
      document.getElementById('game-container').appendChild(warning);
      console.error("WebGL not available");
      return;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(this.colors.day);
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    } catch (e) {
      console.error("Error initializing renderer:", e);
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(this.colors.day.clone(), 30, 60);
    this.scene.background = this.colors.day.clone();
  }
  
  initCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
  }

  initUI() {
    this.ui = new UI();
  }

  registerUICallbacks() {
    this.ui.onGameStart = () => this.startGame();
    this.ui.onGameRestart = () => this.restartGame();
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  updateFogColor(timeOfDay) {
    const FOG_NEAR_NIGHT = 15;
    const FOG_FAR_NIGHT = 25;
    const FOG_NEAR_SUNRISE = 20;
    const FOG_FAR_SUNRISE = 30;
    const FOG_NEAR_DAY = 30;
    const FOG_FAR_DAY = 45;
  
    if (!this.scene.fog) {
      console.error("Fog missing, recreating");
      this.scene.fog = new THREE.Fog(this.colors.day.clone(), FOG_NEAR_DAY, FOG_FAR_DAY);
    }

    let skyColor;
    if (timeOfDay < 0.25) {
      const t = timeOfDay / 0.25;
      skyColor = this.colors.night.clone().lerp(this.colors.sunrise, t);
      this.scene.fog.near = lerp(FOG_NEAR_NIGHT, FOG_NEAR_SUNRISE, t);
      this.scene.fog.far = lerp(FOG_FAR_NIGHT, FOG_FAR_SUNRISE, t);
    } else if (timeOfDay < 0.5) {
      const t = (timeOfDay - 0.25) / 0.25;
      skyColor = this.colors.sunrise.clone().lerp(this.colors.day, t);
      this.scene.fog.near = FOG_NEAR_DAY;
      this.scene.fog.far = FOG_FAR_DAY;
    } else if (timeOfDay < 0.75) {
      const t = (timeOfDay - 0.5) / 0.25;
      skyColor = this.colors.day.clone().lerp(this.colors.sunset, t);
      this.scene.fog.near = FOG_NEAR_DAY;
      this.scene.fog.far = FOG_FAR_DAY;
    } else {
      const t = (timeOfDay - 0.75) / 0.25;
      skyColor = this.colors.sunset.clone().lerp(this.colors.night, t);
      this.scene.fog.near = lerp(FOG_NEAR_SUNRISE, FOG_NEAR_NIGHT, t);
      this.scene.fog.far = lerp(FOG_FAR_SUNRISE, FOG_FAR_NIGHT, t);
    }

    this.scene.fog.color.copy(skyColor);
    this.scene.background.copy(skyColor);
  }

  startGame() {
    try {
      this.world = new World(this.scene);
      this.world.initialize();
      this.player = new Player(this.camera, this.world, this.ui);
      this.enemyManager = new EnemyManager(this.world, this.player);
      this.player.inventory.addInitialItems();
      this.world.update(this.player);
      this.render();
      this.isRunning = true;
      this.lastTime = performance.now();
    } catch (e) {
      console.error("Error starting game:", e);
    }
  }

  restartGame() {
    this.cleanupGame();
    this.startGame();
  }

  disposeObject(object) {
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach(material => material.dispose());
      } else {
        object.material.dispose();
      }
    }
  }

  cleanupGame() {
    if (this.enemyManager) {
      this.enemyManager.clearEnemies();
    }
    while (this.scene.children.length) {
      const child = this.scene.children[0];
      this.disposeObject(child);
      this.scene.remove(child);
    }
    this.initScene();
  }
  
  animate() {
    requestAnimationFrame((now) => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      if (this.isRunning) {
        this.update(dt);
      }
      this.render();
      this.lastTime = now;
      this.animate();
    });
  }

  update(dt) {
    if (this.player) {
      this.player.update(dt);
      if (this.player.dayNightCycle) {
        this.updateFogColor(this.player.dayNightCycle.timeOfDay);
      }
    }
    if (this.world) {
      this.world.update(this.player);
    }
    if (this.enemyManager) {
      this.enemyManager.update(dt);
    }
    this.checkGameStatus();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  checkGameStatus() {
    if (this.player && this.player.health <= 0) {
      this.gameOver('You died!');
    }
    if (this.player && this.player.dayNightCycle.day > this.player.dayNightCycle.totalDays) {
      this.gameOver('Congratulations! You survived all 5 days!', true);
    }
  }

  gameOver(message, isVictory = false) {
    this.isRunning = false;
    this.ui.showGameOver(message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new Game();
});
