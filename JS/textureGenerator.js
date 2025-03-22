/**
 * Procedural texture generator for block textures
 */
class TextureGenerator {
  constructor() {
    this.textures = {};
    this.blockTextures = {};
  }

  fillCanvas(ctx, size, color) {
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fillRect(0, 0, size, size);
  }

  processPixels(ctx, size, processor) {
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const index = (y * size + x) * 4;
        processor(data, x, y, index);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  createTexture(generator) {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    generator(ctx, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  addVariation(baseColor, amount) {
    const actualAmount = Math.min(amount, 8);
    const r = Math.floor(baseColor.r + Math.sin(baseColor.r * 0.1) * actualAmount);
    const g = Math.floor(baseColor.g + Math.cos(baseColor.g * 0.1) * actualAmount);
    const b = Math.floor(baseColor.b + Math.sin(baseColor.b * 0.1) * actualAmount);
    return {
      r: Math.max(0, Math.min(255, r)),
      g: Math.max(0, Math.min(255, g)),
      b: Math.max(0, Math.min(255, b))
    };
  }

  noise(x, y, seed = 0) {
    const hash = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return hash - Math.floor(hash);
  }
  
  valueNoise(x, y, scale = 1, seed = 0) {
    const scaledX = x * scale;
    const scaledY = y * scale;
    const x0 = Math.floor(scaledX);
    const y0 = Math.floor(scaledY);
    const x1 = x0 + 1;
    const y1 = y0 + 1;
    const sx = scaledX - x0;
    const sy = scaledY - y0;
    const n00 = this.noise(x0, y0, seed);
    const n10 = this.noise(x1, y0, seed);
    const n01 = this.noise(x0, y1, seed);
    const n11 = this.noise(x1, y1, seed);
    const nx0 = this.lerp(n00, n10, sx);
    const nx1 = this.lerp(n01, n11, sx);
    return this.lerp(nx0, nx1, sy);
  }
  
  lerp(a, b, t) {
    return a + t * (b - a);
  }
  
  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }
  
  fbm(x, y, octaves = 4, lacunarity = 2.0, gain = 0.5, seed = 0) {
    let amplitude = 1.0, frequency = 1.0, sum = 0, maxSum = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * this.valueNoise(x * frequency, y * frequency, 1, seed + i);
      maxSum += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / maxSum;
  }
  
  voronoiNoise(x, y, scale = 1, seed = 0) {
    const scaledX = x * scale, scaledY = y * scale;
    const cellX = Math.floor(scaledX), cellY = Math.floor(scaledY);
    let minDist = 1.0;
    for (let offY = -1; offY <= 1; offY++) {
      for (let offX = -1; offX <= 1; offX++) {
        const neighborX = cellX + offX, neighborY = cellY + offY;
        const pointX = neighborX + this.noise(neighborX, neighborY, seed);
        const pointY = neighborY + this.noise(neighborY, neighborX, seed + 1);
        const dx = scaledX - pointX, dy = scaledY - pointY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        minDist = Math.min(minDist, dist);
      }
    }
    return Math.min(1.0, minDist);
  }
  
  warpedNoise(x, y, scale = 1, warpAmount = 1, seed = 0) {
    const warpX = x + warpAmount * this.valueNoise(x, y, scale, seed + 1);
    const warpY = y + warpAmount * this.valueNoise(x, y, scale, seed + 2);
    return this.valueNoise(warpX, warpY, scale, seed);
  }
  
  blendColors(color1, color2, blend) {
    return {
      r: Math.floor(color1.r + (color2.r - color1.r) * blend),
      g: Math.floor(color1.g + (color2.g - color1.g) * blend),
      b: Math.floor(color1.b + (color2.b - color1.b) * blend)
    };
  }

  generateAllTextures() {
    this.generateDirtTexture();
    this.generateGrassTexture();
    this.generateStoneTexture();
    this.generateSandTexture();
    this.generateWaterTexture();
    this.generateWoodTexture();
    this.generateLeavesTexture();
    this.generateBedrockTexture();
    this.generateGrassPlantTexture();
    this.generateRedFlowerTexture();
    this.generateYellowFlowerTexture();
    return this.blockTextures;
  }

  generateDirtTexture() {
    const baseColor = { r: 134, g: 96, b: 67 };
    const texture = this.createTexture((ctx, size) => {
      this.fillCanvas(ctx, size, baseColor);
      const lightColor = { r: 145, g: 106, b: 75 },
            darkColor = { r: 115, g: 76, b: 45 },
            darkestColor = { r: 101, g: 67, b: 33 };
      this.processPixels(ctx, size, (data, x, y, index) => {
        const largeScale = this.fbm(x / size * 3, y / size * 3, 2, 2.0, 0.5, 42),
              mediumScale = this.fbm(x / size * 6, y / size * 6, 2, 2.0, 0.5, 123),
              smallScale = this.fbm(x / size * 12, y / size * 12, 2, 2.0, 0.5, 789),
              combinedNoise = 0.5 * largeScale + 0.35 * mediumScale + 0.15 * smallScale;
        let finalColor;
        if (combinedNoise < 0.35) {
          finalColor = this.blendColors(baseColor, darkestColor, this.smoothstep(0.2, 0.35, combinedNoise));
        } else if (combinedNoise < 0.6) {
          finalColor = this.blendColors(darkColor, baseColor, this.smoothstep(0.35, 0.6, combinedNoise));
        } else {
          finalColor = this.blendColors(baseColor, lightColor, this.smoothstep(0.6, 0.8, combinedNoise));
        }
        const microNoise = this.noise(x * 50, y * 50, 999) * 6 - 3;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
      });
    });
    this.blockTextures[BLOCK_TYPE.DIRT] = texture;
  }

  generateGrassTexture() {
    const topTexture = this.createTexture((ctx, size) => {
      const baseColor = { r: 95, g: 169, b: 57 },
            lightColor = { r: 119, g: 186, b: 67 },
            darkColor = { r: 73, g: 145, b: 37 };
      this.fillCanvas(ctx, size, baseColor);
      this.processPixels(ctx, size, (data, x, y, index) => {
        const largeScale = this.fbm(x / size * 3, y / size * 3, 3, 2.0, 0.5, 42),
              mediumScale = this.fbm(x / size * 6, y / size * 6, 2, 2.0, 0.5, 123),
              smallScale = this.warpedNoise(x / size * 15, y / size * 15, 2, 0.5, 789),
              combinedNoise = 0.4 * largeScale + 0.4 * mediumScale + 0.2 * smallScale;
        let finalColor;
        if (combinedNoise < 0.3) {
          finalColor = this.blendColors(darkColor, baseColor, this.smoothstep(0.1, 0.3, combinedNoise));
        } else if (combinedNoise < 0.7) {
          finalColor = baseColor;
        } else {
          finalColor = this.blendColors(baseColor, lightColor, this.smoothstep(0.7, 0.9, combinedNoise));
        }
        const detailNoise = this.noise(x * 35, y * 35, 321) * 8 - 4;
        data[index] = Math.max(0, Math.min(255, finalColor.r + detailNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + detailNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + detailNoise));
      });
    });

    const sideTexture = this.createTexture((ctx, size) => {
      const dirtColor = { r: 134, g: 96, b: 67 },
            darkDirtColor = { r: 115, g: 76, b: 45 },
            darkestDirtColor = { r: 101, g: 67, b: 33 };
      this.fillCanvas(ctx, size, dirtColor);
      this.processPixels(ctx, size, (data, x, y, index) => {
        if (y >= 4) {
          const largeScale = this.fbm(x / size * 3, y / size * 3, 2, 2.0, 0.5, 42),
                mediumScale = this.fbm(x / size * 6, y / size * 6, 2, 2.0, 0.5, 123),
                combinedNoise = 0.6 * largeScale + 0.4 * mediumScale;
          let finalColor;
          if (combinedNoise < 0.35) {
            finalColor = this.blendColors(dirtColor, darkestDirtColor, this.smoothstep(0.2, 0.35, combinedNoise));
          } else if (combinedNoise < 0.6) {
            finalColor = this.blendColors(darkDirtColor, dirtColor, this.smoothstep(0.35, 0.6, combinedNoise));
          } else {
            finalColor = dirtColor;
          }
          const microNoise = this.noise(x * 50, y * 50, 999) * 5 - 2.5;
          data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
          data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
          data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
        }
      });
      const grassColor = { r: 95, g: 169, b: 57 },
            lightGrassColor = { r: 119, g: 186, b: 67 },
            darkGrassColor = { r: 73, g: 145, b: 37 };
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < size; x++) {
          const edgeNoise = this.noise(x * 0.7, 0, 123) * 1.5,
                edgeY = 3.5 + edgeNoise;
          if (y <= edgeY) {
            const noiseVal = this.fbm(x / size * 6, y / size * 6, 2, 2.0, 0.5, 456);
            let pixelColor = noiseVal < 0.4 ? darkGrassColor : (noiseVal > 0.7 ? lightGrassColor : grassColor);
            const imgData = ctx.getImageData(x, y, 1, 1);
            imgData.data[0] = pixelColor.r;
            imgData.data[1] = pixelColor.g;
            imgData.data[2] = pixelColor.b;
            imgData.data[3] = 255;
            ctx.putImageData(imgData, x, y);
          }
        }
      }
    });

    const bottomTexture = this.blockTextures[BLOCK_TYPE.DIRT];
    this.blockTextures[BLOCK_TYPE.GRASS] = {
      top: topTexture,
      side: sideTexture,
      bottom: bottomTexture
    };
  }

