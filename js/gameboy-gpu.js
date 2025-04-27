import { Util } from './gameboy-utils';

// Screen device
class Screen {
    constructor(canvas, pixelSize) {
        this.context = canvas.getContext('2d');
        this.canvas = canvas;
        this.pixelSize = pixelSize || 1;
        this.initImageData();
    }

    static colors = [
        0xFF, // White
        0xAA, // Light gray
        0x55, // Dark gray
        0x00  // Black
    ];

    static physics = {
        WIDTH: 160,
        HEIGHT: 144,
        FREQUENCY: 60
    };

    setPixelSize(pixelSize) {
        this.pixelSize = pixelSize;
        this.initImageData();
    }

    initImageData() {
        this.canvas.width = Screen.physics.WIDTH * this.pixelSize;
        this.canvas.height = Screen.physics.HEIGHT * this.pixelSize;
        this.imageData = this.context.createImageData(this.canvas.width, this.canvas.height);
    }

    clearScreen() {
        this.context.fillStyle = '#FFF';
        this.context.fillRect(0, 0, Screen.physics.WIDTH * this.pixelSize, Screen.physics.HEIGHT * this.pixelSize);
    }

    fillImageData(buffer) {
        for (let y = 0; y < Screen.physics.HEIGHT; y++) {
            for (let py = 0; py < this.pixelSize; py++) {
                const _y = y * this.pixelSize + py;
                for (let x = 0; x < Screen.physics.WIDTH; x++) {
                    for (let px = 0; px < this.pixelSize; px++) {
                        const offset = _y * this.canvas.width + (x * this.pixelSize + px);
                        const v = Screen.colors[buffer[y * Screen.physics.WIDTH + x]];
                        this.imageData.data[offset * 4] = v;
                        this.imageData.data[offset * 4 + 1] = v;
                        this.imageData.data[offset * 4 + 2] = v;
                        this.imageData.data[offset * 4 + 3] = 255;
                    }
                }
            }
        }
    }

    render(buffer) {
        this.fillImageData(buffer);
        this.context.putImageData(this.imageData, 0, 0);
    }
}

// GPU implementation
class GPU {
    constructor(screen, cpu) {
        this.cpu = cpu;
        this.screen = screen;

        this.LCDC = 0xFF40;
        this.STAT = 0xFF41;
        this.SCY = 0xFF42;
        this.SCX = 0xFF43;
        this.LY = 0xFF44;
        this.LYC = 0xFF45;
        this.BGP = 0xFF47;
        this.OBP0 = 0xFF48;
        this.OBP1 = 0xFF49;
        this.WY = 0xFF4A;
        this.WX = 0xFF4B;

        this.vram = cpu.memory.vram.bind(cpu.memory);

        this.OAM_START = 0xFE00;
        this.OAM_END = 0xFE9F;
        this.deviceram = cpu.memory.deviceram.bind(cpu.memory);
        this.oamram = cpu.memory.oamram.bind(cpu.memory);
        this.VBLANK_TIME = 70224;
        this.clock = 0;
        this.mode = 2;
        this.line = 0;

        this.buffer = new Array(Screen.physics.WIDTH * Screen.physics.HEIGHT);
        this.tileBuffer = new Array(8);
        this.bgTileCache = {};
    }

    static tilemap = {
        HEIGHT: 32,
        WIDTH: 32,
        START_0: 0x9800,
        START_1: 0x9C00,
        LENGTH: 0x0400 // 1024 bytes = 32*32
    };

