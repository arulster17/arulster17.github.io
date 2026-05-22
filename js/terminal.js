(function () {
  'use strict';

  const termEl  = document.getElementById('terminal');
  const inputEl = document.getElementById('cmd-input');

  // ── Directory state ───────────────────────────────────
  let cwd = '~';

  function promptStr() {
    return 'arul:' + cwd + '$';
  }

  // ── Active prompt refs ────────────────────────────────
  let activeTypedEl  = null;
  let activeCursorEl = null;

  // ── Input state ───────────────────────────────────────
  let currentText = '';
  let cmdHistory  = [];
  let histIdx     = -1;
  let completionHintEl = null;
  let completionCycle  = null; // { candidates, prefix, idx } while cycling

  // ── Output helpers ────────────────────────────────────

  function append(html, cls) {
    const d = document.createElement('div');
    d.className = cls || 'out-line';
    d.innerHTML = html;
    termEl.appendChild(d);
    return d;
  }

  function line(html)  { return append(html, 'out-line'); }
  function blank()     { append('', 'out-blank'); }
  function rule()      { line('<span class="out-rule">────────────────────────────────────────────</span>'); }

  function scrollBottom() { termEl.scrollTop = termEl.scrollHeight; }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function btn(cmd, label) {
    return '<button class="cmd-btn" onclick="__term.run(' + JSON.stringify(cmd) + ')">'
      + esc(label || cmd) + '</button>';
  }

  function aext(url, label) {
    return '<a class="ext-link" href="' + esc(url) + '" target="_blank" rel="noopener">'
      + esc(label) + '</a>';
  }

  // ── Filesystem ────────────────────────────────────────
  //
  // Each node: { type: 'dir'|'file', entries?: [...], desc?: '...', show?: fn }
  // Paths are strings like '~', '~/projects', '~/blog/llm-serving'

  const FS = {
    '~': {
      type: 'dir',
      entries: ['about', 'github', 'linkedin', 'resume', 'projects', 'blog'],
    },

    '~/about': {
      type: 'file',
      show() {
        // TODO: replace with your actual bio
        line('<span class="c-muted">&lt;!-- TODO: add your bio here --&gt;</span>');
        blank();
      },
    },

    '~/github': {
      type: 'file',
      show() {
        line('<span class="c-accent">↗ </span>' + aext('https://github.com/arulster17', 'github.com/arulster17'));
        blank();
      },
    },

    '~/linkedin': {
      type: 'file',
      show() {
        line('<span class="c-accent">↗ </span>' + aext('https://www.linkedin.com/in/arulster17/', 'linkedin.com/in/arulster17'));
        blank();
      },
    },

    '~/resume': {
      type: 'file',
      show() {
        line('<span class="c-accent">↗ </span>' + aext('/Arul%20Mathur%20Resume.pdf', 'resume.pdf'));
        blank();
      },
    },

    '~/projects': {
      type: 'dir',
      entries: ['research', 'course-project-1', 'course-project-2'],
    },

    '~/projects/research': {
      type: 'file',
      show() {
        // TODO: replace with your actual research project
        line('<span class="bold">&lt;!-- TODO: research project name --&gt;</span>');
        line('<span class="chip">research</span> <span class="chip">ucsd</span>');
        blank();
        line('<span class="c-muted">&lt;!-- TODO: description --&gt;</span>');
        blank();
      },
    },

    '~/projects/course-project-1': {
      type: 'file',
      show() {
        // TODO: replace with your actual course project
        line('<span class="bold">&lt;!-- TODO: course project name --&gt;</span>');
        line('<span class="chip">course project</span>');
        blank();
        line('<span class="c-muted">&lt;!-- TODO: description --&gt;</span>');
        blank();
      },
    },

    '~/projects/course-project-2': {
      type: 'file',
      show() {
        // TODO: replace with your actual course project
        line('<span class="bold">&lt;!-- TODO: course project name --&gt;</span>');
        line('<span class="chip">course project</span>');
        blank();
        line('<span class="c-muted">&lt;!-- TODO: description --&gt;</span>');
        blank();
      },
    },

    '~/blog': {
      type: 'dir',
      entries: ['llm-serving'],
    },

    '~/blog/llm-serving': {
      type: 'dir',
      desc: 'understanding llm serving — how LLMs are served at scale',
      entries: ['01', '02', '03', '04'],
    },

    '~/blog/llm-serving/01': { type: 'file', show: postComingSoon },
    '~/blog/llm-serving/02': { type: 'file', show: postComingSoon },
    '~/blog/llm-serving/03': { type: 'file', show: postComingSoon },
    '~/blog/llm-serving/04': { type: 'file', show: postComingSoon },
  };

  function postComingSoon() {
    line('<span class="c-muted">[coming soon]</span>');
    blank();
  }

  // ── Path helpers ──────────────────────────────────────

  function resolvePath(target) {
    if (!target || target === '~') return '~';
    if (target === '.')            return cwd;
    if (target === '..') {
      if (cwd === '~') return '~';
      const i = cwd.lastIndexOf('/');
      return i <= 1 ? '~' : cwd.slice(0, i);
    }
    if (target.startsWith('~/')) return target;
    return cwd === '~' ? '~/' + target : cwd + '/' + target;
  }

  function lastName(path) {
    return path === '~' ? '~' : path.split('/').pop();
  }

  function cwdEntries() {
    const node = FS[cwd];
    return (node && node.type === 'dir') ? node.entries : [];
  }

  // ── Prompt management ─────────────────────────────────

  function createPrompt() {
    const div = document.createElement('div');
    div.className = 'prompt-line';
    div.innerHTML =
      '<span class="prompt">' + esc(promptStr()) + '&nbsp;</span>' +
      '<span class="typed-text"></span>' +
      '<span class="cursor">█</span>';
    termEl.appendChild(div);
    activeTypedEl  = div.querySelector('.typed-text');
    activeCursorEl = div.querySelector('.cursor');
    scrollBottom();
  }

  function freezePrompt(text) {
    if (completionHintEl) { completionHintEl.remove(); completionHintEl = null; }
    completionCycle = null;
    if (activeTypedEl)  activeTypedEl.textContent = text;
    if (activeCursorEl) activeCursorEl.remove();
    activeTypedEl  = activeCursorEl = null;
  }

  function syncTyped() {
    if (activeTypedEl) activeTypedEl.textContent = currentText;
  }

  // ── Commands ──────────────────────────────────────────

  function cmdHelp() {
    line('<span class="out-heading">commands</span>');
    rule();
    [
      ['ls',           'list directory contents'],
      ['cd &lt;dir&gt;',     'navigate into a directory'],
      ['cd ..',        'go up one level'],
      ['cat &lt;file&gt;',   'read a file'],
      ['pwd',          'show current path'],
      ['clear',        'clear the terminal'],
      ['help',         'show this message'],
    ].forEach(([name, desc]) => {
      line('  <span class="c-accent">' + name + '</span>  '
        + '<span class="c-muted">→ ' + esc(desc) + '</span>');
    });
    blank();
    line('<span class="c-muted">  ↑↓ history  ·  tab completion</span>');
    blank();
  }

  function cmdLs() {
    const node = FS[cwd];
    if (!node || node.type !== 'dir') return;
    node.entries.forEach(name => {
      const childPath = cwd === '~' ? '~/' + name : cwd + '/' + name;
      const child     = FS[childPath];
      const isDir     = child && child.type === 'dir';
      const label     = isDir ? name + '/' : name;
      const cls       = isDir ? 'c-accent' : 'c-text';
      const cmd       = isDir ? 'cd ' + name : 'cat ' + name;
      line('  <button class="cmd-btn ls-entry" onclick="__term.run(' + JSON.stringify(cmd) + ')">'
        + '<span class="' + cls + '">' + esc(label) + '</span></button>');
    });
    blank();
  }

  function cmdCd(args) {
    const target = args[0];
    if (!target) { cwd = '~'; return; }

    const path = resolvePath(target);
    const node = FS[path];

    if (!node) {
      line('<span class="c-error">cd: ' + esc(target) + ': no such directory</span>');
      blank();
      return;
    }
    if (node.type === 'file') {
      line('<span class="c-error">cd: ' + esc(target) + ': not a directory</span>');
      blank();
      return;
    }

    cwd = path;

    if (node.desc) {
      line('<span class="c-muted">' + esc(node.desc) + '</span>');
      blank();
    }
  }

  function cmdCat(args) {
    if (!args[0]) {
      line('<span class="c-error">cat: missing filename</span>');
      blank();
      return;
    }
    const path = resolvePath(args[0]);
    const node = FS[path];

    if (!node) {
      line('<span class="c-error">cat: ' + esc(args[0]) + ': no such file or directory</span>');
      blank();
      return;
    }
    if (node.type === 'dir') {
      line('<span class="c-error">cat: ' + esc(args[0]) + ': is a directory</span>');
      line('<span class="c-muted">  use ' + btn('ls') + ' to list its contents</span>');
      blank();
      return;
    }

    node.show();
  }

  function cmdPwd() {
    line(esc(cwd));
    blank();
  }

  function cmdClear() {
    termEl.innerHTML = '';
    activeTypedEl = activeCursorEl = null;
    createPrompt();
    inputEl.focus();
  }

  function cmdOpen(args) {
    const target = args.join(' ').toLowerCase().trim();
    if (target === 'github') {
      window.open('https://github.com/arulster17', '_blank', 'noopener');
      line('<span class="c-accent">↗</span> opening github.com/arulster17...');
      blank();
    } else if (target === 'linkedin') {
      window.open('https://www.linkedin.com/in/arulster17/', '_blank', 'noopener');
      line('<span class="c-accent">↗</span> opening linkedin.com/in/arulster17...');
      blank();
    } else {
      line('<span class="c-error">open: unknown target \'' + esc(target) + '\'</span>');
      line('<span class="c-muted">  try: open github · open linkedin</span>');
      blank();
    }
  }

  // ── Execute ───────────────────────────────────────────

  function run(raw) {
    raw = (raw || '').trim();
    freezePrompt(raw);

    if (raw) {
      cmdHistory.unshift(raw);
      if (cmdHistory.length > 200) cmdHistory.pop();
    }
    histIdx = -1;
    currentText = '';
    inputEl.value = '';

    if (raw) {
      const parts = raw.split(/\s+/);
      const verb  = parts[0].toLowerCase();
      const args  = parts.slice(1);

      switch (verb) {
        case 'help': case '?': cmdHelp();       break;
        case 'ls':             cmdLs();         break;
        case 'cd':             cmdCd(args);     break;
        case 'cat':            cmdCat(args);    break;
        case 'pwd':            cmdPwd();        break;
        case 'clear':
          cmdClear();
          return; // cmdClear already creates a new prompt
        default:
          line('<span class="c-error">command not found: ' + esc(verb) + '</span>');
          line('  type ' + btn('help') + ' for available commands');
          blank();
      }
    }

    createPrompt();
    inputEl.focus();
    scrollBottom();
  }

  window.__term = { run };

  // ── Input events ──────────────────────────────────────

  inputEl.addEventListener('input', () => {
    currentText = inputEl.value;
    syncTyped();
    histIdx = -1;
    completionCycle = null;
    if (completionHintEl) { completionHintEl.remove(); completionHintEl = null; }
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = currentText;
      currentText = '';
      inputEl.value = '';
      run(cmd);

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histIdx < cmdHistory.length - 1) {
        histIdx++;
        currentText = cmdHistory[histIdx];
        inputEl.value = currentText;
        syncTyped();
        setTimeout(() => { inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length; }, 0);
      }

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) {
        histIdx--;
        currentText = cmdHistory[histIdx];
      } else {
        histIdx = -1;
        currentText = '';
      }
      inputEl.value = currentText;
      syncTyped();

    } else if (e.key === 'Tab') {
      e.preventDefault();
      tabComplete();

    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      cmdClear();

    } else if (e.key === 'u' && e.ctrlKey) {
      e.preventDefault();
      currentText = '';
      inputEl.value = '';
      syncTyped();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('a, button') && !window.matchMedia('(pointer: coarse)').matches) {
      inputEl.focus();
    }
  });

  // ── Tab completion ─────────────────────────────────────

  const BASE_CMDS = ['cat ', 'cd ', 'clear', 'help', 'ls', 'pwd'];

  function tabComplete() {
    // If already cycling, advance to next candidate
    if (completionCycle) {
      completionCycle.idx = (completionCycle.idx + 1) % completionCycle.candidates.length;
      currentText = completionCycle.prefix + completionCycle.candidates[completionCycle.idx];
      inputEl.value = currentText;
      syncTyped();
      inputEl.focus();
      return;
    }

    if (!currentText) return;
    const parts   = currentText.split(/\s+/);
    const verb    = parts[0].toLowerCase();
    const partial = parts[1] || '';

    if (parts.length === 1) {
      // complete command name
      const matches = BASE_CMDS.filter(c => c.startsWith(verb));
      applySingleOrMulti(matches, currentText);

    } else if (verb === 'cd' || verb === 'cat') {
      const entries = cwdEntries();
      let matches = entries.filter(e => e.toLowerCase().startsWith(partial.toLowerCase()));

      if (verb === 'cd') {
        // only directories + '..'
        matches = matches.filter(e => {
          const p = cwd === '~' ? '~/' + e : cwd + '/' + e;
          return FS[p] && FS[p].type === 'dir';
        });
        if (cwd !== '~' && '..'.startsWith(partial)) matches.unshift('..');
      } else {
        // only files for cat
        matches = matches.filter(e => {
          const p = cwd === '~' ? '~/' + e : cwd + '/' + e;
          return FS[p] && FS[p].type === 'file';
        });
      }

      if (matches.length === 1) {
        currentText = verb + ' ' + matches[0];
        inputEl.value = currentText;
        syncTyped();
      } else if (matches.length > 1) {
        const prefix = lcp(matches);
        if (prefix.length > partial.length) {
          currentText = verb + ' ' + prefix;
          inputEl.value = currentText;
          syncTyped();
        }
        completionCycle = { candidates: matches, prefix: verb + ' ', idx: -1 };
        showCompletions(matches);
      }

    } else if (verb === 'open') {
      const opts = ['github', 'linkedin'].filter(o => o.startsWith(partial));
      if (opts.length === 1) {
        currentText = 'open ' + opts[0];
        inputEl.value = currentText;
        syncTyped();
      } else if (opts.length > 1) {
        completionCycle = { candidates: opts, prefix: 'open ', idx: -1 };
        showCompletions(opts);
      }
    }
  }

  function applySingleOrMulti(matches, original) {
    if (matches.length === 1) {
      currentText = matches[0];
      inputEl.value = currentText;
      syncTyped();
    } else if (matches.length > 1) {
      const trimmed = matches.map(m => m.trimEnd());
      const prefix = lcp(trimmed);
      if (prefix.length > original.length) {
        currentText = prefix;
        inputEl.value = currentText;
        syncTyped();
      }
      completionCycle = { candidates: trimmed, prefix: '', idx: -1 };
      showCompletions(trimmed);
    }
  }

  function lcp(strs) {
    if (!strs.length) return '';
    return strs.reduce((a, s) => {
      let i = 0;
      while (i < a.length && a[i] === s[i]) i++;
      return a.slice(0, i);
    });
  }

  function showCompletions(matches) {
    if (completionHintEl) completionHintEl.remove();
    completionHintEl = document.createElement('div');
    completionHintEl.className = 'out-line';
    completionHintEl.innerHTML = '<span class="completion-hint">  ' + matches.map(esc).join('    ') + '</span>';
    termEl.appendChild(completionHintEl);
    scrollBottom();
    inputEl.focus();
  }

  // ── Welcome ───────────────────────────────────────────

  function welcome() {
    const now    = new Date();
    const days   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const p      = n => String(n).padStart(2, '0');
    const dateStr = days[now.getDay()] + ' ' + months[now.getMonth()] + ' ' + p(now.getDate())
      + ' ' + p(now.getHours()) + ':' + p(now.getMinutes()) + ':' + p(now.getSeconds())
      + ' ' + now.getFullYear();

    line('<span class="c-text">Last login: ' + esc(dateStr) + '</span>');
    blank();
    line('<span class="c-text">============================================</span>');
    line('  <span class="c-accent">arul mathur</span>  <span class="c-text">cs @ uc san diego</span>');
    line('<span class="c-text">============================================</span>');
    line('<span class="c-text">Type ' + btn('help') + ' for a list of commands.</span>');
    blank();
    createPrompt();
    inputEl.focus();
  }

  welcome();

})();
