var GameboyJS;
(function (GameboyJS) {
"use strict";

// Sound Channel 1 (Pulse with sweep)
var Channel1 = function(apu, channel, context) {
    this.apu = apu;
    this.channelNum = channel;
    this.context = context;
    
    this.oscillator = null;
    this.gainNode = null;
    this.enabled = false;
    this.playing = false;
    
    this.frequency = 0;
    this.volume = 0;
    this.envelopeVolume = 0;
    this.lengthCounter = 0;
    this.maxLength = 64;
    this.lengthEnabled = false;
    this.lengthCheck = false;
    
    // Channel 1 specific variables
    this.sweepTime = 0;
    this.sweepDirection = 1;
    this.sweepShifts = 0;
    this.sweepTimer = 0;
    this.sweepEnabled = false;
    
    // Envelope
    this.envelopeDirection = 1;
    this.envelopeTimer = 0;
    this.envelopeStepTime = 0;
    
    // Clock counters
    this.lengthClock = 0;
    this.envelopeClock = 0;
    this.sweepClock = 0;
    
    this.initAudio();
};

Channel1.prototype.initAudio = function() {
    if (!this.context) {
        return;
    }
    
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = 'square';
    
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = 0;
    
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
    
    this.oscillator.start();
};

Channel1.prototype.enable = function() {
    this.enabled = true;
    if (this.playing) {
        this.updateVolume();
    }
};

Channel1.prototype.disable = function() {
    this.enabled = false;
    if (this.playing) {
        this.gainNode.gain.value = 0;
    }
};

Channel1.prototype.play = function() {
    // Reset length counter if it reached zero
    if (this.lengthCounter === 0) {
        this.lengthCounter = this.maxLength;
    }
    
    // Reset envelope
    this.envelopeVolume = this.volume;
    this.envelopeTimer = this.envelopeStepTime;
    
    // Reset sweep
    this.sweepTimer = this.sweepTime;
    this.sweepEnabled = this.sweepTime > 0 || this.sweepShifts > 0;
    
    // Set playing state
    this.playing = true;
    this.apu.setSoundFlag(this.channelNum, 1);
    
    // Update audio output
    this.updateFrequency();
    this.updateVolume();
};

Channel1.prototype.stop = function() {
    this.playing = false;
    this.gainNode.gain.value = 0;
    this.apu.setSoundFlag(this.channelNum, 0);
};

Channel1.prototype.updateFrequency = function() {
    if (!this.oscillator) {
        return;
    }
    
    // Convert GB frequency to actual frequency
    var gbFreqHz = 131072 / (2048 - this.frequency);
    this.oscillator.frequency.value = gbFreqHz;
};

Channel1.prototype.updateVolume = function() {
    if (!this.gainNode || !this.enabled) {
        return;
    }
    
    var volume = this.envelopeVolume / 15;
    this.gainNode.gain.value = volume * 0.25;
};

Channel1.prototype.setFrequency = function(freq) {
    this.frequency = freq;
    if (this.playing) {
        this.updateFrequency();
    }
};

Channel1.prototype.getFrequency = function() {
    return this.frequency;
};

Channel1.prototype.setLength = function(length) {
    this.lengthCounter = this.maxLength - length;
};

Channel1.prototype.setEnvelopeVolume = function(volume) {
    this.volume = volume;
};

Channel1.prototype.update = function(cycles) {
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
    
    // Update sweep
    if (this.sweepEnabled && this.sweepTime > 0) {
        this.sweepClock += cycles;
        // Sweep updated at 128Hz
        while (this.sweepClock >= 32768) {
            this.sweepClock -= 32768;
            
            if (this.sweepTimer > 0) {
                this.sweepTimer--;
                if (this.sweepTimer === 0) {
                    this.sweepTimer = this.sweepTime;
                    
                    // Calculate new frequency
                    var newFreq = this.calculateSweepFrequency();
                    
                    if (newFreq <= 2047 && this.sweepShifts > 0) {
                        this.frequency = newFreq;
                        this.updateFrequency();
                        
                        // Calculate again for overflow check
                        this.calculateSweepFrequency();
                    }
                }
            }
        }
    }
};

Channel1.prototype.calculateSweepFrequency = function() {
    var newFreq = this.frequency;
    var sweep = this.frequency >> this.sweepShifts;
    
    if (this.sweepDirection > 0) {
        newFreq += sweep;
    } else {
        newFreq -= sweep;
    }
    
    // If overflow, disable channel
    if (newFreq > 2047) {
        this.stop();
    }
    
    return newFreq;
};

GameboyJS.Channel1 = Channel1;
}(GameboyJS || (GameboyJS = {})));