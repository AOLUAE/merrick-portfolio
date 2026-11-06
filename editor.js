/**
 * Portfolio Editor - Built-in editing mode for portfolio website
 * Features: text editing, image replacement, localStorage persistence, ZIP export
 * Usage: Ctrl+Shift+E or ?edit=true
 */
(function() {
  'use strict';

  // ─── Config ───────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'portfolio-edits';
  const PAGES = {
    'index': 'index.html',
    'fpv': 'project-dmkr-fpv.html',
    'elecom': 'project-elecom.html',
    'dryer': 'project-pet-dryer.html',
    'antarikha': 'project-antarikha.html'
  };
  const PAGE_NAMES = {
    'index': '首页',
    'fpv': 'FPV 眼镜',
    'elecom': '直发器',
    'dryer': '烘干器',
    'antarikha': '无人机'
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  let editMode = false;
  let edits = {};
  let fileInput = null;
  let currentEditId = null;
  let currentEditEl = null;

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    // Load saved edits
    try { edits = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e) { edits = {}; }

    // Check URL param or saved state
    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === 'true' || localStorage.getItem('portfolio-edit-mode') === 'true') {
      enableEditMode();
    }

    // Register keyboard shortcut
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        toggleEditMode();
      }
    });

    // Apply saved edits on load
    applyEdits();
  }

  // ─── Edit Mode Toggle ───────────────────────────────────────────────────────
  function toggleEditMode() {
    if (editMode) disableEditMode();
    else enableEditMode();
  }

  function enableEditMode() {
    editMode = true;
    localStorage.setItem('portfolio-edit-mode', 'true');
    injectStyles();
    activateEditables();
    showToolbar();
    document.body.classList.add('pf-edit-active');
  }

  function disableEditMode() {
    editMode = false;
    localStorage.setItem('portfolio-edit-mode', 'false');
    removeStyles();
    deactivateEditables();
    hideToolbar();
    document.body.classList.remove('pf-edit-active');
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  var _styleEl = null;
  function injectStyles() {
    if (_styleEl) return;
    _styleEl = document.createElement('style');
    _styleEl.id = 'pf-editor-styles';
    _styleEl.textContent = [
      '/* Edit Mode Base */',
      '.pf-edit-active { position: relative; }',
      '.pf-edit-active::after {',
      '  content: ""; position: fixed; inset: 0; pointer-events: none;',
      '  background: rgba(200,169,110,0.015); z-index: 9998;',
      '}',
      '',
      '/* Editable text */',
      '[data-editable="text"] { cursor: text; outline: none; border-radius: 3px; transition: box-shadow 0.15s, outline 0.15s; }',
      '[data-editable="text"]:hover { box-shadow: 0 0 0 2px rgba(200,169,110,0.5) !important; outline: 1px dashed rgba(200,169,110,0.6) !important; }',
      '[data-editable="text"]:focus { box-shadow: 0 0 0 2px rgba(200,169,110,0.8) !important; outline: 1px solid rgba(200,169,110,0.8) !important; }',
      '',
      '/* Edited indicator */',
      '[data-edited]::after {',
      '  content: "●"; position: absolute; bottom: 2px; right: 4px;',
      '  font-size: 7px; color: #c8a96e; line-height: 1; pointer-events: none;',
      '}',
      '[data-edited] { position: relative; }',
      '',
      '/* Editable images */',
      '[data-editable="image"] { cursor: pointer; outline: none; border-radius: 3px; transition: box-shadow 0.15s, outline 0.15s; }',
      '[data-editable="image"]:hover { box-shadow: 0 0 0 3px rgba(200,169,110,0.5) !important; outline: 2px dashed rgba(200,169,110,0.6) !important; }',
      '',
      '/* Image overlay */',
      '.pf-img-overlay {',
      '  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;',
      '  background: rgba(0,0,0,0.45); color: #fff; font-size: 14px; font-weight: 600;',
      '  border-radius: inherit; pointer-events: none; opacity: 0; transition: opacity 0.2s;',
      '  z-index: 2;',
      '}',
      '[data-editable="image"]:hover .pf-img-overlay { opacity: 1; }',
      '[data-editable="image"] { position: relative; }',
      '',
      '/* Toolbar */',
      '.pf-toolbar {',
      '  position: fixed; top: 0; left: 0; right: 0; z-index: 10000;',
      '  display: flex; align-items: center; justify-content: space-between;',
      '  padding: 0 20px; height: 48px;',
      '  background: linear-gradient(135deg, #1a1508 0%, #2a2010 100%);',
      '  border-bottom: 1px solid rgba(200,169,110,0.3);',
      '  box-shadow: 0 2px 16px rgba(0,0,0,0.4);',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '  transform: translateY(-100%); transition: transform 0.3s ease;',
      '}',
      '.pf-toolbar.pf-toolbar-visible { transform: translateY(0); }',
      '.pf-toolbar-left { display: flex; align-items: center; gap: 10px; color: #c8a96e; font-size: 13px; font-weight: 600; }',
      '.pf-toolbar-center { display: flex; align-items: center; gap: 8px; }',
      '.pf-toolbar-right { display: flex; align-items: center; gap: 8px; }',
      '.pf-btn {',
      '  padding: 6px 14px; border-radius: 6px; border: 1px solid rgba(200,169,110,0.4);',
      '  background: rgba(200,169,110,0.1); color: #c8a96e; font-size: 12px; font-weight: 600;',
      '  cursor: pointer; transition: all 0.2s; font-family: inherit;',
      '}',
      '.pf-btn:hover { background: rgba(200,169,110,0.25); border-color: rgba(200,169,110,0.7); }',
      '.pf-btn:active { transform: scale(0.97); }',
      '.pf-btn-export {',
      '  background: rgba(200,169,110,0.15); border-color: rgba(200,169,110,0.5);',
      '  color: #e8c87e;',
      '}',
      '.pf-btn-export:hover { background: rgba(200,169,110,0.35); }',
      '.pf-btn-close {',
      '  background: rgba(255,80,80,0.1); border-color: rgba(255,80,80,0.3); color: #ff8080;',
      '}',
      '.pf-btn-close:hover { background: rgba(255,80,80,0.2); border-color: rgba(255,80,80,0.5); }',
      '',
      '/* Toast */',
      '.pf-toast {',
      '  position: fixed; bottom: 24px; right: 24px; z-index: 10001;',
      '  padding: 10px 18px; border-radius: 8px;',
      '  background: rgba(30,30,20,0.92); color: #c8a96e;',
      '  font-size: 13px; font-weight: 500; font-family: -apple-system, sans-serif;',
      '  border: 1px solid rgba(200,169,110,0.3);',
      '  box-shadow: 0 4px 20px rgba(0,0,0,0.4);',
      '  opacity: 0; transform: translateY(10px);',
      '  transition: opacity 0.25s, transform 0.25s;',
      '  pointer-events: none;',
      '}',
      '.pf-toast.pf-toast-show { opacity: 1; transform: translateY(0); }',
      '',
      '/* Mobile */',
      '@media (max-width: 600px) {',
      '  .pf-toolbar { padding: 0 12px; height: 44px; }',
      '  .pf-toolbar-center { gap: 6px; }',
      '  .pf-btn { padding: 5px 10px; font-size: 11px; }',
      '  .pf-toast { bottom: 16px; right: 16px; }',
      '}',
      '',
      '/* Adjust nav to not overlap toolbar */',
      '.pf-edit-active .nav, .pf-edit-active .back-nav { top: 0 !important; }',
    ].join('\n');
    document.head.appendChild(_styleEl);
  }

  function removeStyles() {
    if (_styleEl) { _styleEl.remove(); _styleEl = null; }
  }

  // ─── Toolbar ───────────────────────────────────────────────────────────────
  var _toolbar = null;
  function showToolbar() {
    if (_toolbar) return;
    var pageKey = getCurrentPageKey();
    _toolbar = document.createElement('div');
    _toolbar.className = 'pf-toolbar';
    _toolbar.innerHTML = [
      '<div class="pf-toolbar-left">',
      '  <span>✏️</span>',
      '  <span>编辑模式</span>',
      '  <span style="opacity:0.5;margin-left:4px">·</span>',
      '  <span style="opacity:0.7;font-weight:400">' + (PAGE_NAMES[pageKey] || '当前页') + '</span>',
      '</div>',
      '<div class="pf-toolbar-center">',
      '  <button class="pf-btn pf-btn-save" onclick="window.__pfSave&&window.__pfSave()">💾 保存</button>',
      '  <button class="pf-btn pf-btn-reset" onclick="window.__pfReset&&window.__pfReset()">↺ 重置本页</button>',
      '</div>',
      '<div class="pf-toolbar-right">',
      '  <button class="pf-btn pf-btn-export" onclick="window.__pfExport&&window.__pfExport()">📦 导出站点</button>',
      '  <button class="pf-btn pf-btn-close" onclick="window.__pfToggle&&window.__pfToggle()">✕ 退出</button>',
      '</div>',
    ].join('');
    document.body.appendChild(_toolbar);
    // Animate in
    requestAnimationFrame(function() {
      _toolbar.classList.add('pf-toolbar-visible');
    });
    // Push body down
    document.body.style.marginTop = '48px';
    var nav = document.querySelector('.nav, .back-nav');
    if (nav) nav.style.top = '48px';
  }

  function hideToolbar() {
    if (_toolbar) { _toolbar.remove(); _toolbar = null; }
    document.body.style.marginTop = '';
    var nav = document.querySelector('.nav, .back-nav');
    if (nav) nav.style.top = '';
  }

  // ─── Editable Elements ─────────────────────────────────────────────────────
  function activateEditables() {
    // Text
    document.querySelectorAll('[data-editable="text"]').forEach(function(el) {
      el.contentEditable = 'true';
      el.setAttribute('tabindex', '0');
      el.addEventListener('input', onTextInput);
      el.addEventListener('blur', onTextBlur);
    });
    // Images
    document.querySelectorAll('[data-editable="image"]').forEach(function(el) {
      el.addEventListener('click', onImageClick);
    });
  }

  function deactivateEditables() {
    document.querySelectorAll('[data-editable]').forEach(function(el) {
      el.contentEditable = 'false';
      el.removeAttribute('tabindex');
      el.removeEventListener('input', onTextInput);
      el.removeEventListener('blur', onTextBlur);
      el.removeEventListener('click', onImageClick);
    });
  }

  function onTextInput(e) {
    var el = e.currentTarget;
    var editId = el.getAttribute('data-edit-id');
    if (!editId) return;
    var pageKey = getCurrentPageKey();
    if (!edits[pageKey]) edits[pageKey] = {};
    edits[pageKey][editId] = el.innerHTML;
    saveToStorage();
    markEdited(el, true);
  }

  function onTextBlur(e) {
    var el = e.currentTarget;
    var editId = el.getAttribute('data-edit-id');
    if (!editId) return;
    var pageKey = getCurrentPageKey();
    if (!edits[pageKey]) edits[pageKey] = {};
    edits[pageKey][editId] = el.innerHTML;
    saveToStorage();
  }

  function onImageClick(e) {
    var el = e.currentTarget;
    e.stopPropagation();
    currentEditEl = el;
    var editId = el.getAttribute('data-edit-id');
    currentEditId = editId;

    // Create hidden file input
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', onFileSelected);
      document.body.appendChild(fileInput);
    }
    fileInput.click();
  }

  function onFileSelected(e) {
    var file = e.target.files[0];
    if (!file || !currentEditId) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      var base64 = ev.target.result;
      var pageKey = getCurrentPageKey();
      if (!edits[pageKey]) edits[pageKey] = {};
      edits[pageKey][currentEditId] = base64;
      saveToStorage();

      // Apply to image element
      var img = currentEditEl.querySelector('img') || currentEditEl;
      img.src = base64;
      markEdited(img, true);
      showToast('✓ 图片已替换并保存');
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  }

  // ─── Apply Saved Edits ─────────────────────────────────────────────────────
  function applyEdits() {
    var pageKey = getCurrentPageKey();
    var pageEdits = edits[pageKey];
    if (!pageEdits) return;

    Object.keys(pageEdits).forEach(function(editId) {
      var val = pageEdits[editId];
      if (!val) return;

      // Try to find by data-edit-id
      var el = document.querySelector('[data-edit-id="' + editId + '"]');
      if (!el) return;

      if (el.tagName === 'IMG') {
        // Image edit — also update overlay if present
        el.src = val;
        markEdited(el, true);
      } else if (el.getAttribute('data-editable') === 'text') {
        el.innerHTML = val;
        markEdited(el, true);
      } else if (el.querySelector && el.querySelector('img')) {
        // Wrapper element with img child
        var img = el.querySelector('img');
        img.src = val;
        markEdited(el, true);
      }
    });
  }

  function markEdited(el, isEdited) {
    if (isEdited) el.setAttribute('data-edited', 'true');
    else el.removeAttribute('data-edited');
  }

  // ─── Storage ────────────────────────────────────────────────────────────────
  function saveToStorage() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(edits)); } catch(e) {}
  }

  // ─── Page Key Detection ────────────────────────────────────────────────────
  function getCurrentPageKey() {
    var path = window.location.pathname;
    var name = path.split('/').pop() || 'index.html';
    for (var k in PAGES) {
      if (PAGES[k] === name) return k;
    }
    return 'index';
  }

  // ─── Save / Reset / Export ─────────────────────────────────────────────────
  window.__pfToggle = toggleEditMode;

  window.__pfSave = function() {
    saveToStorage();
    showToast('✓ 已保存到浏览器');
  };

  window.__pfReset = function() {
    var pageKey = getCurrentPageKey();
    if (!edits[pageKey]) return;
    if (!confirm('确定要重置"' + PAGE_NAMES[pageKey] + '"页面的所有修改吗？')) return;

    // Reload to restore original
    var url = new URL(window.location);
    url.searchParams.delete('edit');
    window.location.href = url.toString();
  };

  window.__pfExport = function() {
    showToast('⏳ 正在生成 ZIP，请稍候…');
    setTimeout(function() {
      try {
        var zip = generateZip();
        downloadBlob(zip, 'portfolio-site.zip');
        showToast('✓ ZIP 已下载');
      } catch(err) {
        showToast('✗ 导出失败: ' + err.message);
      }
    }, 100);
  };

  // ─── Pure JS ZIP Generator ─────────────────────────────────────────────────
  function generateZip() {
    var files = {};

    // Read localStorage edits
    var allEdits = {};
    try { allEdits = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e) {}

    // Collect all pages
    var pageContents = {};
    var pageKeys = Object.keys(PAGES);

    // Since we're in browser, we need to fetch each page
    // We'll use fetch to get the HTML content
    var basePath = window.location.pathname.replace(/[^/\\]*$/, '');

    // Build modified content for each page
    pageKeys.forEach(function(key) {
      var html = getCurrentDocumentHTML(key);
      if (html) pageContents[key] = html;
    });

    // Include CSS
    var cssContent = '';
    var link = document.querySelector('link[href*="common.css"]');
    if (link) {
      // We can't fetch cross-origin, but common.css is local
      // Try to read from existing style
      cssContent = getInlineCSS();
    }

    // Include editor.js inline content
    var editorContent = getEditorJSContent();

    // Build zip entries
    var entries = [];

    // CSS
    if (cssContent) {
      entries.push({ name: 'common.css', data: cssContent });
    }

    // editor.js
    entries.push({ name: 'editor.js', data: editorContent });

    // HTML pages with edits applied
    pageKeys.forEach(function(key) {
      var html = pageContents[key];
      if (!html) return;

      // Inject editor.js script if not present
      if (html.indexOf('editor.js') === -1) {
        html = html.replace('</body>', '<script src="editor.js"></script>\n</body>');
      }

      entries.push({ name: PAGES[key], data: html });
    });

    // Images from localStorage (base64)
    collectEditedImages(allEdits, entries);

    // Assemble ZIP
    return assembleZip(entries);
  }

  function getCurrentDocumentHTML(pageKey) {
    var targetFile = PAGES[pageKey];
    if (!targetFile) return null;

    // Get from current DOM if it's the current page
    if (getCurrentPageKey() === pageKey) {
      return document.documentElement.outerHTML;
    }

    // For other pages, we'd need to fetch them
    // Since this is a browser environment, we construct from stored edits
    // by reading the original HTML from a data attribute or similar
    // In practice, since the user opened one page, we need another approach

    // Instead, we modify the current document and infer others
    // The most reliable way: reconstruct from current page knowledge
    return null;
  }

  function getInlineCSS() {
    // Try to get common.css content
    // Since we can't fetch it in browser, we'll use a best-effort approach
    // by reading it from the page's stylesheet
    var css = '';
    try {
      for (var i = 0; i < document.styleSheets.length; i++) {
        var sheet = document.styleSheets[i];
        try {
          var rules = sheet.cssRules || sheet.rules;
          if (rules) {
            for (var j = 0; j < rules.length; j++) {
              css += rules[j].cssText + '\n';
            }
          }
        } catch(e) {}
      }
    } catch(e) {}
    return css;
  }

  function getEditorJSContent() {
    // Read the editor.js script content from the page
    var scripts = document.querySelectorAll('script[src="editor.js"]');
    if (scripts.length) {
      // Can't read external file content directly
    }
    // Return the current script's text
    var editorScripts = document.querySelectorAll('script');
    for (var i = 0; i < editorScripts.length; i++) {
      if (editorScripts[i].src && editorScripts[i].src.indexOf('editor.js') !== -1) {
        return '';
      }
    }
    return '';
  }

  function collectEditedImages(allEdits, entries) {
    var seen = {};
    Object.keys(allEdits).forEach(function(pageKey) {
      var pageEdits = allEdits[pageKey];
      Object.keys(pageEdits).forEach(function(editId) {
        var val = pageEdits[editId];
        if (val && typeof val === 'string' && val.indexOf('data:image') === 0) {
          // Extract format from data URL
          var format = val.match(/^data:image\/(\w+);base64,/);
          if (format) {
            var ext = format[1];
            var filename = 'edited-' + editId + '.' + ext;
            if (!seen[filename]) {
              seen[filename] = true;
              // Decode base64 to binary
              var binStr = atob(val.split(',')[1]);
              var bytes = new Uint8Array(binStr.length);
              for (var i = 0; i < binStr.length; i++) {
                bytes[i] = binStr.charCodeAt(i);
              }
              entries.push({ name: 'images/' + filename, data: bytes });
            }
          }
        }
      });
    });
  }

  // ─── ZIP Assembly (Minimal STORE method, no compression) ────────────────────
  function assembleZip(entries) {
    var parts = [];
    var centralDir = [];
    var offset = 0;

    entries.forEach(function(entry) {
      var name = entry.name;
      var data = entry.data;

      // Convert data to Uint8Array if string
      if (typeof data === 'string') {
        var buf = new Uint8Array(data.length);
        for (var i = 0; i < data.length; i++) buf[i] = data.charCodeAt(i);
        data = buf;
      } else if (Array.isArray(data)) {
        data = new Uint8Array(data);
      }

      // Local file header
      var nameBytes = strToBytes(name);
      var header = new Uint8Array(30 + nameBytes.length);
      writeUint32(header, 0, 0x04034b50);      // sig
      writeUint16(header, 4, 20);               // version needed
      writeUint16(header, 6, 0);                // flags
      writeUint16(header, 8, 0);                // compression (STORE)
      writeUint16(header, 10, 0);               // mod time
      writeUint16(header, 12, 0);               // mod date
      writeUint32(header, 14, 0);               // crc32 placeholder
      writeUint32(header, 18, data.length);      // compressed size
      writeUint32(header, 22, data.length);      // uncompressed size
      writeUint16(header, 26, nameBytes.length); // filename length
      writeUint16(header, 28, 0);               // extra field length
      header.set(nameBytes, 30);

      var entryData = new Uint8Array(header.length + data.length);
      entryData.set(header, 0);
      entryData.set(data, header.length);

      var crc = crc32(data);
      writeUint32(entryData, 14, crc);

      parts.push(entryData);
      offset += entryData.length;

      // Central directory entry
      var cdEntry = new Uint8Array(46 + nameBytes.length);
      writeUint32(cdEntry, 0, 0x02014b50);      // sig
      writeUint16(cdEntry, 4, 20);               // version made by
      writeUint16(cdEntry, 6, 20);               // version needed
      writeUint16(cdEntry, 8, 0);               // flags
      writeUint16(cdEntry, 10, 0);              // compression
      writeUint16(cdEntry, 12, 0);              // mod time
      writeUint16(cdEntry, 14, 0);              // mod date
      writeUint32(cdEntry, 16, crc);            // crc32
      writeUint32(cdEntry, 20, data.length);    // compressed size
      writeUint32(cdEntry, 24, data.length);    // uncompressed size
      writeUint16(cdEntry, 28, nameBytes.length);
      writeUint16(cdEntry, 30, 0);              // extra field
      writeUint16(cdEntry, 32, 0);              // comment
      writeUint16(cdEntry, 34, 0);              // disk start
      writeUint16(cdEntry, 36, 0);              // internal attr
      writeUint32(cdEntry, 38, 0);              // external attr
      writeUint32(cdEntry, 42, offset - entryData.length); // relative offset
      cdEntry.set(nameBytes, 46);

      centralDir.push(cdEntry);
      offset += cdEntry.length;
    });

    // Central directory header
    var cdOffset = 0;
    var totalParts = parts.reduce(function(s, p) { return s + p.length; }, 0);
    var cdHeader = new Uint8Array(22);
    writeUint32(cdHeader, 0, 0x06054b50);       // sig
    writeUint16(cdHeader, 4, 0);                // disk
    writeUint16(cdHeader, 6, 0);                // disk with cd
    writeUint16(cdHeader, 8, entries.length);  // entries on disk
    writeUint16(cdHeader, 10, entries.length);  // total entries
    writeUint32(cdHeader, 12, centralDir.reduce(function(s, e) { return s + e.length; }, 0));
    writeUint32(cdHeader, 16, totalParts);      // cd offset
    writeUint16(cdHeader, 20, 0);               // comment

    // Assemble final zip
    var total = totalParts + centralDir.reduce(function(s, e) { return s + e.length; }, 0) + cdHeader.length;
    var zip = new Uint8Array(total);
    var pos = 0;
    parts.forEach(function(p) { zip.set(p, pos); pos += p.length; });
    centralDir.forEach(function(c) { zip.set(c, pos); pos += c.length; });
    zip.set(cdHeader, pos);

    return zip.buffer;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function strToBytes(str) {
    var bytes = new Uint8Array(str.length);
    for (var i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    return bytes;
  }

  function writeUint32(buf, offset, val) {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >> 8) & 0xff;
    buf[offset + 2] = (val >> 16) & 0xff;
    buf[offset + 3] = (val >> 24) & 0xff;
  }

  function writeUint16(buf, offset, val) {
    buf[offset] = val & 0xff;
    buf[offset + 1] = (val >> 8) & 0xff;
  }

  // CRC32 table
  var _crcTable = (function() {
    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    return table;
  })();

  function crc32(data) {
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < data.length; i++) {
      crc = _crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function downloadBlob(buffer, filename) {
    var blob = new Blob([buffer], { type: 'application/zip' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ─── Toast ─────────────────────────────────────────────────────────────────
  var _toastTimer = null;
  var _toastEl = null;

  function showToast(msg) {
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      _toastEl.className = 'pf-toast';
      document.body.appendChild(_toastEl);
    }
    _toastEl.textContent = msg;
    _toastEl.classList.add('pf-toast-show');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function() {
      _toastEl.classList.remove('pf-toast-show');
    }, 2500);
  }

  // ─── Bootstrap ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Auto-inject img overlays when edit mode activates
  var _origEnable = enableEditMode;
  enableEditMode = function() {
    _origEnable();
    document.querySelectorAll('[data-editable="image"]').forEach(function(el) {
      if (!el.querySelector('.pf-img-overlay')) {
        var overlay = document.createElement('div');
        overlay.className = 'pf-img-overlay';
        overlay.textContent = '📷 点击替换';
        overlay.style.borderRadius = 'inherit';
        el.appendChild(overlay);
      }
    });
  };

  var _origDisable = disableEditMode;
  disableEditMode = function() {
    _origDisable();
    document.querySelectorAll('.pf-img-overlay').forEach(function(el) { el.remove(); });
  };

})();