  generateStoneTexture() {
    const baseColor = { r: 126, g: 126, b: 126 };
    const texture = this.createTexture((ctx, size) => {
      this.fillCanvas(ctx, size, baseColor);
      const lightColor = { r: 142, g: 142, b: 142 },
            darkColor = { r: 112, g: 112, b: 112 };
      this.processPixels(ctx, size, (data, x, y, index) => {
        const largeScale = this.warpedNoise(x / size * 2, y / size * 2, 1, 0.5, 789),
              mediumScale = this.fbm(x / size * 4, y / size * 4, 3, 2.0, 0.5, 234),
              smallScale = this.fbm(x / size * 8, y / size * 8, 2, 2.0, 0.5, 567),
              voronoiPattern = this.voronoiNoise(x / size * 2, y / size * 2, 1, 123);
        let combinedNoise = 0.5 * largeScale + 0.35 * mediumScale + 0.15 * smallScale;
        if (voronoiPattern > 0.15 && voronoiPattern < 0.2) {
          combinedNoise *= 0.8;
        }
        let finalColor = combinedNoise < 0.4 
          ? this.blendColors(baseColor, darkColor, this.smoothstep(0.2, 0.4, combinedNoise))
          : (combinedNoise < 0.6 ? baseColor : this.blendColors(baseColor, lightColor, this.smoothstep(0.6, 0.8, combinedNoise)));
        const microNoise = this.noise(x * 40, y * 40, 999) * 4 - 2;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
      });
    });
    this.blockTextures[BLOCK_TYPE.STONE] = texture;
  }

