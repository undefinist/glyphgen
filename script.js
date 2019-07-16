const GLYPH_SIZE       = 256;
const LINES_SIZE       = 4.0;
const CURVES_SIZE      = 6.0;
const LINE_WIDTH_SIZE  = 10.0;
const LINE_LENGTH_SIZE = 256.0;
const MID_POINT_X_SIZE = 100.0;
const MID_POINT_Y_SIZE = 100.0;

var settings = {

    $params: $("#params-sidebar"),

    saveSetting: function(name, val) {
        this[name] = val;
        if(window.localStorage["glyphgen.settings"] === undefined) {
            let obj = {};
            obj[name] = val;
            window.localStorage["glyphgen.settings"] = JSON.stringify(obj);
        }
        else {
            let obj = JSON.parse(window.localStorage["glyphgen.settings"]);
            obj[name] = val;
            window.localStorage["glyphgen.settings"] = JSON.stringify(obj);
        }
    },

    load: function() {
        if(window.localStorage["glyphgen.settings"] !== undefined) {
            let obj = JSON.parse(window.localStorage["glyphgen.settings"]);
            for (const key in obj) {
                settings[key] = obj[key];
                let id = key.replace(/\s/g, "-");
                if(obj[key] === true || obj[key] === false)
                    $("#" + id)[0].checked = obj[key];
                else
                {
                    $("#" + id).val(obj[key]);
                    $("#" + id + "-val").text(obj[key]);
                }
            }
        }
    },

    addRange: function(name, label, min, max, step, defaultValue) {
        let id = name.replace(/\s/g, "-");
        this.$params.append(
            `<label for="${id}">${label}</label>` +
            `<span class="slider-value" id="${id}-val">${defaultValue}</span>` +
            '<div class="input-group mb-3">' +
                `<input type="range" class="custom-range" id="${id}" min="${min}" max="${max}" step="${step}" value="${defaultValue}">` +
            '</div>');
        $("#" + id).on("input", function() {
            settings.saveSetting(name, $(this).val());
            $("#" + id + "-val").text($(this).val());
            gen();
        });
        this[name] = defaultValue;
    },
    addBool: function(name, label, defaultValue) {
        let id = name.replace(/\s/g, "-");
        this.$params.append(
            '<div class="custom-control custom-switch mb-3">' +
                `<input type="checkbox" class="custom-control-input" id="${id}" ${defaultValue ? "checked" : ""}>` +
                `<label class="custom-control-label" for="${id}">${label}</label>` +
            "</div>");
        $("#" + id).on("input", function() {
            settings.saveSetting(name, this.checked);
            gen();
        });
        this[name] = defaultValue;
    },

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

// init canvas widths and heights (easier to do from here)
// this sizes are separate from the actual widths and heights in the browser
// ie these are the true sizes; will be scaled to browser size.
var $canvases = $(".glyph > canvas");
$canvases.attr("width", GLYPH_SIZE).attr("height", GLYPH_SIZE);

Math.seedrandom(); // replace Math.random using lib seedrandom
$("#seed").on("input", function() {
    settings.saveSetting("seed", $(this).val());
    gen();
});
$("#randomize-btn").on("click", function() {
    const map = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let str = "";
    for(let i = 0; i < 5; ++i)
        str += map[random.int(0, map.length - 1)];
    settings.seed = str;
    $("#seed").val(str);
    gen();
});

settings.addBool("normalize", "Normalize Glyph", false);
settings.addRange("lineWidth", "Line Width", 1, 32, 1, 8);
settings.addRange("jagginess", "Jagginess", 0, 1, 0.1, 0.3);
settings.addRange("angleVariance", "Angular Variance", 1, 10, 1, 3);
settings.addRange("minStrokes", "Min Strokes (per part)", 1, 6, 1, 1);
settings.addRange("maxStrokes", "Max Strokes (per part)", 1, 6, 1, 4);
settings.addRange("minParts", "Min Parts (per glyph)", 1, 4, 1, 1);
settings.addRange("maxParts", "Max Parts (per glyph)", 1, 4, 1, 1);
settings.addRange("arcWeight", "Arc Weight", 0, 1, 0.1, 0.5);
settings.load();

var random = {
    prerolledValues: [],

    // discards any prerolled values, then prerolls values
    preroll: function(count) {
        this.prerolledValues = [];
        for(let i = 0; i < count; ++i)
            this.prerolledValues.push(Math.random());
    },

    // gets from prerolled, or rolls. [0, 1)
    get: function() {
        return this.prerolledValues.length == 0 ? Math.random() : this.prerolledValues.shift();
    },

    // [min, max)
    number: function(min = 0, max = 1) {
        return this.get() * (max - min) + min;
    },
  
    // [min, max]
    int: function(min = 0, max = 100) {
        return Math.floor(this.get() * (max - min + 1)) + min;
    },

    // ~ [-1, 1]
    gaussian: function() {
        var u = 0, v = 0;
        while(u === 0) u = this.get(); //Converting [0,1) to (0,1)
        while(v === 0) v = this.get();
        return Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v ) / 3;
    }
}


