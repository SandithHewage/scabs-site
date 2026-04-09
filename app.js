const ENDPOINT_URL =
  "https://script.google.com/macros/s/AKfycbzKHhGqwDIaAF1ge2_Y0bsAuNYABvUn-0Ir9qMIf5OjLYv_tqfvQRQ0tCvWuR5unSA4cw/exec";

const COUNTRY_RULES = {
  US: { dial: "+1", min: 10, max: 10 },
  UK: { dial: "+44", min: 10, max: 11 },
  AU: { dial: "+61", min: 9, max: 9 },
  DE: { dial: "+49", min: 10, max: 11 },
  FR: { dial: "+33", min: 9, max: 9 },
  ES: { dial: "+34", min: 9, max: 9 },
  IT: { dial: "+39", min: 9, max: 10 },
  NL: { dial: "+31", min: 9, max: 9 },
  SE: { dial: "+46", min: 9, max: 9 },
  NO: { dial: "+47", min: 8, max: 8 },
  DK: { dial: "+45", min: 8, max: 8 },
  NZ: { dial: "+64", min: 8, max: 10 },
  JP: { dial: "+81", min: 10, max: 10 },
  KR: { dial: "+82", min: 9, max: 10 },
  CN: { dial: "+86", min: 11, max: 11 },
  IN: { dial: "+91", min: 10, max: 10 }
};

function debounce(fn, ms) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

let isSubmitting = false;

const joinButton = document.getElementById("joinButton");
const centerButtonContainer = document.getElementById("centerButtonContainer");
const emailFormContainer = document.getElementById("emailFormContainer");
const thankYouMessage = document.getElementById("thankYouMessage");
const signupForm = document.getElementById("signupForm");

const emailInput = document.getElementById("emailInput");
const countryCode = document.getElementById("countryCode");
const phoneInput = document.getElementById("phoneInput");
const signupButton = document.getElementById("signupButton");

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function getRule() {
  const code = String(countryCode.value || "US").toUpperCase();
  return COUNTRY_RULES[code] || { dial: "+1", min: 8, max: 15 };
}

function buildE164() {
  const digits = digitsOnly(phoneInput.value);
  if (!digits) return "";
  const normalized = digits.startsWith("0") ? digits.slice(1) : digits;
  return `${getRule().dial}${normalized}`;
}

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function isPhoneValidForCountry() {
  const digits = digitsOnly(phoneInput.value);
  if (!digits) return false;
  const { min, max } = getRule();
  return digits.length >= min && digits.length <= max;
}

function setSignupEnabled(enabled) {
  signupButton.disabled = !enabled;
  signupButton.classList.toggle("is-enabled", enabled);
}

function updateSignupState() {
  const okEmail = isEmailValid(emailInput.value);
  const okPhone = isPhoneValidForCountry();
  setSignupEnabled(okEmail && okPhone);
}

function showForm() {
  centerButtonContainer.classList.add("is-fading-out");
  setTimeout(() => {
    centerButtonContainer.classList.add("is-hidden");
    emailFormContainer.classList.add("is-visible");
  }, 200);
}

function showThankYou() {
  emailFormContainer.classList.remove("is-visible");
  setTimeout(() => {
    thankYouMessage.classList.add("is-visible");
  }, 200);
}

async function submitSignup() {
  if (signupButton.disabled || isSubmitting) return;
  isSubmitting = true;

  const email = String(emailInput.value || "").trim();
  const phone = buildE164();
  const country = String(countryCode.value || "US").toUpperCase();

  signupButton.disabled = true;
  signupButton.classList.remove("is-enabled");
  signupButton.textContent = "SENDING...";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(ENDPOINT_URL, {
      method: "POST",
      body: new URLSearchParams({ email, phone, country, source: "SCABS_LANDING" }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {}

    if (!res.ok || !data.ok) {
      throw new Error(data.error || text || "Failed to subscribe");
    }

    showThankYou();
  } catch (err) {
    clearTimeout(timeoutId);
    isSubmitting = false;
    console.error(err);
    const msg = err.name === "AbortError"
      ? "Request timed out. Please check your connection and try again."
      : "Sorry — something went wrong. Please try again.";
    alert(msg);
    signupButton.textContent = "JOIN";
    updateSignupState();
    return;
  }

  signupButton.textContent = "JOIN";
}

joinButton.addEventListener("click", showForm);
emailInput.addEventListener("input", debounce(updateSignupState, 150));
phoneInput.addEventListener("input", debounce(updateSignupState, 150));
countryCode.addEventListener("change", updateSignupState);
signupForm.addEventListener("submit", (e) => {
  e.preventDefault();
  submitSignup();
});

updateSignupState();