  generateSandTexture() {
    const baseColor = { r: 223, g: 214, b: 156 };
    const texture = this.createTexture((ctx, size) => {
      this.fillCanvas(ctx, size, baseColor);
      const lightColor = { r: 233, g: 226, b: 176 },
            darkColor = { r: 213, g: 203, b: 138 };
      this.processPixels(ctx, size, (data, x, y, index) => {
        const largeScale = this.fbm(x / size * 4, y / size * 4, 2, 2.0, 0.5, 321),
              mediumScale = this.fbm(x / size * 8, y / size * 8, 2, 2.0, 0.5, 654),
              smallScale = this.noise(x / size * 20, y / size * 20, 987),
              combinedNoise = 0.3 * largeScale + 0.3 * mediumScale + 0.4 * smallScale;
        let finalColor = combinedNoise < 0.4 
          ? this.blendColors(baseColor, darkColor, this.smoothstep(0.2, 0.4, combinedNoise))
          : (combinedNoise < 0.6 ? baseColor : this.blendColors(baseColor, lightColor, this.smoothstep(0.6, 0.8, combinedNoise)));
        const microNoise = (this.noise(x * 60, y * 60, 111) - 0.5) * 6;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
      });
    });
    this.blockTextures[BLOCK_TYPE.SAND] = texture;
  }

