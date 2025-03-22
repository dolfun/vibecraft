const BLOCK_ICONS = {
  [BLOCK_TYPE.AIR]: null,
  
  [BLOCK_TYPE.DIRT]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#8B4513" />
      <circle cx="8" cy="8" r="2" fill="#6b3000" />
      <circle cx="24" cy="6" r="3" fill="#6b3000" />
      <circle cx="20" cy="22" r="2" fill="#6b3000" />
      <circle cx="10" cy="26" r="3" fill="#6b3000" />
      <circle cx="16" cy="14" r="2" fill="#6b3000" />
    </svg>
  `,
  
  [BLOCK_TYPE.GRASS]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#8B4513" />
      <rect width="32" height="12" fill="#3BB446" />
      <rect width="32" height="2" y="12" fill="#2d8035" />
      <line x1="4" y1="6" x2="10" y2="6" stroke="#8adb92" stroke-width="2" />
      <line x1="20" y1="4" x2="26" y2="4" stroke="#8adb92" stroke-width="2" />
      <line x1="14" y1="8" x2="18" y2="8" stroke="#8adb92" stroke-width="2" />
    </svg>
  `,
  
  [BLOCK_TYPE.STONE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#808080" />
      <polygon points="0,0 12,0 15,3 10,8 0,6" fill="#959595" />
      <polygon points="32,15 32,32 20,32 15,28" fill="#707070" />
      <polygon points="15,15 22,10 28,14 22,20" fill="#757575" />
    </svg>
  `,
  
  [BLOCK_TYPE.WATER]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#3333DD" />
      <path d="M0,8 Q8,12 16,8 Q24,4 32,8 V32 H0 Z" fill="#4444EE" />
      <path d="M0,16 Q8,20 16,16 Q24,12 32,16 V32 H0 Z" fill="#5555FF" opacity="0.5" />
    </svg>
  `,
  
  [BLOCK_TYPE.SAND]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#EEDD77" />
      <circle cx="8" cy="8" r="1" fill="#D4C36B" />
      <circle cx="16" cy="6" r="1" fill="#D4C36B" />
      <circle cx="24" cy="10" r="1" fill="#D4C36B" />
      <circle cx="10" cy="16" r="1" fill="#D4C36B" />
      <circle cx="20" cy="18" r="1" fill="#D4C36B" />
      <circle cx="6" cy="26" r="1" fill="#D4C36B" />
      <circle cx="26" cy="24" r="1" fill="#D4C36B" />
      <circle cx="14" cy="28" r="1" fill="#D4C36B" />
    </svg>
  `,
  
  [BLOCK_TYPE.BEDROCK]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#333333" />
      <polygon points="0,0 10,0 15,5 10,10 0,8" fill="#444444" />
      <polygon points="32,5 32,15 25,20 20,15" fill="#222222" />
      <polygon points="15,15 25,12 28,18 20,25 12,20" fill="#3a3a3a" />
      <polygon points="0,20 10,25 5,32 0,32" fill="#2a2a2a" />
    </svg>
  `,
  
  [BLOCK_TYPE.WOOD]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#926239" />
      <rect x="8" y="0" width="4" height="32" fill="#7d5430" />
      <rect x="20" y="0" width="4" height="32" fill="#7d5430" />
      <ellipse cx="10" cy="10" rx="3" ry="2" fill="#614224" />
      <ellipse cx="22" cy="20" rx="3" ry="2" fill="#614224" />
    </svg>
  `,
  
  [BLOCK_TYPE.LEAVES]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#125B27" />
      <circle cx="8" cy="8" r="3" fill="#0e4b20" />
      <circle cx="24" cy="6" r="4" fill="#0e4b20" />
      <circle cx="20" cy="22" r="5" fill="#0e4b20" />
      <circle cx="4" cy="26" r="3" fill="#0e4b20" />
      <circle cx="16" cy="14" r="2" fill="#1b7c36" />
      <circle cx="25" cy="18" r="2" fill="#1b7c36" />
      <circle cx="14" cy="28" r="2" fill="#1b7c36" />
    </svg>
  `,
  
  [BLOCK_TYPE.GRASS_PLANT]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="transparent" />
      <path d="M16,30 L16,8" stroke="#7EC850" stroke-width="2" />
      <path d="M16,15 L10,7" stroke="#7EC850" stroke-width="2" />
      <path d="M16,20 L20,13" stroke="#7EC850" stroke-width="2" />
      <path d="M16,12 L22,5" stroke="#7EC850" stroke-width="2" />
      <path d="M16,18 L12,10" stroke="#7EC850" stroke-width="2" />
    </svg>
  `,
  
  [BLOCK_TYPE.RED_FLOWER]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="transparent" />
      <path d="M16,30 L16,14" stroke="#3BB446" stroke-width="2" />
      <circle cx="16" cy="10" r="6" fill="#FF3333" />
      <circle cx="16" cy="10" r="3" fill="#FFCC00" />
    </svg>
  `,
  
  [BLOCK_TYPE.YELLOW_FLOWER]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="transparent" />
      <path d="M16,30 L16,14" stroke="#3BB446" stroke-width="2" />
      <circle cx="16" cy="10" r="6" fill="#FFFF00" />
      <circle cx="16" cy="10" r="3" fill="#FF9900" />
    </svg>
  `,
  
  // ITEMS
  [ITEM_TYPE.WOODEN_PICKAXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="18" width="4" height="12" fill="#926239" />
      <polygon points="6,4 14,12 18,12 26,4 22,0 10,0" fill="#926239" />
    </svg>
  `,
  
  [ITEM_TYPE.WOODEN_AXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="15" width="4" height="15" fill="#926239" />
      <polygon points="10,4 18,12 22,8 14,0" fill="#926239" />
    </svg>
  `,
  
  [ITEM_TYPE.WOODEN_SWORD]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="20" width="4" height="10" fill="#926239" />
      <polygon points="10,5 14,20 18,20 22,5 18,0 14,0" fill="#926239" />
    </svg>
  `,
  
  [ITEM_TYPE.STONE_PICKAXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="18" width="4" height="12" fill="#926239" />
      <polygon points="6,4 14,12 18,12 26,4 22,0 10,0" fill="#808080" />
    </svg>
  `,
  
  [ITEM_TYPE.STONE_AXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="15" width="4" height="15" fill="#926239" />
      <polygon points="10,4 18,12 22,8 14,0" fill="#808080" />
    </svg>
  `,
  
  [ITEM_TYPE.STONE_SWORD]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="20" width="4" height="10" fill="#926239" />
      <polygon points="10,5 14,20 18,20 22,5 18,0 14,0" fill="#808080" />
    </svg>
  `,

  [ITEM_TYPE.IRON_PICKAXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="18" width="4" height="12" fill="#926239" />
      <polygon points="6,4 14,12 18,12 26,4 22,0 10,0" fill="#C0C0C0" />
    </svg>
  `,
  
  [ITEM_TYPE.IRON_AXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="15" width="4" height="15" fill="#926239" />
      <polygon points="10,4 18,12 22,8 14,0" fill="#C0C0C0" />
    </svg>
  `,
  
  [ITEM_TYPE.IRON_SWORD]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="20" width="4" height="10" fill="#926239" />
      <polygon points="10,5 14,20 18,20 22,5 18,0 14,0" fill="#C0C0C0" />
    </svg>
  `,
  
  [ITEM_TYPE.DIAMOND_PICKAXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="18" width="4" height="12" fill="#926239" />
      <polygon points="6,4 14,12 18,12 26,4 22,0 10,0" fill="#5CB8E6" />
    </svg>
  `,
  
  [ITEM_TYPE.DIAMOND_AXE]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="15" width="4" height="15" fill="#926239" />
      <polygon points="10,4 18,12 22,8 14,0" fill="#5CB8E6" />
    </svg>
  `,
  
  [ITEM_TYPE.DIAMOND_SWORD]: `
    <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="20" width="4" height="10" fill="#926239" />
      <polygon points="10,5 14,20 18,20 22,5 18,0 14,0" fill="#5CB8E6" />
    </svg>
  `
};