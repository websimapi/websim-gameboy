var GameboyJS = GameboyJS || {};

// Utility functions
GameboyJS.Util = {
    // Add to the first argument the properties of all other arguments
    extend: function(target /*, source1, source2, etc. */) {
        var sources = Array.prototype.slice.call(arguments);
        for (var i in sources) {
            var source = sources[i];
            for (var name in source) {
                target[name] = source[name];
            }
        }

        return target;
    },
    testFlag: function(p, cc) {
        var test=1;
        var mask=0x10;
        if (cc=='NZ'||cc=='NC') test=0;
        if (cc=='NZ'||cc=='Z')  mask=0x80;
        return (test && p.r.F&mask) || (!test && !(p.r.F&mask));
    },
    getRegAddr: function(p, r1, r2) {return this.makeword(p.r[r1], p.r[r2]);},

    // make a 16 bits word from 2 bytes
    makeword: function(b1, b2) {return (b1 << 8) + b2;},

    // return the integer signed value of a given byte
    getSignedValue: function(v) {return v & 0x80 ? v-256 : v;},

    // extract a bit from a byte
    readBit: function(byte, index) {
        return (byte >> index) & 1;
    }
};

// Exceptions
function UnimplementedException(message, fatal) {
    this.message = message;
    this.name = "UnimplementedException";
    if (fatal === undefined) {
        fatal = true;
    }
    this.fatal = fatal;
}
GameboyJS.UnimplementedException = UnimplementedException;

// Screen device
GameboyJS.Screen = function(canvas, pixelSize) {
    this.context = canvas.getContext('2d');
    this.canvas = canvas;
    this.pixelSize = pixelSize || 1;
    this.physics = GameboyJS.Screen.physics; 
    this.initImageData();
};

GameboyJS.Screen.colors = [
    0xFF,
    0xAA,
    0x55,
    0x00
];

GameboyJS.Screen.physics = {
    WIDTH    : 160,
    HEIGHT   : 144,
    FREQUENCY: 60
};

GameboyJS.Screen.prototype.setPixelSize = function(pixelSize) {
    this.pixelSize = pixelSize;
    this.initImageData();
};

GameboyJS.Screen.prototype.initImageData = function() {
    this.canvas.width = GameboyJS.Screen.physics.WIDTH * this.pixelSize;
    this.canvas.height = GameboyJS.Screen.physics.HEIGHT * this.pixelSize;
    this.imageData = this.context.createImageData(this.canvas.width, this.canvas.height);
};

GameboyJS.Screen.prototype.clearScreen = function() {
    this.context.fillStyle = '#FFF';
    this.context.fillRect(0, 0, GameboyJS.Screen.physics.WIDTH * this.pixelSize, GameboyJS.Screen.physics.HEIGHT * this.pixelSize);
};

GameboyJS.Screen.prototype.fillImageData = function(buffer) {
    for (var y = 0; y < GameboyJS.Screen.physics.HEIGHT; y++) {
        for (var py = 0; py < this.pixelSize; py++) {
            var _y = y * this.pixelSize + py;
            for (var x = 0; x < GameboyJS.Screen.physics.WIDTH; x++) {
                for (var px = 0; px < this.pixelSize; px++) {
                    var offset = _y * this.canvas.width + (x * this.pixelSize + px);
                    var v = GameboyJS.Screen.colors[buffer[y * GameboyJS.Screen.physics.WIDTH + x]];
                    this.imageData.data[offset * 4] = v;
                    this.imageData.data[offset * 4 + 1] = v;
                    this.imageData.data[offset * 4 + 2] = v;
                    this.imageData.data[offset * 4 + 3] = 255;
                }
            }
        }
    }
};

GameboyJS.Screen.prototype.render = function(buffer) {
    this.fillImageData(buffer);
    this.context.putImageData(this.imageData, 0, 0);
};

// Memory unit
GameboyJS.Memory = function(cpu) {
    this.MEM_SIZE = 65536; 

    this.MBCtype = 0;
    this.banksize = 0x4000;
    this.rom = null;
    this.mbc = null;
    this.cpu = cpu;
};

