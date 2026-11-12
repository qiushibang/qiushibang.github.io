/* 邱仕邦 · 个人主页 — interactions.
   Everything here is an enhancement: with scripts blocked the page is still
   fully readable (see the `.js-ready` guards in site.css). */
(() => {
  const root = document.documentElement;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  root.classList.add("js-ready");

  /* ------------------------------------------------------------- theme */
  const themeButton = $(".theme-toggle");
  const themeMeta = $('meta[name="theme-color"]');
  const themeColors = { light: "#f6f3ea", dark: "#0f130d" };
  function applyTheme(theme, remember) {
    root.dataset.theme = theme;
    themeMeta?.setAttribute("content", themeColors[theme]);
    themeButton?.setAttribute("aria-pressed", String(theme === "dark"));
    themeButton?.setAttribute(
      "aria-label",
      theme === "dark" ? "切换为浅色模式" : "切换为深色模式",
    );
    if (remember) {
      try {
        localStorage.setItem("sb-theme", theme);
      } catch (error) {
        /* private mode: the choice just will not persist */
      }
    }
  }
  applyTheme(root.dataset.theme === "dark" ? "dark" : "light");
  themeButton?.addEventListener("click", () => {
    if (!reduced.matches) {
      root.classList.add("theme-anim");
      setTimeout(() => root.classList.remove("theme-anim"), 450);
    }
    applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", (event) => {
    try {
      if (localStorage.getItem("sb-theme")) return;
    } catch (error) {
      /* fall through and follow the system */
    }
    applyTheme(event.matches ? "dark" : "light");
  });

  /* ------------------------------------------------------ sliding marks */
  // One small helper moves an indicator under whichever item is current.
  function placeIndicator(indicator, item, animate) {
    if (!indicator || !item || !item.offsetWidth) return;
    indicator.style.setProperty("--x", `${item.offsetLeft}px`);
    indicator.style.setProperty("--w", `${item.offsetWidth}px`);
    indicator.classList.add("on");
    if (animate && !reduced.matches) indicator.classList.add("anim");
  }

  /* -------------------------------------------------- nav, progress, top */
  const topbar = $(".topbar");
  const progress = $(".progress");
  const toTop = $(".to-top");
  const navList = $(".contents");
  const navIndicator = $(".nav-ind");
  const navLinks = $$(".contents a");
  const sheetLinks = $$(".sheet a");
  const chapters = navLinks.map((link) => $(link.hash));
  let activeIndex = -1;

  function setActive(index) {
    if (index === activeIndex) return;
    const first = activeIndex < 0;
    activeIndex = index;
    navLinks.forEach((link, i) =>
      i === index
        ? link.setAttribute("aria-current", "location")
        : link.removeAttribute("aria-current"),
    );
    sheetLinks.forEach((link, i) =>
      i === index
        ? link.setAttribute("aria-current", "location")
        : link.removeAttribute("aria-current"),
    );
    placeIndicator(navIndicator, navLinks[index], !first);
  }

  function onScroll() {
    const max = root.scrollHeight - innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    if (progress) progress.style.transform = `scaleX(${ratio.toFixed(4)})`;
    toTop?.classList.toggle("show", scrollY > 700);
    const line = (topbar?.offsetHeight || 60) + 90;
    let index = 0;
    chapters.forEach((chapter, i) => {
      if (chapter && chapter.getBoundingClientRect().top <= line) index = i;
    });
    if (max > 0 && scrollY >= max - 4) index = chapters.length - 1;
    setActive(index);
  }
  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      onScroll();
    });
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", () => {
    placeIndicator(navIndicator, navLinks[activeIndex], false);
    schedule();
  });
  addEventListener("pageshow", onScroll);
  document.fonts?.ready.then(() => placeIndicator(navIndicator, navLinks[activeIndex], false));
  onScroll();
  toTop?.addEventListener("click", () =>
    scrollTo({ top: 0, behavior: reduced.matches ? "auto" : "smooth" }),
  );

  /* ------------------------------------------------------- mobile sheet */
  const menuButton = $(".menu-btn");
  function setMenu(open) {
    topbar.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "关闭目录" : "打开目录");
  }
  menuButton?.addEventListener("click", () =>
    setMenu(!topbar.classList.contains("menu-open")),
  );
  sheetLinks.forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("click", (event) => {
    if (!topbar.contains(event.target)) setMenu(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && topbar.classList.contains("menu-open")) {
      setMenu(false);
      menuButton.focus();
    }
  });
  matchMedia("(min-width: 761px)").addEventListener?.("change", () => setMenu(false));

  /* -------------------------------------------------------- scroll reveal */
  const revealItems = $$(".reveal");
  // Stagger siblings that enter together (card grids), capped so it never drags.
  const seen = new Map();
  revealItems.forEach((item) => {
    const parent = item.parentElement;
    const count = seen.get(parent) || 0;
    seen.set(parent, count + 1);
    item.style.setProperty("--i", String(Math.min(count, 4) % 5));
  });
  function settle(item) {
    // Once shown, drop the reveal state so hover transitions are not delayed.
    const delay = Number(item.style.getPropertyValue("--i") || 0) * 80;
    setTimeout(() => item.classList.remove("reveal", "in"), 900 + delay);
  }
  if (reduced.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.remove("reveal"));
  } else {
    const reveal = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          reveal.unobserve(entry.target);
          settle(entry.target);
        });
      },
      { rootMargin: "0px 0px -7% 0px", threshold: 0.06 },
    );
    revealItems.forEach((item) => reveal.observe(item));
  }

  /* ------------------------------------------------------------ counters */
  const counters = $$("[data-count]");
  function runCounter(node) {
    const target = Number(node.dataset.count);
    const decimals = Number(node.dataset.decimals || 0);
    if (!Number.isFinite(target) || reduced.matches) return;
    const started = performance.now();
    const duration = 1300;
    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      node.textContent = (target * eased).toFixed(decimals);
      if (t < 1) requestAnimationFrame(tick);
    };
    node.textContent = (0).toFixed(decimals);
    requestAnimationFrame(tick);
  }
  if ("IntersectionObserver" in window) {
    const count = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          count.unobserve(entry.target);
          setTimeout(() => runCounter(entry.target), 250);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((node) => count.observe(node));
  }

  /* ---------------------------------------------------------------- tabs */
  const tabList = $(".tabs");
  const tabs = $$('[role="tab"]', tabList);
  const tabIndicator = $(".tab-ind");
  function showScreen(active, animate = true) {
    tabs.forEach((tab) => {
      const on = tab === active;
      tab.setAttribute("aria-selected", String(on));
      tab.tabIndex = on ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !on;
    });
    placeIndicator(tabIndicator, active, animate);
  }
  tabs.forEach((tab) => tab.addEventListener("click", () => showScreen(tab)));
  tabList?.addEventListener("keydown", (event) => {
    const current = tabs.indexOf(event.target);
    if (current < 0) return;
    const next = {
      ArrowLeft: (current + tabs.length - 1) % tabs.length,
      ArrowRight: (current + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    showScreen(tabs[next]);
    tabs[next].focus();
  });
  const selectedTab = () => tabs.find((tab) => tab.getAttribute("aria-selected") === "true");
  placeIndicator(tabIndicator, selectedTab(), false);
  document.fonts?.ready.then(() => placeIndicator(tabIndicator, selectedTab(), false));
  addEventListener("resize", () => placeIndicator(tabIndicator, selectedTab(), false));
  if (tabList && "ResizeObserver" in window) {
    new ResizeObserver(() => placeIndicator(tabIndicator, selectedTab(), false)).observe(tabList);
  }

  /* ------------------------------------------------------------ lightbox */
  const box = $(".lightbox");
  if (box && typeof box.showModal === "function") {
    const image = $("img", box);
    const caption = $("figcaption", box);
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.(".demo-shot");
      if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
      event.preventDefault();
      const label = (link.getAttribute("aria-label") || "").replace(/^放大查看：/, "");
      image.src = link.href;
      image.alt = label;
      caption.textContent = label;
      box.showModal();
    });
    box.addEventListener("click", (event) => {
      if (event.target === box || event.target.closest(".lb-close")) box.close();
    });
  }
})();