  generateWaterTexture() {
    const baseColor = { r: 63, g: 118, b: 228 };
    const texture = this.createTexture((ctx, size) => {
      ctx.clearRect(0, 0, size, size);
      this.processPixels(ctx, size, (data, x, y, index) => {
        const waveScale1 = this.fbm(x / size * 3 + 0.1, y / size * 3, 2, 2.0, 0.5, 123),
              waveScale2 = this.fbm(x / size * 2 - 0.6, y / size * 2, 2, 2.0, 0.5, 456),
              waves = waveScale1 * 0.6 + waveScale2 * 0.4,
              depth = 0.4 + 0.6 * waves,
              deepColor = { r: 54, g: 97, b: 181 },
              shallowColor = { r: 86, g: 154, b: 231 },
              finalColor = this.blendColors(deepColor, shallowColor, depth);
        data[index] = finalColor.r;
        data[index + 1] = finalColor.g;
        data[index + 2] = finalColor.b;
        data[index + 3] = 200 + waves * 30;
      });
    });
    texture.transparent = true;
    this.blockTextures[BLOCK_TYPE.WATER] = texture;
  }

  generateWoodTexture() {
    const baseColor = { r: 143, g: 119, b: 72 };
    const endTexture = this.createTexture((ctx, size) => {
      this.fillCanvas(ctx, size, baseColor);
      this.processPixels(ctx, size, (data, x, y, index) => {
        const centerX = size / 2,
              centerY = size / 2,
              dx = x - centerX,
              dy = y - centerY,
              distance = Math.sqrt(dx * dx + dy * dy),
              ringVal = (Math.sin(distance * 2.5) + 1) / 2,
              noiseVal = this.fbm(x / size * 8, y / size * 8, 2, 2.0, 0.5, 678),
              warpedRings = ringVal * 0.8 + noiseVal * 0.2;
        const darkColor = { r: 122, g: 99, b: 55 },
              midColor = { r: 132, g: 109, b: 62 };
        let finalColor = (distance < size * 0.15)
          ? this.blendColors(midColor, darkColor, 0.7)
          : (warpedRings < 0.4)
            ? this.blendColors(baseColor, darkColor, 1 - warpedRings * 2)
            : (warpedRings > 0.6)
              ? this.blendColors(baseColor, midColor, (warpedRings - 0.6) * 2.5)
              : baseColor;
        const microNoise = this.noise(x * 30, y * 30, 123) * 6 - 3;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
      });
    });

    const sideTexture = this.createTexture((ctx, size) => {
      this.fillCanvas(ctx, size, baseColor);
      this.processPixels(ctx, size, (data, x, y, index) => {
        const grainFreq = 15,
              noiseX = this.fbm(x / size * 10, y / size * 3, 3, 2.0, 0.5, 789),
              noiseY = this.fbm(x / size * 3, y / size * 8, 2, 2.0, 0.5, 456),
              warpedX = x + noiseY * 1.5,
              warpedGrain = Math.sin(warpedX * grainFreq) * 0.5 + 0.5,
              grain = warpedGrain * 0.7 + noiseX * 0.3;
        const darkColor = { r: 122, g: 99, b: 55 },
              lightColor = { r: 158, g: 134, b: 88 };
        let finalColor = (grain < 0.35)
          ? this.blendColors(baseColor, darkColor, this.smoothstep(0.1, 0.35, grain))
          : (grain > 0.65)
            ? this.blendColors(baseColor, lightColor, this.smoothstep(0.65, 0.9, grain))
            : baseColor;
        const knotX = 9, knotY = 6, knotRadius = 2.5,
              knotDist = Math.sqrt((x - knotX) ** 2 + (y - knotY) ** 2);
        if (knotDist < knotRadius) {
          const knotColor = { r: 101, g: 84, b: 50 },
                knotBlend = this.smoothstep(0, knotRadius, knotDist);
          finalColor = this.blendColors(knotColor, finalColor, knotBlend);
        }
        const microNoise = this.noise(x * 40, y * 40, 999) * 4 - 2;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
      });
    });

    this.blockTextures[BLOCK_TYPE.WOOD] = {
      top: endTexture,
      side: sideTexture,
      bottom: endTexture
    };
  }

