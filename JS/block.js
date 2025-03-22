const BLOCK_TYPE = Object.freeze({
  AIR: 0,
  DIRT: 1,
  GRASS: 2,
  STONE: 3,
  WATER: 4,
  SAND: 5,
  BEDROCK: 6,
  WOOD: 7,
  LEAVES: 8,
  GRASS_PLANT: 9,
  RED_FLOWER: 10,
  YELLOW_FLOWER: 11
});

const BLOCK_COLORS = Object.freeze({
  [BLOCK_TYPE.AIR]: 0x000000,
  [BLOCK_TYPE.DIRT]: 0x8B4513,
  [BLOCK_TYPE.GRASS]: 0x3BB446,
  [BLOCK_TYPE.STONE]: 0x808080,
  [BLOCK_TYPE.WATER]: 0x3333DD,
  [BLOCK_TYPE.SAND]: 0xEEDD77,
  [BLOCK_TYPE.BEDROCK]: 0x333333,
  [BLOCK_TYPE.WOOD]: 0x926239,
  [BLOCK_TYPE.LEAVES]: 0x125B27,
  [BLOCK_TYPE.GRASS_PLANT]: 0x7EC850,
  [BLOCK_TYPE.RED_FLOWER]: 0xFF3333,
  [BLOCK_TYPE.YELLOW_FLOWER]: 0xFFFF00
});

const BLOCK_PROPERTIES = Object.freeze({
  [BLOCK_TYPE.AIR]: {
    name: "Air",
    isSolid: false,
    isTransparent: true,
    breakTime: 0,
    drops: [],
    model: "empty",
    isDamaging: false
  },
  [BLOCK_TYPE.DIRT]: {
    name: "Dirt",
    isSolid: true,
    isTransparent: false,
    breakTime: 0.5,
    drops: [{ type: BLOCK_TYPE.DIRT, count: 1 }],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.GRASS]: {
    name: "Grass",
    isSolid: true,
    isTransparent: false,
    breakTime: 0.6,
    drops: [{ type: BLOCK_TYPE.DIRT, count: 1 }],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.STONE]: {
    name: "Stone",
    isSolid: true,
    isTransparent: false,
    breakTime: 1.5,
    drops: [{ type: BLOCK_TYPE.STONE, count: 1 }],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.WATER]: {
    name: "Water",
    isSolid: false,
    isTransparent: true,
    breakTime: 0,
    drops: [],
    model: "fluid",
    isDamaging: true,
    damageInterval: 1.0,
    damageAmount: 20
  },
  [BLOCK_TYPE.SAND]: {
    name: "Sand",
    isSolid: true,
    isTransparent: false,
    breakTime: 0.5,
    drops: [{ type: BLOCK_TYPE.SAND, count: 1 }],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.BEDROCK]: {
    name: "Bedrock",
    isSolid: true,
    isTransparent: false,
    breakTime: -1,
    drops: [],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.WOOD]: {
    name: "Wood",
    isSolid: true,
    isTransparent: false,
    breakTime: 2,
    drops: [{ type: BLOCK_TYPE.WOOD, count: 1 }],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.LEAVES]: {
    name: "Leaves",
    isSolid: true,
    isTransparent: true,
    breakTime: 0.2,
    drops: [{ type: BLOCK_TYPE.LEAVES, count: 1, probability: 0.1 }],
    model: "cube",
    isDamaging: false
  },
  [BLOCK_TYPE.GRASS_PLANT]: {
    name: "Grass Plant",
    isSolid: false,
    isTransparent: true,
    breakTime: 0.1,
    drops: [{ type: BLOCK_TYPE.GRASS_PLANT, count: 1 }],
    model: "cross",
    isDamaging: false
  },
  [BLOCK_TYPE.RED_FLOWER]: {
    name: "Red Flower",
    isSolid: false,
    isTransparent: true,
    breakTime: 0.1,
    drops: [{ type: BLOCK_TYPE.RED_FLOWER, count: 1 }],
    model: "cross",
    isDamaging: false
  },
  [BLOCK_TYPE.YELLOW_FLOWER]: {
    name: "Yellow Flower",
    isSolid: false,
    isTransparent: true,
    breakTime: 0.1,
    drops: [{ type: BLOCK_TYPE.YELLOW_FLOWER, count: 1 }],
    model: "cross",
    isDamaging: false
  }
});

