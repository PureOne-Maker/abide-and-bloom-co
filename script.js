/* Abide & Bloom Co. — storefront logic */

/* ---------- image delivery ----------
   Product art lives in the repo as base64 text files (*.webp.b64) because
   binary upload isn't available to this build pipeline. hydrate() swaps the
   placeholders for the real images at runtime. Nothing else changes. */
const __PLACEHOLDER = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const __imgCache = {};
function __loadImage(key) {
  if (__imgCache[key]) return Promise.resolve(__imgCache[key]);
  return fetch(key)
    .then((r) => { if (!r.ok) throw new Error("img"); return r.text(); })
    .then((t) => (__imgCache[key] = "data:image/webp;base64," + t.trim()));
}
function hydrate(root) {
  const scope = root || document;
  Array.from(scope.querySelectorAll("img[data-b64]")).forEach((img) => {
    const key = img.getAttribute("data-b64");
    __loadImage(key).then((uri) => { img.src = uri; }).catch(() => {});
  });
}
function hydrateStatic() {
  // index.html ships <img src="assets/*.webp"> — reroute through .b64
  document.querySelectorAll('img[src^="assets/"][src$=".webp"]').forEach((img) => {
    img.setAttribute("data-b64", img.getAttribute("src") + ".b64");
    img.src = __PLACEHOLDER;
  });
  const fav = document.querySelector('link[rel="icon"]');
  if (fav) {
    const href = fav.getAttribute("href");
    if (href && href.endsWith(".webp")) {
      __loadImage(href + ".b64").then((uri) => { fav.href = uri; }).catch(() => {});
    }
  }
  hydrate(document);
}

const PRODUCTS = [
  {
    id: "abide-tee",
    name: "The Abide Tee",
    color: "Cream",
    price: 34,
    img: "assets/abide-bloom-tee-mockup.webp",
    desc: "Our signature. The intertwined AB monogram in soft black on heavyweight cream cotton — the shirt you'll reach for on slow mornings and long days alike.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  },
  {
    id: "bloom-hoodie",
    name: "The Bloom Hoodie",
    color: "Black",
    price: 64,
    img: "assets/abide-bloom-hoodie-mockup.webp",
    desc: "Midnight-black fleece with the monogram in warm cream. Built for early mornings, late prayers, and everything in between.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  },
  {
    id: "rooted-crewneck",
    name: "The Rooted Crewneck",
    color: "Oatmeal",
    price: 54,
    img: "assets/abide-bloom-crewneck-mockup.webp",
    desc: "A cozy oatmeal crewneck carrying the full lockup. Understated, elevated, and impossibly soft — the quiet luxury of the drop.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  },
  {
    id: "grace-tote",
    name: "The Grace Tote",
    color: "Natural Canvas",
    price: 28,
    img: "assets/abide-bloom-tote-mockup.webp",
    desc: "Heavyweight natural canvas printed with the monogram. For Bibles, journals, farmers markets, and everyday grace.",
    sizes: null,
  },
  {
    id: "abide-cap",
    name: "The Abide Cap",
    color: "Cream",
    price: 28,
    img: "assets/abide-bloom-cap-mockup.webp",
    desc: "A classic cream dad cap with the embroidered-look monogram. Quiet faith, worn well. Adjustable fit.",
    sizes: null,
  },
  {
    id: "devotional-journal",
    name: "The Devotional Journal",
    color: "Cream Linen",
    price: 24,
    img: "assets/abide-bloom-journal-mockup.webp",
    desc: "A cream linen hardcover journal for morning pages, prayers, and verses worth keeping — the monogram on the cover, grace on every page.",
    sizes: null,
  },
  {
    id: "welcome-gift-set",
    name: "The Welcome Gift Set",
    color: "Gift-Ready",
    price: 68,
    img: "assets/abide-bloom-giftbags-mockup.webp",
    desc: "The Abide Tee in cream, folded into our signature black & cream gift bag with tissue and hang tag. The easiest, most meaningful gift you'll ever give.",
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
  },
];

const money = (n) => "$" + n;

/* ---------- storage ---------- */
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem("abide_cart") || "{}");
  } catch (e) {
    return {};
  }
}
function saveCart(cart) {
  try {
    localStorage.setItem("abide_cart", JSON.stringify(cart));
  } catch (e) {}
}
let cart = loadCart();

/* ---------- product grid ---------- */
const grid = document.getElementById("product-grid");

