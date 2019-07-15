const GLYPH_SIZE       = 128;
const LINES_SIZE       = 4.0;
const CURVES_SIZE      = 6.0;
const LINE_WIDTH_SIZE  = 10.0;
const LINE_LENGTH_SIZE = 256.0;
const MID_POINT_X_SIZE = 100.0;
const MID_POINT_Y_SIZE = 100.0;

var settings = {
    seed: "",
    lineWidth: 10,
    lineLength: 10,
    angle: 180,
    curves: 1,
    lines: 1,
    mid_x: 10,
    mid_y: 10
};

var lasPosX = 0;
var lasPosY = 0;
var seed = 61829450;

// init canvas widths and heights (easier to do from here)
// this sizes are separate from the actual widths and heights in the browser
// ie these are the true sizes; will be scaled to browser size.
var $canvases = $(".glyph > canvas");
$canvases.attr("width", GLYPH_SIZE).attr("height", GLYPH_SIZE);

Math.seedrandom(); // replace Math.random using lib seedrandom
$("#seed-input").on("input", function(e) {
    settings.seed = $(this).val();
    gen();
});
$("#line-width").on("input", function(e) {
    settings.lineWidth = $(this).val();
    gen();
});
$("#line-length").on("input", function (e) {
  settings.lineLength = $(this).val();
  gen();
});
$("#circle-arc-angle").on("input", function(e) {
    settings.angle = $(this).val();
    gen();
});
$("#curves-input").on("input", function(e) {
    settings.curves = $(this).val();
    gen();
});
$("#lines-input").on("input", function (e) {
    settings.lines = $(this).val();
    gen();
});
$("#mid-x-input").on("input", function (e) {
    settings.mid_x = $(this).val();
    gen();
});
$("#mid-y-input").on("input", function (e) {
    settings.mid_y = $(this).val();
    gen();
});

function randFloat(min, max) // [min, max)
{
    return Math.random() * (max - min) + min;
}
function randInt(min, max) // [min, max]
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function clamp(value, min, max)
{
    return value < min ? min : (value > max ? max : value);
}
function gaussRand()
{
  var sum = 0;
  for (var i = 0; i < 3; i++) {
    // Uses an xorshift PRNG
    var hold = seed;
    seed ^= seed << 13;
    seed ^= seed >> 17;
    seed ^= seed << 5;
    var r = hold + seed;
    sum += r * (1.0 / 0x7FFFFFFF);
  }
  // Returns [-1.0,1.0] (66.7%�95.8%�100%)
  return sum / 3;
}
// function genGlyph(ctx)
// {
    // ctx.beginPath();

    // let x0 = randInt(16, GLYPH_SIZE - 16);
    // let y0 = randInt(16, GLYPH_SIZE - 16);
    // ctx.arc(x0, y0, randInt(4, 32), randFloat(0, Math.PI * 2), randFloat(0, Math.PI));
    // ctx.stroke();
// }


const Direction = {
    UP: 1,
    RIGHT: 2,
    DOWN: 3,
    LEFT: 4
};


const strokes = {
    line: {
        points: 2,
        draw: function(ctx, points) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.stroke();
        }
    },
    bezier: {
        points: 4,
        draw: function(ctx, points) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.bezierCurveTo(points[1].x, points[1].y, points[2].x, points[2].y, points[3].x, points[3].y);
            ctx.stroke();
            return 4;
        }
    }
};


// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
function genGlyph(ctx)
{
    var points = [];

    // build list of points starting from border
    let i = randInt(0, GLYPH_SIZE * 4 - 4);
    let pt0 = { x : 0, y : 0 };
    let dir = 0;
    if(i <= GLYPH_SIZE) { pt0.x = i; pt0.y = 0; dir = Direction.DOWN; }
    else if(i <= GLYPH_SIZE * 2) { pt0.x = GLYPH_SIZE; pt0.y = i - GLYPH_SIZE; dir = Direction.LEFT; }
    else if(i <= GLYPH_SIZE * 3) { pt0.x = i % GLYPH_SIZE; pt0.y = GLYPH_SIZE; dir = Direction.UP; }
    else { pt0.x = 0; pt0.y = i % GLYPH_SIZE; dir = Direction.RIGHT; }
    points.push(pt0);

    for(let n = 0; n < 4; ++n)
    {
        if(randInt(0, 4) < n)
        {
            break;
        }
        if(dir == Direction.DOWN)
        {
            let x = randInt(0, GLYPH_SIZE);
            let y = randInt(pt0.y, GLYPH_SIZE);
            points.push(pt0 = {x: x, y: y});
        }
        else if(dir == Direction.UP)
        {
            let x = randInt(0, GLYPH_SIZE);
            let y = randInt(0, pt0.y);
            points.push(pt0 = {x: x, y: y});
        }
        else if(dir == Direction.LEFT)
        {
            let x = randInt(0, pt0.x);
            let y = randInt(0, GLYPH_SIZE);
            points.push(pt0 = {x: x, y: y});
        }
        else
        {
            let x = randInt(pt0.x, GLYPH_SIZE);
            let y = randInt(0, GLYPH_SIZE);
            points.push(pt0 = {x: x, y: y});
        }
    }

    while(points.length > 1)
    {
        let keys = Object.keys(strokes);
        let index = randInt(0, keys.length - 1);
        let i = 0;
        let counter = 0;
        while(true)
        {
            let stroke = strokes[keys[i % keys.length]];
            if(points.length >= stroke.points)
            {
                if(counter == index)
                {
                    stroke.draw(ctx, points);
                    for(let j = 1; j < stroke.points; ++j)
                        points.shift();
                    break;
                }
                ++counter;
            }
            ++i;
        }
    }



    // ctx.beginPath();

    // // change input to take in degrees from 0-180, thus we have to convert back to radians
    // let rad = settings.angle * Math.PI / 180;
    // let numCurves = CURVES_SIZE * settings.curves / 100.0;
    // for (var i = 0; i < numCurves; ++i) {
    //     let x0 = randInt(16, GLYPH_SIZE - 16);
    //     let y0 = randInt(16, GLYPH_SIZE - 16);
    //     //Save last known position
    //     lasPosX = x0 + randInt(0, 6);
    //     lasPosY = y0 + randInt(0, 6);
    //     ctx.arc(x0, y0, randInt(4, 32), randFloat(0, rad * 2), randFloat(0, rad));   
    // }  
    // ctx.stroke();
}

// for drawing lines
//https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_shapes
function genGlyphLines(ctx)
{
    ctx.beginPath();
    //Use last known position to connect the line and arcs
    let numLines = LINES_SIZE * settings.lines / 100.0;
      //Implement something to let user decide how many lines?
    for (var i = 0; i < numLines; ++i)
    {
        let x0 = lasPosX;//randInt(16, GLYPH_SIZE - 16);
        let y0 = lasPosY;//randInt(16, GLYPH_SIZE - 16);
        // move to a random coordinate on the box
        ctx.moveTo(x0, y0);
        //Get a random direction
        let ranRadY = Math.sin(randFloat(0.0, Math.PI));
        let ranRadX = Math.cos(randFloat(0.0, Math.PI));
        let mag = settings.lineLength * LINE_LENGTH_SIZE / 100.0;
        lasPosX = clamp(x0 + ranRadX * mag, 0, GLYPH_SIZE);
        lasPosY = clamp(y0 + ranRadY * mag, 0, GLYPH_SIZE);
        // draw a line from moveTo to another random point
        //ctx.lineTo(randInt(x0+ 16, GLYPH_SIZE - 16), randInt(16 + y0, GLYPH_SIZE - 16));
        //Draw line to <x0, y0> + <ranRadX, ranRadY> * lineLength
        ctx.lineTo(lasPosX, lasPosY);
    }
    ctx.closePath();
    ctx.stroke();
}

function genGlyphQuadraticCurve(ctx)
{
    ctx.beginPath();
    
    // move to a random coordinate on the box
    let x0 = randInt(16, GLYPH_SIZE - 16);
    let y0 = randInt(16, GLYPH_SIZE - 16);
    ctx.moveTo(x0, y0);
    
    // end point
    let x_end = randInt(10, GLYPH_SIZE - 10);
    let y_end = randInt(10, GLYPH_SIZE - 10);
    
    //control point 1
    let cpx = Math.abs(x_end - x0) / 2.0 + MID_POINT_X_SIZE * settings.mid_x / 100.0;
    let cpy = Math.abs(y_end - y0) / 2.0 + MID_POINT_Y_SIZE * settings.mid_y / 100.0;

    //========================================
    // LOOKS WRONG SO NEED TO MODIFY IF WE WANT TO USE
    //========================================
    ctx.quadraticCurveTo(cpx, cpy, x_end, y_end);
    ctx.stroke();
}

function gen()
{
    Math.seedrandom(settings.seed);
    for (const canvas of $canvases) {
        let ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = "round";
        ctx.lineWidth = settings.lineWidth * LINE_WIDTH_SIZE / 100.0;
        genGlyph(ctx);
        // genGlyphLines(ctx);
        // genGlyphBezierCurve(ctx);
    }
}

gen();

// var permArr = [],
  // usedChars = [];

// function permute(input) {
  // var i, ch;
  // for (i = 0; i < input.length; i++) {
    // ch = input.splice(i, 1)[0];
    // usedChars.push(ch);
    // if (input.length == 0) {
      // permArr.push(usedChars.slice());
    // }
    // permute(input);
    // input.splice(i, 0, ch);
    // usedChars.pop();
  // }
  // return permArr
// };


// document.write(JSON.stringify(permute([1, 2, 3])));