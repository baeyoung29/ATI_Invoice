(function migrateLegacyKeys() {
	[["vivantUsers", "atiUsers"], ["vivantSession", "atiSession"], ["vivantInvoice", "atiInvoice"]].forEach(([oldKey, newKey]) => {
		const value = localStorage.getItem(oldKey);
		if (value !== null) {
			if (localStorage.getItem(newKey) === null) localStorage.setItem(newKey, value);
			localStorage.removeItem(oldKey);
		}
	});
})();

async function hashPassword(password) {
	const enc = new TextEncoder().encode(password);
	const buf = await crypto.subtle.digest("SHA-256", enc);
	return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getUsers() {
	return JSON.parse(localStorage.getItem("atiUsers") || "{}");
}

function saveUsers(users) {
	localStorage.setItem("atiUsers", JSON.stringify(users));
}

function currentUser() {
	return localStorage.getItem("atiSession");
}

function hasLoggedInBefore() {
	return localStorage.getItem("atiHasLoggedInBefore") === "1";
}

function markLoggedInBefore() {
	localStorage.setItem("atiHasLoggedInBefore", "1");
}

function currentUserBranding() {
	const username = currentUser();
	if (!username) return null;

	const users = getUsers();
	const user = users[username];
	if (!user) return null;

	return {
		logo: user.logo || null,
		stamp: user.stamp || null,
		trn: user.trn || null,
		address: user.address || null,
		phone: user.phone || null,
		email: user.email || null
	};
}

function fileToDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsDataURL(file);
	});
}

function requireAuth() {
	if (!currentUser()) {
		window.location.href = "auth.html";
	}
}

function logout() {
	localStorage.removeItem("atiSession");
	window.location.href = "auth.html";
}

function showAuthMsg(id, text, isError) {
	const msg = document.getElementById(id);
	if (!msg) return;
	msg.textContent = text;
	msg.className = "authMsg " + (isError ? "error shake" : "success");

	if (isError) {
		msg.addEventListener("animationend", () => msg.classList.remove("shake"), { once: true });
	}
}

function clearAuthMsgs() {
	document.querySelectorAll(".authMsg").forEach(m => {
		m.textContent = "";
		m.className = "authMsg";
	});
}

function setLoading(btn, isLoading) {
	if (!btn) return;
	btn.disabled = isLoading;
	btn.classList.toggle("isLoading", isLoading);
}

const EYE_ICON = '<svg class="pwIcon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_ICON = '<svg class="pwIcon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a19.8 19.8 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 7 11 7a19.9 19.9 0 0 1-3.17 4.19"/><path d="M14.12 14.12A3 3 0 1 1 9.88 9.88"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function togglePassword(inputId, btn) {
	const input = document.getElementById(inputId);
	const showing = input.type === "text";
	input.type = showing ? "password" : "text";
	btn.innerHTML = showing ? EYE_ICON : EYE_OFF_ICON;
	btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
}

function previewImage(input, previewId) {
	const preview = document.getElementById(previewId);
	if (input.files && input.files[0]) {
		const reader = new FileReader();
		reader.onload = e => {
			preview.src = e.target.result;
			preview.style.display = "block";
		};
		reader.readAsDataURL(input.files[0]);
	} else {
		preview.style.display = "none";
	}
}

function setAuthMode(mode, options) {
	const wrapper = document.querySelector(".authWrapper");
	if (!wrapper) return;

	const opts = options || {};
	const isRegister = mode === "register";

	wrapper.dataset.mode = mode;
	document.title = isRegister ? "ATI - Register" : "ATI - Login";

	const loginTitle = document.getElementById("loginTitle");
	const loginSubtitle = document.getElementById("loginSubtitle");
	if (loginTitle && loginSubtitle) {
		if (hasLoggedInBefore()) {
			loginTitle.textContent = "Welcome back";
			loginSubtitle.textContent = "Log in to continue to your invoices";
		} else {
			loginTitle.textContent = "Welcome";
			loginSubtitle.textContent = "Log in, or create an account to get started";
		}
	}

	const loginSlide = document.getElementById("loginSlide");
	const registerSlide = document.getElementById("registerSlide");
	loginSlide.inert = isRegister;
	registerSlide.inert = !isRegister;
	loginSlide.setAttribute("aria-hidden", String(isRegister));
	registerSlide.setAttribute("aria-hidden", String(!isRegister));

	clearAuthMsgs();

	if (!opts.silent) {
		setTimeout(() => {
			const target = document.getElementById(isRegister ? "regUsername" : "loginUsername");
			if (target) target.focus({ preventScroll: true });
		}, 520);
	}
}

