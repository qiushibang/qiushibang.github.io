// Keep the chosen tab while the pointer previews other screens.
const tabList = document.querySelector(".tabs");
const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
let chosen = tabs[0];
const hoverPointer = matchMedia("(hover: hover) and (pointer: fine)");

function showScreen(active) {
  for (const tab of tabs) {
    const visible = tab === active;
    tab.setAttribute("aria-selected", String(visible));
    tab.tabIndex = tab === chosen ? 0 : -1;
    document.getElementById(tab.getAttribute("aria-controls")).hidden =
      !visible;
  }
}
function chooseScreen(tab) {
  chosen = tab;
  showScreen(tab);
}
for (const tab of tabs) {
  tab.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "touch" && hoverPointer.matches) showScreen(tab);
  });
  tab.addEventListener("click", () => chooseScreen(tab));
}
tabList.addEventListener("pointerleave", () => showScreen(chosen));
tabList.addEventListener("keydown", (event) => {
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
  chooseScreen(tabs[next]);
  chosen.focus();
});

const menu = document.querySelector(".menu");
const navLinks = [...document.querySelectorAll(".contents a")];
const menuLinks = [...menu.querySelectorAll("nav a")];
const chapters = navLinks.map((link) => document.querySelector(link.hash));
function updatePosition() {
  let active = navLinks[0];
  for (let i = 0; i < chapters.length; i++) {
    if (chapters[i].getBoundingClientRect().top <= 88) active = navLinks[i];
  }
  for (const link of [...navLinks, ...menuLinks]) {
    if (link.hash === active.hash)
      link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
  if (!matchMedia("(max-width:700px)").matches) menu.open = false;
}
let pending = false;
function scheduleUpdate() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    updatePosition();
  });
}
window.addEventListener("scroll", scheduleUpdate, { passive: true });
window.addEventListener("resize", scheduleUpdate);
window.addEventListener("pageshow", updatePosition);
updatePosition();
document.addEventListener("click", (event) => {
  if (!menu.contains(event.target) || event.target.closest("nav a"))
    menu.open = false;
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu.open) {
    menu.open = false;
    menu.querySelector("summary").focus();
  }
});
