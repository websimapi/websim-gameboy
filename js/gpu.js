var GameboyJS;
(function (GameboyJS) {
"use strict";

// GPU (Graphics Processing Unit)
var GPU = function(screen, cpu) {
    this.screen = screen;
    this.cpu = cpu;
    this.memory = cpu.memory;
    
    this.vram = new Uint8Array(0x2000);
    this.oam = new Uint8Array(0xA0);
    
    this.mode = 0;
    this.modeClock = 0;
    this.line = 0;
    
    this.scrollX = 0;
    this.scrollY = 0;
    this.windowX = 0;
    this.windowY = 0;
    
    this.bgPalette = [0, 1, 2, 3];
    this.objPalette0 = [0, 1, 2, 3];
    this.objPalette1 = [0, 1, 2, 3];
    
    this.bgEnabled = true;
    this.windowEnabled = false;
    this.spritesEnabled = false;
    this.lcdEnabled = true;
    
    this.bgTileMap = 0x1800;
    this.bgTileSet = 0x0000;
    this.windowTileMap = 0x1800;
    
    this.spriteSize = 8;
    
    // Frame buffer (160x144 pixels, 4 colors)
    this.frameBuffer = new Uint8Array(160 * 144);
};

// GPU modes
GPU.MODES = {
    HBLANK: 0,
    VBLANK: 1,
    OAM: 2,
    VRAM: 3
};

// Update GPU state
GPU.prototype.update = function(cycles) {
    if (!this.lcdEnabled) {
        return;
    }
    
    this.modeClock += cycles;
    
    switch (this.mode) {
        case GPU.MODES.HBLANK:
            // After HBLANK, move to next line
            if (this.modeClock >= 204) {
                this.modeClock = 0;
                this.line++;
                
                if (this.line === 144) {
                    // Enter VBLANK
                    this.mode = GPU.MODES.VBLANK;
                    this.screen.render(this.frameBuffer);
                    this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.VBLANK);
                } else {
                    // Back to OAM mode for next line
                    this.mode = GPU.MODES.OAM;
                }
                
                // Check for LY=LYC coincidence
                if (this.memory[0xFF44] === this.memory[0xFF45]) {
                    this.memory[0xFF41] |= 0x04; // Set coincidence flag
                    if (this.memory[0xFF41] & 0x40) {
                        this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.LCDC);
                    }
                } else {
                    this.memory[0xFF41] &= ~0x04; // Reset coincidence flag
                }
            }
            break;
            
        case GPU.MODES.VBLANK:
            // VBLANK lasts 10 lines
            if (this.modeClock >= 456) {
                this.modeClock = 0;
                this.line++;
                
                if (this.line > 153) {
                    // End of VBLANK, back to OAM for line 0
                    this.mode = GPU.MODES.OAM;
                    this.line = 0;
                }
            }
            break;
            
        case GPU.MODES.OAM:
            // OAM mode - CPU cannot access OAM memory (80 cycles)
            if (this.modeClock >= 80) {
                this.modeClock = 0;
                this.mode = GPU.MODES.VRAM;
            }
            break;
            
        case GPU.MODES.VRAM:
            // VRAM mode - CPU cannot access OAM or VRAM (172 cycles)
            if (this.modeClock >= 172) {
                this.modeClock = 0;
                this.mode = GPU.MODES.HBLANK;
                
                // Render scan line
                this.renderScan();
                
                // Check for HBLANK interrupt
                if (this.memory[0xFF41] & 0x08) {
                    this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.LCDC);
                }
            }
            break;
    }
    
    // Update LCD status register
    this.memory[0xFF41] &= ~0x03;
    this.memory[0xFF41] |= this.mode;
    
    // Update LY register
    this.memory[0xFF44] = this.line;
};