function clamp(value, min, max)
{
    return value < min ? min : (value > max ? max : value);
}



class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static difference(p0, p1) { return new Point(p0.x - p1.x, p0.y - p1.y); }
}



class Stroke {
    constructor(points) {
        this.points = points;
    }
    draw(ctx) {}
    get bounds() {
        let rect = { min: new Point(GLYPH_SIZE, GLYPH_SIZE), max: new Point(0, 0) };
        for (const pt of this.points) {
            rect.min.x = Math.min(pt.x, rect.min.x);
            rect.min.y = Math.min(pt.y, rect.min.y);
            rect.max.x = Math.max(pt.x, rect.max.x);
            rect.max.y = Math.max(pt.y, rect.max.y);
        }
        return rect;
    }

    clonePoints() {
        let pts = [];
        for (const pt of this.points) {
            pts.push(new Point(pt.x, pt.y));
        }
        return pts;
    }
    clone() {}
}
class Line extends Stroke {
    static get requiredPoints() { return 2; }
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.lineTo(this.points[1].x, this.points[1].y);
        ctx.stroke();
    }
    clone() { return new Line(this.clonePoints()); }
}
class Bezier extends Stroke {
    static get requiredPoints() { return 4; }
    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.bezierCurveTo(this.points[1].x, this.points[1].y, this.points[2].x, this.points[2].y, this.points[3].x, this.points[3].y);
        ctx.stroke();
    }
    clone() { return new Bezier(this.clonePoints()); }
}
class Arc extends Stroke {
    constructor(points, r, a, s) {
        super(points);
        this.r = r ? r : random.int(GLYPH_SIZE / 12, GLYPH_SIZE / 6);
        this.a = a ? a : Math.PI * (random.gaussian() + 1);
        this.s = s ? s : random.number(0, Math.PI * 2);
    }
    static get requiredPoints() { return 1; }
    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.points[0].x, this.points[0].y, this.r, this.s, this.s+this.a);
        ctx.stroke();
    }
    clone() { return new Arc(this.clonePoints(), this.r, this.a, this.s); }
    get bounds() {
        return { min: new Point(this.points[0].x - this.r, this.points[0].y - this.r),
                 max: new Point(this.points[0].x + this.r, this.points[0].y + this.r)};
    }
}



