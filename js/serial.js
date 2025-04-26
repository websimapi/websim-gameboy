var GameboyJS;
(function (GameboyJS) {
"use strict";

// Serial port handler
var Serial = function(cpu) {
    this.cpu = cpu;
    this.memory = cpu.memory;
    this.transferInProgress = false;
    this.transferCycles = 0;
    this.internalClock = false;
    this.dataToSend = 0;
};

Serial.prototype.start = function() {
    this.transferInProgress = true;
    this.transferCycles = 0;
    this.internalClock = (this.memory[0xFF02] & 0x01) !== 0;
    this.dataToSend = this.memory[0xFF01];
};

Serial.prototype.update = function(cycles) {
    if (!this.transferInProgress) {
        return;
    }
    
    this.transferCycles += cycles;
    
    // 8 bits at 8192Hz = 512 cycles per transfer at 4Mhz
    if (this.transferCycles >= 512) {
        this.completeTransfer();
    }
};

Serial.prototype.completeTransfer = function() {
    // In a real GameBoy, this would send data out the serial port
    // and receive data from another device
    
    // For emulation, we'll just log the data
    if (this.dataToSend >= 32 && this.dataToSend <= 126) {
        console.log('Serial data sent: ' + String.fromCharCode(this.dataToSend));
    } else {
        console.log('Serial data sent: ' + this.dataToSend);
    }
    
    // Data received is always 0xFF (no external connection)
    this.memory[0xFF01] = 0xFF;
    
    // Reset transfer control
    this.memory[0xFF02] &= 0x7F;
    this.transferInProgress = false;
    
    // Trigger serial interrupt
    this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.SERIAL);
};

Serial.prototype.readRegister = function(address) {
    switch (address) {
        case 0xFF01: // SB - Serial transfer data
            return this.memory[0xFF01];
        case 0xFF02: // SC - Serial transfer control
            return this.memory[0xFF02];
    }
    return 0;
};

Serial.prototype.writeRegister = function(address, value) {
    switch (address) {
        case 0xFF01: // SB - Serial transfer data
            this.memory[0xFF01] = value;
            break;
        case 0xFF02: // SC - Serial transfer control
            this.memory[0xFF02] = value;
            
            // Check if transfer start requested
            if ((value & 0x80) !== 0) {
                this.start();
            }
            break;
    }
};

GameboyJS.Serial = Serial;
}(GameboyJS || (GameboyJS = {})));