GameboyJS.Memory.addresses = {
    VRAM_START : 0x8000,
    VRAM_END   : 0x9FFF,

    EXTRAM_START : 0xA000,
    EXTRAM_END   : 0xBFFF,

    OAM_START : 0xFE00,
    OAM_END   : 0xFE9F,

    DEVICE_START: 0xFF00,
    DEVICE_END:   0xFF7F
};

// Memory can be accessed as an Array
GameboyJS.Memory.prototype = new Array();

GameboyJS.Memory.prototype.reset = function() {
    this.length = this.MEM_SIZE;
    for (var i = GameboyJS.Memory.addresses.VRAM_START; i <= GameboyJS.Memory.addresses.VRAM_END; i++) {
        this[i] = 0;
    }
    for (var i = GameboyJS.Memory.addresses.DEVICE_START; i <= GameboyJS.Memory.addresses.DEVICE_END; i++) {
        this[i] = 0;
    }
    this[0xFFFF] = 0;
};

GameboyJS.Memory.prototype.setRomData = function(data) {
    this.rom = data;
    this.loadRomBank(0);
    this.mbc = GameboyJS.MBC.getMbcInstance(this, this[0x147]);
    this.loadRomBank(1);
    this.mbc.loadRam(this.cpu.getGameName(), this.cpu.getRamSize());
};

GameboyJS.Memory.prototype.loadRomBank = function(index) {
    var start = index ? 0x4000 : 0x0;
    var romStart = index * 0x4000;
    for (var i = 0; i < this.banksize; i++) {
        this[i + start] = this.rom[romStart + i];
    }
};

// Video ram accessor
GameboyJS.Memory.prototype.vram = function(address) {
    if (address < GameboyJS.Memory.addresses.VRAM_START || address > GameboyJS.Memory.addresses.VRAM_END) {
        throw 'VRAM access in out of bounds address ' + address;
    }

    return this[address];
};

// OAM ram accessor
GameboyJS.Memory.prototype.oamram = function(address) {
    if (address < GameboyJS.Memory.addresses.OAM_START || address > GameboyJS.Memory.addresses.OAM_END) {
        throw 'OAMRAM access in out of bounds address ' + address;
    }

    return this[address];
};

// Device ram accessor
GameboyJS.Memory.prototype.deviceram = function(address, value) {
    if (address < GameboyJS.Memory.addresses.DEVICE_START || address > GameboyJS.Memory.addresses.DEVICE_END) {
        throw 'Device RAM access in out of bounds address ' + address;
    }
    if (typeof value === "undefined") {
        return this[address];
    } else {
        this[address] = value;
    }
};

// Memory read proxy function
// Used to centralize memory read access
GameboyJS.Memory.prototype.rb = function (addr) {
    if (addr >= 0xFF10 && addr < 0xFF40) {
        var mask = apuMask[addr - 0xFF10];
        return this[addr] | mask;
    }
    if ((addr >= 0xA000 && addr < 0xC000)) {
        return this.mbc.readRam(addr);
    }
    return this[addr];
};

// Bitmasks for audio addresses reads
var apuMask = [
0x80,0x3F,0x00,0xFF,0xBF, // NR10-NR15
0xFF,0x3F,0x00,0xFF,0xBF, // NR20-NR25
0x7F,0xFF,0x9F,0xFF,0xBF, // NR30-NR35
0xFF,0xFF,0x00,0x00,0xBF, // NR40-NR45
0x00,0x00,0x70,           // NR50-NR52
0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,0xFF,
0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00, // Wave RAM
0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00
];

