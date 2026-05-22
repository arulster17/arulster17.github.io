# arulster17.github.io — Project Notes

Personal website for Arul Mathur (UC San Diego). Hosted on GitHub Pages at arulster17.github.io.

## Stack
Plain HTML/CSS/JS — no framework, no build step. Serves directly from the repo root.

To preview locally:
```
cd C:\Users\Arul\Projects\arulster17.github.io
python -m http.server 8080
```
Then open http://localhost:8080. Always use a server (not file://) — absolute paths won't work otherwise.

## Concept
The site is a **terminal emulator**. Visitors can type real commands (`ls`, `cd`, `cat`, `pwd`) to navigate content organized as a fake filesystem. A quickbar at the top provides mouse-accessible shortcuts.

## Files
```
index.html                  ← main page (terminal shell + quickbar)
css/style.css               ← all styles (terminal + fallback pages)
js/terminal.js              ← full terminal engine (filesystem, commands, input)
projects/index.html         ← fallback projects page (not the main experience)
blog/index.html             ← fallback blog page
blog/llm-serving/index.html ← fallback blog series page
Arul Mathur Resume.pdf      ← resume, served at root
```

## Terminal filesystem (defined in js/terminal.js → `const FS`)
```
~
├── about              (file — bio, currently placeholder TODO)
├── resume.pdf         (file — opens /Arul%20Mathur%20Resume.pdf in new tab)
├── projects/          (directory)
│   ├── research       (file — UCSD research project, placeholder TODO)
│   ├── course-project-1  (file — placeholder TODO)
│   └── course-project-2  (file — placeholder TODO)
└── blog/              (directory)
    └── llm-serving/   (directory — series, has desc: shown on cd)
        ├── 01         (file — coming soon)
        ├── 02         (file — coming soon)
        ├── 03         (file — coming soon)
        └── 04         (file — coming soon)
```

## Terminal commands
`ls`, `cd <dir>`, `cd ..`, `cat <file>`, `pwd`, `open github`, `open linkedin`, `clear`, `help`

Keyboard: ↑↓ history, Tab completion (context-aware: cd→dirs, cat→files), Ctrl+L clear, Ctrl+U clear line.

## Quickbar links (index.html)
Left-to-right: `arul mathur` brand | `about` `projects` `blog` (run terminal commands) | `github` `linkedin` `resume` (open external)

- **about** → runs `cat about`
- **projects** → runs `cd projects`
- **blog** → runs `cd blog`
- **github** → https://github.com/arulster17
- **linkedin** → https://www.linkedin.com/in/arulster17/
- **resume** → /Arul%20Mathur%20Resume.pdf

## Design
- Dark terminal aesthetic: bg `#0d0d0d`, text `#d4d4d4`, accent `#64ffda` (cyan-green)
- Font: JetBrains Mono throughout (Google Fonts)
- Subtle CRT scanline overlay (CSS `body::after`)
- All CSS variables in `:root` in style.css — easy to retheme

## What's TODO (content placeholders)
All content placeholders are in `js/terminal.js` in the `FS` object:
- `~/about` → `show()` function: replace placeholder with actual bio
- `~/projects/research` → add real UCSD research project name + description
- `~/projects/course-project-1` and `course-project-2` → real project names/descriptions; these should eventually be renamed to actual project slugs
- `~/blog/llm-serving/01–04` → replace "coming soon" with real post content; rename slugs to actual post titles

To add a new project: add an entry to `FS['~/projects'].entries` and add a new `'~/projects/your-slug'` node with a `show()` function.

To add a blog post: update `FS['~/blog/llm-serving'].entries` and add a corresponding node.

## What's NOT done yet
- Actual bio content
- Real project names/descriptions
- Blog post titles and content for the LLM serving series
- Course project demos (mentioned as future work — figure out individually)
- Deploying to GitHub Pages (just needs `git push`)
- The fallback pages (projects/, blog/) still have TODO placeholders in HTML

## Key decisions made
- Plain HTML/CSS/JS (no React, no Astro, no Jekyll)
- Terminal as primary navigation, quickbar for mouse users
- Blog posts hosted directly on site as HTML (not linked to Medium) — low priority
- No file permissions display in ls output (explicitly removed as overkill)
- Prompt flows inline with output (no sticky bottom input bar)
