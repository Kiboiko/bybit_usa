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

  const isValidUSPhone = (value) => {
    const digits = value.replace(/\D/g, "");
    const tenDigits = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
    return /^[2-9]\d{2}[2-9]\d{6}$/.test(tenDigits);
  };

  const formatUSPhone = (raw) => {
    let digits = raw.replace(/\D/g, "");
    if (digits.startsWith("1")) digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (!digits) return "";
    let out = "1 (" + digits.slice(0, 3);
    if (digits.length >= 3) out += ")";
    if (digits.length > 3) out += " " + digits.slice(3, 6);
    if (digits.length >= 6) out += "-" + digits.slice(6, 10);
    return out;
  };

  document.querySelectorAll('input[name="phone"]').forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatUSPhone(input.value);
    });
    input.addEventListener("focus", () => {
      if (!input.value) input.value = "1 (";
    });
    input.addEventListener("blur", () => {
      if (input.value === "1 (") input.value = "";
    });
  });

  const readLead = (form) => {
    const fd = new FormData(form);
    return {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "").trim(),
      email: String(fd.get("email") || "").trim(),
    };
  };

  const isLeadComplete = ({ name, phone, email }) =>
    Boolean(name) && isValidUSPhone(phone) && isValidEmail(email);

  // Tells the visitor why the submit button is still greyed out.
  const describeMissing = ({ name, phone, email }) => {
    if (!name) return "Enter your full name.";
    if (!isValidUSPhone(phone)) return "Enter a valid US phone number, e.g. 1 (212) 555-0100.";
    if (!isValidEmail(email)) return "Enter a valid email address.";
    return "";
  };

  const updateSubmitState = (form) => {
    const btn = form.querySelector('button[type="submit"]');
    const msg = form.querySelector(".form-msg");
    const data = readLead(form);
    const complete = isLeadComplete(data);

    if (btn) btn.disabled = !complete;

    // Never paint over the result of an actual submit.
    if (!msg || msg.classList.contains("is-success") || msg.classList.contains("is-error")) return;
    const touched = data.name || data.phone || data.email;
    setMsg(msg, complete || !touched ? "" : describeMissing(data), "is-hint");
  };

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
      ...readLead(form),
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
    if (!data.phone || !isValidUSPhone(data.phone)) {
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
      updateSubmitState(form);
    }
  };

  document.querySelectorAll('form[data-form="lead"]').forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitLead(form);
    });
    form.addEventListener("input", () => {
      const msg = form.querySelector(".form-msg");
      // Editing after a failed/successful submit clears that message so hints can show again.
      if (msg && (msg.classList.contains("is-error") || msg.classList.contains("is-success"))) {
        setMsg(msg, "", null);
      }
      updateSubmitState(form);
    });

    // Flag a field as invalid once the visitor has left it, not while they are still typing.
    form.querySelectorAll("input").forEach((input) => {
      input.addEventListener("blur", () => {
        const value = input.value.trim();
        const name = input.getAttribute("name");
        let ok = true;
        if (name === "phone") ok = !value || isValidUSPhone(value);
        else if (name === "email") ok = !value || isValidEmail(value);
        input.classList.toggle("is-invalid", !ok);
      });
    });

    updateSubmitState(form);
  });
})();