const ITEM_TYPE = Object.freeze({
  ...BLOCK_TYPE,
  WOODEN_PICKAXE: 101,
  WOODEN_AXE: 102,
  WOODEN_SWORD: 103,
  STONE_PICKAXE: 104,
  STONE_AXE: 105,
  STONE_SWORD: 106,
  IRON_PICKAXE: 107,
  IRON_AXE: 108,
  IRON_SWORD: 109,
  DIAMOND_PICKAXE: 110,
  DIAMOND_AXE: 111,
  DIAMOND_SWORD: 112
});

const ITEM_PROPERTIES = Object.freeze({
  ...BLOCK_PROPERTIES,
  [ITEM_TYPE.WOODEN_PICKAXE]: {
    name: "Wooden Pickaxe",
    stackSize: 1,
    tool: true,
    toolType: "pickaxe",
    miningSpeed: 2,
    durability: 60
  },
  [ITEM_TYPE.WOODEN_AXE]: {
    name: "Wooden Axe",
    stackSize: 1,
    tool: true,
    toolType: "axe",
    miningSpeed: 2,
    durability: 60
  },
  [ITEM_TYPE.WOODEN_SWORD]: {
    name: "Wooden Sword",
    stackSize: 1,
    tool: true,
    toolType: "sword",
    damage: 4,
    durability: 60
  },
  [ITEM_TYPE.STONE_PICKAXE]: {
    name: "Stone Pickaxe",
    stackSize: 1,
    tool: true,
    toolType: "pickaxe",
    miningSpeed: 4,
    durability: 120
  },
  [ITEM_TYPE.STONE_AXE]: {
    name: "Stone Axe",
    stackSize: 1,
    tool: true,
    toolType: "axe",
    miningSpeed: 4,
    durability: 120
  },
  [ITEM_TYPE.STONE_SWORD]: {
    name: "Stone Sword",
    stackSize: 1,
    tool: true,
    toolType: "sword",
    damage: 5,
    durability: 120
  },
  [ITEM_TYPE.IRON_PICKAXE]: {
    name: "Iron Pickaxe",
    stackSize: 1,
    tool: true,
    toolType: "pickaxe",
    miningSpeed: 6,
    durability: 240
  },
  [ITEM_TYPE.IRON_AXE]: {
    name: "Iron Axe",
    stackSize: 1,
    tool: true,
    toolType: "axe",
    miningSpeed: 6,
    durability: 240
  },
  [ITEM_TYPE.IRON_SWORD]: {
    name: "Iron Sword",
    stackSize: 1,
    tool: true,
    toolType: "sword",
    damage: 7,
    durability: 240
  },
  // Diamond tools (new)
  [ITEM_TYPE.DIAMOND_PICKAXE]: {
    name: "Diamond Pickaxe",
    stackSize: 1,
    tool: true,
    toolType: "pickaxe",
    miningSpeed: 8,
    durability: 500
  },
  [ITEM_TYPE.DIAMOND_AXE]: {
    name: "Diamond Axe",
    stackSize: 1,
    tool: true,
    toolType: "axe",
    miningSpeed: 8,
    durability: 500
  },
  [ITEM_TYPE.DIAMOND_SWORD]: {
    name: "Diamond Sword",
    stackSize: 1,
    tool: true,
    toolType: "sword",
    damage: 10,
    durability: 500
  }
});

class Block {
  constructor(id) {
    this.id = id;
    const properties = BLOCK_PROPERTIES[id] || BLOCK_PROPERTIES[BLOCK_TYPE.AIR];
    Object.assign(this, {
      ...properties,
      color: BLOCK_COLORS[id] || 0xFFFFFF
    });
  }

  canBeMined(tool) {
    return this.breakTime >= 0;
  }

  getDrops() {
    return this.drops.reduce((result, drop) => {
      if (!drop.probability || Math.random() <= drop.probability) {
        result.push({ type: drop.type, count: drop.count });
      }
      return result;
    }, []);
  }
}

function createBlock(id) {
  return new Block(id);
}
