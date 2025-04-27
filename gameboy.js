/* 
 * Compatibility module that exposes the GameboyJS namespace
 * for backwards compatibility with the old code structure
 */

// Import modules from their new locations
import { loadboot } from './js/core/bootrom.js';
import { Gameboy, UnimplementedException } from './js/core/gameboy.js';
import { CPU } from './js/core/cpu.js';
import { Debug } from './js/utils/debug.js';
import { GPU } from './js/graphics/gpu.js';
import { Screen } from './js/graphics/screen.js';
import { Memory } from './js/core/memory.js';
import { ExtRam } from './js/core/extram.js';
import { Gamepad } from './js/io/gamepad.js';
import { Input } from './js/io/input.js';
import { Keyboard } from './js/io/keyboard.js';
import { MBC } from './js/core/mbc.js';
import { opcodeMap, opcodeCbmap, cpuOps } from './js/core/opcodes.js';
import { RomAjaxReader } from './js/io/rom-ajax-reader.js';
import { RomDropFileReader } from './js/io/rom-drop-file-reader.js';
import { RomFileReader } from './js/io/rom-file-reader.js';
import { Rom } from './js/io/rom.js';
import { ConsoleSerial, DummySerial } from './js/io/serial.js';
import { APU } from './js/audio/apu.js';
import { Channel1 } from './js/audio/channel1.js';
import { Channel3 } from './js/audio/channel3.js';
import { Channel4 } from './js/audio/channel4.js';
import { Timer } from './js/core/timer.js';
import { Util } from './js/utils/util.js';

// Create window.GameboyJS namespace for compatibility
window.GameboyJS = {
    loadboot,
    CPU,
    Debug,
    GPU,
    Screen,
    UnimplementedException,
    Memory,
    ExtRam,
    Gamepad,
    Input,
    Keyboard,
    MBC,
    opcodeMap,
    opcodeCbmap,
    cpuOps,
    RomAjaxReader,
    RomDropFileReader,
    RomFileReader,
    Rom,
    ConsoleSerial,
    DummySerial,
    APU,
    Channel1,
    Channel3,
    Channel4,
    Timer,
    Util,
    Gameboy
};

// Export function to initialize the emulator
export function initGameboy(canvasElement, options) {
    const gameboy = new Gameboy(canvasElement, options);
    window.g = gameboy; // Set the global g variable
    return gameboy;
}