    update(clockElapsed) {
        this.clock += clockElapsed;
        let vblank = false;

        switch (this.mode) {
            case 0: // HBLANK
                if (this.clock >= 204) {
                    this.clock -= 204;
                    this.line++;
                    this.updateLY();
                    if (this.line == 144) {
                        this.setMode(1);
                        vblank = true;
                        this.cpu.requestInterrupt(CPU.INTERRUPTS.VBLANK);
                        this.drawFrame();
                    } else {
                        this.setMode(2);
                    }
                }
                break;
            case 1: // VBLANK
                if (this.clock >= 456) {
                    this.clock -= 456;
                    this.line++;
                    if (this.line > 153) {
                        this.line = 0;
                        this.setMode(2);
                    }
                    this.updateLY();
                }
                break;
            case 2: // SCANLINE OAM
                if (this.clock >= 80) {
                    this.clock -= 80;
                    this.setMode(3);
                }
                break;
            case 3: // SCANLINE VRAM
                if (this.clock >= 172) {
                    this.clock -= 172;
                    this.drawScanLine(this.line);
                    this.setMode(0);
                }
                break;
        }

        return vblank;
    }

    updateLY() {
        this.deviceram(this.LY, this.line);
        let STAT = this.deviceram(this.STAT);
        if (this.deviceram(this.LY) == this.deviceram(this.LYC)) {
            this.deviceram(this.STAT, STAT | (1 << 2));
            if (STAT & (1 << 6)) {
                this.cpu.requestInterrupt(CPU.INTERRUPTS.LCDC);
            }
        } else {
            this.deviceram(this.STAT, STAT & (0xFF - (1 << 2)));
        }
    }

    setMode(mode) {
        this.mode = mode;
        let newSTAT = this.deviceram(this.STAT);
        newSTAT &= 0xFC;
        newSTAT |= mode;
        this.deviceram(this.STAT, newSTAT);

        if (mode < 3) {
            if (newSTAT & (1 << (3 + mode))) {
                this.cpu.requestInterrupt(CPU.INTERRUPTS.LCDC);
            }
        }
    }

    // Push one scanline into the main buffer
    drawScanLine(line) {
        const LCDC = this.deviceram(this.LCDC);
        const enable = Util.readBit(LCDC, 7);
        if (enable) {
            const lineBuffer = new Array(Screen.physics.WIDTH);
            this.drawBackground(LCDC, line, lineBuffer);
            this.drawSprites(LCDC, line, lineBuffer);
            // TODO draw a line for the window here too
        }
    }

    drawFrame() {
        const LCDC = this.deviceram(this.LCDC);
        const enable = Util.readBit(LCDC, 7);
        if (enable) {
            //this.drawSprites(LCDC);
            this.drawWindow(LCDC);
        }
        this.bgTileCache = {};
        this.screen.render(this.buffer);
    }

    drawBackground(LCDC, line, lineBuffer) {
        if (!Util.readBit(LCDC, 0)) {
            return;
        }

        const mapStart = Util.readBit(LCDC, 3) ? GPU.tilemap.START_1 : GPU.tilemap.START_0;

        let dataStart, signedIndex = false;
        if (Util.readBit(LCDC, 4)) {
            dataStart = 0x8000;
        } else {
            dataStart = 0x8800;
            signedIndex = true;
        }

        const bgx = this.deviceram(this.SCX);
        const bgy = this.deviceram(this.SCY);
        const tileLine = ((line + bgy) & 7);

        // browse BG tilemap for the line to render
        const tileRow = ((((bgy + line) / 8) | 0) & 0x1F);
        let firstTile = ((bgx / 8) | 0) + 32 * tileRow;
        let lastTile = firstTile + Screen.physics.WIDTH / 8 + 1;
        if ((lastTile & 0x1F) < (firstTile & 0x1F)) {
            lastTile -= 32;
        }
        let x = (firstTile & 0x1F) * 8 - bgx; // x position of the first tile's leftmost pixel
        for (let i = firstTile; i != lastTile; i++, (i & 0x1F) == 0 ? i -= 32 : null) {
            let tileIndex = this.vram(i + mapStart);

            if (signedIndex) {
                tileIndex = Util.getSignedValue(tileIndex) + 128;
            }

            // try to retrieve the tile data from the cache, or use readTileData() to read from ram
            // TODO find a better cache system now that the BG is rendered line by line
            const tileData = this.bgTileCache[tileIndex] || (this.bgTileCache[tileIndex] = this.readTileData(tileIndex, dataStart));

            this.drawTileLine(tileData, tileLine);
            this.copyBGTileLine(lineBuffer, this.tileBuffer, x);
            x += 8;
        }

        this.copyLineToBuffer(lineBuffer, line);
    }

