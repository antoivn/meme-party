(function () {
  'use strict';

  const MEMES_API = 'https://api.imgflip.com/get_memes';
  const MAX_DISPLAY_SIZE = 600; // max canvas side for performance on phones
  const IMAGE_FETCH_TIMEOUT_MS = 20000;

  // Try direct first (if CDN allows CORS), then CORS proxies as fallbacks
  function getProxyUrls(imageUrl) {
    const encoded = encodeURIComponent(imageUrl);
    return [
      null, // direct
      'https://corsproxy.io/?url=' + encoded,
      'https://corsproxy.org/?' + encoded,
      'https://api.allorigins.win/raw?url=' + encoded,
      'https://api.cors.lol/?url=' + encoded,
    ];
  }

  const $ = (id) => document.getElementById(id);
  const searchEl = $('search');
  const memeGrid = $('meme-grid');
  const loadingEl = $('loading');
  const noResultsEl = $('no-results');
  const browseSection = $('browse');
  const editorSection = $('editor');
  const backBtn = $('back');
  const canvas = $('canvas');
  const canvasLoadingEl = $('canvas-loading');
  const topTextEl = $('top-text');
  const bottomTextEl = $('bottom-text');
  const downloadBtn = $('download');

  let allMemes = [];
  let selectedMeme = null;
  let ctx = null;

  // Load meme templates from Imgflip (no API key needed)
  async function loadMemes() {
    try {
      const res = await fetch(MEMES_API);
      const data = await res.json();
      if (data.success && data.data && data.data.memes) {
        allMemes = data.data.memes;
        renderGrid(allMemes);
      } else {
        showError('Could not load memes. Try again later.');
      }
    } catch (err) {
      console.error(err);
      showError('Network error. Check connection and try again.');
    } finally {
      loadingEl.hidden = true;
    }
  }

  function showError(msg) {
    loadingEl.textContent = msg;
    loadingEl.hidden = false;
  }

  function filterMemes(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return allMemes;
    return allMemes.filter((m) => m.name.toLowerCase().includes(q));
  }

  function renderGrid(memes) {
    memeGrid.hidden = false;
    noResultsEl.classList.remove('visible');
    noResultsEl.hidden = true;

    if (memes.length === 0) {
      memeGrid.hidden = true;
      noResultsEl.hidden = false;
      noResultsEl.classList.add('visible');
      return;
    }

    memeGrid.innerHTML = memes
      .map(
        (m) =>
          `<button type="button" class="meme-card" data-id="${m.id}" data-url="${escapeAttr(m.url)}" data-name="${escapeAttr(m.name)}" data-width="${m.width}" data-height="${m.height}">
            <img src="${escapeAttr(m.url)}" alt="" loading="lazy" crossorigin="anonymous">
            <span>${escapeHtml(m.name)}</span>
          </button>`
      )
      .join('');

    memeGrid.querySelectorAll('.meme-card').forEach((btn) => {
      btn.addEventListener('click', () => selectMeme(btn.dataset));
    });
  }

  function escapeAttr(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML.replace(/"/g, '&quot;');
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function revokeMemeObjectUrl() {
    if (selectedMeme && selectedMeme.objectUrl) {
      URL.revokeObjectURL(selectedMeme.objectUrl);
      selectedMeme.objectUrl = null;
    }
  }

  async function fetchImageAsBlob(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { mode: 'cors', signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('Image fetch failed');
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) throw new Error('Not an image');
      return URL.createObjectURL(blob);
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  async function loadImageViaProxy(imageUrl) {
    const urls = getProxyUrls(imageUrl);
    let lastErr;
    for (const proxyUrl of urls) {
      const url = proxyUrl !== null ? proxyUrl : imageUrl;
      try {
        return await fetchImageAsBlob(url);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Image fetch failed');
  }

  function selectMeme(data) {
    revokeMemeObjectUrl();
    selectedMeme = {
      id: data.id,
      url: data.url,
      name: data.name,
      width: parseInt(data.width, 10) || 500,
      height: parseInt(data.height, 10) || 500,
    };
    browseSection.hidden = true;
    editorSection.hidden = false;
    topTextEl.value = '';
    bottomTextEl.value = '';
    if (canvasLoadingEl) {
      canvasLoadingEl.textContent = 'Loading image…';
      canvasLoadingEl.classList.remove('hidden');
    }
    topTextEl.focus();

    loadImageViaProxy(selectedMeme.url)
      .then((objectUrl) => {
        if (!selectedMeme) return;
        selectedMeme.objectUrl = objectUrl;
        if (canvasLoadingEl) canvasLoadingEl.classList.add('hidden');
        drawMeme();
      })
      .catch((err) => {
        console.error(err);
        if (canvasLoadingEl) {
          canvasLoadingEl.textContent = 'Image failed to load. Try another meme.';
          canvasLoadingEl.classList.remove('hidden');
        }
      });
  }

  function goBack() {
    revokeMemeObjectUrl();
    selectedMeme = null;
    editorSection.hidden = true;
    browseSection.hidden = false;
  }

  function scaleSize(w, h, max) {
    if (w <= max && h <= max) return { w, h };
    const r = Math.min(max / w, max / h);
    return { w: Math.round(w * r), h: Math.round(h * r) };
  }

  function drawMeme() {
    if (!selectedMeme || !canvas) return;
    if (!selectedMeme.objectUrl) return;

    const img = new Image();

    img.onload = function () {
      const { width: tw, height: th } = scaleSize(
        selectedMeme.width,
        selectedMeme.height,
        MAX_DISPLAY_SIZE
      );
      canvas.width = tw;
      canvas.height = th;
      ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, tw, th);

      const topText = (topTextEl && topTextEl.value) || '';
      const bottomText = (bottomTextEl && bottomTextEl.value) || '';

      // Meme-style text: white with black outline, centered
      const fontSize = Math.max(24, Math.floor(tw / 18));
      ctx.font = `bold ${fontSize}px "PT Sans", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      const padding = 12;
      const lineHeight = fontSize * 1.2;

      function drawStrokeText(text, x, y) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = Math.max(2, Math.floor(fontSize / 10));
        ctx.strokeText(text, x, y);
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x, y);
      }

      function wrapLines(text, maxWidth) {
        const words = text.split(/\s+/);
        const lines = [];
        let line = '';
        for (const word of words) {
          const test = line ? line + ' ' + word : word;
          const m = ctx.measureText(test);
          if (m.width > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);
        return lines.length ? lines : [''];
      }

      const maxTextWidth = tw - padding * 2;
      const topLines = wrapLines(topText, maxTextWidth);
      const bottomLines = wrapLines(bottomText, maxTextWidth);

      let y = padding;
      for (const line of topLines) {
        drawStrokeText(line, tw / 2, y);
        y += lineHeight;
      }

      y = th - padding - bottomLines.length * lineHeight;
      for (const line of bottomLines) {
        drawStrokeText(line, tw / 2, y);
        y += lineHeight;
      }
    };

    img.onerror = function () {
      if (ctx && canvas.width && canvas.height) {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Image failed to load', canvas.width / 2, canvas.height / 2);
      }
    };

    img.src = selectedMeme.objectUrl;
  }

  function downloadMeme() {
    if (!selectedMeme || !canvas || !canvas.width || !canvas.height) return;
    try {
      const link = document.createElement('a');
      link.download = `meme-${selectedMeme.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      alert('Download failed. Try taking a screenshot of the meme instead.');
    }
  }

  // Search with slight debounce
  let searchTimeout;
  searchEl.addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderGrid(filterMemes(searchEl.value));
    }, 150);
  });

  searchEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') searchEl.blur();
  });

  topTextEl.addEventListener('input', drawMeme);
  bottomTextEl.addEventListener('input', drawMeme);
  backBtn.addEventListener('click', goBack);
  downloadBtn.addEventListener('click', downloadMeme);

  loadMemes();
})();
