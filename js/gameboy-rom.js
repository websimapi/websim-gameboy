// A RomFileReader is able to load a local file from an input element
class RomFileReader {
    constructor(el) {
        this.domElement = el || document.getElementById('file');
        if (!this.domElement) {
            throw 'The RomFileReader needs a valid input element.';
        }

        this.domElement.addEventListener('change', (e) => {
            this.loadFromFile(e.target.files[0]);
        });
    }

    // The callback argument will be called when a file is successfully
    // read, with the data as argument (Uint8Array)
    setCallback(onLoadCallback) {
        this.callback = onLoadCallback;
    }

    // Automatically called when the DOM input is provided with a file
    loadFromFile(file) {
        if (file === undefined) {
            return;
        }
        const fr = new FileReader();
        const cb = this.callback;

        fr.onload = function() {
            cb && cb(new Uint8Array(fr.result));
        };
        fr.onerror = function(e) {
            console.log('Error reading the file', e.target.error.code);
        };
        fr.readAsArrayBuffer(file);
    }
}

// A RomDropFileReader is able to load a drag and dropped file
class RomDropFileReader {
    constructor(el) {
        this.dropElement = el;
        if (!this.dropElement) {
            throw 'The RomDropFileReader needs a drop zone.';
        }

        this.dropElement.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.target.classList.add('drag-active');
        });
        
        this.dropElement.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.target.classList.remove('drag-active');
        });
        
        this.dropElement.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        this.dropElement.addEventListener('drop', (e) => {
            e.target.classList.remove('drag-active');
            if (e.dataTransfer.files.length == 0) {
                return;
            }
            e.preventDefault();
            this.loadFromFile(e.dataTransfer.files[0]);
        });
    }

    // The callback argument will be called when a file is successfully
    // read, with the data as argument (Uint8Array)
    setCallback(onLoadCallback) {
        this.callback = onLoadCallback;
    }

    // The file loading logic is the same as the regular file reader
    loadFromFile(file) {
        if (file === undefined) {
            return;
        }
        const fr = new FileReader();
        const cb = this.callback;

        fr.onload = function() {
            cb && cb(new Uint8Array(fr.result));
        };
        fr.onerror = function(e) {
            console.log('Error reading the file', e.target.error.code);
        };
        fr.readAsArrayBuffer(file);
    }
}

class Rom {
    constructor(gameboy, romReader) {
        this.gameboy = gameboy;
        if (romReader) {
            this.addReader(romReader);
        }
    }

    addReader(romReader) {
        const self = this;
        romReader.setCallback(function(data) {
            if (!Rom.validate(data)) {
                self.gameboy.error('The file is not a valid GameBoy ROM.');
                return;
            }
            self.data = data;
            self.gameboy.startRom(self);
        });
    }

    // Validate the checksum of the cartridge header
    static validate(data) {
        let hash = 0;
        for (let i = 0x134; i <= 0x14C; i++) {
            hash = hash - data[i] - 1;
        }
        return (hash & 0xFF) == data[0x14D];
    }
}

export { Rom, RomFileReader, RomDropFileReader };