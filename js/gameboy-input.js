// Keyboard listener
// Does the mapping between the keyboard and the Input class
class Keyboard {
    constructor() {}

    // Initialize the keyboard listeners and set up the callbacks
    // for button press / release
    init(onPress, onRelease) {
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

    managePress(keycode) {
        var key = this.translateKey(keycode);
        if (key) {
            this.onPress(key);
        }
    };

    manageRelease(keycode) {
        var key = this.translateKey(keycode);
        if (key) {
            this.onRelease(key);
        }
    };

    // Transform a keyboard keycode into a key of the Input.keys object
    translateKey(keycode) {
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
};

// The Input management system
//
// The pressKey() and releaseKey() functions should be called by a device class
// like Keyboard after a physical button trigger event
//
// They rely on the name of the original buttons as parameters (see Input.keys)
class Input {
    constructor(cpu, pad) {
        this.cpu = cpu;
        this.memory = cpu.memory;
        this.P1 = 0xFF00;
        this.state = 0;

        pad.init(this.pressKey.bind(this), this.releaseKey.bind(this));
    }

    static keys = {
        START:  0x80,
        SELECT: 0x40,
        B:      0x20,
        A:      0x10,
        DOWN:   0x08,
        UP:     0x04,
        LEFT:   0x02,
        RIGHT:  0x01
    };

    pressKey(key) {
        this.state |= Input.keys[key];

        this.cpu.requestInterrupt(GameboyJS.CPU.INTERRUPTS.HILO);
    };

    releaseKey(key) {
        var mask = 0xFF - Input.keys[key];
        this.state &= mask;
    };

    update() {
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
};

export { Keyboard, Input };