function goToMode(mode) {
	if (window.location.hash !== "#" + mode) {
		window.location.hash = mode;
	} else {
		setAuthMode(mode);
	}
}

function modeFromHash() {
	return window.location.hash === "#register" ? "register" : "login";
}

function initAuthPage() {
	setAuthMode(modeFromHash(), { silent: true });

	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			document.querySelector(".authWrapper").classList.add("ready");
		});
	});

	window.addEventListener("hashchange", () => setAuthMode(modeFromHash()));
}

async function handleRegister(event) {
	event.preventDefault();
	const submitBtn = event.target.querySelector("button[type=submit]");

	const username = regUsername.value.trim();
	const password = regPassword.value;
	const confirmPassword = regConfirm.value;
	const trn = regTRN.value.trim();
	const address = regAddress.value.trim();
	const phone = regPhone.value.trim();
	const email = regEmail.value.trim();
	const logoFile = regLogo.files[0];
	const stampFile = regStamp.files[0];
	const MAX_SIZE = 2 * 1024 * 1024;

	if (!username || !password) {
		showAuthMsg("regMsg", "Please fill in all fields.", true);
		return;
	}
	if (password !== confirmPassword) {
		showAuthMsg("regMsg", "Passwords do not match.", true);
		return;
	}
	if (password.length < 4) {
		showAuthMsg("regMsg", "Password must be at least 4 characters.", true);
		return;
	}
	if (!/^\d{15}$/.test(trn)) {
		showAuthMsg("regMsg", "TRN must be exactly 15 digits.", true);
		return;
	}
	if (!address || !phone || !email) {
		showAuthMsg("regMsg", "Please fill in your company address, phone, and email.", true);
		return;
	}
	if (!logoFile || !stampFile) {
		showAuthMsg("regMsg", "Please upload both your logo and your stamp.", true);
		return;
	}
	if (logoFile.size > MAX_SIZE || stampFile.size > MAX_SIZE) {
		showAuthMsg("regMsg", "Please use images under 2MB each.", true);
		return;
	}

	const users = getUsers();
	if (users[username]) {
		showAuthMsg("regMsg", "That username is already taken.", true);
		return;
	}

	setLoading(submitBtn, true);

	const [passwordHash, logoData, stampData] = await Promise.all([
		hashPassword(password),
		fileToDataURL(logoFile),
		fileToDataURL(stampFile)
	]);

	users[username] = {
		password: passwordHash,
		logo: logoData,
		stamp: stampData,
		trn: trn,
		address: address,
		phone: phone,
		email: email
	};
	saveUsers(users);

	showAuthMsg("regMsg", "Account created! Redirecting to login...", false);
	setTimeout(() => {
		event.target.reset();
		document.getElementById("logoPreview").style.display = "none";
		document.getElementById("stampPreview").style.display = "none";
		setLoading(submitBtn, false);
		goToMode("login");
	}, 900);
}

async function handleLogin(event) {
	event.preventDefault();
	const submitBtn = event.target.querySelector("button[type=submit]");

	const username = loginUsername.value.trim();
	const password = loginPassword.value;
	const users = getUsers();

	if (!users[username]) {
		showAuthMsg("loginMsg", "No account found with that username.", true);
		return;
	}

	setLoading(submitBtn, true);

	const hashed = await hashPassword(password);
	if (users[username].password !== hashed) {
		showAuthMsg("loginMsg", "Incorrect password.", true);
		setLoading(submitBtn, false);
		return;
	}

	localStorage.setItem("atiSession", username);
	markLoggedInBefore();
	showAuthMsg("loginMsg", "Welcome back! Loading your invoices...", false);
	document.querySelector(".authWrapper").classList.add("isLeaving");
	setTimeout(() => { window.location.href = "home.html"; }, 260);
}
