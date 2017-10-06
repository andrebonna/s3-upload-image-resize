const gulp = require('gulp');
const babel = require('gulp-babel');
const clean = require('gulp-clean');
const sourceTranspile = [
    'src/**/*.js',
    '!src/**/*.spec.js', 
    '!src/**/*.spec.js.snap', 
    '!src/**/__snapshots__',
    '!src/**/__mocks__'
];
const dest = 'build';

gulp.task('clean', ()=>{
    return gulp.src(dest).pipe(clean());
});

gulp.task('transpile', ['clean'], () => {
    return gulp.src(sourceTranspile).
        pipe(babel({
            presets: ['env']
        })).
        pipe(gulp.dest(dest));
});


gulp.task('default', ['transpile']);


