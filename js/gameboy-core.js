import { CPU } from './gameboy-cpu';
import { Screen, GPU } from './gameboy-gpu';
import { Input, Keyboard } from './gameboy-input';
import { Rom, RomFileReader, RomDropFileReader } from './gameboy-rom';
import { UnimplementedException } from './gameboy-utils';

const defaultOptions = {
    pad: {class: Keyboard, mapping: null},
    zoom: 1,
    romReaders: [],
    statusContainerId: 'status',
    gameNameContainerId: 'game-name',
    errorContainerId: 'error'
};

// Gameboy class
//
// This object is the entry point of the application
// Will delegate user actions to the emulated devices
// and provide information where needed
class Gameboy {
    constructor(canvas, options) {
        options = options || {};
        this.options = Object.assign({}, defaultOptions, options);

        const cpu = new CPU(this);
        const screen = new Screen(canvas, this.options.zoom);
        const gpu = new GPU(screen, cpu);
        cpu.gpu = gpu;

        const pad = new this.options.pad.class(this.options.pad.mapping);
        const input = new Input(cpu, pad);
        cpu.input = input;

        this.cpu = cpu;
        this.screen = screen;
        this.input = input;
        this.pad = pad;

        this.createRom(this.options.romReaders);

        this.statusContainer = document.getElementById(this.options.statusContainerId) || document.createElement('div');
        this.gameNameContainer = document.getElementById(this.options.gameNameContainerId) || document.createElement('div');
        this.errorContainer = document.getElementById(this.options.errorContainerId) || document.createElement('div');
    }

    // Create the ROM object and bind one or more readers
    createRom(readers) {
        const rom = new Rom(this);
        if (readers.length == 0) {
            // add the default rom reader
            const romReader = new RomFileReader();
            rom.addReader(romReader);
        } else {
            for (const i in readers) {
                if (readers.hasOwnProperty(i)) {
                    rom.addReader(readers[i]);
                }
            }
        }
    }

    startRom(rom) {
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
    }

    pause(value) {
        if (value) {
            this.setStatus('Game Paused :');
            this.cpu.pause();
        } else {
            this.setStatus('Game Running :');
            this.cpu.unpause();
        }
    }

    error(message) {
        this.setStatus('Error during execution');
        this.setError('An error occurred during execution:' + message);
        this.cpu.stop();
    }

    setStatus(status) {
        this.statusContainer.innerHTML = status;
    }
    
    // Display an error message
    setError(message) {
        this.errorContainer.classList.remove('hide');
        this.errorContainer.innerHTML = message;
    }
    
    // Display the name of the game running
    setGameName(name) {
        this.gameNameContainer.innerHTML = name;
    }
    
    setSoundEnabled(value) {
        if (value) {
            this.cpu.apu.connect();
        } else {
            this.cpu.apu.disconnect();
        }
    }
    
    setScreenZoom(value) {
        this.screen.setPixelSize(value);
    }
    
    handleException(e) {
        if (e instanceof UnimplementedException) {
            if (e.fatal) {
                this.error('This cartridge is not supported ('+ e.message +')');
            } else {
                console.error(e.message);
            }
        } else {
            throw e;
        }
    }
}

export { Gameboy, RomFileReader, RomDropFileReader };