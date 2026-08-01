(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Sticky header state */
  const header = document.getElementById("header");
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Mobile nav */
  const burger = document.getElementById("burger");
  const nav = document.getElementById("nav");

  const closeNav = () => {
    if (!burger || !nav) return;
    burger.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  };

  burger?.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    nav?.classList.toggle("is-open", !open);
  });

  nav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  /* Active section highlighting */
  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".nav__link")];

  const syncActiveNav = () => {
    const y = window.scrollY + 100;
    let current = sections[0]?.id;
    for (const section of sections) {
      if (section.offsetTop <= y) current = section.id;
    }
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
    });
  };
  window.addEventListener("scroll", syncActiveNav, { passive: true });
  syncActiveNav();

  /* Reveal on scroll */
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }

  /* Lead forms → Google Sheets via backend + service account */
  const apiUrl = (window.APP_CONFIG && window.APP_CONFIG.apiUrl) || "/api/leads";

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const setMsg = (el, text, type) => {
    if (!el) return;
    el.textContent = text;
    el.classList.remove("is-success", "is-error");
    if (type) el.classList.add(type);
  };

  const submitLead = async (form) => {
    const msg = form.querySelector(".form-msg");
    const btn = form.querySelector('button[type="submit"]');
    const data = {
      name: String(new FormData(form).get("name") || "").trim(),
      phone: String(new FormData(form).get("phone") || "").trim(),
      email: String(new FormData(form).get("email") || "").trim(),
      source: form.closest("#hero-form") ? "hero" : "contact",
      page: location.href,
      submittedAt: new Date().toISOString(),
    };

    form.querySelectorAll("input").forEach((input) => input.classList.remove("is-invalid"));

    let valid = true;
    if (!data.name) {
      form.querySelector('[name="name"]')?.classList.add("is-invalid");
      valid = false;
    }
    if (!data.phone) {
      form.querySelector('[name="phone"]')?.classList.add("is-invalid");
      valid = false;
    }
    if (!data.email || !isValidEmail(data.email)) {
      form.querySelector('[name="email"]')?.classList.add("is-invalid");
      valid = false;
    }

    if (!valid) {
      setMsg(msg, "Please fill in all fields correctly.", "is-error");
      return;
    }

    btn.disabled = true;
    setMsg(msg, "Sending…", null);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || `HTTP ${res.status}`);
      }

      form.reset();
      setMsg(msg, "Thank you! Your request has been sent.", "is-success");
    } catch (err) {
      console.error(err);
      setMsg(msg, "Something went wrong. Please try again.", "is-error");
    } finally {
      btn.disabled = false;
    }
  };

  document.querySelectorAll('form[data-form="lead"]').forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitLead(form);
    });
  });
})();