// Memory write proxy function
// Used to centralize memory writes and delegate specific behaviour
// to the correct units
GameboyJS.Memory.prototype.wb = function(addr, value) {
    if (addr < 0x8000 || (addr >= 0xA000 && addr < 0xC000)) { // MBC
        this.mbc.manageWrite(addr, value);
    } else if (addr >= 0xFF10 && addr <= 0xFF3F) { // sound registers
        this.cpu.apu.manageWrite(addr, value);
    } else if (addr == 0xFF00) { // input register
        this[addr] = ((this[addr] & 0x0F) | (value & 0x30));
    } else {
        this[addr] = value;
        if ((addr & 0xFF00) == 0xFF00) {
            if (addr == 0xFF02) {
                if (value & 0x80) {
                    this.cpu.enableSerialTransfer();
                }
            }
            if (addr == 0xFF04) {
                this.cpu.resetDivTimer();
            }
            if (addr == 0xFF46) { // OAM DMA transfer
                this.dmaTransfer(value);
            }
        }
    }
}

// Start a DMA transfer (OAM data from cartrige to RAM)
GameboyJS.Memory.prototype.dmaTransfer = function(startAddressPrefix) {
    var startAddress = (startAddressPrefix << 8);
    for (var i = 0; i < 0xA0; i++) {
        this[GameboyJS.Memory.addresses.OAM_START + i] = this[startAddress + i];
    }
};

// RomFileReader implementation
GameboyJS.RomFileReader = function(el) {
    this.domElement = el || document.getElementById('file');
    if (!this.domElement) {
        throw 'The RomFileReader needs a valid input element.';
    }

    var self = this;
    this.domElement.addEventListener('change', function(e){
        self.loadFromFile(e.target.files[0]);
    });
};

// The callback argument will be called when a file is successfully
// read, with the data as argument (Uint8Array)
GameboyJS.RomFileReader.prototype.setCallback = function(onLoadCallback) {
    this.callback = onLoadCallback;
};

// Automatically called when the DOM input is provided with a file
GameboyJS.RomFileReader.prototype.loadFromFile = function(file) {
    if (file === undefined) {
        return;
    }
    var fr = new FileReader();
    var cb = this.callback;

    fr.onload = function() {
        cb && cb(new Uint8Array(fr.result));
    };
    fr.onerror = function(e) {
        console.log('Error reading the file', e.target.error.code)
    };
    fr.readAsArrayBuffer(file);
};

// RomDropFileReader implementation
GameboyJS.RomDropFileReader = function(el) {
    this.dropElement = el;
    if (!this.dropElement) {
        throw 'The RomDropFileReader needs a drop zone.';
    }

    var self = this;
    this.dropElement.addEventListener('dragenter', function(e) {
        e.preventDefault();
        e.target.classList.add('drag-active');
    });
    this.dropElement.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.target.classList.remove('drag-active');
    });
    this.dropElement.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    this.dropElement.addEventListener('drop', function (e) {
        e.target.classList.remove('drag-active');
        if (e.dataTransfer.files.length == 0) {
            return;
        }
        e.preventDefault();
        self.loadFromFile(e.dataTransfer.files[0]);
    });
};

// The callback argument will be called when a file is successfully
// read, with the data as argument (Uint8Array)
GameboyJS.RomDropFileReader.prototype.setCallback = function(onLoadCallback) {
    this.callback = onLoadCallback;
};

// The file loading logic is the same as the regular file reader
GameboyJS.RomDropFileReader.prototype.loadFromFile = function(file) {
    if (file === undefined) {
        return;
    }
    var fr = new FileReader();
    var cb = this.callback;

    fr.onload = function() {
        cb && cb(new Uint8Array(fr.result));
    };
    fr.onerror = function(e) {
        console.log('Error reading the file', e.target.error.code)
    };
    fr.readAsArrayBuffer(file);
};

// Rom implementation
GameboyJS.Rom = function(gameboy, romReader) {
    this.gameboy = gameboy;
    if (romReader) {
        this.addReader(romReader);
    }
};

GameboyJS.Rom.prototype.addReader = function(romReader) {
    var self = this;
    romReader.setCallback(function(data) {
        if (!validate(data)) {
            self.gameboy.error('The file is not a valid GameBoy ROM.');
            return;
        }
        self.data = data;
        self.gameboy.startRom(self);
    });
};

// Validate the checksum of the cartridge header
function validate(data) {
    var hash = 0;
    for (var i = 0x134; i <= 0x14C; i++) {
        hash = hash - data[i] - 1;
    }
    return (hash & 0xFF) == data[0x14D];
};