    // Copy a tile line from a tileBuffer to a line buffer, at a given x position
    copyBGTileLine(lineBuffer, tileBuffer, x) {
        // copy tile line to buffer
        for (let k = 0; k < 8; k++, x++) {
            if (x < 0 || x >= Screen.physics.WIDTH) continue;
            lineBuffer[x] = tileBuffer[k];
        }
    }

    // Copy a scanline into the main buffer
    copyLineToBuffer(lineBuffer, line) {
        const bgPalette = GPU.getPalette(this.deviceram(this.BGP));

        for (let x = 0; x < Screen.physics.WIDTH; x++) {
            const color = lineBuffer[x];
            this.drawPixel(x, line, bgPalette[color]);
        }
    }

    // Write a line of a tile (8 pixels) into a buffer array
    drawTileLine(tileData, line, xflip, yflip) {
        xflip = xflip | 0;
        yflip = yflip | 0;
        const l = yflip ? 7 - line : line;
        let byteIndex = l * 2;
        const b1 = tileData[byteIndex++];
        const b2 = tileData[byteIndex++];

        let offset = 8;
        for (let pixel = 0; pixel < 8; pixel++) {
            offset--;
            const mask = (1 << offset);
            const colorValue = ((b1 & mask) >> offset) + ((b2 & mask) >> offset) * 2;
            const p = xflip ? offset : pixel;
            this.tileBuffer[p] = colorValue;
        }
    }

    drawSprites(LCDC, line, lineBuffer) {
        if (!Util.readBit(LCDC, 1)) {
            return;
        }
        const spriteHeight = Util.readBit(LCDC, 2) ? 16 : 8;

        let sprites = [];
        for (let i = this.OAM_START; i < this.OAM_END && sprites.length < 10; i += 4) {
            const y = this.oamram(i);
            const x = this.oamram(i + 1);
            const index = this.oamram(i + 2);
            const flags = this.oamram(i + 3);

            if (y - 16 > line || y - 16 < line - spriteHeight) {
                continue;
            }
            sprites.push({ x: x, y: y, index: index, flags: flags })
        }

        if (sprites.length == 0) return;

        // cache object to store read tiles from this frame
        let cacheTile = {};
        let spriteLineBuffer = new Array(Screen.physics.WIDTH);

        for (let i = 0; i < sprites.length; i++) {
            const sprite = sprites[i];
            const tileLine = line - sprite.y + 16;
            const paletteNumber = Util.readBit(sprite.flags, 4);
            const xflip = Util.readBit(sprite.flags, 5);
            const yflip = Util.readBit(sprite.flags, 6);
            const tileData = cacheTile[sprite.index] || (cacheTile[sprite.index] = this.readTileData(sprite.index, 0x8000, spriteHeight * 2));
            this.drawTileLine(tileData, tileLine, xflip, yflip);
            this.copySpriteTileLine(spriteLineBuffer, this.tileBuffer, sprite.x - 8, paletteNumber);
        }

        this.copySpriteLineToBuffer(spriteLineBuffer, line);
    }

    // Copy a tile line from a tileBuffer to a line buffer, at a given x position
    copySpriteTileLine(lineBuffer, tileBuffer, x, palette) {
        // copy tile line to buffer
        for (let k = 0; k < 8; k++, x++) {
            if (x < 0 || x >= Screen.physics.WIDTH || tileBuffer[k] == 0) continue;
            lineBuffer[x] = { color: tileBuffer[k], palette: palette };
        }
    }

    // Copy a sprite scanline into the main buffer
    copySpriteLineToBuffer(spriteLineBuffer, line) {
        const spritePalettes = {};
        spritePalettes[0] = GPU.getPalette(this.deviceram(this.OBP0));
        spritePalettes[1] = GPU.getPalette(this.deviceram(this.OBP1));

        for (let x = 0; x < Screen.physics.WIDTH; x++) {
            if (!spriteLineBuffer[x]) continue;
            const color = spriteLineBuffer[x].color;
            if (color === 0) continue;
            const paletteNumber = spriteLineBuffer[x].palette;
            this.drawPixel(x, line, spritePalettes[paletteNumber][color]);
        }
    }

