// Ion.Sound
// version 1.3.0 Build: 20
// © 2013 Denis Ineshin | IonDen.com
//
// Project page:    http://ionden.com/a/plugins/ion.sound/en.html
// GitHub page:     https://github.com/IonDen/ion.sound
//
// Released under MIT licence:
// http://ionden.com/a/plugins/licence-en.html
// =====================================================================================================================

(function ($) {

    if ($.ionSound) {
        return;
    }


    var settings = {},
    soundsNum,
    canMp3,
    url,
    i,

    sounds = {},
    playing = false,

    VERSION = "1.3.0";


    var createSound = function (soundInfo) {
        var name,
        volume;

        if (soundInfo.indexOf(":") !== -1) {
            name = soundInfo.split(":")[0];
            volume = soundInfo.split(":")[1];
        } else {
            name = soundInfo;
        }

        sounds[name] = new Audio();
        /* canMp3 = sonds[name].canPlayType("audio/mp3");
        if (canMp3 === "probably" || canMp3 === "maybe") {
        	url = settings.path + name + ".mp3";
        } else { */
        	url = settings.path + name + ".ogg";
        /* }; */

        $(sounds[name]).prop("src", url);
        sounds[name].load();
        sounds[name].preload = "auto";
        sounds[name].volume = volume || settings.volume;
    };


    var playSound = function (info) {
        var $sound,
        name,
        volume,
        playing_int;

        if (info.indexOf(":") !== -1) {
            name = info.split(":")[0];
            volume = info.split(":")[1];
        } else {
            name = info;
        }

        $sound = sounds[name];

        if (typeof $sound !== "object" || $sound === null) {
            return;
        }


        if (volume) {
            $sound.volume = volume;
        }

        if (!settings.multiPlay && !playing) {

            $sound.play();
            playing = true;

            playing_int = setInterval(function () {
                if ($sound.ended) {
                    clearInterval(playing_int);
                    playing = false;
                }
            }, 250);

        } else if (settings.multiPlay) {

            if ($sound.ended) {
                $sound.play();
            } else {
                try {
                    $sound.currentTime = 0;
                } catch (e) {}
                $sound.play();
            }

        }
    };


    var stopSound = function (name) {
        var $sound = sounds[name];

        if (typeof $sound !== "object" || $sound === null) {
            return;
        }

        $sound.pause();
        try {
            $sound.currentTime = 0;
        } catch (e) {}
    };


    var killSound = function (name) {
        var $sound = sounds[name];

        if (typeof $sound !== "object" || $sound === null) {
            return;
        }

        try {
            sounds[name].src = "";
        } catch (e) {}
        sounds[name] = null;
    };


    // Plugin methods
    $.ionSound = function (options) {

        settings = $.extend({
            sounds: [/* This array had one element, it got removed */],
            path: "./sounds/",
            multiPlay: true,
            volume: "1.0"
        }, options);

        soundsNum = settings.sounds.length;

        if (typeof Audio === "function" || typeof Audio === "object") {
            for (i = 0; i < soundsNum; i += 1) {
                createSound(settings.sounds[i]);
            }
        }

        $.ionSound.play = function (name) {
            playSound(name);
        };
        $.ionSound.stop = function (name) {
            stopSound(name);
        };
        $.ionSound.kill = function (name) {
            killSound(name);
        };
    };


    $.ionSound.destroy = function () {
        for (i = 0; i < soundsNum; i += 1) {
            sounds[settings.sounds[i]] = null;
        }
        soundsNum = 0;
        $.ionSound.play = function () {};
        $.ionSound.stop = function () {};
        $.ionSound.kill = function () {};
    };

}(jQuery));