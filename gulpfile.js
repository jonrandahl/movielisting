"use strict";

var basePaths = {
  src: 'app/',
  dest: 'dest/'
};

var paths = {
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
 var appFiles = {
  styles: paths.styles.src + '**/*.scss',
  scripts: paths.scripts.src + '**/*.js',
  media: paths.media.src + '**/**',
  files: paths.files.dest + '**/*.html'
};
 var vendorFiles = {
  styles: '',
  scripts: ''
};
 /*
	var the magic begin
*/
var gulp = require('gulp');
var gutil = require('gulp-util');
 //Add in live reload to the watch
var browserSync = require('browser-sync').create();
 //modules
var assets = require('postcss-assets');
var autoprefixer = require('autoprefixer');
var concat = require('gulp-concat');
var cssnano = require('gulp-cssnano');
var deporder = require('gulp-deporder');
var imagemin = require('gulp-imagemin');
var mqpacker = require('css-mqpacker');
var newer = require('gulp-newer');
var postcss = require('gulp-postcss');
var sass = require('gulp-sass');
var size = require('gulp-size');
var stripdebug = require('gulp-strip-debug');
var uglify = require('gulp-uglify');

 // development mode?
var devBuild = (process.env.NODE_ENV !== 'production');

 // Allows gulp --dev to be run for a more verbose output
 var isProduction = true;
 var sassStyle = 'compressed';
 var sourceMaps = false;
 var showSassErrors = false;
 //if still in development make sure you can read your compiled code easily
 if (devBuild) {
  sassStyle = 'expanded';
  sourceMaps = true;
  isProduction = false;
  showSassErrors = true;
}

 // Copy all static images
gulp.task('images', function () {
  return gulp.src(appFiles.media)
    .pipe(newer(paths.media.dest))
    // Pass in options to the task
    .pipe(imagemin({ optimizationLevel: 5 }))
    .pipe(gulp.dest(paths.media.dest))
    .pipe(browserSync.stream());
});

gulp.task('css', function () {
   var postCssOpts = [
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
   return gulp.src(vendorFiles.styles.concat(appFiles.styles))
    .pipe(sass({
      outputStyle: sassStyle,
      sourceMap: sourceMaps,
      precision: 3,
      errLogToConsole: showSassErrors
    }))
    .pipe(postcss(postCssOpts))
    .pipe(gulp.dest(paths.styles.dest))
    .pipe(browserSync.stream());
});

gulp.task('scripts', function () {
   return gulp.src(vendorFiles.scripts.concat(appFiles.scripts))
    .pipe(deporder())
    .pipe(concat('app.js'))
    .pipe(isProduction ? stripdebug() : gutil.noop())
    .pipe(isProduction ? uglify() : gutil.noop())
    .pipe(size())
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(browserSync.stream());
});

gulp.task('serve', ['css', 'scripts', 'images'], function () {
  browserSync.init();
  gulp.watch(appFiles.styles, ['css']);
  gulp.watch(appFiles.scripts, ['scripts']);
  gulp.watch(appFiles.media, ['images']);
  gulp.watch(appFiles.files).on('change', browserSync.reload);
});

 // run all tasks
gulp.task('run', ['css', 'scripts']); //remember - [css] calls [images]

 // The defualt task (called when you run 'gulp')
gulp.task('default', ['serve']);