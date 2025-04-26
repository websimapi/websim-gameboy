var GameboyJS;
(function (GameboyJS) {
"use strict";

// Timer component
var Timer = function(cpu) {
    this.cpu = cpu;
    this.div = 0;
    this.tima = 0;
    this.tma = 0;
    this.timerEnabled = false;
    this.timerFreq = 0;
    this.divCycles = 0;
    this.timaCycles = 0;
};

Timer.prototype.update = function(cycles) {
    // Update DIV register (incremented at 16384Hz)
    this.divCycles += cycles;
    while (this.divCycles >= 256) {
        this.div = (this.div + 1) & 0xFF;
        this.divCycles -= 256;
    }
    
    // Update TIMA if enabled
    if (this.timerEnabled) {
        this.timaCycles += cycles;
        while (this.timaCycles >= this.timerFreq) {
            this.tima = (this.tima + 1) & 0xFF;
            this.timaCycles -= this.timerFreq;
            
            // Check for overflow
            if (this.tima === 0) {
                // Reset TIMA to TMA and request timer interrupt
                this.tima = this.tma;
                this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.TIMER);
            }
        }
    }
};

Timer.prototype.read = function(address) {
    switch (address) {
        case 0xFF04: return this.div;
        case 0xFF05: return this.tima;
        case 0xFF06: return this.tma;
        case 0xFF07: 
            var val = 0;
            if (this.timerEnabled) val |= 0x04;
            switch (this.timerFreq) {
                case 1024: val |= 0x00; break;
                case 16: val |= 0x01; break;
                case 64: val |= 0x02; break;
                case 256: val |= 0x03; break;
            }
            return val;
    }
    return 0;
};

Timer.prototype.write = function(address, value) {
    switch (address) {
        case 0xFF04:
            // Reset DIV
            this.div = 0;
            this.divCycles = 0;
            break;
        case 0xFF05:
            // Set TIMA
            this.tima = value;
            break;
        case 0xFF06:
            // Set TMA
            this.tma = value;
            break;
        case 0xFF07:
            // TAC - Timer Control
            this.timerEnabled = (value & 0x04) !== 0;
            
            // Set timer frequency
            switch (value & 0x03) {
                case 0: this.timerFreq = 1024; break; // 4096Hz
                case 1: this.timerFreq = 16; break;   // 262144Hz
                case 2: this.timerFreq = 64; break;   // 65536Hz
                case 3: this.timerFreq = 256; break;  // 16384Hz
            }
            break;
    }
};

GameboyJS.Timer = Timer;
}(GameboyJS || (GameboyJS = {})));