var strokeModifiers = {
    translate: function(stroke, delta) {
        stroke = stroke.clone();
        for (let pt of stroke.points) {
            pt.x += delta.x;
            pt.y += delta.y;
        }
        return stroke;
    },
    mirror: function(stroke, axis, c) {
        stroke = stroke.clone();
        for (let pt of stroke.points) {
            if(axis === "y")
                pt.y += (c - pt.y) * 2;
            else
                pt.x += (c - pt.x) * 2;
        }
        if(stroke.constructor.name == "Arc") {
            if(axis === "y")
                stroke.s = -stroke.s;
            else
                stroke.s = Math.PI - stroke.s;
            stroke.a = -stroke.a;
        }
        return stroke;
    },
    rotate90: function(stroke, center) {
        stroke = stroke.clone();
        for (let pt of stroke.points) {
            let px = pt.x;
            pt.x = center.x + pt.y - center.y;
            pt.y = center.y + px - center.x;
        }
        if(stroke.constructor.name == "Arc")
            stroke.s += Math.PI / 2;
        return stroke;
    },
    scale: function(stroke, center, mag) {
        stroke = stroke.clone();
        for (let pt of stroke.points) {
            pt.x = center.x + (pt.x - center.x) * mag;
            pt.y = center.y + (pt.y - center.y) * mag;
        }
        if(stroke.constructor.name == "Arc")
            stroke.r *= mag;
        return stroke;
    },
    vary: function(stroke, maxOffset) {
        stroke = stroke.clone();
        for (let pt of stroke.points) {
            pt.x += random.gaussian() * maxOffset;
            pt.y += random.gaussian() * maxOffset;
        }
        if(stroke.constructor.name == "Arc") {
            stroke.r += random.gaussian() * maxOffset;
            stroke.a += random.gaussian() * maxOffset;
            stroke.s += random.gaussian() * maxOffset;
        }
        return stroke;
    }
}



function genNextPoint(p0) {

    const angleConstraint = 90 / settings.angleVariance;

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

    let angle = random.int(angleMin / angleConstraint, angleMax / angleConstraint) * angleConstraint;
    let rad = random.number(radiusMin, radiusMax);
    return new Point(
        p0.x + Math.floor(Math.cos(angle * Math.PI / 180) * rad),
        p0.y - Math.floor(Math.sin(angle * Math.PI / 180) * rad));
}



function randStroke(point) {
    if(random.number(0, 1) < settings.jagginess)
    {
        let points = [ point ];
        for(let i = 1; i < Line.requiredPoints; ++i)
            points.push(point = genNextPoint(point));
        return new Line(points);
    }
    else
    {
        if(random.number(0, 1) < settings.arcWeight)
        {
            let points = [ point ];
            for(let i = 1; i < Arc.requiredPoints; ++i)
                points.push(point = genNextPoint(point));
            return new Arc(points);
        }
        else
        {
            let points = [ point ];
            for(let i = 1; i < Bezier.requiredPoints; ++i)
                points.push(point = genNextPoint(point));
            return new Bezier(points);
        }
    }
}

function reuseStroke(point, stroke) {
    let bounds = stroke.bounds;

    let modStrokes = [];
    modStrokes.push(strokeModifiers.mirror(stroke, "x", (bounds.max.x + bounds.min.x) * 0.5));
    modStrokes.push(strokeModifiers.mirror(stroke, "y", (bounds.max.y + bounds.min.y) * 0.5));
    modStrokes.push(strokeModifiers.rotate90(stroke, stroke.points[0]));
    modStrokes.push(strokeModifiers.rotate90(modStrokes[modStrokes.length - 1], stroke.points[0]));
    modStrokes.push(strokeModifiers.rotate90(modStrokes[modStrokes.length - 1], stroke.points[0]));

    // repeat stroke starting from point
    let delta = Point.difference(stroke.points[0], point);
    modStrokes.push(strokeModifiers.translate(stroke, delta));
    for(let i = 0; i < 5; ++i) {
        modStrokes.push(strokeModifiers.translate(modStrokes[i], delta));
    }

    // add translated version of original stroke
    let offset = Point.difference(genNextPoint(point), point);
    modStrokes.push(strokeModifiers.translate(stroke, offset));

    for(let i = 0; i < modStrokes.length; ++i) {
        bounds = modStrokes[i].bounds;
        if(bounds.min.x < 0 || bounds.min.y < 0 || bounds.max.x > GLYPH_SIZE || bounds.max.y > GLYPH_SIZE)
            modStrokes.splice(i--, 1);
    }

    if(modStrokes.length == 0)
        return null;

    let i = random.int(0, modStrokes.length - 1);
    return modStrokes[i];
}

