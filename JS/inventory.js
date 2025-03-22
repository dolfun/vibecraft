class Inventory {
  constructor(hotbarSize, ui) {
    this.ui = ui;
    this.hotbarSize = hotbarSize;
    this.slots = new Array(hotbarSize).fill(null);
    this.ui.createHotbar(hotbarSize);
  }
  
  updateSlotUI(slot) {
    if (slot < this.hotbarSize) {
      this.ui.updateHotbarSlot(slot, this.slots[slot]);
    }
  }
  
  getItemInSlot(slot) {
    if (slot < 0 || slot >= this.slots.length) return null;
    return this.slots[slot];
  }
  
  setItemInSlot(slot, itemType, count) {
    if (slot < 0 || slot >= this.slots.length) return false;
    this.slots[slot] = (itemType === null || count <= 0)
      ? null
      : { id: itemType, count };
    this.updateSlotUI(slot);
    return true;
  }
  
  addItem(itemType, count) {
    if (itemType === BLOCK_TYPE.AIR) return true;
    const itemProps = BLOCK_PROPERTIES[itemType] || ITEM_PROPERTIES[itemType];
    const maxStack = itemProps.stackSize || 64;
    
    // Try to stack with existing items
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (slot && slot.id === itemType) {
        const addCount = Math.min(count, maxStack - slot.count);
        if (addCount > 0) {
          slot.count += addCount;
          count -= addCount;
          this.updateSlotUI(i);
          if (count <= 0) return true;
        }
      }
    }
    
    // Place in empty slots
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        const addCount = Math.min(count, maxStack);
        this.slots[i] = { id: itemType, count: addCount };
        count -= addCount;
        this.updateSlotUI(i);
        if (count <= 0) return true;
      }
    }
    
    return count <= 0;
  }
  
  removeItem(slot, count) {
    if (slot < 0 || slot >= this.slots.length) return false;
    const item = this.slots[slot];
    if (!item) return false;
    
    const removeCount = Math.min(count, item.count);
    item.count -= removeCount;
    if (item.count <= 0) this.slots[slot] = null;
    this.updateSlotUI(slot);
    
    return removeCount === count;
  }
  
  swapSlots(slotA, slotB) {
    if (
      slotA < 0 || slotA >= this.slots.length ||
      slotB < 0 || slotB >= this.slots.length
    ) {
      return false;
    }
    
    [this.slots[slotA], this.slots[slotB]] = [this.slots[slotB], this.slots[slotA]];
    this.updateSlotUI(slotA);
    this.updateSlotUI(slotB);
    
    return true;
  }
  
  addInitialItems() {
    this.setItemInSlot(0, ITEM_TYPE.WOODEN_SWORD, 1);
    this.setItemInSlot(1, ITEM_TYPE.WOODEN_PICKAXE, 1);
    this.setItemInSlot(2, ITEM_TYPE.WOODEN_AXE, 1);
    this.setItemInSlot(3, BLOCK_TYPE.DIRT, 32);
  }

  upgradeTool(slot, newToolType) {
    this.setItemInSlot(slot, newToolType, 1);
  }
}