// MBC implementation
GameboyJS.MBC = {};

// Create an MBC instance depending on the type specified in the cartridge
GameboyJS.MBC.getMbcInstance = function(memory, type) {
    var instance;
    switch (type) {
        case 0x00:
            instance = new MBC0(memory);
            break;
        case 0x01: case 0x02: case 0x03:
            instance = new MBC1(memory);
            break;
        case 0x0F: case 0x10: case 0x11: case 0x12: case 0x13:
            instance = new MBC3(memory);
            break;
        case 0x19: case 0x1A: case 0x1B: case 0x1C: case 0x1D: case 0x1E:
            instance = new MBC5(memory);
            break;
        default:
            throw new GameboyJS.UnimplementedException('MBC type not supported');
    }

    return instance;
};

// ExtRam implementation
var ExtRam = function() {
    this.extRam = null;
    this.ramSize = 0;
    this.ramBank = 0;
};

ExtRam.prototype.loadRam = function(game, size) {
    this.gameName = game;

    this.ramSize = size;
    this.ramBanksize = this.ramSize >= 0x2000 ? 8192 : 2048;

    var key = this.getStorageKey();
    var data = localStorage.getItem(key);
    if (data == null) {
        this.extRam = Array.apply(null, new Array(this.ramSize)).map(function(){return 0;});
    } else {
        this.extRam = JSON.parse(data);
        if (this.extRam.length != size) {
            console.error('Found RAM data but not matching expected size.');
        }
    }
};

ExtRam.prototype.setRamBank = function(bank) {
    this.ramBank = bank;
};

ExtRam.prototype.manageWrite = function(offset, value) {
    this.extRam[this.ramBank * 8192 + offset] = value;
};

ExtRam.prototype.manageRead = function(offset) {
    return this.extRam[this.ramBank * 8192 + offset];
};

ExtRam.prototype.getStorageKey = function() {
    return this.gameName + '_EXTRAM';
};

// Actually save the RAM in the physical storage (localStorage)
ExtRam.prototype.saveRamData = function() {
    localStorage.setItem(this.getStorageKey(), JSON.stringify(this.extRam));
};

GameboyJS.ExtRam = ExtRam;

// MBC implementations
var MBC1 = function(memory) {
    this.memory = memory;
    this.romBankNumber = 1;
    this.mode = 0; // mode 0 = ROM, mode 1 = RAM
    this.ramEnabled = true;
    this.extRam = new GameboyJS.ExtRam();
};

MBC1.prototype.loadRam = function(game, size) {
    this.extRam.loadRam(game, size);
};

MBC1.prototype.manageWrite = function(addr, value) {
    switch (addr & 0xF000) {
        case 0x0000: case 0x1000: // enable RAM
            this.ramEnabled = (value & 0x0A) ? true : false;
            if (this.ramEnabled) {
                this.extRam.saveRamData();
            }
            break;
        case 0x2000: case 0x3000: // ROM bank number lower 5 bits
            value &= 0x1F;
            if (value == 0) value = 1;
            var mask = this.mode ? 0 : 0xE0;
            this.romBankNumber = (this.romBankNumber & mask) +value;
            this.memory.loadRomBank(this.romBankNumber);
            break;
        case 0x4000: case 0x5000: // RAM bank or high bits ROM
            value &= 0x03;
            if (this.mode == 0) { // ROM upper bits
                this.romBankNumber = (this.romBankNumber&0x1F) | (value << 5);
                this.memory.loadRomBank(this.romBankNumber);
            } else { // RAM bank
                this.extRam.setRamBank(value);
            }
            break;
        case 0x6000: case 0x7000: // ROM / RAM mode
            this.mode = value & 1;
            break;
        case 0xA000: case 0xB000:
            this.extRam.manageWrite(addr - 0xA000, value);
            break;
    }
};

MBC1.prototype.readRam = function(addr) {
    return this.extRam.manageRead(addr - 0xA000);
};

