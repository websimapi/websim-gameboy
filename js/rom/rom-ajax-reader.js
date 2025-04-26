var GameboyJS;
(function (GameboyJS) {
"use strict";

// ROM AJAX Reader
// Handle loading a ROM via AJAX request
var RomAjaxReader = function(url) {
    this.callback = null;
    this.url = url;
    
    if (url) {
        this.loadRom(url);
    }
};

RomAjaxReader.prototype.loadRom = function(url) {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    
    xhr.onload = function() {
        if (xhr.status === 200 && self.callback) {
            var arrayBuffer = xhr.response;
            var array = new Uint8Array(arrayBuffer);
            self.callback(array);
        }
    };
    
    xhr.send();
};

RomAjaxReader.prototype.setCallback = function(callback) {
    this.callback = callback;
};

GameboyJS.RomAjaxReader = RomAjaxReader;
}(GameboyJS || (GameboyJS = {})));

