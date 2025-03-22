const WORLD_SIZE = { WIDTH: 512, HEIGHT: 128, DEPTH: 512 };
const ISLAND_SIZE = 256;
const SEA_LEVEL = 32;
const MAX_HEIGHT = 64;
const CHUNK_SIZE = 32;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mod(n, m) {
  return ((n % m) + m) % m;
}

function distance(x1, y1, z1, x2, y2, z2) {
  const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function manhattanDistance(x1, y1, z1, x2, y2, z2) {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1) + Math.abs(z2 - z1);
}

function getChunkCoordFromBlockCoord(blockCoord) {
  return Math.floor(blockCoord / CHUNK_SIZE);
}

function getLocalCoordInChunk(blockCoord) {
  return mod(blockCoord, CHUNK_SIZE);
}

function getBlockKey(x, y, z) {
  return `${x},${y},${z}`;
}

function getChunkKey(x, y, z) {
  return `${x},${y},${z}`;
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function rayCast(origin, direction, world, maxDistance = 5) {
  const rayOrigin = { x: origin.x, y: origin.y, z: origin.z };
  let rayDir = { x: direction.x, y: direction.y, z: direction.z };

  const dirLength = Math.sqrt(rayDir.x ** 2 + rayDir.y ** 2 + rayDir.z ** 2);
  if (Math.abs(dirLength - 1.0) > 0.001) {
    if (dirLength === 0) return null;
    rayDir.x /= dirLength;
    rayDir.y /= dirLength;
    rayDir.z /= dirLength;
  }

  const steps = 100;
  const stepSize = maxDistance / steps;
  let currentX = rayOrigin.x, currentY = rayOrigin.y, currentZ = rayOrigin.z;
  let blockX = Math.floor(currentX), blockY = Math.floor(currentY), blockZ = Math.floor(currentZ);
  let lastAirBlockX = blockX, lastAirBlockY = blockY, lastAirBlockZ = blockZ;
  
  const startBlock = world.getBlock(blockX, blockY, blockZ);
  if (startBlock && startBlock.id !== BLOCK_TYPE.AIR && startBlock.isSolid) {
    return {
      position: { x: blockX, y: blockY, z: blockZ },
      normal: { x: 0, y: 0, z: 0 },
      distance: 0,
      block: startBlock,
      exact: { x: currentX, y: currentY, z: currentZ }
    };
  }
  if (startBlock && startBlock.id === BLOCK_TYPE.AIR) {
    lastAirBlockX = blockX; lastAirBlockY = blockY; lastAirBlockZ = blockZ;
  }
  
  for (let i = 1; i <= steps; i++) {
    const dist = i * stepSize;
    currentX = rayOrigin.x + rayDir.x * dist;
    currentY = rayOrigin.y + rayDir.y * dist;
    currentZ = rayOrigin.z + rayDir.z * dist;
    
    blockX = Math.round(currentX);
    blockY = Math.round(currentY);
    blockZ = Math.round(currentZ);
    
    if (blockX >= 0 && blockX < WORLD_SIZE.WIDTH &&
        blockY >= 0 && blockY < WORLD_SIZE.HEIGHT &&
        blockZ >= 0 && blockZ < WORLD_SIZE.DEPTH) {
      const block = world.getBlock(blockX, blockY, blockZ);
      if (block && block.id === BLOCK_TYPE.AIR) {
        lastAirBlockX = blockX; lastAirBlockY = blockY; lastAirBlockZ = blockZ;
      } else if (block && block.isSolid) {
        let normal = { x: 0, y: 0, z: 0 };
        if (blockX > lastAirBlockX) normal = { x: -1, y: 0, z: 0 };
        else if (blockX < lastAirBlockX) normal = { x: 1, y: 0, z: 0 };
        else if (blockY > lastAirBlockY) normal = { x: 0, y: -1, z: 0 };
        else if (blockY < lastAirBlockY) normal = { x: 0, y: 1, z: 0 };
        else if (blockZ > lastAirBlockZ) normal = { x: 0, y: 0, z: -1 };
        else if (blockZ < lastAirBlockZ) normal = { x: 0, y: 0, z: 1 };

        if (!normal.x && !normal.y && !normal.z) {
          if (Math.abs(rayDir.x) >= Math.abs(rayDir.y) && Math.abs(rayDir.x) >= Math.abs(rayDir.z)) {
            normal.x = rayDir.x > 0 ? -1 : 1;
          } else if (Math.abs(rayDir.y) >= Math.abs(rayDir.x) && Math.abs(rayDir.y) >= Math.abs(rayDir.z)) {
            normal.y = rayDir.y > 0 ? -1 : 1;
          } else {
            normal.z = rayDir.z > 0 ? -1 : 1;
          }
        }
        
        return {
          position: { x: blockX, y: blockY, z: blockZ },
          normal,
          distance: dist,
          block,
          exact: { x: currentX, y: currentY, z: currentZ }
        };
      }
    } else {
      return null;
    }
  }
  
  return null;
}

function checkBlockCollision(position, world) {
  const playerWidth = 0.5, playerHeight = 1.7;
  const halfWidth = (playerWidth / 2) * 0.9;
  
  const checkPoints = [
    { x: position.x - halfWidth, y: position.y, z: position.z - halfWidth },
    { x: position.x + halfWidth, y: position.y, z: position.z - halfWidth },
    { x: position.x - halfWidth, y: position.y, z: position.z + halfWidth },
    { x: position.x + halfWidth, y: position.y, z: position.z + halfWidth },
    { x: position.x - halfWidth, y: position.y + playerHeight, z: position.z - halfWidth },
    { x: position.x + halfWidth, y: position.y + playerHeight, z: position.z - halfWidth },
    { x: position.x - halfWidth, y: position.y + playerHeight, z: position.z + halfWidth },
    { x: position.x + halfWidth, y: position.y + playerHeight, z: position.z + halfWidth },
    { x: position.x, y: position.y + playerHeight / 2, z: position.z }
  ];
  
  const collisions = [];
  
  for (const point of checkPoints) {
    const blockX = Math.round(point.x);
    const blockY = Math.round(point.y);
    const blockZ = Math.round(point.z);
    
    if (blockX < 0 || blockX >= WORLD_SIZE.WIDTH ||
        blockY < 0 || blockY >= WORLD_SIZE.HEIGHT ||
        blockZ < 0 || blockZ >= WORLD_SIZE.DEPTH) {
      continue;
    }
    
    const block = world.getBlock(blockX, blockY, blockZ);
    if (block && block.id !== BLOCK_TYPE.AIR && block.isSolid) {
      collisions.push({ position: { x: blockX, y: blockY, z: blockZ }, block });
    }
  }
  
  return collisions;
}