var MBC3 = function(memory) {
    this.memory = memory;
    this.romBankNumber = 1;
    this.ramEnabled = true;
    this.extRam = new GameboyJS.ExtRam();
};

MBC3.prototype.loadRam = function(game, size) {
    this.extRam.loadRam(game, size);
};

MBC3.prototype.manageWrite = function(addr, value) {
    switch (addr & 0xF000) {
        case 0x0000: case 0x1000: // enable RAM
            this.ramEnabled = (value & 0x0A) ? true : false;
            if (this.ramEnabled) {
                this.extRam.saveRamData();
            }
            break;
        case 0x2000: case 0x3000: // ROM bank number
            value &= 0x7F;
            if (value == 0) value = 1;
            this.romBankNumber = value;
            this.memory.loadRomBank(this.romBankNumber);
            break;
        case 0x4000: case 0x5000: // RAM bank
            this.extRam.setRamBank(value);
            break;
        case 0x6000: case 0x7000: // Latch clock data
            throw new GameboyJS.UnimplementedException('cartridge clock not supported', false);
            break;
        case 0xA000: case 0xB000:
            this.extRam.manageWrite(addr - 0xA000, value);
            break;
    }
};

MBC3.prototype.readRam = function(addr) {
    return this.extRam.manageRead(addr - 0xA000);
};

// declare MBC5 for compatibility with most cartriges
// does not support rumble feature
var MBC5 = MBC3;

// MBC0 exists for consistency and manages the no-MBC cartriges
var MBC0 = function(memory) {this.memory = memory;};

MBC0.prototype.manageWrite = function(addr, value) {
    this.memory.loadRomBank(value);
};

MBC0.prototype.readRam = function(addr) {return 0;};

MBC0.prototype.loadRam = function() {};

// Keyboard implementation
GameboyJS.Keyboard = function() {};

// Initialize the keyboard listeners and set up the callbacks
// for button press / release
GameboyJS.Keyboard.prototype.init = function(onPress, onRelease) {
    this.onPress = onPress;
    this.onRelease = onRelease;

    var self = this;
    document.addEventListener('keydown', function(e) {
        self.managePress(e.keyCode);
    });
    document.addEventListener('keyup', function(e) {
        self.manageRelease(e.keyCode);
    });
}

GameboyJS.Keyboard.prototype.managePress = function(keycode) {
    var key = this.translateKey(keycode);
    if (key) {
        this.onPress(key);
    }
};

GameboyJS.Keyboard.prototype.manageRelease = function(keycode) {
    var key = this.translateKey(keycode);
    if (key) {
        this.onRelease(key);
    }
};

// Transform a keyboard keycode into a key of the Input.keys object
GameboyJS.Keyboard.prototype.translateKey = function(keycode) {
    var key = null;
    switch (keycode) {
        case 71: // G
            key = 'A';
            break;
        case 66: // B
            key = 'B';
            break;
        case 72: // H
            key = 'START';
            break;
        case 78: // N
            key = 'SELECT';
            break;
        case 37: // left
            key = 'LEFT';
            break;
        case 38: // up
            key = 'UP';
            break;
        case 39: // right
            key = 'RIGHT';
            break;
        case 40: // down
            key = 'DOWN';
            break;
    }

    return key;
};

// Input implementation
GameboyJS.Input = function(cpu, pad) {
    this.cpu = cpu;
    this.memory = cpu.memory;
    this.P1 = 0xFF00;
    this.state = 0;

    pad.init(this.pressKey.bind(this), this.releaseKey.bind(this));
};

GameboyJS.Input.keys = {
    START:  0x80,
    SELECT: 0x40,
    B:      0x20,
    A:      0x10,
    DOWN:   0x08,
    UP:     0x04,
    LEFT:   0x02,
    RIGHT:  0x01
};

GameboyJS.Input.prototype.pressKey = function(key) {
    this.state |= GameboyJS.Input.keys[key];
    this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.HILO);
};

GameboyJS.Input.prototype.releaseKey = function(key) {
    var mask = 0xFF - GameboyJS.Input.keys[key];
    this.state &= mask;
};

