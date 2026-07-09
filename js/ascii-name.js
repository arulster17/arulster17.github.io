(function () {
  figlet.defaults({ fontPath: 'https://cdn.jsdelivr.net/npm/figlet@1.7.0/fonts' });

  var NAME       = 'arul mathur';
  var FONT       = 'Standard';
  var ART_SIZE   = '10px';   // font-size for the pre art
  var STEP_MS    = 70;
  var PAUSE_MS   = 10000;
  var INITIAL_MS = 3000;

  var cache   = {};
  var pending = 0;

  var uniqueChars = NAME.split('').filter(function (c, i, a) {
    return c !== ' ' && a.indexOf(c) === i;
  });

  pending = uniqueChars.length;
  if (!pending) return;

  uniqueChars.forEach(function (ch) {
    figlet.text(ch, { font: FONT }, function (err, result) {
      if (!err && result) {
        var lines = result.split('\n');
        while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
        cache[ch] = lines;
      } else {
        cache[ch] = [ch];
      }
      if (--pending === 0) build();
    });
  });

  function build() {
    var nameEl = document.querySelector('.info-name');
    if (!nameEl) return;

    var height = 0;
    for (var c in cache) {
      if (cache[c].length > height) height = cache[c].length;
    }

    var display = document.createElement('div');
    display.className = 'name-display';

    var animatable = [];

    NAME.split('').forEach(function (ch) {
      var span = document.createElement('span');
      span.className = 'name-char';

      if (ch === ' ') {
        span.className      += ' name-space';
        span.style.fontSize  = ART_SIZE;
        span.style.height    = (height * 1.2) + 'em';
        display.appendChild(span);
        return;
      }

      var artLines = cache[ch] || [ch];
      while (artLines.length < height) artLines.push('');

      var artWidth = 0;
      artLines.forEach(function (l) { if (l.length > artWidth) artWidth = l.length; });
      var artText = artLines.map(function (l) { return padEnd(l, artWidth); }).join('\n');

      // Plain: big character, natural width
      var plainEl = document.createElement('span');
      plainEl.className   = 'char-plain';
      plainEl.textContent = ch;
      span.appendChild(plainEl);

      // Art: figlet pre, hidden initially
      var artEl = document.createElement('pre');
      artEl.className   = 'char-art';
      artEl.textContent = artText;
      artEl.style.display = 'none';
      span.appendChild(artEl);

      span._artWidth = artWidth;

      // Always fix height to art dimensions — keeps all chars the same height
      // during the transition so plain text stays vertically centered, not jarring
      span.style.fontSize = ART_SIZE;
      span.style.height   = (height * 1.2) + 'em';

      display.appendChild(span);
      animatable.push(span);
    });

    nameEl.parentNode.replaceChild(display, nameEl);

    setTimeout(function () { step(animatable, 0, true); }, INITIAL_MS);
  }

  function step(els, idx, toArt) {
    var span    = els[idx];
    var plainEl = span.querySelector('.char-plain');
    var artEl   = span.querySelector('.char-art');

    if (toArt) {
      span.style.width      = span._artWidth + 'ch';
      plainEl.style.display = 'none';
      artEl.style.display   = '';
    } else {
      span.style.width      = '';
      artEl.style.display   = 'none';
      plainEl.style.display = '';
    }

    if (idx + 1 < els.length) {
      setTimeout(function () { step(els, idx + 1, toArt); }, STEP_MS);
    } else {
      setTimeout(function () { step(els, 0, !toArt); }, PAUSE_MS);
    }
  }

  function padEnd(str, len) {
    var s = str || '';
    var n = len - s.length;
    return n > 0 ? s + Array(n + 1).join(' ') : s;
  }

})();