function renderProducts() {
  grid.innerHTML = PRODUCTS.map((p) => `
    <article class="product-card reveal" data-id="${p.id}" tabindex="0" role="button" aria-label="View ${p.name}">
      <div class="product-media"><img data-b64="${p.img}.b64" src="${__PLACEHOLDER}" alt="${p.name} — ${p.color}" loading="lazy" /></div>
      <div class="product-info">
        <p class="product-color">${p.color}</p>
        <h3>${p.name}</h3>
        <div class="product-row">
          <span class="price">${money(p.price)}</span>
          <button class="add-btn" data-add="${p.id}">Add to Bag</button>
        </div>
      </div>
    </article>
  `).join("");

  grid.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-add]")) return;
      openQuickView(card.dataset.id);
    });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openQuickView(card.dataset.id); }
    });
  });
  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const p = PRODUCTS.find((x) => x.id === btn.dataset.add);
      addToCart(p.id, p.sizes ? p.sizes[2] : "One Size", 1);
    });
  });
  hydrate(grid);
  observeReveals();
}

/* ---------- quick view ---------- */
const modal = document.getElementById("quick-view");
let qvProduct = null, qvSize = null, qvQty = 1;

function openQuickView(id) {
  qvProduct = PRODUCTS.find((p) => p.id === id);
  qvQty = 1;
  qvSize = qvProduct.sizes ? qvProduct.sizes[2] : "One Size";
  const qvImg = document.getElementById("qv-img");
  qvImg.setAttribute("data-b64", qvProduct.img + ".b64");
  qvImg.src = __PLACEHOLDER;
  qvImg.alt = qvProduct.name;
  hydrate(qvImg.parentElement);
  document.getElementById("qv-eyebrow").textContent = qvProduct.color;
  document.getElementById("qv-name").textContent = qvProduct.name;
  document.getElementById("qv-price").textContent = money(qvProduct.price);
  document.getElementById("qv-desc").textContent = qvProduct.desc;
  document.getElementById("qv-qty").textContent = qvQty;
  const sizesEl = document.getElementById("qv-sizes");
  if (qvProduct.sizes) {
    sizesEl.style.display = "flex";
    sizesEl.innerHTML = qvProduct.sizes.map((s) =>
      `<button class="size-pill${s === qvSize ? " active" : ""}" data-size="${s}">${s}</button>`
    ).join("");
    sizesEl.querySelectorAll("[data-size]").forEach((b) =>
      b.addEventListener("click", () => {
        qvSize = b.dataset.size;
        sizesEl.querySelectorAll("[data-size]").forEach((x) => x.classList.toggle("active", x === b));
      })
    );
  } else {
    sizesEl.style.display = "none";
    sizesEl.innerHTML = "";
  }
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}
function closeQuickView() {
  modal.hidden = true;
  document.body.style.overflow = "";
}
document.getElementById("qv-close").addEventListener("click", closeQuickView);
modal.addEventListener("click", (e) => { if (e.target === modal) closeQuickView(); });
document.getElementById("qv-minus").addEventListener("click", () => {
  qvQty = Math.max(1, qvQty - 1);
  document.getElementById("qv-qty").textContent = qvQty;
});
document.getElementById("qv-plus").addEventListener("click", () => {
  qvQty = Math.min(99, qvQty + 1);
  document.getElementById("qv-qty").textContent = qvQty;
});
document.getElementById("qv-add").addEventListener("click", () => {
  addToCart(qvProduct.id, qvSize, qvQty);
  closeQuickView();
});

/* ---------- cart ---------- */
const drawer = document.getElementById("cart-drawer");
const overlay = document.getElementById("overlay");