GameboyJS.Input.prototype.update = function() {
    var value = this.memory.rb(this.P1);
    value = ((~value) & 0x30); // invert the value so 1 means 'active'
    if (value & 0x10) { // direction keys listened
        value |= (this.state & 0x0F);
    } else if (value & 0x20) { // action keys listened
        value |= ((this.state & 0xF0) >> 4);
    } else if ((value & 0x30) == 0) { // no keys listened
        value &= 0xF0;
    }

    value = ((~value) & 0x3F); // invert back
    this.memory[this.P1] = value;
};

// Timer implementation
GameboyJS.Timer = function(cpu, memory) {
    this.cpu    = cpu;
    this.memory = memory;

    this.DIV  = 0xFF04;
    this.TIMA = 0xFF05;
    this.TMA  = 0xFF06;
    this.TAC  = 0xFF07;

    this.mainTime  = 0;
    this.divTime   = 0;
};

GameboyJS.Timer.prototype.update = function(clockElapsed) {
    this.updateDiv(clockElapsed);
    this.updateTimer(clockElapsed);
};

GameboyJS.Timer.prototype.updateTimer = function(clockElapsed) {
    if (!(this.memory.rb(this.TAC) & 0x4)) {
        return;
    }
    this.mainTime += clockElapsed;

    var threshold = 64;
    switch (this.memory.rb(this.TAC) & 3) {
        case 0: threshold=64; break; // 4KHz
        case 1: threshold=1;  break; // 256KHz
        case 2: threshold=4;  break; // 64KHz
        case 3: threshold=16; break; // 16KHz
    }
    threshold *= 16;

    while (this.mainTime >= threshold) {
        this.mainTime -= threshold;

        this.memory.wb(this.TIMA, this.memory.rb(this.TIMA) + 1);
        if (this.memory.rb(this.TIMA) > 0xFF) {
            this.memory.wb(this.TIMA, this.memory.rb(this.TMA));
            this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.TIMER);
        }
    }
};

GameboyJS.Timer.prototype.updateDiv = function(clockElapsed) {
    var divThreshold = 256; // DIV is 16KHz
    this.divTime += clockElapsed;
    if (this.divTime > divThreshold) {
        this.divTime -= divThreshold;
        var div = this.memory.rb(this.DIV) + 1;
        this.memory.wb(this.DIV, div&0xFF);
    }
};

GameboyJS.Timer.prototype.resetDiv = function() {
    this.divTime = 0;
    this.memory[this.DIV] = 0; // direct write to avoid looping
};

// GPU implementation (simplified for now)
GameboyJS.GPU = function(screen, cpu) {
    this.cpu = cpu;
    this.screen = screen;
    
    // Use the screen's physics properties correctly
    this.width = GameboyJS.Screen.physics.WIDTH;
    this.height = GameboyJS.Screen.physics.HEIGHT;
    
    // Basic buffer initialization
    this.buffer = new Array(this.width * this.height);
    for (var i = 0; i < this.buffer.length; i++) {
        this.buffer[i] = 0; // Initialize with white color
    }
    
    this.clock = 0;
    this.vblankTime = 70224; // CPU cycles per frame (4.194304MHz / ~60Hz)
};

GameboyJS.GPU.prototype.update = function(clockElapsed) {
    this.clock += clockElapsed;
    
    // For now, just return true occasionally to simulate vblank
    if (this.clock >= this.vblankTime) {
        this.clock = 0;
        
        // Render the current buffer (for now just a placeholder gray screen)
        this.screen.render(this.buffer);
        
        // Trigger VBLANK interrupt
        this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.VBLANK);
        
        return true;
    }
    
    return false;
};

// CPU implementation
GameboyJS.CPU = function(gameboy) {
    this.gameboy = gameboy;

    this.r = {A:0, F: 0, B:0, C:0, D:0, E:0, H:0, L:0, pc:0, sp:0};
    this.IME = true;
    this.clock = {c: 0, serial: 0};
    this.isHalted = false;
    this.isPaused = false;
    this.usingBootRom = false;

    this.createDevices();
};

