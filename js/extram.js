var GameboyJS;
(function (GameboyJS) {
"use strict";

// External RAM (for cartridges with RAM)
var ExtRam = function(size, banks, gameName, hasBattery) {
    this.size = size || 0;
    this.banks = banks || 1;
    this.gameName = gameName || 'unknown';
    this.hasBattery = hasBattery || false;
    
    // Initialize RAM with zeros
    this.ram = new Uint8Array(this.size);
    
    // Try to load RAM from localStorage if battery-backed
    if (this.hasBattery) {
        this.loadRam();
    }
};

ExtRam.prototype.read = function(address) {
    if (address < this.size) {
        return this.ram[address];
    }
    return 0xFF;
};

ExtRam.prototype.write = function(address, value) {
    if (address < this.size) {
        this.ram[address] = value;
        
        // Auto-save if battery-backed
        if (this.hasBattery) {
            this.saveRam();
        }
    }
};

ExtRam.prototype.loadRam = function() {
    try {
        var savedRam = localStorage.getItem('gbjs_ram_' + this.gameName);
        if (savedRam) {
            var data = JSON.parse(savedRam);
            for (var i = 0; i < this.size && i < data.length; i++) {
                this.ram[i] = data[i];
            }
        }
    } catch (e) {
        console.error('Failed to load RAM from localStorage', e);
    }
};

ExtRam.prototype.saveRam = function() {
    if (!this.hasBattery) return;
    
    try {
        var ramData = Array.from(this.ram);
        localStorage.setItem('gbjs_ram_' + this.gameName, JSON.stringify(ramData));
    } catch (e) {
        console.error('Failed to save RAM to localStorage', e);
    }
};

GameboyJS.ExtRam = ExtRam;
}(GameboyJS || (GameboyJS = {})));