  generateLeavesTexture() {
    const baseColor = { r: 44, g: 108, b: 37 };
    const texture = this.createTexture((ctx, size) => {
      ctx.clearRect(0, 0, size, size);
      this.processPixels(ctx, size, (data, x, y, index) => {
        const baseNoise = this.fbm(x / size * 4, y / size * 4, 3, 2.0, 0.5, 456),
              detailNoise = this.fbm(x / size * 8, y / size * 8, 2, 2.0, 0.5, 789),
              holePattern = this.fbm(x / size * 6, y / size * 6, 2, 2.0, 0.5, 321),
              combinedNoise = baseNoise * 0.6 + detailNoise * 0.4;
        const darkColor = { r: 30, g: 90, b: 25 },
              lightColor = { r: 60, g: 128, b: 48 };
        let finalColor = (combinedNoise < 0.4)
          ? this.blendColors(baseColor, darkColor, this.smoothstep(0.2, 0.4, combinedNoise))
          : (combinedNoise > 0.7)
            ? this.blendColors(baseColor, lightColor, this.smoothstep(0.7, 0.9, combinedNoise))
            : baseColor;
        const microNoise = this.noise(x * 30, y * 30, 111) * 8 - 4;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
        if (holePattern < 0.1) {
          data[index + 3] = 0;
        } else if (holePattern < 0.15) {
          data[index + 3] = 128;
        } else {
          data[index + 3] = (x === 0 || y === 0 || x === size - 1 || y === size - 1) ? 230 : 250;
        }
      });
    });
    texture.transparent = true;
    this.blockTextures[BLOCK_TYPE.LEAVES] = texture;
  }

  generateBedrockTexture() {
    const baseColor = { r: 84, g: 84, b: 84 };
    const texture = this.createTexture((ctx, size) => {
      this.fillCanvas(ctx, size, baseColor);
      this.processPixels(ctx, size, (data, x, y, index) => {
        const largeNoise = this.fbm(x / size * 3, y / size * 3, 3, 2.0, 0.5, 123),
              mediumNoise = this.warpedNoise(x / size * 5, y / size * 5, 2, 0.8, 456),
              smallNoise = this.fbm(x / size * 8, y / size * 8, 2, 2.0, 0.5, 789),
              cellPattern = this.voronoiNoise(x / size * 3, y / size * 3, 1, 321);
        let combinedNoise = largeNoise * 0.3 + mediumNoise * 0.4 + smallNoise * 0.3;
        if (cellPattern > 0.1 && cellPattern < 0.2) {
          combinedNoise = combinedNoise * 0.7 - 0.1;
        }
        const lightColor = { r: 105, g: 105, b: 105 },
              darkColor = { r: 58, g: 58, b: 58 },
              veryDarkColor = { r: 38, g: 38, b: 38 };
        let finalColor = combinedNoise < 0.3
          ? this.blendColors(darkColor, veryDarkColor, this.smoothstep(0.1, 0.3, combinedNoise))
          : (combinedNoise < 0.6
            ? this.blendColors(darkColor, baseColor, this.smoothstep(0.3, 0.6, combinedNoise))
            : this.blendColors(baseColor, lightColor, this.smoothstep(0.6, 0.9, combinedNoise)));
        const microNoise = this.noise(x * 50, y * 50, 999) * 8 - 4;
        data[index] = Math.max(0, Math.min(255, finalColor.r + microNoise));
        data[index + 1] = Math.max(0, Math.min(255, finalColor.g + microNoise));
        data[index + 2] = Math.max(0, Math.min(255, finalColor.b + microNoise));
      });
    });
    this.blockTextures[BLOCK_TYPE.BEDROCK] = texture;
  }

