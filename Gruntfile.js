var rimraf = require('rimraf');
var fs = require('fs-extra');
var util = require('util')

util._extend({
  encoding: "utf8",
  timeout: 0,
  maxBuffer: false,
  killSignal: "SIGTERM",
  cwd: null,
  env: null
});

module.exports = function(grunt) {
  "use strict";

  // buildPlatforms = parseBuildPlatforms(grunt.option('platforms'))
  var packageJson = grunt.file.readJSON('package.json');
  var _VERSION = packageJson.version;

  grunt.log.writeln('Building ' + packageJson.version);

  grunt.initConfig({
    // Wipe out previous builds and test reporting.
    clean: [
      "build/komanda-source",
      'build/releases/**'
    ],

    handlebars: {
      compile: {
        options: {
          amd: true,
          namespace: 'Templates',
          partialsUseNamespace: true,
          processName: function(filePath) {
            var file = filePath.replace(/.*\/(\w+)\.hbs/, '$1');
            return file;
          }
        },
        files:{
          'app/templates.js': ['app/templates/*.hbs']
        }
      }
    },

    // Run your source code through JSHint's defaults.
    jshint: {
      options: {
        smarttabs: true,
      },
      all: [
        "app/**/*.js",
        "!app/templates.js",
        "!app/lib/**/*.js"
      ]
    },

    // This task uses James Burke's excellent r.js AMD builder to take all
    // modules and concatenate them into a single file.
    requirejs: {
      release: {
        options: {
          mainConfigFile: "app/config.js",
          generateSourceMaps: false,
          include: ["main"],
          out: "build/komanda-source/komanda.js",
          optimize: "uglify2",

          // Since we bootstrap with nested `require` calls this option allows
          // R.js to find them.
          findNestedDependencies: true,

          // Include a minimal AMD implementation shim.
          name: "almond",

          // Setting the base url to the distribution directory allows the
          // Uglify minification process to correctly map paths for Source
          // Maps.
          baseUrl: "build/komanda-source/app",

          // Wrap everything in an IIFE.
          wrap: true,

          // Do not preserve any license comments when working with source
          // maps.  These options are incompatible.
          preserveLicenseComments: false
        }
      }
    },

    // This task simplifies working with CSS inside Backbone Boilerplate
    // projects.  Instead of manually specifying your stylesheets inside the
    // HTML, you can use `@imports` and this task will concatenate only those
    // paths.
    styles: {
      // Out the concatenated contents of the following styles into the below
      // development file path.
      "build/komanda-source/komanda.css": {
        // Point this to where your `index.css` file is location.
        src: "app/styles/index.css",

        // The relative path to use for the @imports.
        paths: ["app/styles"],

        // Rewrite image paths during release to be relative to the `img`
        // directory.
        // forceRelative: [ "/app/images/", "/app/fonts" ]
      }
    },

    // Minify the distribution CSS.
    cssmin: {
      release: {
        files: {
          "build/komanda-source/komanda.css": ["build/komanda-source/komanda.css"]
        }
      }
    },

    server: {
      options: {
        host: "0.0.0.0",
        port: 8000
      },

      development: {},

      release: {
        options: {
          prefix: "build/komanda-source"
        }
      },

      test: {
        options: {
          forever: false,
          port: 8001
        }
      }
    },

    processhtml: {
      release: {
        files: {
          "build/komanda-source/index.html": ["index.html"]
        }
      }
    },

    // Move vendor and app logic during a build.
    copy: {
      release: {
        files: [
          { src: "package.json", dest: "build/komanda-source/package.json" },
          { src: ["app/**"], dest: "build/komanda-source/" },
          { src: "vendor/**", dest: "build/komanda-source/" }
        ]
      }
    },

    compress: {
      release: {
        options: {
          archive: "build/komanda-source/komanda.js.gz"
        },

        files: ["build/komanda-source/komanda.js"]
      }
    },

    nodewebkit: {
      options: {
        // version: '0.8.5',
        app_name: "Komanda",
        app_version: '0.1.0',
        build_dir: './build',
        mac: false,
        win: true,
        linux32: false,
        linux64: false,
        mac_icns: "app/styles/images/logo/komanda.icns"
      },
      // src: ['./**/*'],
      src: [
        './build/komanda-source/**/*',
        // './node_modules/irc/**/*',
      ]
    },

    shell: {
      runmac: {
        options: {
          stdout: false,
          stderr: false,
          stdin: false
        },
        command: "./build/cache/mac/0.9.2/node-webkit.app/Contents/MacOS/node-webkit . > /dev/null 2>&1"
      },

      runwin: {
        options: {
          stdout: false,
          stderr: false,
          stdin: false
        },
        command: "build\\releases\\Komanda\\win\\Komanda\\Komanda.exe"

      },

      create_dmg: {
        options: {
          stdout: true
        },
        command: './dist/mac/yoursway-create-dmg/create-dmg --volname "Komanda ' + _VERSION + '" --background ./dist/mac/background.png --window-size 480 540 --icon-size 128 --app-drop-link 240 370 --icon "Komanda" 240 110 ./build/releases/Komanda/mac/Komanda-' + _VERSION + '.dmg ./build/releases/Komanda/mac/'
      }

    }

  });

  grunt.registerTask('cleanBuildDir', 'remove unneeded files from the build dir.', function() {
    fs.mkdirSync('build/komanda-source/images');
    fs.mkdirSync('build/komanda-source/fonts');

    fs.copySync("build/komanda-source/app/styles/images", "build/komanda-source/images")
    fs.copySync("build/komanda-source/app/styles/fonts", "build/komanda-source/fonts");
    fs.copySync("node_modules/irc/", "build/komanda-source/node_modules/irc/");

    rimraf.sync("build/komanda-source/app", function(error) {
      console.log(error);
    });

    rimraf.sync("build/komanda-source/vendor", function(error) {
      console.log(error);
    });

  });

  // Grunt contribution tasks.
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-cssmin");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-compress");

  // Third-party tasks.
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks("grunt-node-webkit-builder");
  grunt.loadNpmTasks("grunt-bbb-server");
  grunt.loadNpmTasks("grunt-processhtml");
  grunt.loadNpmTasks('grunt-contrib-handlebars');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks("grunt-bbb-styles");
  grunt.loadNpmTasks("grunt-shell");

  grunt.registerTask('default', [

  ]);

  grunt.registerTask("build", [
    "clean",
    "jshint",
    "processhtml",
    "copy",
    "requirejs",
    "styles",
    "cssmin",
    "cleanBuildDir",
    "nodewebkit"
  ]);

  grunt.registerTask("runmac", [
    "default",
    "shell:runmac"
  ]);


  grunt.registerTask("runwin", [
    "default",
    "shell:runwin"
  ]);
};