// Render a single scan line
GPU.prototype.renderScan = function() {
    var lineOffset = this.line * 160;
    
    // Clear line
    for (var x = 0; x < 160; x++) {
        this.frameBuffer[lineOffset + x] = 0;
    }
    
    // Render background if enabled
    if (this.bgEnabled) {
        this.renderBackground(lineOffset);
    }
    
    // Render window if enabled
    if (this.windowEnabled && this.line >= this.windowY && this.windowY <= 143) {
        this.renderWindow(lineOffset);
    }
    
    // Render sprites if enabled
    if (this.spritesEnabled) {
        this.renderSprites(lineOffset);
    }
};

// Render background for current line
GPU.prototype.renderBackground = function(lineOffset) {
    var y = this.line + this.scrollY;
    var tileRow = ((y & 0xFF) >> 3) & 31;
    
    for (var x = 0; x < 160; x++) {
        var pixelX = (x + this.scrollX) & 0xFF;
        var tileCol = (pixelX >> 3) & 31;
        
        // Get tile index from background map
        var tileAddress = this.bgTileMap + (tileRow * 32) + tileCol;
        var tileIndex = this.vram[tileAddress & 0x1FFF];
        
        // Adjust for tile set
        if (this.bgTileSet === 0x0000 && tileIndex < 128) {
            tileIndex += 256;
        }
        
        // Calculate tile data address
        var tileDataAddress = this.bgTileSet + (tileIndex * 16);
        if (this.bgTileSet === 0x0800) {
            tileDataAddress = 0x1000 + ((tileIndex & 0xFF) * 16);
        }
        
        // Calculate row within tile
        var tileRow = y & 7;
        var tileData1 = this.vram[(tileDataAddress + (tileRow * 2)) & 0x1FFF];
        var tileData2 = this.vram[(tileDataAddress + (tileRow * 2) + 1) & 0x1FFF];
        
        // Calculate column within tile
        var tileCol = 7 - (pixelX & 7);
        
        // Extract color bit from tile data
        var colorBit1 = (tileData1 >> tileCol) & 1;
        var colorBit2 = (tileData2 >> tileCol) & 1;
        var colorNum = (colorBit2 << 1) | colorBit1;
        
        // Apply palette
        var color = this.bgPalette[colorNum];
        
        // Set pixel in frame buffer
        this.frameBuffer[lineOffset + x] = color;
    }
};

// Render window for current line
GPU.prototype.renderWindow = function(lineOffset) {
    var windowLine = this.line - this.windowY;
    
    // Only render if the window line is within bounds
    if (windowLine < 0) {
        return;
    }
    
    var tileRow = (windowLine >> 3) & 31;
    
    for (var x = 0; x < 160; x++) {
        // Skip pixels to the left of windowX
        var pixelX = x - this.windowX + 7;
        if (pixelX < 0) {
            continue;
        }
        
        var tileCol = (pixelX >> 3) & 31;
        
        // Get tile index from window map
        var tileAddress = this.windowTileMap + (tileRow * 32) + tileCol;
        var tileIndex = this.vram[tileAddress & 0x1FFF];
        
        // Adjust for tile set
        if (this.bgTileSet === 0x0000 && tileIndex < 128) {
            tileIndex += 256;
        }
        
        // Calculate tile data address
        var tileDataAddress = this.bgTileSet + (tileIndex * 16);
        if (this.bgTileSet === 0x0800) {
            tileDataAddress = 0x1000 + ((tileIndex & 0xFF) * 16);
        }
        
        // Calculate row within tile
        var tileLine = windowLine & 7;
        var tileData1 = this.vram[(tileDataAddress + (tileLine * 2)) & 0x1FFF];
        var tileData2 = this.vram[(tileDataAddress + (tileLine * 2) + 1) & 0x1FFF];
        
        // Calculate column within tile
        var tileCol = 7 - (pixelX & 7);
        
        // Extract color bit from tile data
        var colorBit1 = (tileData1 >> tileCol) & 1;
        var colorBit2 = (tileData2 >> tileCol) & 1;
        var colorNum = (colorBit2 << 1) | colorBit1;
        
        // Apply palette
        var color = this.bgPalette[colorNum];
        
        // Set pixel in frame buffer
        this.frameBuffer[lineOffset + x] = color;
    }
};

