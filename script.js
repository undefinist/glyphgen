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
var gaussRandSeed = 0;

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
function randPoint()
{
    return new Point(randInt(0, GLYPH_SIZE), randInt(0, GLYPH_SIZE));
}
function clamp(value, min, max)
{
    return value < min ? min : (value > max ? max : value);
}
function gaussRand()
{
    var u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) / 3;
}
// function genGlyph(ctx)
// {
    // ctx.beginPath();

    // let x0 = randInt(16, GLYPH_SIZE - 16);
    // let y0 = randInt(16, GLYPH_SIZE - 16);
    // ctx.arc(x0, y0, randInt(4, 32), randFloat(0, Math.PI * 2), randFloat(0, Math.PI));
    // ctx.stroke();
// }


class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Stroke {
    constructor(points) {
        this.points = points;
    }
    draw(ctx) {}
}
class Line extends Stroke {
    static get requiredPoints() { return 2; }
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.lineTo(this.points[1].x, this.points[1].y);
        ctx.stroke();
    }
}
class Bezier extends Stroke {
    static get requiredPoints() { return 4; }
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.bezierCurveTo(this.points[1].x, this.points[1].y, this.points[2].x, this.points[2].y, this.points[3].x, this.points[3].y);
        ctx.stroke();
    }
}

function genNextPoint(p0) {

    const angleConstraint = 30;

    // split canvas into 3x3 to determine what direction the next point can go
    let angleMin = 0;
    let angleMax = 0;
    let radiusMin = GLYPH_SIZE / 3;
    let radiusMax = GLYPH_SIZE / 3 * 2;

    if(p0.x < GLYPH_SIZE / 3 && p0.y < GLYPH_SIZE / 3)
    {
        angleMin = -90;
        angleMax = 0;
    }
    else if(p0.x < GLYPH_SIZE / 3 && p0.y < GLYPH_SIZE / 3 * 2)
    {
        angleMin = -90;
        angleMax = 90;
        radiusMin = GLYPH_SIZE / 3 / 3 * 2;
        radiusMax = GLYPH_SIZE / 3;
    }
    else if(p0.x < GLYPH_SIZE / 3)
    {
        angleMin = 0;
        angleMax = 90;
    }
    else if(p0.x < GLYPH_SIZE / 3 * 2 && p0.y < GLYPH_SIZE / 3)
    {
        angleMin = -180;
        angleMax = 0;
        radiusMin = GLYPH_SIZE / 3 / 3 * 2;
        radiusMax = GLYPH_SIZE / 3;
    }
    else if(p0.x < GLYPH_SIZE / 3 * 2 && p0.y < GLYPH_SIZE / 3 * 2)
    {
        angleMin = 0;
        angleMax = 360;
        radiusMin = GLYPH_SIZE / 3 / 3 * 2;
        radiusMax = GLYPH_SIZE / 3;
    }
    else if(p0.x < GLYPH_SIZE / 3 * 2)
    {
        angleMin = 0;
        angleMax = 180;
        radiusMin = GLYPH_SIZE / 3 / 3 * 2;
        radiusMax = GLYPH_SIZE / 3;
    }
    else if(p0.y < GLYPH_SIZE / 3)
    {
        angleMin = 180;
        angleMax = 270;
    }
    else if(p0.y < GLYPH_SIZE / 3 * 2)
    {
        angleMin = 90;
        angleMax = 270;
        radiusMin = GLYPH_SIZE / 3 / 3 * 2;
        radiusMax = GLYPH_SIZE / 3;
    }
    else
    {
        angleMin = 90;
        angleMax = 180;
    }

    let angle = randInt(angleMin / angleConstraint, angleMax / angleConstraint) * angleConstraint;
    let rad = randFloat(radiusMin, radiusMax);
    return new Point(
        p0.x + Math.floor(Math.cos(angle * Math.PI / 180) * rad),
        p0.y - Math.floor(Math.sin(angle * Math.PI / 180) * rad));
}

function randStroke(point) {
    const jagginess = 0.25;
    if(randFloat(0, 1) < jagginess)
    {
        let points = [ point ];
        for(let i = 0; i < Line.requiredPoints; ++i)
            points.push(point = genNextPoint(point));
        return new Line(points);
    }
    else
    {
        let points = [ point ];
        for(let i = 0; i < Bezier.requiredPoints; ++i)
            points.push(point = genNextPoint(point));
        return new Bezier(points);
    }
}



