var GameboyJS;
(function (GameboyJS) {
    "use strict";

    // CPU (Central Processing Unit)
    // The main processing component of the Game Boy

    var CPU = function(gameboy) {
        this.gameboy = gameboy;

        // Initialize registers
        this.r = {
            A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, H: 0, L: 0,
            pc: 0, sp: 0
        };

        // Clock - used to track CPU cycles
        this.clock = { c: 0, serial: 0, div: 0, tima: 0 };

    // CPU Interrupt flags
    CPU.INTERRUPTS = {
        VBLANK: 1,   // Vertical blank (bit 0)
        LCDC: 2,     // LCDC status (bit 1)
        TIMER: 4,    // Timer overflow (bit 2)
        SERIAL: 8,   // Serial transfer complete (bit 3)
        HILO: 16     // HI-LO transition on pins (bit 4)
    };

    // Reset CPU state
    CPU.prototype.reset = function() {
        this.r.A = 0;
        this.r.B = 0;
        this.r.C = 0;
        this.r.D = 0;
        this.r.E = 0;
        this.r.F = 0;
        this.r.H = 0;
        this.r.L = 0;
        this.r.pc = 0;
        this.r.sp = 0xFFFE;

        this.clock.c = 0;
        this.clock.serial = 0;
        this.clock.div = 0;
        this.clock.tima = 0;

        this.timaEnabled = false;
        this.IME = false;
        this.scheduledIME = false;
        this.halted = false;
        this.stopped = false;

        this.memory.reset();
    };

    // Helper function to write to a register
    CPU.prototype.wr = function(r, v) {
        if (r === 'F') {
            this.r.F = v & 0xF0; // Lower 4 bits of F are always 0
        } else {
            this.r[r] = v;
        }
    };

    // Start execution
    CPU.prototype.run = function() {
        this.stopped = false;

        // Start main execution loop
        var self = this;
        this._runIntervalId = setInterval(function() {
            try {
                // Execute a frame's worth of instructions
                self.frame();
            } catch (e) {
                clearInterval(self._runIntervalId);
                self.gameboy.handleException(e);
            }
        }, 1000 / 60); // Aim for 60fps
    };

    // Execute a single frame
    CPU.prototype.frame = function() {
        // Target number of cycles for one frame (4.194304 MHz / 60 fps)
        var cycles = 70224;

        // Execute instructions until we reach the target cycle count
        this.execute(cycles);

        // Reset frame cycle counter
        this.clock.c = 0;
    };

    // Execute a number of cycles
    CPU.prototype.execute = function(cycles) {
        var lastClockC = 0;

        while (this.clock.c < cycles) {
            // Store the clock state before executing the opcode
            lastClockC = this.clock.c;

            // If the system is halted, don't execute
            if (this.halted) {
                this.clock.c += 4;
            } else {
                // Fetch and execute opcode
                var opcode = this.memory.rb(this.r.pc++);
                GameboyJS.opcodes.standardMap[opcode](this);
            }

            // Update timers with elapsed cycles
            var elapsed = this.clock.c - lastClockC;
            this.updateTimers(elapsed);

            // Handle interrupts
            this.handleInterrupts();

            // Update memory-mapped components
            this.memory.update();
            this.input.update();
            this.gpu.update(elapsed);
            this.apu.update(elapsed);
        }
    };

    // Update internal timers
    CPU.prototype.updateTimers = function(cycles) {
        // Divider register (incremented at 16384Hz)
        this.clock.div += cycles;
        while (this.clock.div >= 256) {
            this.memory[0xFF04] = (this.memory[0xFF04] + 1) & 0xFF;
            this.clock.div -= 256;
        }

        // Timer counter (TIMA)
        if (this.timaEnabled) {
            this.clock.tima += cycles;

            // Get timer frequency
            var freq = this.getTimaFreq();
            while (this.clock.tima >= freq) {
                // Increment TIMA
                this.memory[0xFF05] = (this.memory[0xFF05] + 1) & 0xFF;

                // Check for overflow
                if (this.memory[0xFF05] === 0) {
                    // Reset TIMA to TMA value and request timer interrupt
                    this.memory[0xFF05] = this.memory[0xFF06];
                    this.requestInterrupt(CPU.INTERRUPTS.TIMER);
                }

                this.clock.tima -= freq;
            }
        }

        // Serial transfer
        if (this.serialEnabled) {
            this.clock.serial += cycles;
            if (this.clock.serial >= 512) {
                // Transfer complete
                this.memory[0xFF02] &= 0x7F;
                this.serialEnabled = false;
                this.requestInterrupt(CPU.INTERRUPTS.SERIAL);
            }
        }
    };

    // Get Timer frequency divisor
    CPU.prototype.getTimaFreq = function() {
        var freq = this.memory[0xFF07] & 0x03;
        switch (freq) {
            case 0: return 1024; // 4096Hz
            case 1: return 16;   // 262144Hz
            case 2: return 64;   // 65536Hz
            case 3: return 256;  // 16384Hz
        }
    };

    // Reset DIV timer
    CPU.prototype.resetDivTimer = function() {
        this.memory[0xFF04] = 0;
        this.clock.div = 0;
    };

    // Handle interrupts
    CPU.prototype.handleInterrupts = function() {
        // Handle pending IME enable (from EI instruction)
        if (this.scheduledIME) {
            this.IME = true;
            this.scheduledIME = false;
        }

        // Check for interrupts if halted or interrupts enabled
        if (this.halted || this.IME) {
            var IE = this.memory[0xFFFF]; // Interrupt Enable
            var IF = this.memory[0xFF0F]; // Interrupt Flags
            var interrupts = IE & IF;

            if (interrupts) {
                // Un-halt CPU even if IME is disabled
                this.halted = false;

                // Process enabled interrupts
                if (this.IME) {
                    this.IME = false;

                    // Find highest priority interrupt
                    if (interrupts & CPU.INTERRUPTS.VBLANK) {
                        this.processInterrupt(CPU.INTERRUPTS.VBLANK, 0x40);
                    } else if (interrupts & CPU.INTERRUPTS.LCDC) {
                        this.processInterrupt(CPU.INTERRUPTS.LCDC, 0x48);
                    } else if (interrupts & CPU.INTERRUPTS.TIMER) {
                        this.processInterrupt(CPU.INTERRUPTS.TIMER, 0x50);
                    } else if (interrupts & CPU.INTERRUPTS.SERIAL) {
                        this.processInterrupt(CPU.INTERRUPTS.SERIAL, 0x58);
                    } else if (interrupts & CPU.INTERRUPTS.HILO) {
                        this.processInterrupt(CPU.INTERRUPTS.HILO, 0x60);
                    }
                }
            }
        }
    };

    // Process a specific interrupt
    CPU.prototype.processInterrupt = function(interrupt, vector) {
        // Clear the interrupt flag
        this.memory[0xFF0F] &= ~interrupt;

        // Push PC onto stack
        this.memory.wb(--this.r.sp, (this.r.pc >> 8) & 0xFF);
        this.memory.wb(--this.r.sp, this.r.pc & 0xFF);

        // Jump to interrupt handler
        this.r.pc = vector;

        // Add cycles for interrupt handling
        this.clock.c += 12;
    };

    // Request an interrupt
    CPU.prototype.requestInterrupt = function(interrupt) {
        this.memory[0xFF0F] |= interrupt;
    };

    // Enable serial transfer
    CPU.prototype.enableSerialTransfer = function() {
        this.serialEnabled = true;
        this.clock.serial = 0;
    };

    // Enable interrupts (called by EI instruction)
    CPU.prototype.enableInterrupts = function() {
        // Schedule IME to be enabled after the next instruction
        this.scheduledIME = true;
    };

    // Disable interrupts (called by DI instruction)
    CPU.prototype.disableInterrupts = function() {
        this.IME = false;
        this.scheduledIME = false;
    };

    // Halt the CPU
    CPU.prototype.halt = function() {
        this.halted = true;
    };

    // Stop the CPU
    CPU.prototype.stop = function() {
        clearInterval(this._runIntervalId);
        this.stopped = true;
    };

    // Pause emulation
    CPU.prototype.pause = function() {
        clearInterval(this._runIntervalId);
    };

    // Resume emulation
    CPU.prototype.unpause = function() {
        if (!this.stopped) {
            this.run();
        }
    };

    // Load a ROM
    CPU.prototype.loadRom = function(romData) {
        this.memory.setRomData(romData);

        // Setup timer based on TAC register
        var tac = this.memory[0xFF07];
        this.timaEnabled = (tac & 0x04) ? true : false;
    };

    // Get the name of the current game from ROM header
    CPU.prototype.getGameName = function() {
        if (!this.memory.rom) {
            return '';
        }

        var name = '';
        for (var i = 0x134; i < 0x143; i++) {
            var c = this.memory.rom[i];
            if (c === 0) break;
            name += String.fromCharCode(c);
        }
        return name;
    };

    // Get RAM size from ROM header
    CPU.prototype.getRamSize = function() {
        if (!this.memory.rom) {
            return 0;
        }

        var ramSizeCode = this.memory.rom[0x149];
        switch (ramSizeCode) {
            case 0: return 0;
            case 1: return 2 * 1024;
            case 2: return 8 * 1024;
            case 3: return 32 * 1024;
            case 4: return 128 * 1024;
            case 5: return 64 * 1024;
            default: return 0;
        }
    };

GameboyJS.CPU = CPU;
}(GameboyJS || (GameboyJS = {})));