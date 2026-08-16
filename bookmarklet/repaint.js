(function () {
  if (window.__REPAINT__) {
    window.__REPAINT__.toggle();
    return;
  }

  var ROLES = ["bg", "text", "primary", "secondary", "accent"];

  var TOKEN_PATTERNS = {
    bg: /^--.*(background|bg|panel|surface|canvas|paper|raised)(?!.*text)/i,
    text: /^--.*(text|foreground|fg|ink)(?!.*(bg|background))/i,
    primary: /^--.*primary/i,
    secondary: /^--.*secondary/i,
    accent: /^--.*(accent|brand|highlight)/i
  };

  var TOKEN_WARN_THRESHOLD = 20;

  var FONTS_BASE_STORAGE_KEY = "__repaint_fonts_base__";

  var FONT_ROLES = ["heading", "body", "mono"];

  var FONT_TOKEN_PATTERNS = {
    heading: /^--.*font.*(heading|display|title|serif)/i,
    body: /^--.*font.*(body|sans|base|text)/i,
    mono: /^--.*font.*(mono|code)/i
  };

  var FONT_PRESETS = [
    { label: "Keep site font", value: "", server: false },
    { label: "System UI", value: "system-ui, -apple-system, 'Segoe UI', sans-serif", server: false },
    { label: "System serif", value: "Georgia, 'Times New Roman', serif", server: false },
    { label: "System mono", value: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace", server: false },
    { label: "Inter", value: "'Repaint Inter', system-ui, sans-serif", server: true },
    { label: "Space Grotesk", value: "'Repaint Space Grotesk', system-ui, sans-serif", server: true },
    { label: "Fraunces", value: "'Repaint Fraunces', Georgia, serif", server: true },
    { label: "Newsreader", value: "'Repaint Newsreader', Georgia, serif", server: true },
    { label: "JetBrains Mono", value: "'Repaint JetBrains Mono', monospace", server: true }
  ];

  function collectTokens() {
    var found = {};
    var allProps = {};
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      var rules;
      try {
        rules = sheet.cssRules;
      } catch (e) {
        continue;
      }
      if (!rules) continue;
      scanRules(rules, found, allProps);
    }
    return { roles: found, allProps: Object.keys(allProps) };
  }

  function scanRules(rules, found, allProps) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.style) {
        for (var j = 0; j < rule.style.length; j++) {
          var prop = rule.style[j];
          if (typeof prop !== "string" || prop.indexOf("--") !== 0) continue;
          allProps[prop] = true;
          classify(prop, TOKEN_PATTERNS, found, "color", false);
          classify(prop, FONT_TOKEN_PATTERNS, found, "font", true);
        }
      }
      if (rule.cssRules) scanRules(rule.cssRules, found, allProps);
    }
  }

  function classify(prop, patterns, found, bucket, exclusive) {
    for (var key in patterns) {
      if (!patterns[key].test(prop)) continue;
      var mapKey = bucket + ":" + key;
      if (!found[mapKey]) found[mapKey] = [];
      if (found[mapKey].indexOf(prop) === -1) found[mapKey].push(prop);
      if (exclusive) return;
    }
  }

  var OVERRIDE_SELECTORS = {
    bg: "html, body, main, section, article, [class*='bg-'], [class*='background'], [class*='surface'], [class*='card'], [class*='panel']",
    text: "html, body, p, span, li, h1, h2, h3, h4, h5, h6, label",
    primary: "button, [type='submit'], a[class*='btn'], [class*='btn-primary'], [class*='button-primary']",
    secondary: "[class*='btn-secondary'], [class*='button-secondary'], [class*='badge']",
    accent: "a, a:visited"
  };

  var FONT_OVERRIDE_SELECTORS = {
    heading: "h1, h2, h3, h4, h5, h6",
    body: "html, body, p, span, li, div",
    mono: "code, pre, kbd, samp"
  };

  function createOverrideSheet() {
    var style = document.createElement("style");
    style.id = "repaint-override";
    document.documentElement.appendChild(style);
    return style;
  }

  function componentsToHex(r, g, b) {
    return (
      "#" +
      [r, g, b]
        .map(function (n) {
          var h = parseInt(n, 10).toString(16);
          return h.length === 1 ? "0" + h : h;
        })
        .join("")
    );
  }

  var _hexCtx;

  function colorToHexViaCanvas(value) {
    if (!_hexCtx) {
      var canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      _hexCtx = canvas.getContext("2d");
    }
    _hexCtx.fillStyle = "#000000";
    _hexCtx.fillStyle = value;
    _hexCtx.fillRect(0, 0, 1, 1);
    var data = _hexCtx.getImageData(0, 0, 1, 1).data;
    return componentsToHex(data[0], data[1], data[2]);
  }

  function rgbToHex(value) {
    if (!value) return "#000000";
    value = value.trim();
    if (!value) return "#000000";
    if (value.charAt(0) === "#") return value.length === 4 ? expandHex(value) : value;
    var m = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) return componentsToHex(m[1], m[2], m[3]);
    try {
      return colorToHexViaCanvas(value);
    } catch (e) {
      return "#000000";
    }
  }

  function expandHex(hex) {
    return "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  function isColorValue(value) {
    if (!value) return false;
    value = value.trim();
    if (!value) return false;
    return window.CSS && CSS.supports ? CSS.supports("color", value) : /^#|rgb|hsl/i.test(value);
  }

  function Repaint() {
    var collected = collectTokens();
    this.tokens = collected.roles;
    this.allProps = collected.allProps;
    this.overrideStyle = createOverrideSheet();
    this.overrideRules = {};
    this.visible = true;
    this.mode = "roles";
    this.fontsBase = this.loadStoredFontsBase() || "http://localhost:8787";
    this.fontsLoaded = false;
    this.picks = [];
    this.pickCounter = 0;
    this.picking = false;
    this._pickHoverEl = null;
    this._pickHoverOutline = "";
    this.buildPanel();
  }

  Repaint.prototype.toggle = function () {
    this.visible = !this.visible;
    this.host.style.display = this.visible ? "block" : "none";
  };

  Repaint.prototype.applyColor = function (role, value) {
    var tokenKey = "color:" + role;
    var tokens = this.tokens[tokenKey];
    if (tokens && tokens.length) {
      tokens.forEach(function (prop) {
        document.documentElement.style.setProperty(prop, value);
      });
    } else {
      this.overrideRules[role] = OVERRIDE_SELECTORS[role] + " { " + colorProp(role) + ": " + value + " !important; }";
      this.renderOverride();
    }
  };

  Repaint.prototype.applyFont = function (role, value) {
    if (!value) return;
    var tokenKey = "font:" + role;
    var tokens = this.tokens[tokenKey];
    if (tokens && tokens.length) {
      tokens.forEach(function (prop) {
        document.documentElement.style.setProperty(prop, value);
      });
    } else {
      this.overrideRules["font-" + role] = FONT_OVERRIDE_SELECTORS[role] + " { font-family: " + value + " !important; }";
      this.renderOverride();
    }
  };

  Repaint.prototype.applyToken = function (prop, value) {
    document.documentElement.style.setProperty(prop, value);
  };

  Repaint.prototype.renderOverride = function () {
    var css = "";
    for (var key in this.overrideRules) css += this.overrideRules[key] + "\n";
    this.overrideStyle.textContent = css;
  };

  Repaint.prototype.loadStoredFontsBase = function () {
    try {
      return localStorage.getItem(FONTS_BASE_STORAGE_KEY) || "";
    } catch (e) {
      return "";
    }
  };

  Repaint.prototype.storeFontsBase = function (value) {
    try {
      localStorage.setItem(FONTS_BASE_STORAGE_KEY, value);
    } catch (e) {}
  };

  Repaint.prototype.loadFonts = function (base, statusEl) {
    var link = document.getElementById("repaint-fonts-link");
    if (link) link.remove();
    link = document.createElement("link");
    link.id = "repaint-fonts-link";
    link.rel = "stylesheet";
    link.href = base.replace(/\/$/, "") + "/fonts/fonts.css";
    var self = this;
    link.onload = function () {
      self.fontsLoaded = true;
      statusEl.textContent = "fonts loaded";
    };
    link.onerror = function () {
      self.fontsLoaded = false;
      statusEl.textContent = "failed to load, is the fonts server running?";
    };
    document.head.appendChild(link);
    statusEl.textContent = "loading...";
  };

  Repaint.prototype.exportCss = function () {
    var lines = [":root {"];
    var computed = getComputedStyle(document.documentElement);
    var self = this;
    var seen = {};
    function emitProp(prop) {
      if (seen[prop]) return;
      seen[prop] = true;
      lines.push("  " + prop + ": " + computed.getPropertyValue(prop).trim() + ";");
    }
    ROLES.forEach(function (role) {
      (self.tokens["color:" + role] || []).forEach(emitProp);
    });
    FONT_ROLES.forEach(function (role) {
      (self.tokens["font:" + role] || []).forEach(emitProp);
    });
    lines.push("}");
    if (this.overrideStyle.textContent) {
      lines.push("");
      lines.push("/* roles/elements without a detected token, applied as overrides */");
      lines.push(this.overrideStyle.textContent.trim());
    }
    return lines.join("\n");
  };

  function colorProp(role) {
    if (role === "bg") return "background-color";
    if (role === "text") return "color";
    return "background-color";
  }

  Repaint.prototype.buildPanel = function () {
    var host = document.createElement("div");
    host.id = "repaint-host";
    host.style.cssText = "all: initial; position: fixed; top: 16px; right: 16px; z-index: 2147483647;";
    document.documentElement.appendChild(host);
    this.host = host;

    var root = host.attachShadow({ mode: "open" });
    var style = document.createElement("style");
    style.textContent = PANEL_CSS;
    root.appendChild(style);

    var panel = document.createElement("div");
    panel.className = "panel";
    panel.innerHTML = PANEL_HTML;
    root.appendChild(panel);
    this.root = root;

    this.wireTabs();
    this.wireColorRoles();
    this.wireFontRoles();
    this.wireFontsServer();
    this.wireActions();
    this.wireTokenSearch();
    this.wirePicking();
    this.updateTokenLabels();
    this.renderTokensList("");
    this.renderPicksList();
    this.setMode("roles");
  };

  Repaint.prototype.setMode = function (mode) {
    this.mode = mode;
    var self = this;
    ["roles", "tokens", "pick"].forEach(function (m) {
      var section = self.root.querySelector('[data-mode-panel="' + m + '"]');
      section.style.display = m === mode ? "block" : "none";
      var tab = self.root.querySelector('[data-mode-tab="' + m + '"]');
      tab.classList.toggle("active", m === mode);
    });
    if (mode !== "pick" && this.picking) this.stopPicking();
  };

  Repaint.prototype.wireTabs = function () {
    var self = this;
    ["roles", "tokens", "pick"].forEach(function (m) {
      self.root.querySelector('[data-mode-tab="' + m + '"]').addEventListener("click", function () {
        self.setMode(m);
      });
    });
  };

  Repaint.prototype.updateTokenLabels = function () {
    var self = this;
    ROLES.forEach(function (role) {
      var el = self.root.querySelector('[data-token-label="' + role + '"]');
      var tokens = self.tokens["color:" + role];
      var broad = tokens && tokens.length > TOKEN_WARN_THRESHOLD;
      el.textContent = tokens && tokens.length
        ? tokens.length + " token(s): " + tokens.slice(0, 3).join(", ") + (tokens.length > 3 ? "..." : "") + (broad ? " — broad match, try All tokens for precision" : "")
        : "no token, using override";
      el.classList.toggle("token-warn", !!broad);
    });
    FONT_ROLES.forEach(function (role) {
      var el = self.root.querySelector('[data-token-label="font-' + role + '"]');
      var tokens = self.tokens["font:" + role];
      el.textContent = tokens && tokens.length ? tokens.join(", ") : "no token, using override";
    });
  };

  Repaint.prototype.getRoleColorHex = function (role) {
    if (role === "bg" || role === "text") {
      var bodyComputed = getComputedStyle(document.body);
      return rgbToHex(role === "text" ? bodyComputed.color : bodyComputed.backgroundColor);
    }
    var tokens = this.tokens["color:" + role];
    if (tokens && tokens.length) {
      var computed = getComputedStyle(document.documentElement);
      return rgbToHex(computed.getPropertyValue(tokens[0]).trim());
    }
    var el = document.querySelector(OVERRIDE_SELECTORS[role]);
    if (!el) return "#000000";
    var elComputed = getComputedStyle(el);
    return rgbToHex(colorProp(role) === "color" ? elComputed.color : elComputed.backgroundColor);
  };

  Repaint.prototype.wireColorRoles = function () {
    var self = this;
    ROLES.forEach(function (role) {
      var input = self.root.querySelector('[data-color-role="' + role + '"]');
      try {
        input.value = self.getRoleColorHex(role);
      } catch (e) {}
      input.addEventListener("input", function () {
        self.applyColor(role, input.value);
      });
    });
  };

  Repaint.prototype.wireFontRoles = function () {
    var self = this;
    FONT_ROLES.forEach(function (role) {
      var select = self.root.querySelector('[data-font-role="' + role + '"]');
      FONT_PRESETS.forEach(function (preset) {
        var opt = document.createElement("option");
        opt.value = preset.value;
        opt.textContent = preset.label + (preset.server ? " (needs fonts server)" : "");
        select.appendChild(opt);
      });
      select.addEventListener("change", function () {
        self.applyFont(role, select.value);
      });
    });
  };

  Repaint.prototype.wireFontsServer = function () {
    var self = this;
    var input = this.root.querySelector("[data-fonts-base]");
    var status = this.root.querySelector("[data-fonts-status]");
    var button = this.root.querySelector("[data-fonts-load]");
    input.value = this.fontsBase;
    button.addEventListener("click", function () {
      self.fontsBase = input.value || self.fontsBase;
      self.storeFontsBase(self.fontsBase);
      self.loadFonts(self.fontsBase, status);
    });
  };

  Repaint.prototype.wireActions = function () {
    var self = this;
    this.root.querySelector('[data-action="reset"]').addEventListener("click", function () {
      location.reload();
    });
    this.root.querySelector('[data-action="close"]').addEventListener("click", function () {
      self.toggle();
    });
    this.root.querySelector('[data-action="export"]').addEventListener("click", function () {
      var css = self.exportCss();
      navigator.clipboard.writeText(css).then(
        function () {
          self.root.querySelector("[data-export-status]").textContent = "copied to clipboard";
        },
        function () {
          window.prompt("Copy this CSS:", css);
        }
      );
    });
  };

  Repaint.prototype.wireTokenSearch = function () {
    var self = this;
    var input = this.root.querySelector("[data-token-search]");
    input.addEventListener("input", function () {
      self.renderTokensList(input.value.trim().toLowerCase());
    });
  };

  Repaint.prototype.renderTokensList = function (filter) {
    var self = this;
    var container = this.root.querySelector("[data-tokens-list]");
    var computed = getComputedStyle(document.documentElement);
    var matches = this.allProps.filter(function (prop) {
      if (filter && prop.toLowerCase().indexOf(filter) === -1) return false;
      return isColorValue(computed.getPropertyValue(prop));
    });
    var countEl = this.root.querySelector("[data-tokens-count]");
    countEl.textContent = matches.length + " color token(s)" + (matches.length > 300 ? ", narrow with search" : "");
    container.innerHTML = "";
    var shown = matches.slice(0, 300);
    shown.forEach(function (prop) {
      var value = computed.getPropertyValue(prop).trim();
      var row = document.createElement("label");
      row.className = "row token-row";
      var input = document.createElement("input");
      input.type = "color";
      try {
        input.value = rgbToHex(value);
      } catch (e) {
        input.value = "#000000";
      }
      input.addEventListener("input", function () {
        self.applyToken(prop, input.value);
      });
      var name = document.createElement("span");
      name.className = "token-name";
      name.textContent = prop;
      name.title = prop + ": " + value;
      row.appendChild(input);
      row.appendChild(name);
      container.appendChild(row);
    });
  };

  Repaint.prototype.wirePicking = function () {
    var self = this;
    this.root.querySelector('[data-action="pick"]').addEventListener("click", function () {
      if (self.picking) self.stopPicking();
      else self.startPicking();
    });
    this._onPickMouseMove = function (e) {
      self.handlePickMouseMove(e);
    };
    this._onPickClick = function (e) {
      self.handlePickClick(e);
    };
    this._onPickKeydown = function (e) {
      if (e.key === "Escape") self.stopPicking();
    };
  };

  Repaint.prototype.startPicking = function () {
    this.picking = true;
    this.root.querySelector('[data-action="pick"]').textContent = "Click an element (Esc to cancel)";
    document.addEventListener("mousemove", this._onPickMouseMove, true);
    document.addEventListener("click", this._onPickClick, true);
    document.addEventListener("keydown", this._onPickKeydown, true);
  };

  Repaint.prototype.stopPicking = function () {
    this.picking = false;
    var btn = this.root.querySelector('[data-action="pick"]');
    if (btn) btn.textContent = "Pick an element";
    document.removeEventListener("mousemove", this._onPickMouseMove, true);
    document.removeEventListener("click", this._onPickClick, true);
    document.removeEventListener("keydown", this._onPickKeydown, true);
    this.clearPickHover();
  };

  Repaint.prototype.clearPickHover = function () {
    if (this._pickHoverEl) {
      this._pickHoverEl.style.outline = this._pickHoverOutline;
      this._pickHoverEl = null;
    }
  };

  Repaint.prototype.handlePickMouseMove = function (e) {
    if (this.host.contains(e.target)) return;
    if (e.target === this._pickHoverEl) return;
    this.clearPickHover();
    this._pickHoverEl = e.target;
    this._pickHoverOutline = e.target.style.outline;
    e.target.style.outline = "2px solid #C9A96E";
  };

  Repaint.prototype.handlePickClick = function (e) {
    if (this.host.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    var el = e.target;
    this.clearPickHover();
    this.stopPicking();
    this.addPick(el);
  };

  Repaint.prototype.addPick = function (el) {
    var id = el.getAttribute("data-repaint-id");
    if (!id) {
      id = "rp-" + ++this.pickCounter;
      el.setAttribute("data-repaint-id", id);
    }
    var computed = getComputedStyle(el);
    this.picks.push({
      id: id,
      label: describeElement(el),
      textColor: rgbToHex(computed.color),
      bgColor: rgbToHex(computed.backgroundColor)
    });
    this.renderPicksList();
  };

  Repaint.prototype.removePick = function (id) {
    this.picks = this.picks.filter(function (p) {
      return p.id !== id;
    });
    delete this.overrideRules["pick-" + id + "-text"];
    delete this.overrideRules["pick-" + id + "-bg"];
    this.renderOverride();
    this.renderPicksList();
  };

  Repaint.prototype.applyPickColor = function (id, kind, value) {
    var selector = "[data-repaint-id='" + id + "']";
    var prop = kind === "text" ? "color" : "background-color";
    this.overrideRules["pick-" + id + "-" + kind] = selector + " { " + prop + ": " + value + " !important; }";
    this.renderOverride();
  };

  Repaint.prototype.renderPicksList = function () {
    var self = this;
    var container = this.root.querySelector("[data-picks-list]");
    container.innerHTML = "";
    if (!this.picks.length) {
      var hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = "no elements picked yet";
      container.appendChild(hint);
      return;
    }
    this.picks.forEach(function (pick) {
      var row = document.createElement("div");
      row.className = "pick-row";

      var label = document.createElement("div");
      label.className = "token-name";
      label.textContent = pick.label;
      row.appendChild(label);

      var controls = document.createElement("div");
      controls.className = "row";

      var textInput = document.createElement("input");
      textInput.type = "color";
      textInput.value = pick.textColor;
      textInput.title = "text color";
      textInput.addEventListener("input", function () {
        self.applyPickColor(pick.id, "text", textInput.value);
      });

      var bgInput = document.createElement("input");
      bgInput.type = "color";
      bgInput.value = pick.bgColor;
      bgInput.title = "background color";
      bgInput.addEventListener("input", function () {
        self.applyPickColor(pick.id, "bg", bgInput.value);
      });

      var remove = document.createElement("button");
      remove.textContent = "x";
      remove.title = "remove this override";
      remove.addEventListener("click", function () {
        self.removePick(pick.id);
      });

      controls.appendChild(textInput);
      controls.appendChild(bgInput);
      controls.appendChild(remove);
      row.appendChild(controls);
      container.appendChild(row);
    });
  };

  function describeElement(el) {
    var tag = el.tagName.toLowerCase();
    var cls = el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    return tag + cls;
  }

  var PANEL_HTML =
    '<div class="head"><span>RePaint</span><button data-action="close" title="hide, click bookmarklet again to show">x</button></div>' +
    '<div class="tabs">' +
    '<button class="tab" data-mode-tab="roles">Roles</button>' +
    '<button class="tab" data-mode-tab="tokens">All tokens</button>' +
    '<button class="tab" data-mode-tab="pick">Pick</button>' +
    "</div>" +
    '<div data-mode-panel="roles">' +
    '<div class="section"><h3>Colors</h3>' +
    ROLES.map(function (role) {
      return (
        '<label class="row"><span class="role">' +
        role +
        '</span><input type="color" data-color-role="' +
        role +
        '"><span class="token" data-token-label="' +
        role +
        '"></span></label>'
      );
    }).join("") +
    "</div>" +
    "</div>" +
    '<div data-mode-panel="tokens">' +
    '<div class="section">' +
    '<h3>All color tokens</h3>' +
    '<input type="text" data-token-search placeholder="filter by name">' +
    '<div class="hint" data-tokens-count></div>' +
    '<div class="tokens-scroll" data-tokens-list></div>' +
    "</div>" +
    "</div>" +
    '<div data-mode-panel="pick">' +
    '<div class="section">' +
    '<h3>Pick an element</h3>' +
    '<button data-action="pick">Pick an element</button>' +
    '<div class="hint">click the button, then click anything on the page to edit its text/background color</div>' +
    '<div class="tokens-scroll" data-picks-list></div>' +
    "</div>" +
    "</div>" +
    '<div class="section"><h3>Fonts</h3>' +
    FONT_ROLES.map(function (role) {
      return (
        '<label class="row"><span class="role">' +
        role +
        '</span><select data-font-role="' +
        role +
        '"></select></label>' +
        '<div class="token" data-token-label="font-' +
        role +
        '"></div>'
      );
    }).join("") +
    '<div class="row"><input type="text" data-fonts-base placeholder="fonts server URL"><button data-fonts-load>Load</button></div>' +
    '<div class="hint" data-fonts-status>fonts not loaded yet</div>' +
    "</div>" +
    '<div class="section actions">' +
    '<button data-action="export">Export CSS</button>' +
    '<button data-action="reset">Reset (reload page)</button>' +
    '<div class="hint" data-export-status></div>' +
    "</div>";

  var PANEL_CSS =
    ":host { all: initial; }" +
    ".panel { font-family: system-ui, sans-serif; font-size: 12px; width: 260px; max-height: 90vh; display: flex; flex-direction: column; background: #17171a; color: #e8e4dc; border: 1px solid rgba(232,228,220,0.16); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; }" +
    ".head { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #0d0d0f; font-weight: 600; flex-shrink: 0; }" +
    ".head button { background: none; border: none; color: #e8e4dc; cursor: pointer; font-size: 12px; }" +
    ".tabs { display: flex; border-bottom: 1px solid rgba(232,228,220,0.1); flex-shrink: 0; }" +
    ".tab { flex: 1; background: #0d0d0f; color: #8a867e; border: none; padding: 6px 4px; font-size: 11px; cursor: pointer; }" +
    ".tab.active { color: #C9A96E; background: #17171a; }" +
    ".panel > div[data-mode-panel], .section { overflow-y: auto; }" +
    ".section { padding: 8px 10px; border-top: 1px solid rgba(232,228,220,0.1); }" +
    ".section h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #8a867e; }" +
    ".row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }" +
    ".role { width: 60px; text-transform: capitalize; }" +
    ".token { color: #8a867e; font-size: 10px; word-break: break-all; }" +
    ".token-warn { color: #e0a458; }" +
    "select, input[type='text'] { flex: 1; background: #0d0d0f; color: #e8e4dc; border: 1px solid rgba(232,228,220,0.16); border-radius: 4px; padding: 2px 4px; width: 100%; box-sizing: border-box; margin-bottom: 4px; }" +
    "input[type='color'] { width: 28px; height: 20px; padding: 0; border: none; background: none; flex-shrink: 0; }" +
    "button { background: #C9A96E; color: #0d0d0f; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-weight: 600; }" +
    ".actions button { width: 100%; margin-bottom: 4px; }" +
    ".hint { color: #8a867e; font-size: 10px; margin: 2px 0 6px; }" +
    ".tokens-scroll { max-height: 260px; overflow-y: auto; border: 1px solid rgba(232,228,220,0.1); border-radius: 4px; padding: 4px; }" +
    ".token-row { margin-bottom: 2px; }" +
    ".token-name { font-size: 10px; color: #cfcbc2; word-break: break-all; }" +
    ".pick-row { padding: 6px 0; border-bottom: 1px solid rgba(232,228,220,0.08); }" +
    ".pick-row button { padding: 2px 6px; }";

  window.__REPAINT__ = new Repaint();
})();
