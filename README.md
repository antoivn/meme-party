# Birthday Meme Maker 🎂

A simple, mobile-friendly web app to make memes for your birthday party. Search popular meme templates, add text in **English or Russian**, and download your meme.

## Features

- **Search** – Browse 100+ meme templates from Imgflip (Drake, Distracted Boyfriend, Bernie, etc.)
- **Top & bottom text** – Add your own captions; supports English and Russian (Cyrillic)
- **Download** – Save the meme as a PNG to your device
- **Mobile-first** – Designed for phones: large tap targets, no zoom on input focus, works in portrait/landscape

## How to run

**Easiest (Windows):** Double‑click **run.bat** in the `meme-party` folder. It will start a server and open the app in your browser.

**Step‑by‑step:** See **[HOW-TO-RUN.md](HOW-TO-RUN.md)** for detailed instructions (Python, Node.js, or using your phone on the same Wi‑Fi).

**Quick commands** (run in the `meme-party` folder):

- **Python:** `python -m http.server 8000` then open http://localhost:8000  
  (if that fails, try `py -m http.server 8000`)
- **Node.js:** `npx serve .` then open the URL shown (e.g. http://localhost:3000)

You must open the app via **http://localhost:...** in the browser, not by opening the HTML file directly, or images and download may not work.

## Usage

1. Use the search box to find a meme template (e.g. "Drake", "Bernie", "Cat").
2. Tap a template to open the editor.
3. Type top and bottom text (English or Russian).
4. Tap **Download meme** to save the image.

No account or API key required. Meme templates are loaded from [Imgflip's free API](https://api.imgflip.com/).

## Put it online (share a link)

To host the app in the cloud so anyone can open it (e.g. at a party), see **[DEPLOY-CLOUD.md](DEPLOY-CLOUD.md)**. Free options: **Netlify** (drag-and-drop), **GitHub Pages**, or **Surge**.