// Render sprites for current line
GPU.prototype.renderSprites = function(lineOffset) {
    var spritesToRender = [];
    
    // Find sprites that intersect this scanline
    for (var i = 0; i < 40; i++) {
        var spriteIndex = i * 4;
        var spriteY = this.oam[spriteIndex] - 16;
        
        if (this.line >= spriteY && this.line < (spriteY + this.spriteSize)) {
            var spriteX = this.oam[spriteIndex + 1] - 8;
            var tileIndex = this.oam[spriteIndex + 2];
            var attributes = this.oam[spriteIndex + 3];
            
            // Adjust for 8x16 sprites
            if (this.spriteSize === 16) {
                tileIndex &= 0xFE;
            }
            
            spritesToRender.push({
                x: spriteX,
                y: spriteY,
                tileIndex: tileIndex,
                attributes: attributes,
                index: i
            });
            
            // GameBoy only renders up to 10 sprites per line
            if (spritesToRender.length === 10) {
                break;
            }
        }
    }
    
    // Sort sprites by x-coordinate (for priority)
    spritesToRender.sort(function(a, b) {
        if (a.x !== b.x) {
            return a.x - b.x;
        }
        return a.index - b.index;
    });
    
    // Render sprites in order
    for (var i = 0; i < spritesToRender.length; i++) {
        var sprite = spritesToRender[i];
        
        var yFlip = (sprite.attributes & 0x40) !== 0;
        var xFlip = (sprite.attributes & 0x20) !== 0;
        var paletteNum = (sprite.attributes & 0x10) !== 0 ? 1 : 0;
        var priority = (sprite.attributes & 0x80) !== 0;
        
        // Calculate row within sprite
        var spriteLine = this.line - sprite.y;
        if (yFlip) {
            spriteLine = this.spriteSize - 1 - spriteLine;
        }
        
        // Get tile data for this line of the sprite
        var tileAddress = 0x0000 + (sprite.tileIndex * 16) + (spriteLine * 2);
        var tileData1 = this.vram[tileAddress & 0x1FFF];
        var tileData2 = this.vram[(tileAddress + 1) & 0x1FFF];
        
        // Render each pixel of the sprite
        for (var x = 0; x < 8; x++) {
            // Skip if sprite pixel is off-screen
            if (sprite.x + x < 0 || sprite.x + x >= 160) {
                continue;
            }
            
            // Calculate which bit to use based on x-flip
            var bitPos = xFlip ? x : 7 - x;
            
            // Extract color bits
            var colorBit1 = (tileData1 >> bitPos) & 1;
            var colorBit2 = (tileData2 >> bitPos) & 1;
            var colorNum = (colorBit2 << 1) | colorBit1;
            
            // Skip transparent pixels
            if (colorNum === 0) {
                continue;
            }
            
            // Check background priority
            if (priority) {
                var bgColor = this.frameBuffer[lineOffset + sprite.x + x];
                if (bgColor !== 0) {
                    continue;
                }
            }
            
            // Apply sprite palette
            var color = paletteNum ? this.objPalette1[colorNum] : this.objPalette0[colorNum];
            
            // Set pixel in frame buffer
            this.frameBuffer[lineOffset + sprite.x + x] = color;
        }
    }
};

