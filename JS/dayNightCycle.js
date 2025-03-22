class DayNightCycle {
  constructor() {
    this.totalDays = 5;
    this.dayDuration = 25;
    this.nightDuration = 25;
    
    this.day = 1;
    this.timeOfDay = 0.0;
    this.elapsedTime = 0;
    this.dayLength = this.dayDuration + this.nightDuration;
    
    this.lastDayState = this.isDay();
  }
  
  update(dt) {
    this.elapsedTime += dt;
    const fullDayProgress = (this.elapsedTime % this.dayLength) / this.dayLength;
    this.timeOfDay = (fullDayProgress + 0.25) % 1;
    
    if (this.elapsedTime >= this.dayLength) {
      this.day++;
      this.elapsedTime = 0;
      if (this.day > this.totalDays) {
        this.onGameComplete();
      }
    }
    
    const isDay = this.isDay();
    if (isDay !== this.lastDayState) {
      isDay ? this.onDayStart() : this.onNightStart();
      this.lastDayState = isDay;
    }
  }
  
  isDay() {
    return this.timeOfDay >= 0.25 && this.timeOfDay <= 0.75;
  }
  
  onDayStart() {
    console.log(`Day ${this.day} has started!`);
  }
  
  onNightStart() {
    console.log(`Night of day ${this.day} has started!`);
  }
  
  onGameComplete() {
    console.log("You survived all 5 days! Game complete!");
  }
  
  getTimeString() {
    const hours = Math.floor(this.timeOfDay * 24);
    const minutes = Math.floor((this.timeOfDay * 24 * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  getDifficultyMultiplier() {
    return 1 + (this.day - 1) * 0.25;
  }
  
  getTimeDescription() {
    if (this.timeOfDay < 0.15 || this.timeOfDay > 0.85) {
      return "Night (Dangerous)";
    } else if (this.timeOfDay < 0.25) {
      return "Dawn";
    } else if (this.timeOfDay < 0.75) {
      return "Day (Safe)";
    } else {
      return "Dusk";
    }
  }
}