GameboyJS.CPU.INTERRUPTS = {
    VBLANK: 0,
    LCDC:   1,
    TIMER:  2,
    SERIAL: 3,
    HILO:   4
};

// Simple stub for interruptRoutines
GameboyJS.CPU.interruptRoutines = {
    0: function(){},
    1: function(){},
    2: function(){},
    3: function(){},
    4: function(){}
};

GameboyJS.CPU.prototype.createDevices = function() {
    this.memory = new GameboyJS.Memory(this);
    this.timer = new GameboyJS.Timer(this, this.memory);
    this.apu = {
        connect: function(){},
        disconnect: function(){},
        update: function(){},
        manageWrite: function(){}
    }; 

    this.SERIAL_INTERNAL_INSTR = 512; 
    this.enableSerial = 0;
    this.serialHandler = { out: function(){}, in: function(){ return 0; } }; 
};

GameboyJS.CPU.prototype.reset = function() {
    this.memory.reset();
    this.r.sp = 0xFFFE;
};

GameboyJS.CPU.prototype.loadRom = function(data) {
    this.memory.setRomData(data);
};

GameboyJS.CPU.prototype.getRamSize = function() {
    var size = 0;
    switch (this.memory.rb(0x149)) {
        case 1:
            size = 2048;
            break;
        case 2:
            size = 2048 * 4;
            break;
        case 3:
            size = 2048 * 16;
            break;
    }
    return size;
};

GameboyJS.CPU.prototype.getGameName = function() {
    var name = '';
    for (var i = 0x134; i < 0x143; i++) {
        var char = this.memory.rb(i) || 32;
        name += String.fromCharCode(char);
    }
    return name;
};

GameboyJS.CPU.prototype.run = function() {
    if (this.usingBootRom) {
        this.r.pc = 0x0000;
    } else {
        this.r.pc = 0x0100;
    }
    this.frame();
};

GameboyJS.CPU.prototype.stop = function() {
    clearTimeout(this.nextFrameTimer);
};

GameboyJS.CPU.prototype.frame = function() {
    if (!this.isPaused) {
        this.nextFrameTimer = setTimeout(this.frame.bind(this), 1000 / GameboyJS.Screen.physics.FREQUENCY);
    }

    try {
        var vblank = false;
        while (!vblank) {
            var oldInstrCount = this.clock.c;
            
            // Simplified CPU execution - for now we'll just increment the clock
            if (!this.isHalted) {
                this.clock.c += 4;
            } else {
                this.clock.c += 4;
            }

            var elapsed = this.clock.c - oldInstrCount;
            vblank = this.gpu.update(elapsed);
            this.timer.update(elapsed);
            this.input.update();
            this.apu.update(elapsed);
            this.checkInterrupt();
        }
        this.clock.c = 0;
    } catch (e) {
        this.gameboy.handleException(e);
    }
};

GameboyJS.CPU.prototype.fetchOpcode = function() {
    // Simplified for now
    return 0;
};

GameboyJS.CPU.prototype.halt = function() {
    this.isHalted = true;
};

GameboyJS.CPU.prototype.unhalt = function() {
    this.isHalted = false;
};

GameboyJS.CPU.prototype.pause = function() {
    this.isPaused = true;
};

GameboyJS.CPU.prototype.unpause = function() {
    if (this.isPaused) {
        this.isPaused = false;
        this.frame();
    }
};

GameboyJS.CPU.prototype.checkInterrupt = function() {
    // Simplified interrupt check for now
};

GameboyJS.CPU.prototype.requestInterrupt = function(type) {
    var IFval = this.memory.rb(0xFF0F);
    IFval |= (1 << type)
    this.memory.wb(0xFF0F, IFval);
    this.unhalt();
};

GameboyJS.CPU.prototype.enableInterrupts = function() {
    this.IME = true;
};

GameboyJS.CPU.prototype.disableInterrupts = function() {
    this.IME = false;
};

GameboyJS.CPU.prototype.enableSerialTransfer = function() {
    this.enableSerial = 1;
    this.clock.serial = 0;
};