function genPart()
{
    // a part is made up of strokes.
    // we confine strokes vectors to 15deg or 45deg to give some sense of structure
    let strokes = [];

    // writing is commonly top-bottom, left-right, so we favor starting from the top
    let y0 = Math.floor(Math.abs(gaussRand()) * GLYPH_SIZE);
    let x0 = Math.floor(Math.abs(gaussRand()) * GLYPH_SIZE);
    let p0 = new Point(x0, y0);
    let startPoints = [ p0 ];

    const maxStrokes = 4;

    for(let i = 0; i < maxStrokes; ++i)
    {
        if(randInt(0, maxStrokes) < i)
            break;

        let stroke = randStroke(p0);
        strokes.push(stroke);
        startPoints.push(stroke.points[stroke.points.length - 1]);

        p0 = startPoints.splice(randInt(0, startPoints.length - 1), 1)[0];
    }

    return strokes;
}

function genGlyph(ctx)
{
    // // point starting from border
    // let dir = randInt(1,4);
    // let pt0 = {x:0, y:0};
    // if(dir == Direction.DOWN)
    // {
    //     pt0.x = (gaussRand() + 1) * GLYPH_SIZE * 0.5;
    // }
    // if(dir == Direction.UP)
    // {
    //     pt0.x = (gaussRand() + 1) * GLYPH_SIZE * 0.5;
    //     pt0.y = GLYPH_SIZE;
    // }
    // if(dir == Direction.RIGHT)
    // {
    //     pt0.y = (gaussRand() + 1) * GLYPH_SIZE * 0.5;
    // }
    // if(dir == Direction.LEFT)
    // {
    //     pt0.x = GLYPH_SIZE;
    //     pt0.y = (gaussRand() + 1) * GLYPH_SIZE * 0.5;
    // }

    // for(let part = 0; part < 4; ++part)
    // {
    //     if(randInt(0, 4) < part)
    //     {
    //         break;
    //     }

    //     points = genPoints(pt0, dir);
    //     pt0 = {x:pt0.x, y:pt0.y};
    //     console.log(part, points.slice(0));

    //     //figure out next start point
    //     if(randInt(0,1) == 0) // start from first or last point
    //     {
    //         pt0 = points[randInt(0, points.length - 1)];
    //     }
    //     else // random pointthat passes through prev path
    //     {
    //         if(dir == Direction.UP)
    //         {
    //             pt0.y = randInt(points[0].y, points[points.length - 1].y);
    //             pt0.x = randInt(0, Math.min(points[0].x, points[points.length - 1].x));
    //             dir = Direction.RIGHT;
    //         }
    //         else if(dir == Direction.DOWN)
    //         {
    //             pt0.y = randInt(points[points.length - 1].y, points[0].y);
    //             pt0.x = randInt(0, Math.min(points[0].x, points[points.length - 1].x));
    //             dir = Direction.RIGHT;
    //         }
    //         else if(dir == Direction.RIGHT)
    //         {
    //             pt0.x = randInt(points[0].x, points[points.length - 1].x);
    //             pt0.y = randInt(0, Math.min(points[0].y, points[points.length - 1].y));
    //             dir = Direction.DOWN;
    //         }
    //         else if(dir == Direction.LEFT)
    //         {
    //             pt0.x = randInt(points[points.length - 1].x, points[0].x);
    //             pt0.y = randInt(0, Math.min(points[0].y, points[points.length - 1].y));
    //             dir = Direction.DOWN;
    //         }
    //     }

    part = genPart();
    for(let i = 0; i < part.length; ++i)
    {
        part[i].draw(ctx);
    }

    // let ending_stroke = randInt(0, 3);
    
    // if(ending_stroke == 0)
    // {    
        // genGlyphLines(ctx, last_point.x, last_point.y);
    // }
    // else if(ending_stroke == 1)
    // {   
        // genGlyphQuadraticCurve(ctx, last_point.x, last_point.y);
    // }
    // else if(ending_stroke == 2)
    // {
       // genGlyphLines(ctx, last_point.x, last_point.y);
       // genGlyphQuadraticCurve(ctx, last_point.x, last_point.y);
    // }
    // else
    // {
       // genGlyphQuadraticCurve(ctx, last_point.x, last_point.y);
       // genGlyphLines(ctx, last_point.x, last_point.y);       
    // }

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
function genGlyphLines(ctx, x0, y0)
{
    ctx.beginPath();
    //Use last known position to connect the line and arcs
    let numLines = LINES_SIZE * settings.lines / 100.0;
      //Implement something to let user decide how many lines?
    for (var i = 0; i < numLines; ++i)
    {
        //let x0 = lasPosX;//randInt(16, GLYPH_SIZE - 16);
        //let y0 = lasPosY;//randInt(16, GLYPH_SIZE - 16);
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

function genGlyphQuadraticCurve(ctx, x0, y0)
{
    ctx.beginPath();
    
    // move to a random coordinate on the box
    //let x0 = randInt(16, GLYPH_SIZE - 16);
    //let y0 = randInt(16, GLYPH_SIZE - 16);
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
    gaussRandSeed = randInt(0, 65536);
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