/* Deepan Jayaraman — site behaviour. Vanilla JS, no dependencies. */
(function () {
  "use strict";

  /* ---------- theme ---------- */
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) { /* private mode */ }

  function toggleTheme() {
    var current = root.getAttribute("data-theme");
    if (!current) {
      var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      current = prefersDark ? "dark" : "light";
    }
    var next = current === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
  }

  /* ---------- toast ---------- */
  var toastEl;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.id = "toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2000);
  }

  document.addEventListener("DOMContentLoaded", function () {

    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    /* ---------- mobile nav ---------- */
    var navToggle = document.getElementById("nav-toggle");
    var navLinks = document.getElementById("nav-links");
    if (navToggle && navLinks) {
      navToggle.addEventListener("click", function () {
        var open = navLinks.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    /* ---------- copy email ---------- */
    document.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var value = btn.getAttribute("data-copy");
        if (navigator.clipboard) {
          navigator.clipboard.writeText(value).then(
            function () { toast("Email copied"); },
            function () { toast(value); }
          );
        } else {
          toast(value);
        }
      });
    });

    /* ---------- publication filters (type / domain / rating) + search ----------
       Each dimension is multi-select: tick several values in a row and they are ORed
       (ABDC A* or JCR Q1). Across rows they are ANDed (Business AND under review).
       "All" is the clear-this-row button, and comes back on its own when nothing
       else in the row is ticked. ---------- */
    var pubs = Array.prototype.slice.call(document.querySelectorAll(".pub"));
    if (pubs.length) {
      var searchInput = document.getElementById("pub-search");
      var emptyMsg = document.getElementById("pub-empty");
      var counter = document.getElementById("pub-count");
      var DIMS = { type: "data-type", domain: "data-domain", rating: "data-rating" };
      var active = { type: [], domain: [], rating: [] };   // empty array = no filter

      function has(el, attr, token) {
        var v = el.getAttribute(attr);
        if (!v) return false;
        return (" " + v + " ").indexOf(" " + token + " ") !== -1;
      }
      function matchesDim(pub, dim) {
        var chosen = active[dim];
        if (!chosen.length) return true;
        for (var i = 0; i < chosen.length; i++) {
          if (has(pub, DIMS[dim], chosen[i])) return true;   // OR within a row
        }
        return false;
      }

      function applyFilter() {
        var q = searchInput ? searchInput.value.trim().toLowerCase() : "";
        var shown = 0;
        pubs.forEach(function (pub) {
          var ok = matchesDim(pub, "type") &&
                   matchesDim(pub, "domain") &&
                   matchesDim(pub, "rating") &&
                   (!q || pub.textContent.toLowerCase().indexOf(q) !== -1);
          pub.hidden = !ok;
          if (ok) shown++;
        });
        document.querySelectorAll("[data-group]").forEach(function (group) {
          group.hidden = group.querySelectorAll(".pub:not([hidden])").length === 0;
        });
        if (emptyMsg) emptyMsg.hidden = shown !== 0;

        var picked = active.type.length + active.domain.length + active.rating.length;
        if (counter) {
          counter.textContent = shown + (shown === 1 ? " item" : " items") +
            (picked ? " · " + picked + (picked === 1 ? " filter" : " filters") + " on" : "") +
            (q ? " · matching “" + q + "”" : "");
        }
      }

      function paintGroup(group, dim) {
        group.querySelectorAll(".chip").forEach(function (c) {
          var v = c.getAttribute("data-value");
          var on = v === "all" ? active[dim].length === 0
                               : active[dim].indexOf(v) !== -1;
          c.setAttribute("aria-pressed", on ? "true" : "false");
        });
      }
      function paintAll() {
        document.querySelectorAll(".filter-group[data-dim]").forEach(function (g) {
          paintGroup(g, g.getAttribute("data-dim"));
        });
      }

      document.querySelectorAll(".filter-group[data-dim]").forEach(function (group) {
        var dim = group.getAttribute("data-dim");
        group.querySelectorAll(".chip").forEach(function (chip) {
          var value = chip.getAttribute("data-value");
          chip.setAttribute("role", "checkbox");
          chip.addEventListener("click", function () {
            if (value === "all") {
              active[dim] = [];
            } else {
              var i = active[dim].indexOf(value);
              if (i === -1) { active[dim].push(value); } else { active[dim].splice(i, 1); }
            }
            paintGroup(group, dim);
            applyFilter();
          });
        });
      });

      if (searchInput) searchInput.addEventListener("input", applyFilter);

      var resetBtn = document.getElementById("pub-reset");
      if (resetBtn) {
        resetBtn.addEventListener("click", function () {
          active = { type: [], domain: [], rating: [] };
          if (searchInput) searchInput.value = "";
          paintAll();
          applyFilter();
        });
      }

      // honour ?domain= / ?type= / ?rating= deep links (used by the home-page hub);
      // each accepts a comma-separated list now that the rows are multi-select
      try {
        var qs = new URLSearchParams(window.location.search);
        ["type", "domain", "rating"].forEach(function (dim) {
          var raw = qs.get(dim);
          if (!raw) return;
          raw.split(",").forEach(function (v) {
            v = v.trim();
            if (!v || v === "all") return;
            var chip = document.querySelector('.filter-group[data-dim="' + dim + '"] .chip[data-value="' + v + '"]');
            if (chip && active[dim].indexOf(v) === -1) active[dim].push(v);
          });
        });
      } catch (e) { /* older browsers */ }

      paintAll();
      applyFilter();
    }

    /* ---------- contact form -> the visitor's own mail client ---------- */
  (function () {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var TO = "deepanjayram@gmail.com";
    var err = document.getElementById("cf-error");

    function fail(msg, el) {
      err.textContent = msg;
      err.hidden = false;
      if (el) el.focus();
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.hidden = true;

      var name = document.getElementById("cf-name").value.trim();
      var from = document.getElementById("cf-email").value.trim();
      var msg  = document.getElementById("cf-msg").value.trim();

      if (!name) return fail("Please add your name.", document.getElementById("cf-name"));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from))
        return fail("That email address does not look right.", document.getElementById("cf-email"));
      if (!msg) return fail("Please write a message.", document.getElementById("cf-msg"));

      var subject = "Website enquiry from " + name;
      var body = [msg, "", "—", name, from,
                  "Sent from the contact form on deepanjayaraman.github.io"].join("\n");
      var href = "mailto:" + TO +
                 "?subject=" + encodeURIComponent(subject) +
                 "&body=" + encodeURIComponent(body);

      if (href.length > 1900) {
        return fail("That message is too long to hand to a mail app. Please shorten it, or write to " +
                    TO + " directly.", document.getElementById("cf-msg"));
      }
      window.location.href = href;

      var btn = form.querySelector('button[type="submit"]');
      var was = btn.innerHTML;
      btn.innerHTML = "Opening your mail app…";
      window.setTimeout(function () { btn.innerHTML = was; }, 3500);
    });
  })();

  /* ---------- interactive domain hub ---------- */
    var hub = document.getElementById("domain-hub");
    var panel = document.getElementById("domain-detail");
    if (hub && panel) {
      var DOMAINS = {
        business: {
          name: "Business &amp; decision support",
          summary: "Prescriptive analytics — the passage from a fitted model to a decision someone can defend.",
          items: [
            "<em>Predict, explain, prescribe</em> — Decision Support Systems (under review)",
            "Risk-aware process innovation using AI-augmented decision frameworks — ICoIED-2026",
            "Decision-support dashboards and digital twins in production at Caterpillar"
          ],
          link: "publications.html?domain=business", linkText: "Publications in this domain"
        },
        entrepreneurship: {
          name: "Entrepreneurship",
          summary: "How AI-driven design shapes what founders decide, and how ventures are evaluated under genuine uncertainty.",
          items: [
            "<em>From intuition to intelligence</em> — DSSE Entrepreneurship Day, IIT Bombay",
            "DSS manuscript on AI-driven design and venture outcomes (under review)"
          ],
          link: "publications.html?domain=entrepreneurship", linkText: "Publications in this domain"
        },
        engineering: {
          name: "Engineering &amp; reliability",
          summary: "Robust design and reliability analysis where failure is rare and expensive.",
          items: [
            "A dual surrogate driven L-moments based robust design — Structural and Multidisciplinary Optimization (2022)",
            "Robust design of a gas turbine disk — ASME Turbo Expo, Oslo",
            "Tail estimation versus learning-function choice in active-learning reliability — RESS (under review)"
          ],
          link: "publications.html?domain=engineering", linkText: "Publications in this domain"
        },
        statistics: {
          name: "Statistics &amp; methods",
          summary: "The methodological core: L-moments, Bayesian inference and model selection when samples are few and contain extremes.",
          items: [
            "L-moments and Bayesian inference for probabilistic risk assessment — Reliability Engineering &amp; System Safety (2023)",
            "L-moments-based uncertainty quantification — Structural and Multidisciplinary Optimization (2021)",
            "Codimension bias in distance-based selection on moment-ratio diagrams — JCGS (under review)",
            "LMomFit, open-source fitting software — Advances in Engineering Software (under review)"
          ],
          link: "publications.html?domain=statistics", linkText: "Publications in this domain"
        },
        safety: {
          name: "Safety &amp; transportation",
          summary: "Which hazards get detected, by whom, and how late — and what that implies for where control effort should go.",
          items: [
            "A detection-pathway framework for accident precursors — Accident Analysis &amp; Prevention (under review)",
            "30,410 NASA ASRS reports, 1988–2026; 34 hazard themes linked to their detection pathways"
          ],
          link: "publications.html?domain=safety", linkText: "Publications in this domain"
        },
        genai: {
          name: "Generative &amp; human-in-the-loop AI",
          summary: "Synthesising rare-event evidence where observation is impossible, with expert judgement kept inside the decision path.",
          items: [
            "Human-in-the-loop generative AI framework for safety-critical design — ICoIED-2026",
            "Generative AI and agent systems in production at Caterpillar",
            "AI Agents and GenAI for Enterprise Transformation — CODE, IIT Madras"
          ],
          link: "industry.html", linkText: "See the industry work"
        }
      };

      var DEFAULT_HTML = panel.innerHTML;
      var pinned = null;

      function show(key) {
        var d = DOMAINS[key];
        if (!d) return;
        var html = "<h3>" + d.name + "</h3><p>" + d.summary + "</p><ul>";
        for (var i = 0; i < d.items.length; i++) html += "<li>" + d.items[i] + "</li>";
        html += "</ul><a class=\"more\" href=\"" + d.link + "\">" + d.linkText + " →</a>";
        panel.innerHTML = html;
        hub.setAttribute("data-active", key);
        hub.querySelectorAll(".spoke").forEach(function (sp) {
          sp.classList.toggle("on", sp.classList.contains("spoke-" + key));
        });
        hub.querySelectorAll(".dg-node").forEach(function (n) {
          n.setAttribute("data-on", n.getAttribute("data-domain") === key ? "1" : "0");
        });
      }

      function clear() {
        if (pinned) return;
        panel.innerHTML = DEFAULT_HTML;
        hub.removeAttribute("data-active");
        hub.querySelectorAll(".spoke").forEach(function (sp) { sp.classList.remove("on"); });
        hub.querySelectorAll(".dg-node").forEach(function (n) { n.removeAttribute("data-on"); });
      }

      hub.querySelectorAll(".dg-node").forEach(function (node) {
        var key = node.getAttribute("data-domain");
        node.addEventListener("mouseenter", function () { if (!pinned) show(key); });
        node.addEventListener("focus", function () { show(key); });
        node.addEventListener("click", function () { pinned = (pinned === key) ? null : key; show(key); });
        node.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pinned = (pinned === key) ? null : key;
            show(key);
          }
        });
      });
      hub.addEventListener("mouseleave", clear);
      hub.addEventListener("focusout", function (e) {
        if (!hub.contains(e.relatedTarget)) clear();
      });
    }

    /* ---------- reveal on scroll ---------- */
    var revealables = document.querySelectorAll(".reveal");
    if (revealables.length) {
      if (!("IntersectionObserver" in window)) {
        revealables.forEach(function (el) { el.classList.add("in"); });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
              io.unobserve(entry.target);
            }
          });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
        revealables.forEach(function (el) { io.observe(el); });
      }
    }

    /* ---------- current year ---------- */
    var y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  });
})();