GameboyJS.CPU.prototype.endSerialTransfer = function() {
    this.enableSerial = 0;
    var data = this.memory.rb(0xFF01);
    this.memory.wb(0xFF02, 0);
    this.serialHandler.out(data);
    this.memory.wb(0xFF01, this.serialHandler.in());
};

GameboyJS.CPU.prototype.resetDivTimer = function() {
    this.timer.resetDiv();
};

// Gameboy main class
var defaultOptions = {
    pad: {class: GameboyJS.Keyboard, mapping: null},
    zoom: 1,
    romReaders: [],
    statusContainerId: 'status',
    gameNameContainerId: 'game-name',
    errorContainerId: 'error'
};

GameboyJS.Gameboy = function(canvas, options) {
    options = options || {};
    this.options = GameboyJS.Util.extend({}, defaultOptions, options);

    var cpu = new GameboyJS.CPU(this);
    var screen = new GameboyJS.Screen(canvas, this.options.zoom);
    var gpu = new GameboyJS.GPU(screen, cpu);
    cpu.gpu = gpu;

    var pad = new this.options.pad.class(this.options.pad.mapping);
    var input = new GameboyJS.Input(cpu, pad);
    cpu.input = input;

    this.cpu = cpu;
    this.screen = screen;
    this.input = input;
    this.pad = pad;

    this.createRom(this.options.romReaders);

    this.statusContainer   = document.getElementById(this.options.statusContainerId) || document.createElement('div');
    this.gameNameContainer = document.getElementById(this.options.gameNameContainerId) || document.createElement('div');
    this.errorContainer    = document.getElementById(this.options.errorContainerId) || document.createElement('div');
};

GameboyJS.Gameboy.prototype.createRom = function (readers) {
    var rom = new GameboyJS.Rom(this);
    if (readers.length == 0) {
        // add the default rom reader
        var romReader = new GameboyJS.RomFileReader();
        rom.addReader(romReader);
    } else {
        for (var i in readers) {
            if (readers.hasOwnProperty(i)) {
                rom.addReader(readers[i]);
            }
        }
    }
};

GameboyJS.Gameboy.prototype.startRom = function(rom) {
    this.errorContainer.classList.add('hide');
    this.cpu.reset();
    try {
        this.cpu.loadRom(rom.data);
        this.setStatus('Game Running :');
        this.setGameName(this.cpu.getGameName());
        this.cpu.run();
    } catch (e) {
        this.handleException(e);
    }
};

GameboyJS.Gameboy.prototype.pause = function(value) {
    if (value) {
        this.setStatus('Game Paused :');
        this.cpu.pause();
    } else {
        this.setStatus('Game Running :');
        this.cpu.unpause();
    }
};

GameboyJS.Gameboy.prototype.error = function(message) {
    this.setStatus('Error during execution');
    this.setError('An error occurred during execution:' + message);
    this.cpu.stop();
};

GameboyJS.Gameboy.prototype.setStatus = function(status) {
    this.statusContainer.innerHTML = status;
};

GameboyJS.Gameboy.prototype.setError = function(message) {
    this.errorContainer.classList.remove('hide');
    this.errorContainer.innerHTML = message;
};

GameboyJS.Gameboy.prototype.setGameName = function(name) {
    this.gameNameContainer.innerHTML = name;
};

GameboyJS.Gameboy.prototype.setSoundEnabled = function(value) {
    if (value) {
        this.cpu.apu.connect();
    } else {
        this.cpu.apu.disconnect();
    }
};

GameboyJS.Gameboy.prototype.setScreenZoom = function(value) {
    this.screen.setPixelSize(value);
};

GameboyJS.Gameboy.prototype.handleException = function(e) {
    if (e instanceof GameboyJS.UnimplementedException) {
        if (e.fatal) {
            this.error('This cartridge is not supported ('+ e.message +')');
        } else {
            console.error(e.message);
        }
    } else {
        throw e;
    }
};

// Add serial handler stub
GameboyJS.ConsoleSerial = {
    out: function(data) { console.log("Serial output:", data); },
    in: function() { return 0; }
};