function genPart()
{
    // a part is made up of strokes.
    // we confine strokes vectors to 15deg or 45deg to give some sense of structure
    let strokes = [];

    // writing is commonly top-bottom, left-right, so we favor starting from the top
    let y0 = Math.floor(Math.abs(random.gaussian()) * GLYPH_SIZE);
    let x0 = Math.floor(Math.abs(random.gaussian()) * GLYPH_SIZE);
    let p0 = new Point(x0, y0);
    let startPoints = [ p0 ];

    for(let i = 0; i < settings.maxStrokes; ++i)
    {
        if(random.int(0, settings.maxStrokes - settings.minStrokes) < i - settings.minStrokes + 1)
            break;

        let stroke = null;
        if(strokes.length > 0 && random.number(0, 1) < 0.5)
            stroke = reuseStroke(p0, strokes[random.int(0, strokes.length - 1)]);
        if(stroke == null)
            stroke = randStroke(p0);
        
        strokes.push(stroke);
        startPoints.push(stroke.points[stroke.points.length - 1]);

        p0 = startPoints.splice(random.int(0, startPoints.length - 1), 1)[0];
    }

    return strokes;
}

function genGlyph(ctx)
{
    random.preroll(200);

    let parts = [];
    for(let part = 0; part < settings.maxParts; ++part) {
        if(random.int(0, settings.maxParts - settings.minParts) < part - settings.minParts + 1)
            break;
        parts.push(genPart());
    }

    // center glyph
    let bounds = parts[0][0].bounds;
    for(const part of parts) {
        for (const stroke of part) {
            let strokeBounds = stroke.bounds;
            bounds.min.x = Math.min(strokeBounds.min.x, bounds.min.x);
            bounds.min.y = Math.min(strokeBounds.min.y, bounds.min.y);
            bounds.max.x = Math.max(strokeBounds.max.x, bounds.max.x);
            bounds.max.y = Math.max(strokeBounds.max.y, bounds.max.y);
        }
    }
    let center = new Point((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2);
    let delta = Point.difference(new Point(GLYPH_SIZE / 2, GLYPH_SIZE / 2), center);
    let scale = (GLYPH_SIZE - settings.lineWidth * 2) / Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y);

    for(const part of parts) {
        for (const stroke of part) {
            let s = strokeModifiers.translate(stroke, delta);
            if(settings.normalize)
                s = strokeModifiers.scale(s, new Point(GLYPH_SIZE / 2, GLYPH_SIZE / 2), scale);
            s.draw(ctx);
        }
    }

    // let ending_stroke = random.int(0, 3);
    
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
    //     let x0 = random.int(16, GLYPH_SIZE - 16);
    //     let y0 = random.int(16, GLYPH_SIZE - 16);
    //     //Save last known position
    //     lasPosX = x0 + random.int(0, 6);
    //     lasPosY = y0 + random.int(0, 6);
    //     ctx.arc(x0, y0, random.int(4, 32), random.number(0, rad * 2), random.number(0, rad));   
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
        //let x0 = lasPosX;//random.int(16, GLYPH_SIZE - 16);
        //let y0 = lasPosY;//random.int(16, GLYPH_SIZE - 16);
        // move to a random coordinate on the box
        ctx.moveTo(x0, y0);
        //Get a random direction
        let ranRadY = Math.sin(random.number(0.0, Math.PI));
        let ranRadX = Math.cos(random.number(0.0, Math.PI));
        let mag = settings.lineLength * LINE_LENGTH_SIZE / 100.0;
        lasPosX = clamp(x0 + ranRadX * mag, 0, GLYPH_SIZE);
        lasPosY = clamp(y0 + ranRadY * mag, 0, GLYPH_SIZE);
        // draw a line from moveTo to another random point
        //ctx.lineTo(random.int(x0+ 16, GLYPH_SIZE - 16), random.int(16 + y0, GLYPH_SIZE - 16));
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
    //let x0 = random.int(16, GLYPH_SIZE - 16);
    //let y0 = random.int(16, GLYPH_SIZE - 16);
    ctx.moveTo(x0, y0);
    
    // end point
    let x_end = random.int(10, GLYPH_SIZE - 10);
    let y_end = random.int(10, GLYPH_SIZE - 10);
    
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
        ctx.lineWidth = settings.lineWidth;
        genGlyph(ctx);
    }
}

gen();
