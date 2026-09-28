# Readapt Lab

Readapt Lab is a privacy-first Chrome extension that personalizes digital typography and measures how presentation affects reading comprehension, reading time, and perceived fatigue.

> **Status:** working research prototype, version 0.3.0. Readapt is not a diagnostic or medical product.

![Readapt Lab welcome screen](docs/screenshots/welcome.png)

## Why Readapt?

Most reading tools offer the same accessibility preset to every user. Readapt explores a different hypothesis: the most effective presentation may vary between readers, and a short behavioral calibration may identify a better individual configuration.

The project combines:

- human-computer interaction and accessible design;
- browser-extension engineering;
- randomized within-product experiments;
- interpretable personalization;
- local, privacy-preserving analytics.

## Research question

**Does individually calibrated typography improve reading comprehension or reduce perceived fatigue compared with standard web presentation?**

The current prototype records comprehension score, reading duration, and self-reported fatigue. Comprehension receives the greatest weight during calibration so that the system does not reward fast but superficial reading.

## Product walkthrough

| Reading controls | Automatic calibration | Results dashboard |
|---|---|---|
| ![Reading controls](docs/screenshots/popup.png) | ![Calibration](docs/screenshots/calibration.png) | ![Dashboard](docs/screenshots/dashboard.png) |

## Current features

- Six typography controls: font family, font size, line height, letter spacing, word spacing, and column width.
- Background color with automatic light/dark text selection.
- Distraction-free mode and a cursor-following reading ruler.
- Paragraph-focus mode and browser-based text-to-speech.
- Presets for calm, focused, and night reading.
- Per-site profiles and a persistent global profile.
- Four-condition automatic calibration based on comprehension, time, and comfort.
- Randomized standard-versus-personalized reading sessions.
- Research mode with an anonymous participant code, consent record, concealed condition, and balanced condition assignment.
- Local dashboard comparing comprehension, time, and fatigue.
- JSON and CSV export for later statistical analysis.

## Installation

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Select the repository folder—the folder that directly contains `manifest.json`.
6. Pin **Readapt Lab** from Chrome's extensions menu.

After installation, Readapt opens a welcome page containing a sample article.

## Basic use

1. Open a regular webpage containing a long-form article.
2. Select the Readapt icon in the Chrome toolbar.
3. Adjust the typography manually or select **Automatic calibration**.
4. Start a reading session.
5. Finish the session and answer the comprehension questions.
6. Open **My results** to compare conditions or export the data.

Readapt cannot modify `chrome://` pages, the Chrome Web Store, other extension pages, or Chrome's built-in PDF viewer.

## Experimental design

Research mode assigns either the original page presentation (**standard condition**) or the reader's saved profile (**personalized condition**). The condition label is concealed from the participant. If stored group counts are unequal, the next session is assigned to the smaller group; otherwise assignment is random.

Each completed session stores:

- anonymous participant code;
- experimental condition;
- timestamp and reading duration;
- comprehension score;
- perceived fatigue from 1 to 5;
- typography configuration;
- article title and URL.

No participant names or medical diagnoses are required.

## Privacy

All profiles, temporary article text, consent settings, and results are stored locally with `chrome.storage.local`. The extension makes no network requests and does not send article content or research results to a server.

Researchers should remove URLs or other potentially identifying fields before sharing exported datasets.

## Accessibility

The extension includes visible keyboard focus, labeled controls, contrast-aware text colors, keyboard-operable buttons, and layouts that adapt to narrow screens. Accessibility of the extension itself remains an ongoing evaluation target.

## Known limitations

- Article extraction is heuristic and works best on semantic pages using `article`, `main`, and `p` elements.
- Automatically generated cloze questions primarily measure recognition, not deep inference or identification of the main idea.
- The calibration texts are a small prototype set and have not yet been independently validated for equal difficulty.
- Reading speed is not normalized by article word count in the current dashboard.
- PDF documents are not supported.
- Distraction removal may hide useful navigation on unusual page layouts.
- No claims about benefits for dyslexia, ADHD, or any clinical group should be made without a properly reviewed study.

## Planned evaluation

Before participant recruitment, the experimental protocol should be reviewed by a qualified research mentor. A stronger study will use counterbalanced, difficulty-matched texts; manually validated comprehension questions; preregistered hypotheses; and appropriate consent procedures, particularly for participants under 18.

## Technology

- Chrome Extension Manifest V3
- Vanilla HTML, CSS, and JavaScript
- `chrome.storage.local`
- Web Speech API
- No build system, server, analytics SDK, or external runtime dependency

## Project structure

```text
readapt-lab/
├── manifest.json
├── content.js
├── service-worker.js
├── popup.*
├── calibration.*
├── research.*
├── quiz.*
├── dashboard.*
├── welcome.*
└── docs/screenshots/
```

## Author

Developed by Polina Smolina as an independent project at the intersection of computer science, data science, accessible computing, and experimental research.

## License

No open-source license has been selected yet. Until a license is added, the source code is publicly viewable but standard copyright restrictions apply.
