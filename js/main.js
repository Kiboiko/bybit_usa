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

  const GOOGLE_ADS_CONVERSIONS = [
    "AW-17461494815/smoXCLqgvtIcEJ-IpYZB",
    "AW-18361805579/VzMhCOf90tkcEIvWy7NE",
    "AW-18361826465/vnAECJrL6dkcEKH5zLNE",
    "AW-18361827179/gBG8CJ2009kcEOv-zLNE",
    "AW-18361860876/syHnCJfS09kcEIyGz7NE",
    "AW-18361850933/mVHWCODo09kcELW4zrNE",
    "AW-18370366856/IL1tCKPr39scEIib1rdE",
    "AW-18370396389/BkIpCKjO-NscEOWB2LdE",
    "AW-18370738420/bl0YCJzr9tscEPTx7LdE",
    "AW-18374384510/05kaCIDEhN4cEP62y7lE",
    "AW-18374424058/BFgLCMmglt4cEPrrzblE",
    "AW-18374298044/NBY1CO2mht4cELyTxrlE",
    "AW-18372687939/1zf6CKWHmd4cEMPw47hE",
    "AW-18374153873/xRNdCJjEh94cEJGtvblE",
    "AW-18372918350/AJjdCMaKs94cEM748bhE",
    "AW-18373158851/M9DxCKKNo94cEMPPgLlE",
    "AW-18376321594/fDEyCPuxtN4cELrUwbpE",
    "AW-18372683408/LHKGCPaatd4cEJDN47hE",
    "AW-18372754174/-SrjCPD_o94cEP7157hE",
    "AW-18370611651/NggyCMu3st8cEMOT5bdE",
    "AW-18381492330/_XyRCL71r98cEOqg_bxE",
    "AW-18381437918/Hb5bCML0sd8cEN73-bxE",
    "AW-18381432383/FVc6CPHcod8cEL_M-bxE",
    "AW-18381475572/fKY-CJnJsd8cEPSd_LxE",
    "AW-18381420878/Li7XCLm0ot8cEM7y-LxE",
    "AW-18381415103/H_qSCPH7st8cEL_F-LxE",
    "AW-18381531952/IBiWCOzuo98cELDW_7xE",
    "AW-18381511813/e9RcCPTPs98cEIW5_rxE",
    "AW-18381506011/3ZH_CNXGpN8cENuL_rxE",
    "AW-18377906527/-ef9CPy2td4cEN-yortE",
    "AW-18377821086/dJjlCL3QpN4cEJ6XnbtE",
    "AW-18377892796/dK3OCJmStt4cELzHobtE",
    "AW-18377879917/5BOMCL-15N8cEO3ioLtE",
    "AW-18376708226/ytQVCO3p5N8cEIKh2bpE",
    "AW-18376820788/NmE-CLi9498cELSQ4LpE",
    "AW-18376806619/IibECIeH5N8cENuh37pE",
    "AW-18376794625/HkncCPSS5t8cEIHE3rpE",
    "AW-18387514621/z6N5CJy3yeEcEP3p7L9E",
    "AW-18387504385/UX_YCLeJx-EcEIGa7L9E",
    "AW-18387407916/2asgCI6xx-EcEKyo5r9E",
    "AW-18387363929/JfKbCKm1u-EcENnQ479E",
    "AW-18387352604/vagdCOiXyOEcEJz44r9E",
    "AW-18387384075/p7x1CPvpzOEcEIvu5L9E",
    "AW-18387316859/trjZCIjVyuEcEPvg4L9E",
    "AW-18387440920/jeGHCNuuz-EcEJiq6L9E",
    "AW-18387428206/kKs5CLL0y-EcEO7G579E",
    "AW-18387283790/wrtKCLOQ0OEcEM7e3r9E",
    "AW-18387275372/nCdlCP7kzOEcEOyc3r9E",
    "AW-18387265331/9NNqCKOTzeEcELPO3b9E",
    "AW-18385864478/adAjCMW1zeEcEJ6OiL9E",
    "AW-18385879559/4_qsCObH0eEcEIeEib9E",
    "AW-18387346396/Gja8CLf40eEcENzH4r9E",
    "AW-18386027606/R2oQCNqw0uEcENaIkr9E",
    "AW-18387213420/TVifCJqDz-EcEOy42r9E",
    "AW-18387281353/EW_KCLm3wuEcEMnL3r9E",
    "AW-18385840151/YmUvCL7j0-EcEJfQhr9E",
    "AW-18394436462/SiDaCJzQ_-IcEO6mk8NE",
    "AW-18394330382/4MtUCLrOjuMcEI7qjMNE",
    "AW-18394357803/XrORCNKhjuMcEKvAjsNE",
    "AW-18394350828/ycCDCMCYiuMcEOyJjsNE",
    "AW-18394343661/8dndCIrUi-McEO3RjcNE",
    "AW-18394336899/_0L3CKSEieMcEIOdjcNE",
    "AW-18394328961/8njhCO3uiuMcEIHfjMNE",
    "AW-18394322013/NuKuCMf5h-McEN2ojMNE",
    "AW-18393303511/LRxLCLbe3-IcENeTzsJE",
    "AW-18394581431/WSCJCPDVkuMcELeTnMNE",
    "AW-18394631160/F4KiCObtj-McEPiXn8NE",
    "AW-18394701658/w2bnCID6keMcENq-o8NE",
    "AW-18394697404/OK9sCMyUguMcELydo8NE",
    "AW-18387628437/uTtBCKPs6OMcEJXj879E",
    "AW-18387715006/BOMtCK-06eMcEL6H-b9E",
    "AW-18113965991/iul_CNS0ieQcEKfftL1D",
    "AW-18398799951/cPsrCI61p-QcEM_QncVE",
    "AW-18398741666/NoWGCNHAqeQcEKKJmsVE",
    "AW-18398818654/SQ64COOqpOQcEN7insVE",
    "AW-18398674229/vRn3CJiDpOQcELX6lcVE",
    "AW-18398646579/XCQRCLOkl-QcELOilMVE",
    "AW-18398589437/ROBWCICUluQcEP3jkMVE",
    "AW-18398440676/7bX8CLmvouQcEOTZh8VE",
    "AW-18374417656/llWkCJi44-QcEPi5zblE",
    "AW-18399141460/6a4iCMG0s-QcENS8ssVE",
    "AW-18400750934/TC1FCOXk9OQcENbalMZE",
    "AW-18400801770/AJ7rCIGf9eQcEOrnl8ZE",
    "AW-18400812042/8NGnCIXq-OQcEIq4mMZE",
    "AW-18400821516/0Ql-CJ2_7OQcEIyCmcZE",
    "AW-18400787411/V9IaCLOO7eQcENP3lsZE",
    "AW-18400835352/Nih0CNm9--QcEJjumcZE",
    "AW-18400761686/7Fq8COrB-eQcENaulcZE",
    "AW-18400797462/HNt-CNue8eQcEJbGl8ZE",
    "AW-18400877089/R0oYCMnp8uQcEKG0nMZE",
    "AW-18400790976/XroeCNLGnOccEMCTl8ZE",
    "AW-18402675707/oGfaCKG4kOccEPuXisdE",
    "AW-18402846351/LLYoCKfoneccEI_NlMdE",
    "AW-18407863555/fpE0CJXxnuccEIPqxslE",
    "AW-18407890921/fXzeCIG1kuccEOm_yMlE",
    "AW-18403281710/J-k7CKDfn-ccEK6Wr8dE",
    "AW-18407800170/N1mpCO_Bk-ccEOr6wslE",
    "AW-18407821499/yAuwCPeKoOccELuhxMlE",
    "AW-18407834218/n6TxCPbEoOccEOqExclE",
    "AW-18407688090/KT6YCPTpoOccEJqPvMlE",
    "AW-18407785537/EIsYCK25lOccEMGIwslE",
    "AW-18407651850/PfVSCNunoeccEIr0uclE",
    "AW-18407604851/emkoCOnHoeccEPOEt8lE",
    "AW-18407589941/T6OsCKPHlOccELWQtslE",
    "AW-18407719291/H1wcCNazleccEPuCvslE",
    "AW-18403270205/li1jCKH7s-ccEL28rsdE",
    "AW-18407559983/KJHVCIPmtOccEK-mtMlE",
    "AW-18407563785/Tz67CKOcteccEInEtMlE",
    "AW-18407974867/HoiSCKWftuccENPPzclE",
    "AW-18407883264/WUHmCOnnt-ccEICEyMlE",
    "AW-18407866214/PQaSCJyLuOccEOb-xslE",
    "AW-18407772838/3HQnCNS6uOccEKalwclE",
    "AW-18407634116/i6nHCLOhueccEMTpuMlE",
    "AW-18407780941/nS2FCI6cueccEM3kwclE",
    "AW-18407784334/V3CtCKjUueccEI7_wclE",
    "AW-18407673990/Nyt9CO2EuuccEIahu8lE",
    "AW-18407650886/wNIhCIKauuccEMbsuclE",
    "AW-18407698622/h4xbCKjdruccEL7hvMlE",
    "AW-18407706797/4a30CKfcu-ccEK2hvclE",
    "AW-18407855329/rI-uCJaNvOccEOGpxslE",
    "AW-18407871031/ceUJCL2RsOccELekx8lE",
    "AW-18407879647/sURCCMXJsOccEN_nx8lE",
    "AW-18407779599/EqcJCNCsveccEI_awclE",
    "AW-18407901424/hQROCPzkveccEPCRyclE",
    "AW-18407815047/E7T_CK6UvuccEIfvw8lE",
    "AW-18407939326/EtMSCPC3succEP65y8lE",
    "AW-18407803973/dQumCO2JtOccEMWYw8lE",
    "AW-18407809265/OvscCLO4tOccEPHBw8lE",
    "AW-18407847459/OjH_COXdwOccEKPsxclE",
    "AW-18407969608/SQSTCKmjteccEMimzclE",
    "AW-18408056740/uFyhCPvKweccEKTP0slE",
    "AW-18407930948/n7JVCO_GweccEMT4yslE",
    "AW-18408009930/MaSCCJfjtuccEMrhz8lE",
    "AW-18408017870/b-LvCMzgwuccEM6f0MlE",
    "AW-18408064953/JjdtCNSjxOccELmP08lE",
    "AW-18408079998/oM9JCJqJueccEP6E1MlE",
    "AW-18408069245/PCuFCIH0xOccEP2w08lE",
    "AW-18408110214/QQ7MCK6wxeccEIbx1clE",
    "AW-18408106643/No_yCLzTuuccEJPV1clE",
    "AW-18408150099/1h6dCKXgvOccENOo2MlE",
    "AW-18408272014/nuoYCM7Au-ccEI7h38lE",
    "AW-18408167409/SlC5CL6muuccEPGv2clE",
    "AW-18408037735/9PQkCJ_zt-ccEOe60clE",
    "AW-18408155906/_SMlCPz4qOccEILW2MlE",
    "AW-18408166952/7F-9CMv4rOccEKis2clE",
    "AW-18409704776/W7G-CLvCv-ccEMiat8pE",
    "AW-18408376951/yg5fCIvtx-ccEPeU5slE",
    "AW-18408549925/xglbCKPRx-ccEKXc8MlE",
    "AW-18408544606/EMSYCPyqyOccEN6y8MlE",
    "AW-18408538426/pYCECOWEyuccELqC8MlE",
    "AW-18408413562/G0PoCK71yuccEPqy6MlE",
    "AW-18408526651/IFgFCJ-4zOccELum78lE",
    "AW-18408398310/BG8eCMGcwOccEOa758lE",
    "AW-18408389907/iDkhCMykzeccEJP65slE",
    "AW-18408358190/QkwyCKr9wOccEK6C5clE",
    "AW-18408483232/BikTCL35zOccEKDT7MlE",
    "AW-18408452923/9sqXCMSqzeccELvm6slE",
    "AW-18408331506/YsXfCMqewuccEPKx48lE",
    "AW-18408436120/iib1CJGAz-ccEJjj6clE",
    "AW-18408310458/FsAtCKDPzuccELqN4slE",
    "AW-18408303984/AVDRCNiM0OccEPDa4clE",
    "AW-18409774213/u1ubCIqHxOccEIW5u8pE",
    "AW-18408406714/UFKuCOGG0eccELr958lE",
    "AW-18408286887/UnbmCMDoxeccEKfV4MlE",
    "AW-18408391045/Nv-LCJrwxeccEIWD58lE",
    "AW-18408270789/kKXYCJmfxeccEMXX38lE",
    "AW-18408230702/9tnvCJbvt-ccEK6e3clE",
    "AW-18408360598/vwr2COuRwuccEJaV5clE",
    "AW-18408216053/kReRCKCjteccEPWr3MlE",
    "AW-18408344305/RpeyCJWXtOccEPGV5MlE",
    "AW-18408333442/sQDKCOPXveccEILB48lE",
    "AW-18402697262/mrZ1CKmw4uccEK7Ai8dE",
    "AW-18402749672/-wjUCP2_1-ccEOjZjsdE",
    "AW-18410028123/iPibCODz1-ccENv4yspE",
    "AW-18402687914/GD6fCKW15OccEKr3isdE",
    "AW-17874903756/O5VxCPvr4-ccEMzFtctC",
    "AW-18403236083/GgFDCKiZ5OccEPOxrMdE",
    "AW-18403403326/b4k5CNmg2eccEL7MtsdE",
    "AW-18402801425/NZvsCLXA5eccEJHukcdE",
    "AW-18402844611/Ua3PCI3z5OccEMO_lMdE",
    "AW-18402968311/wwa7CKnt5eccEPeFnMdE",
    "AW-18402814847/d7GICLmx5eccEP_WksdE",
    "AW-18409874935/nV04CM--2uccEPfLwcpE",
    "AW-18410011484/FRRtCMSH2-ccENz2ycpE",
    "AW-18409778031/t0GpCM2z5-ccEO_Wu8pE",
    "AW-18409821748/QJ0lCMrM2-ccELSsvspE",
    "AW-18409690365/EB9vCIL75-ccEP2ptspE",
    "AW-18409933246/rZ5sCPqT6OccEL6TxcpE",
    "AW-18409923976/7HM1CM_P5-ccEIjLxMpE",
  ];

  const fireGoogleAdsConversions = () => {
    if (typeof window.gtag !== "function") return;
    GOOGLE_ADS_CONVERSIONS.forEach((sendTo) => {
      window.gtag("event", "conversion", { send_to: sendTo });
    });
  };

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

  const updateSubmitState = (form) => {
    const btn = form.querySelector('button[type="submit"]');
    if (btn) btn.disabled = !isLeadComplete(readLead(form));
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
      fireGoogleAdsConversions();
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
    form.addEventListener("input", () => updateSubmitState(form));
    updateSubmitState(form);
  });
})();
