"use strict";

 const basePaths = {
  src: 'app/',
  dest: 'dest/'
};
 const paths = {
  media: {
    src: basePaths.src + 'assets/images/',
    dest: basePaths.dest + 'assets/media/'
  },
  scripts: {
    src: basePaths.src + 'assets/es6/',
    dest: basePaths.dest + 'assets/js/'
  },
  styles: {
    src: basePaths.src + 'assets/sass/',
    dest: basePaths.dest + 'assets/css/'
  },
  files: {
    dest: basePaths.dest + '/'
  }
};
 const appFiles = {
  styles: paths.styles.src + '**/*.scss',
  scripts: paths.scripts.src + '**/*.js',
  media: paths.media.src + '**/**',
  files: paths.files.dest + '**/*.html'
};
 const vendorFiles = {
  styles: '',
  scripts: ''
};
 /*
	Let the magic begin
*/
import { task, src as _src, dest as _dest, watch } from 'gulp';
import { noop } from 'gulp-util';
 //Add in live reload to the watch
const browserSync = require('browser-sync').create();
 //modules
import assets from 'postcss-assets';
import autoprefixer from 'autoprefixer';
import concat from 'gulp-concat';
import cssnano from 'gulp-cssnano';
import deporder from 'gulp-deporder';
import imagemin from 'gulp-imagemin';
import mqpacker from 'css-mqpacker';
import newer from 'gulp-newer';
import postcss from 'gulp-postcss';
import sass from 'gulp-sass';
import size from 'gulp-size';
import stripdebug from 'gulp-strip-debug';
import uglify from 'gulp-uglify';
 // development mode?
const devBuild = (process.env.NODE_ENV !== 'production');
 // Allows gulp --dev to be run for a more verbose output
let isProduction = true;
let sassStyle = 'compressed';
let sourceMaps = false;
let showSassErrors = false;
 if (devBuild) {
  sassStyle = 'expanded';
  sourceMaps = true;
  isProduction = false;
  showSassErrors = true;
}
 task('css', ['images'], function () {
   const postCssOpts = [
    assets({
      relative: basePaths.src,
      loadPaths: ['media/']
    }),
    autoprefixer(),
    mqpacker
  ];
   if (!devBuild) {
    postCssOpts.push(cssnano);
  }
   return _src(vendorFiles.styles.concat(appFiles.styles))
    .pipe(sass({
      outputStyle: sassStyle,
      sourceMap: sourceMaps,
      precision: 3,
      errLogToConsole: showSassErrors
    }))
    .pipe(postcss(postCssOpts))
    .pipe(_dest(paths.styles.dest))
    .pipe(browserSync.stream());
});
 task('scripts', function () {
   return _src(vendorFiles.scripts.concat(appFiles.scripts))
    .pipe(deporder())
    .pipe(concat('app.js'))
    .pipe(isProduction ? stripdebug() : noop())
    .pipe(isProduction ? uglify() : noop())
    .pipe(size())
    .pipe(_dest(paths.scripts.dest))
    .pipe(browserSync.stream());
});
 // Copy all static images
task('images', function () {
  return _src(appFiles.media)
    .pipe(newer(paths.media.dest))
    // Pass in options to the task
    .pipe(imagemin({ optimizationLevel: 5 }))
    .pipe(_dest(paths.media.dest))
    .pipe(browserSync.stream());
});
 task('serve', ['css', 'scripts', 'images'], function () {
  browserSync.init();
  watch(appFiles.styles, ['css']);
  watch(appFiles.scripts, ['scripts']);
  watch(appFiles.media, ['images']);
  watch(appFiles.files).on('change', browserSync.reload);
});
 // run all tasks
task('run', ['css', 'scripts']); //remember - [css] calls [images]
 // The defualt task (called when you run 'gulp')
task('default', ['serve']);