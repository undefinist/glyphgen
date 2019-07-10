const GLYPH_SIZE = 256;

var settings = {
    seed: "",
    lineWidth: 4
};

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

function randFloat(min, max)
{
    return Math.random() * (max - min) + min;
}
function randInt(min, max)
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
function genGlyph(ctx)
{
    ctx.beginPath();

    let x0 = randInt(16, GLYPH_SIZE - 16);
    let y0 = randInt(16, GLYPH_SIZE - 16);
    ctx.arc(x0, y0, randInt(4, 32), randFloat(0, Math.PI * 2), randFloat(0, Math.PI));
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