  generateGrassPlantTexture() {
    const baseColor = { r: 83, g: 185, b: 63 };
    const texture = this.createTexture((ctx, size) => {
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`;
      ctx.lineWidth = 1.5;
      const gradient1 = ctx.createLinearGradient(0, 0, size, size);
      gradient1.addColorStop(0, `rgb(${baseColor.r - 20}, ${baseColor.g - 10}, ${baseColor.b - 10})`);
      gradient1.addColorStop(0.4, `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
      gradient1.addColorStop(1, `rgb(${baseColor.r + 10}, ${baseColor.g + 15}, ${baseColor.b})`);
      ctx.strokeStyle = gradient1;
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.bezierCurveTo(size * 0.3, size * 0.3, size * 0.7, size * 0.7, size - 2, size - 2);
      ctx.stroke();
      const gradient2 = ctx.createLinearGradient(size, 0, 0, size);
      gradient2.addColorStop(0, `rgb(${baseColor.r - 20}, ${baseColor.g - 10}, ${baseColor.b - 10})`);
      gradient2.addColorStop(0.4, `rgb(${baseColor.r}, ${baseColor.g}, ${baseColor.b})`);
      gradient2.addColorStop(1, `rgb(${baseColor.r + 10}, ${baseColor.g + 15}, ${baseColor.b})`);
      ctx.strokeStyle = gradient2;
      ctx.beginPath();
      ctx.moveTo(size - 2, 2);
      ctx.bezierCurveTo(size * 0.7, size * 0.3, size * 0.3, size * 0.7, 2, size - 2);
      ctx.stroke();
      ctx.strokeStyle = `rgb(${baseColor.r - 10}, ${baseColor.g - 5}, ${baseColor.b - 5})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(5, 10);
      ctx.quadraticCurveTo(3, 7, 4, 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(11, 10);
      ctx.quadraticCurveTo(13, 7, 12, 4);
      ctx.stroke();
    });
    texture.transparent = true;
    this.blockTextures[BLOCK_TYPE.GRASS_PLANT] = texture;
  }

  generateFlowerTexture({ type, stemColor, petalColor, centerColor }) {
    const texture = this.createTexture((ctx, size) => {
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = `rgb(${stemColor.r}, ${stemColor.g}, ${stemColor.b})`;
      ctx.fillRect(7, 8, 2, 8);
      const flowerCenterX = 8, flowerCenterY = 6, petalCount = 6,
            innerRadius = 2, outerRadius = 4;
      for (let i = 0; i < petalCount; i++) {
        const angle = (i / petalCount) * Math.PI * 2,
              endX = flowerCenterX + Math.cos(angle) * outerRadius,
              endY = flowerCenterY + Math.sin(angle) * outerRadius;
        ctx.fillStyle = `rgb(${petalColor.r}, ${petalColor.g}, ${petalColor.b})`;
        ctx.beginPath();
        ctx.arc(endX, endY, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgb(${centerColor.r}, ${centerColor.g}, ${centerColor.b})`;
      ctx.beginPath();
      ctx.arc(flowerCenterX, flowerCenterY, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgb(${stemColor.r + 20}, ${stemColor.g + 20}, ${stemColor.b - 10})`;
      ctx.beginPath();
      ctx.ellipse(5, 12, 2, 1.2, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
    });
    texture.transparent = true;
    this.blockTextures[type] = texture;
  }

  generateRedFlowerTexture() {
    this.generateFlowerTexture({
      type: BLOCK_TYPE.RED_FLOWER,
      stemColor: { r: 60, g: 120, b: 40 },
      petalColor: { r: 230, g: 60, b: 60 },
      centerColor: { r: 250, g: 220, b: 0 }
    });
  }

  generateYellowFlowerTexture() {
    this.generateFlowerTexture({
      type: BLOCK_TYPE.YELLOW_FLOWER,
      stemColor: { r: 60, g: 120, b: 40 },
      petalColor: { r: 250, g: 250, b: 90 },
      centerColor: { r: 250, g: 170, b: 0 }
    });
  }
}
