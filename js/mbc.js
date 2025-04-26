var GameboyJS;
(function (GameboyJS) {
"use strict";

// Memory Bank Controllers (MBC) abstraction
var MBC = {
    // Factory method to get the appropriate MBC instance based on cart type
    getMbcInstance: function(memory, cartType) {
        switch (cartType) {
            case 0x00: // ROM only
                return new NoMBC(memory);
            case 0x01: // MBC1
            case 0x02: // MBC1+RAM
            case 0x03: // MBC1+RAM+BATTERY
                return new MBC1(memory, cartType);
            case 0x05: // MBC2
            case 0x06: // MBC2+BATTERY
                return new MBC2(memory, cartType);
            case 0x0F: // MBC3+TIMER+BATTERY
            case 0x10: // MBC3+TIMER+RAM+BATTERY
            case 0x11: // MBC3
            case 0x12: // MBC3+RAM
            case 0x13: // MBC3+RAM+BATTERY
                return new MBC3(memory, cartType);
            case 0x19: // MBC5
            case 0x1A: // MBC5+RAM
            case 0x1B: // MBC5+RAM+BATTERY
            case 0x1C: // MBC5+RUMBLE
            case 0x1D: // MBC5+RUMBLE+RAM
            case 0x1E: // MBC5+RUMBLE+RAM+BATTERY
                return new MBC5(memory, cartType);
            default:
                throw new GameboyJS.UnimplementedException('Cartridge type ' + cartType + ' not supported');
        }
    }
};

// Base MBC class
var BaseMBC = function(memory, type) {
    this.memory = memory;
    this.romBanks = 0;
    this.ramBanks = 0;
    this.ramSize = 0;
    this.hasBattery = false;
    this.hasRam = false;
    this.ramEnabled = false;
    this.extRam = null;
    this.type = type;
    
    // Determine cartridge characteristics
    this.romBanks = this.getRomBanksForType();
    this.ramBanks = this.getRamBanksForType();
    this.hasRam = (this.ramBanks > 0);
    this.hasBattery = this.hasBatteryForType();
};

BaseMBC.prototype.getRomBanksForType = function() {
    var romSizeCode = this.memory.rom[0x148];
    switch (romSizeCode) {
        case 0: return 2;
        case 1: return 4;
        case 2: return 8;
        case 3: return 16;
        case 4: return 32;
        case 5: return 64;
        case 6: return 128;
        case 7: return 256;
        case 8: return 512;
        default: return 2;
    }
};

BaseMBC.prototype.getRamBanksForType = function() {
    var ramSizeCode = this.memory.rom[0x149];
    switch (ramSizeCode) {
        case 0: return 0;
        case 1: return 1;
        case 2: return 1;
        case 3: return 4;
        case 4: return 16;
        case 5: return 8;
        default: return 0;
    }
};

BaseMBC.prototype.hasBatteryForType = function() {
    return [0x03, 0x06, 0x09, 0x0D, 0x0F, 0x10, 0x13, 0x1B, 0x1E].indexOf(this.type) !== -1;
};

BaseMBC.prototype.manageWrite = function(address, value) {
    // To be implemented by subclasses
};

BaseMBC.prototype.readRam = function(address) {
    // By default, if RAM is disabled return 0xFF
    if (!this.ramEnabled) return 0xFF;
    
    // Default implementation - subclasses should override
    return this.extRam ? this.extRam.read(address) : 0xFF;
};

BaseMBC.prototype.writeRam = function(address, value) {
    // Only write if RAM is enabled
    if (this.ramEnabled && this.extRam) {
        this.extRam.write(address, value);
    }
};

BaseMBC.prototype.loadRam = function(gameName, ramSize) {
    if (this.hasRam) {
        this.extRam = new GameboyJS.ExtRam(ramSize, this.ramBanks, gameName, this.hasBattery);
    }
};

// No MBC (ROM only)
var NoMBC = function(memory) {
    BaseMBC.call(this, memory, 0);
    this.ramEnabled = this.hasRam;
};

NoMBC.prototype = Object.create(BaseMBC.prototype);
NoMBC.prototype.constructor = NoMBC;

NoMBC.prototype.manageWrite = function(address, value) {
    // ROM-only carts only allow writing to RAM area
    if (address >= 0xA000 && address < 0xC000) {
        this.writeRam(address, value);
    }
};

// MBC1 implementation
var MBC1 = function(memory, type) {
    BaseMBC.call(this, memory, type);
    this.romBank = 1;
    this.ramBank = 0;
    this.mode = 0;
};

MBC1.prototype = Object.create(BaseMBC.prototype);
MBC1.prototype.constructor = MBC1;

MBC1.prototype.manageWrite = function(address, value) {
    if (address < 0x2000) {
        // RAM Enable
        this.ramEnabled = ((value & 0x0F) === 0x0A) && this.hasRam;
    } else if (address < 0x4000) {
        // ROM Bank Number (5 lower bits)
        var bank = value & 0x1F;
        if (bank === 0) bank = 1;
        this.romBank = (this.romBank & 0x60) | bank;
        this.updateRomBank();
    } else if (address < 0x6000) {
        // RAM Bank Number or Upper Bits of ROM Bank Number
        value &= 0x03;
        if (this.mode === 0) {
            // ROM Banking mode
            this.romBank = (this.romBank & 0x1F) | (value << 5);
            this.updateRomBank();
        } else {
            // RAM Banking mode
            this.ramBank = value;
        }
    } else if (address < 0x8000) {
        // Banking Mode Select
        this.mode = value & 0x01;
        if (this.mode === 0) {
            this.ramBank = 0;
        }
    } else if (address >= 0xA000 && address < 0xC000) {
        // External RAM
        this.writeRam(address, value);
    }
};

MBC1.prototype.readRam = function(address) {
    if (!this.ramEnabled) return 0xFF;
    
    var ramAddress = address - 0xA000;
    if (this.mode === 1) {
        ramAddress += this.ramBank * 0x2000;
    }
    
    return this.extRam ? this.extRam.read(ramAddress) : 0xFF;
};

MBC1.prototype.updateRomBank = function() {
    // Ensure bank number is within range
    this.romBank = this.romBank % this.romBanks;
    if (this.romBank === 0) this.romBank = 1;
    
    // Load the selected ROM bank
    this.memory.loadRomBank(this.romBank);
};

// MBC2 implementation
var MBC2 = function(memory, type) {
    BaseMBC.call(this, memory, type);
    this.romBank = 1;
    this.ramSize = 512; // 512 x 4 bits
};

MBC2.prototype = Object.create(BaseMBC.prototype);
MBC2.prototype.constructor = MBC2;

MBC2.prototype.manageWrite = function(address, value) {
    if (address < 0x2000) {
        // RAM Enable (must have bit 8 of address == 0)
        if ((address & 0x0100) === 0) {
            this.ramEnabled = ((value & 0x0F) === 0x0A);
        }
    } else if (address < 0x4000) {
        // ROM Bank Number (must have bit 8 of address == 1)
        if ((address & 0x0100) !== 0) {
            var bank = value & 0x0F;
            if (bank === 0) bank = 1;
            this.romBank = bank;
            this.memory.loadRomBank(this.romBank);
        }
    } else if (address >= 0xA000 && address < 0xA200) {
        // Built-in RAM (512 x 4 bits)
        if (this.ramEnabled && this.extRam) {
            this.extRam.write(address - 0xA000, value & 0x0F);
        }
    }
};

MBC2.prototype.readRam = function(address) {
    if (!this.ramEnabled) return 0xFF;
    
    if (address < 0xA200) {
        return this.extRam ? this.extRam.read(address - 0xA000) : 0xFF;
    }
    
    return 0xFF;
};

// MBC3 implementation
var MBC3 = function(memory, type) {
    BaseMBC.call(this, memory, type);
    this.romBank = 1;
    this.ramBank = 0;
    this.hasTimer = (type === 0x0F || type === 0x10);
    this.rtcRegisters = [0, 0, 0, 0, 0]; // S, M, H, DL, DH
    this.latchClock = 0;
};

MBC3.prototype = Object.create(BaseMBC.prototype);
MBC3.prototype.constructor = MBC3;

MBC3.prototype.manageWrite = function(address, value) {
    if (address < 0x2000) {
        // RAM and Timer Enable
        this.ramEnabled = ((value & 0x0F) === 0x0A);
    } else if (address < 0x4000) {
        // ROM Bank Number
        var bank = value & 0x7F;
        if (bank === 0) bank = 1;
        this.romBank = bank % this.romBanks;
        this.memory.loadRomBank(this.romBank);
    } else if (address < 0x6000) {
        // RAM Bank Number or RTC Register Select
        if (value <= 0x03) {
            // RAM Bank
            this.ramBank = value;
        } else if (value >= 0x08 && value <= 0x0C && this.hasTimer) {
            // RTC Register
            this.ramBank = value;
        }
    } else if (address < 0x8000) {
        // Latch Clock Data
        if (this.hasTimer) {
            if (this.latchClock === 0 && value === 1) {
                // TODO: Latch RTC data
            }
            this.latchClock = value;
        }
    } else if (address >= 0xA000 && address < 0xC000) {
        // RAM or RTC register write
        if (this.ramBank <= 0x03) {
            // RAM write
            this.writeRam(address, value);
        } else if (this.hasTimer && this.ramBank >= 0x08 && this.ramBank <= 0x0C) {
            // RTC write
            this.rtcRegisters[this.ramBank - 0x08] = value;
        }
    }
};

MBC3.prototype.readRam = function(address) {
    if (!this.ramEnabled) return 0xFF;
    
    if (this.ramBank <= 0x03) {
        // RAM read
        var ramAddress = address - 0xA000 + (this.ramBank * 0x2000);
        return this.extRam ? this.extRam.read(ramAddress) : 0xFF;
    } else if (this.hasTimer && this.ramBank >= 0x08 && this.ramBank <= 0x0C) {
        // RTC read
        return this.rtcRegisters[this.ramBank - 0x08];
    }
    
    return 0xFF;
};

// MBC5 implementation
var MBC5 = function(memory, type) {
    BaseMBC.call(this, memory, type);
    this.romBank = 1;
    this.ramBank = 0;
    this.hasRumble = (type >= 0x1C && type <= 0x1E);
};

MBC5.prototype = Object.create(BaseMBC.prototype);
MBC5.prototype.constructor = MBC5;

MBC5.prototype.manageWrite = function(address, value) {
    if (address < 0x2000) {
        // RAM Enable
        this.ramEnabled = ((value & 0x0F) === 0x0A) && this.hasRam;
    } else if (address < 0x3000) {
        // Lower 8 bits of ROM Bank Number
        this.romBank = (this.romBank & 0x100) | value;
        this.updateRomBank();
    } else if (address < 0x4000) {
        // 9th bit of ROM Bank Number
        this.romBank = ((value & 0x01) << 8) | (this.romBank & 0xFF);
        this.updateRomBank();
    } else if (address < 0x6000) {
        // RAM Bank Number
        if (this.hasRumble) {
            // Ignore rumble bit
            value &= 0x07;
        } else {
            value &= 0x0F;
        }
        this.ramBank = value;
    } else if (address >= 0xA000 && address < 0xC000) {
        // External RAM
        this.writeRam(address, value);
    }
};

MBC5.prototype.readRam = function(address) {
    if (!this.ramEnabled) return 0xFF;
    
    var ramAddress = address - 0xA000 + (this.ramBank * 0x2000);
    return this.extRam ? this.extRam.read(ramAddress) : 0xFF;
};

MBC5.prototype.updateRomBank = function() {
    // Ensure bank number is within range
    this.romBank = this.romBank % this.romBanks;
    if (this.romBank === 0) this.romBank = 1;
    
    // Load the selected ROM bank
    this.memory.loadRomBank(this.romBank);
};

GameboyJS.MBC = MBC;
}(GameboyJS || (GameboyJS = {})));