function cartCount() {
  return Object.values(cart).reduce((n, it) => n + it.qty, 0);
}
function cartSubtotal() {
  return Object.entries(cart).reduce((sum, [key, it]) => {
    const p = PRODUCTS.find((x) => x.id === it.id);
    return sum + (p ? p.price * it.qty : 0);
  }, 0);
}
function addToCart(id, size, qty) {
  const key = id + "__" + size;
  cart[key] = cart[key] || { id, size, qty: 0 };
  cart[key].qty = Math.min(99, cart[key].qty + qty);
  saveCart(cart);
  renderCart();
  const p = PRODUCTS.find((x) => x.id === id);
  toast(`Added to your bag — ${p.name}`);
  openCart();
}
function renderCart() {
  const itemsEl = document.getElementById("cart-items");
  const entries = Object.entries(cart);
  const count = cartCount();
  const badge = document.getElementById("cart-count");
  badge.hidden = count === 0;
  badge.textContent = count;
  document.getElementById("cart-subtotal").textContent = money(cartSubtotal());

  if (!entries.length) {
    itemsEl.innerHTML = `<div class="cart-empty"><p>Your bag is empty.</p><p>Beautiful things are coming —<br />start with the first drop.</p></div>`;
    return;
  }
  itemsEl.innerHTML = entries.map(([key, it]) => {
    const p = PRODUCTS.find((x) => x.id === it.id);
    if (!p) return "";
    return `
      <div class="cart-item" data-key="${key}">
        <img data-b64="${p.img}.b64" src="${__PLACEHOLDER}" alt="${p.name}" />
        <div>
          <p class="ci-name">${p.name}</p>
          <p class="ci-meta">${it.size} · ${money(p.price)}</p>
          <div class="ci-qty">
            <button data-dec="${key}" aria-label="Decrease quantity">−</button>
            <span>${it.qty}</span>
            <button data-inc="${key}" aria-label="Increase quantity">+</button>
          </div>
        </div>
        <div class="ci-right">
          <span class="ci-price">${money(p.price * it.qty)}</span>
          <button class="ci-remove" data-remove="${key}">Remove</button>
        </div>
      </div>`;
  }).join("");

  itemsEl.querySelectorAll("[data-inc]").forEach((b) =>
    b.addEventListener("click", () => { cart[b.dataset.inc].qty = Math.min(99, cart[b.dataset.inc].qty + 1); saveCart(cart); renderCart(); }));
  itemsEl.querySelectorAll("[data-dec]").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.dec;
      cart[k].qty -= 1;
      if (cart[k].qty <= 0) delete cart[k];
      saveCart(cart); renderCart();
    }));
  itemsEl.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => { delete cart[b.dataset.remove]; saveCart(cart); renderCart(); }));
  hydrate(itemsEl);
}
function openCart() {
  renderCart();
  drawer.classList.add("open");
  drawer.setAttribute("aria-hidden", "false");
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add("show"));
  document.body.style.overflow = "hidden";
}
function closeCart() {
  drawer.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  overlay.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => { overlay.hidden = true; }, 320);
}
document.getElementById("cart-open").addEventListener("click", openCart);
document.getElementById("cart-close").addEventListener("click", closeCart);
overlay.addEventListener("click", closeCart);
document.getElementById("checkout-btn").addEventListener("click", () => {
  toast("Checkout opens with the first drop — join the launch list below.");
  closeCart();
  document.getElementById("join").scrollIntoView({ behavior: "smooth" });
});

/* ---------- toast ---------- */
let toastTimer;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

/* ---------- launch form (Netlify Forms + graceful fallback) ---------- */
document.getElementById("launch-form").addEventListener("submit", function (e) {
  e.preventDefault();
  const note = document.getElementById("form-note");
  const data = new FormData(this);
  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data).toString(),
  })
    .then(() => {
      note.textContent = "You're on the list. Watch your inbox — beautiful things are coming.";
      this.reset();
    })
    .catch(() => {
      note.textContent = "You're on the list. Watch your inbox — beautiful things are coming.";
      this.reset();
    });
});

/* ---------- announcement dismiss ---------- */
(function () {
  const bar = document.getElementById("announce");
  const btn = document.getElementById("announce-close");
  if (!bar || !btn) return;
  try {
    if (localStorage.getItem("abide_announce_dismissed") === "1") {
      bar.style.display = "none";
      return;
    }
  } catch (e) {}
  btn.addEventListener("click", () => {
    bar.style.display = "none";
    try { localStorage.setItem("abide_announce_dismissed", "1"); } catch (e) {}
  });
})();

/* ---------- nav / header ---------- */
const header = document.getElementById("site-header");
window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 12);
}, { passive: true });

const menuBtn = document.getElementById("menu-btn");
const mainNav = document.getElementById("main-nav");
menuBtn.addEventListener("click", () => {
  const open = mainNav.classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", open);
  if (open) { overlay.hidden = false; requestAnimationFrame(() => overlay.classList.add("show")); }
  else if (!drawer.classList.contains("open")) { overlay.classList.remove("show"); setTimeout(() => { overlay.hidden = true; }, 320); }
});
mainNav.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuBtn.setAttribute("aria-expanded", "false");
    if (!drawer.classList.contains("open")) { overlay.classList.remove("show"); setTimeout(() => { overlay.hidden = true; }, 320); }
  })
);

/* ---------- reveal on scroll ---------- */
let observer;
function observeReveals() {
  if (!observer) {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("visible"); observer.unobserve(en.target); } });
    }, { threshold: 0.12 });
  }
  document.querySelectorAll(".reveal:not(.visible)").forEach((el) => observer.observe(el));
}

/* ---------- init ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeQuickView(); closeCart(); mainNav.classList.remove("open"); }
});
renderProducts();
renderCart();
hydrateStatic();
observeReveals();
