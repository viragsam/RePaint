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
    for (var i = 0; i < document.styleSheets.length; i++) {
      var sheet = document.styleSheets[i];
      var rules;
      try {
        rules = sheet.cssRules;
      } catch (e) {
        continue;
      }
      if (!rules) continue;
      scanRules(rules, found);
    }
    return found;
  }

  function scanRules(rules, found) {
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (rule.style) {
        for (var j = 0; j < rule.style.length; j++) {
          var prop = rule.style[j];
          if (prop.indexOf("--") !== 0) continue;
          classify(prop, TOKEN_PATTERNS, found, "color");
          classify(prop, FONT_TOKEN_PATTERNS, found, "font");
        }
      }
      if (rule.cssRules) scanRules(rule.cssRules, found);
    }
  }

  function classify(prop, patterns, found, bucket) {
    for (var key in patterns) {
      if (!patterns[key].test(prop)) continue;
      var mapKey = bucket + ":" + key;
      if (!found[mapKey]) found[mapKey] = [];
      if (found[mapKey].indexOf(prop) === -1) found[mapKey].push(prop);
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

  function Repaint() {
    this.tokens = collectTokens();
    this.overrideStyle = createOverrideSheet();
    this.overrideRules = {};
    this.visible = true;
    this.fontsBase = "http://localhost:8787";
    this.fontsLoaded = false;
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

  Repaint.prototype.renderOverride = function () {
    var css = "";
    for (var key in this.overrideRules) css += this.overrideRules[key] + "\n";
    this.overrideStyle.textContent = css;
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
    function emit(role, bucket) {
      var tokens = self.tokens[bucket + ":" + role];
      if (!tokens) return;
      tokens.forEach(function (prop) {
        lines.push("  " + prop + ": " + computed.getPropertyValue(prop).trim() + ";");
      });
    }
    ROLES.forEach(function (role) {
      emit(role, "color");
    });
    FONT_ROLES.forEach(function (role) {
      emit(role, "font");
    });
    lines.push("}");
    if (this.overrideStyle.textContent) {
      lines.push("");
      lines.push("/* roles without a detected token, applied as broad overrides */");
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

    this.wireColorRoles();
    this.wireFontRoles();
    this.wireFontsServer();
    this.wireActions();
    this.updateTokenLabels();
  };

  Repaint.prototype.updateTokenLabels = function () {
    var self = this;
    ROLES.forEach(function (role) {
      var el = self.root.querySelector('[data-token-label="' + role + '"]');
      var tokens = self.tokens["color:" + role];
      el.textContent = tokens && tokens.length ? tokens.join(", ") : "no token, using override";
    });
    FONT_ROLES.forEach(function (role) {
      var el = self.root.querySelector('[data-token-label="font-' + role + '"]');
      var tokens = self.tokens["font:" + role];
      el.textContent = tokens && tokens.length ? tokens.join(", ") : "no token, using override";
    });
  };

  Repaint.prototype.wireColorRoles = function () {
    var self = this;
    ROLES.forEach(function (role) {
      var input = self.root.querySelector('[data-color-role="' + role + '"]');
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
    var input = this.root.querySelector('[data-fonts-base]');
    var status = this.root.querySelector('[data-fonts-status]');
    var button = this.root.querySelector('[data-fonts-load]');
    input.value = this.fontsBase;
    button.addEventListener("click", function () {
      self.fontsBase = input.value || self.fontsBase;
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
          self.root.querySelector('[data-export-status]').textContent = "copied to clipboard";
        },
        function () {
          window.prompt("Copy this CSS:", css);
        }
      );
    });
  };

  var PANEL_HTML =
    '<div class="head"><span>RePaint</span><button data-action="close" title="hide, click bookmarklet again to show">x</button></div>' +
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
    ".panel { font-family: system-ui, sans-serif; font-size: 12px; width: 240px; background: #17171a; color: #e8e4dc; border: 1px solid rgba(232,228,220,0.16); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); overflow: hidden; }" +
    ".head { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #0d0d0f; font-weight: 600; }" +
    ".head button { background: none; border: none; color: #e8e4dc; cursor: pointer; font-size: 12px; }" +
    ".section { padding: 8px 10px; border-top: 1px solid rgba(232,228,220,0.1); }" +
    ".section h3 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #8a867e; }" +
    ".row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }" +
    ".role { width: 60px; text-transform: capitalize; }" +
    ".token { color: #8a867e; font-size: 10px; word-break: break-all; }" +
    "select, input[type='text'] { flex: 1; background: #0d0d0f; color: #e8e4dc; border: 1px solid rgba(232,228,220,0.16); border-radius: 4px; padding: 2px 4px; }" +
    "input[type='color'] { width: 28px; height: 20px; padding: 0; border: none; background: none; }" +
    "button { background: #C9A96E; color: #0d0d0f; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-weight: 600; }" +
    ".actions button { width: 100%; margin-bottom: 4px; }" +
    ".hint { color: #8a867e; font-size: 10px; margin-top: 2px; }";

  window.__REPAINT__ = new Repaint();
})();
