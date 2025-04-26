var GameboyJS;
(function (GameboyJS) {
"use strict";

// Sound Channel 4 (Noise)
var Channel4 = function(apu, channel, context) {
    this.apu = apu;
    this.channelNum = channel;
    this.context = context;
    
    this.oscillator = null;
    this.gainNode = null;
    this.enabled = false;
    this.playing = false;
    
    this.volume = 0;
    this.envelopeVolume = 0;
    this.lengthCounter = 0;
    this.maxLength = 64;
    this.lengthEnabled = false;
    this.lengthCheck = false;
    
    // Noise parameters
    this.shiftClock = 0;
    this.divisorCode = 0;
    this.widthMode = 0;
    this.lfsr = 0x7FFF;
    
    // Envelope
    this.envelopeDirection = 1;
    this.envelopeTimer = 0;
    this.envelopeStepTime = 0;
    
    // Clock counters
    this.lengthClock = 0;
    this.envelopeClock = 0;
    this.noiseClock = 0;
    
    this.initAudio();
};

Channel4.prototype.initAudio = function() {
    if (!this.context) {
        return;
    }
    
    // Create a noise node using a buffer source
    this.createNoiseBuffer();
    
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0;
    
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
};

Channel4.prototype.createNoiseBuffer = function() {
    // Create a buffer with white noise
    var bufferSize = this.context.sampleRate * 2; // 2 seconds of noise
    var buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    var data = buffer.getChannelData(0);
    
    // Fill buffer with white noise
    for (var i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    // Create a buffer source
    this.oscillator = this.context.createBufferSource();
    this.oscillator.buffer = buffer;
    this.oscillator.loop = true;
    this.oscillator.start();
};

Channel4.prototype.enable = function() {
    this.enabled = true;
    if (this.playing) {
        this.updateVolume();
    }
};

Channel4.prototype.disable = function() {
    this.enabled = false;
    if (this.playing) {
        this.gainNode.gain.value = 0;
    }
};

Channel4.prototype.play = function() {
    // Reset length counter if it reached zero
    if (this.lengthCounter === 0) {
        this.lengthCounter = this.maxLength;
    }
    
    // Reset envelope
    this.envelopeVolume = this.volume;
    this.envelopeTimer = this.envelopeStepTime;
    
    // Reset LFSR
    this.lfsr = 0x7FFF;
    
    // Set playing state
    this.playing = true;
    this.apu.setSoundFlag(this.channelNum, 1);
    
    // Update audio output
    this.updateVolume();
};

Channel4.prototype.stop = function() {
    this.playing = false;
    this.gainNode.gain.value = 0;
    this.apu.setSoundFlag(this.channelNum, 0);
};

Channel4.prototype.updateVolume = function() {
    if (!this.gainNode || !this.enabled) {
        return;
    }
    
    var volume = this.envelopeVolume / 15;
    this.gainNode.gain.value = volume * 0.25;
};

Channel4.prototype.update = function(cycles) {
    if (!this.playing) {
        return;
    }
    
    // Update length counter
    if (this.lengthEnabled) {
        this.lengthClock += cycles;
        // Length updated at 256Hz
        while (this.lengthClock >= 16384) {
            this.lengthClock -= 16384;
            
            if (this.lengthCounter > 0) {
                this.lengthCounter--;
                if (this.lengthCounter === 0 && this.lengthCheck) {
                    this.stop();
                    return;
                }
            }
        }
    }
    
    // Update envelope
    if (this.envelopeStepTime > 0) {
        this.envelopeClock += cycles;
        // Envelope updated at 64Hz
        while (this.envelopeClock >= 65536) {
            this.envelopeClock -= 65536;
            
            if (this.envelopeTimer > 0) {
                this.envelopeTimer--;
                if (this.envelopeTimer === 0) {
                    this.envelopeTimer = this.envelopeStepTime;
                    
                    // Update volume
                    var newVolume = this.envelopeVolume + this.envelopeDirection;
                    if (newVolume >= 0 && newVolume <= 15) {
                        this.envelopeVolume = newVolume;
                        this.updateVolume();
                    }
                }
            }
        }
    }
};

Channel4.prototype.setLength = function(length) {
    this.lengthCounter = this.maxLength - length;
};

GameboyJS.Channel4 = Channel4;
}(GameboyJS || (GameboyJS = {})));