// Handle memory access to GPU registers
GPU.prototype.readRegister = function(address) {
    switch (address) {
        case 0xFF40: // LCDC
            var lcdc = 0;
            if (this.bgEnabled) lcdc |= 0x01;
            if (this.spritesEnabled) lcdc |= 0x02;
            if (this.spriteSize === 16) lcdc |= 0x04;
            if (this.bgTileMap === 0x1C00) lcdc |= 0x08;
            if (this.bgTileSet === 0x0000) lcdc |= 0x10;
            if (this.windowEnabled) lcdc |= 0x20;
            if (this.windowTileMap === 0x1C00) lcdc |= 0x40;
            if (this.lcdEnabled) lcdc |= 0x80;
            return lcdc;
            
        case 0xFF41: // STAT
            return this.memory[0xFF41];
            
        case 0xFF42: // SCY
            return this.scrollY;
            
        case 0xFF43: // SCX
            return this.scrollX;
            
        case 0xFF44: // LY
            return this.line;
            
        case 0xFF45: // LYC
            return this.memory[0xFF45];
            
        case 0xFF47: // BGP
            return this.memory[0xFF47];
            
        case 0xFF48: // OBP0
            return this.memory[0xFF48];
            
        case 0xFF49: // OBP1
            return this.memory[0xFF49];
            
        case 0xFF4A: // WY
            return this.windowY;
            
        case 0xFF4B: // WX
            return this.windowX;
    }
    
    return 0;
};

GPU.prototype.writeRegister = function(address, value) {
    switch (address) {
        case 0xFF40: // LCDC
            this.bgEnabled = (value & 0x01) !== 0;
            this.spritesEnabled = (value & 0x02) !== 0;
            this.spriteSize = (value & 0x04) ? 16 : 8;
            this.bgTileMap = (value & 0x08) ? 0x1C00 : 0x1800;
            this.bgTileSet = (value & 0x10) ? 0x0000 : 0x0800;
            this.windowEnabled = (value & 0x20) !== 0;
            this.windowTileMap = (value & 0x40) ? 0x1C00 : 0x1800;
            
            var wasLcdEnabled = this.lcdEnabled;
            this.lcdEnabled = (value & 0x80) !== 0;
            
            if (wasLcdEnabled && !this.lcdEnabled) {
                // LCD turned off
                this.line = 0;
                this.mode = 0;
                this.modeClock = 0;
                
                // Clear the screen
                for (var i = 0; i < this.frameBuffer.length; i++) {
                    this.frameBuffer[i] = 0;
                }
                this.screen.render(this.frameBuffer);
            }
            break;
            
        case 0xFF41: // STAT
            // Only bits 3-6 are writable
            this.memory[0xFF41] = (value & 0x78) | (this.memory[0xFF41] & 0x07);
            break;
            
        case 0xFF42: // SCY
            this.scrollY = value;
            break;
            
        case 0xFF43: // SCX
            this.scrollX = value;
            break;
            
        case 0xFF45: // LYC
            this.memory[0xFF45] = value;
            break;
            
        case 0xFF47: // BGP
            this.memory[0xFF47] = value;
            this.bgPalette[0] = value & 0x03;
            this.bgPalette[1] = (value >> 2) & 0x03;
            this.bgPalette[2] = (value >> 4) & 0x03;
            this.bgPalette[3] = (value >> 6) & 0x03;
            break;
            
        case 0xFF48: // OBP0
            this.memory[0xFF48] = value;
            this.objPalette0[0] = 0; // Color 0 is always transparent
            this.objPalette0[1] = (value >> 2) & 0x03;
            this.objPalette0[2] = (value >> 4) & 0x03;
            this.objPalette0[3] = (value >> 6) & 0x03;
            break;
            
        case 0xFF49: // OBP1
            this.memory[0xFF49] = value;
            this.objPalette1[0] = 0; // Color 0 is always transparent
            this.objPalette1[1] = (value >> 2) & 0x03;
            this.objPalette1[2] = (value >> 4) & 0x03;
            this.objPalette1[3] = (value >> 6) & 0x03;
            break;
            
        case 0xFF4A: // WY
            this.windowY = value;
            break;
            
        case 0xFF4B: // WX
            this.windowX = value;
            break;
    }
};

GameboyJS.GPU = GPU;
}(GameboyJS || (GameboyJS = {})));