    drawTile(tileData, x, y, buffer, bufferWidth, xflip, yflip, spriteMode) {
        xflip = xflip | 0;
        yflip = yflip | 0;
        spriteMode = spriteMode | 0;
        let byteIndex = 0;
        for (let line = 0; line < 8; line++) {
            const l = yflip ? 7 - line : line;
            const b1 = tileData[byteIndex++];
            const b2 = tileData[byteIndex++];

            for (let pixel = 0; pixel < 8; pixel++) {
                const mask = (1 << (7 - pixel));
                const colorValue = ((b1 & mask) >> (7 - pixel)) + ((b2 & mask) >> (7 - pixel)) * 2;
                if (spriteMode && colorValue == 0) continue;
                const p = xflip ? 7 - pixel : pixel;
                const bufferIndex = (x + p) + (y + l) * bufferWidth;
                buffer[bufferIndex] = colorValue;
            }
        }
    }

    // get an array of tile bytes data (16 entries for 8*8px)
    readTileData(tileIndex, dataStart, tileSize) {
        tileSize = tileSize || 0x10; // 16 bytes / tile by default (8*8 px)
        const tileData = [];

        const tileAddressStart = dataStart + (tileIndex * 0x10);
        for (let i = tileAddressStart; i < tileAddressStart + tileSize; i++) {
            tileData.push(this.vram(i));
        }

        return tileData;
    }

    drawWindow(LCDC) {
        if (!Util.readBit(LCDC, 5)) {
            return;
        }

        const buffer = new Array(256 * 256);
        const mapStart = Util.readBit(LCDC, 6) ? GPU.tilemap.START_1 : GPU.tilemap.START_0;

        let dataStart, signedIndex = false;
        if (Util.readBit(LCDC, 4)) {
            dataStart = 0x8000;
        } else {
            dataStart = 0x8800;
            signedIndex = true;
        }

        // browse Window tilemap
        for (let i = 0; i < GPU.tilemap.LENGTH; i++) {
            let tileIndex = this.vram(i + mapStart);

            if (signedIndex) {
                tileIndex = Util.getSignedValue(tileIndex) + 128;
            }

            const tileData = this.readTileData(tileIndex, dataStart);
            const x = i % GPU.tilemap.WIDTH;
            const y = (i / GPU.tilemap.WIDTH) | 0;
            this.drawTile(tileData, x * 8, y * 8, buffer, 256);
        }

        const wx = this.deviceram(this.WX) - 7;
        const wy = this.deviceram(this.WY);
        for (let x = Math.max(0, -wx); x < Math.min(Screen.physics.WIDTH, Screen.physics.WIDTH - wx); x++) {
            for (let y = Math.max(0, -wy); y < Math.min(Screen.physics.HEIGHT, Screen.physics.HEIGHT - wy); y++) {
                const color = buffer[(x & 255) + (y & 255) * 256];
                this.drawPixel(x + wx, y + wy, color);
            }
        }
    }

    drawPixel(x, y, color) {
        this.buffer[y * 160 + x] = color;
    }

    getPixel(x, y) {
        return this.buffer[y * 160 + x];
    }

    // Get the palette mapping from a given palette byte as stored in memory
    // A palette will map a tile color to a final palette color index
    // used with Screen.colors to get a shade of grey
    static getPalette(paletteByte) {
        const palette = [];
        for (let i = 0; i < 8; i += 2) {
            const shade = (paletteByte & (3 << i)) >> i;
            palette.push(shade);
        }
        return palette;
    }
}

// Define CPU.INTERRUPTS here temporarily since we need it in the GPU class
// This will be properly defined in the CPU module
const CPU = {
    INTERRUPTS: {
        VBLANK: 0,
        LCDC: 1,
        TIMER: 2,
        SERIAL: 3,
        HILO: 4
    }
};

export { Screen, GPU };