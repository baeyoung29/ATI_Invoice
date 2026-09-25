function hasLoggedInBefore() {
	return localStorage.getItem("atiHasLoggedInBefore") === "1";
}

function markLoggedInBefore() {
	localStorage.setItem("atiHasLoggedInBefore", "1");
}

let _currentProfile = null; 

function currentUser() {
	return _currentProfile ? _currentProfile.username : null;
}

function currentUserBranding() {
	if (!_currentProfile) return null;
	return {
		logo: _currentProfile.logoData || null,
		stamp: _currentProfile.stampData || null,
		trn: _currentProfile.trn || null,
		address: _currentProfile.address || null,
		phone: _currentProfile.phone || null,
		email: _currentProfile.email || null
	};
}

function usernameKey(username) {
	return username.trim().toLowerCase();
}

function fileToDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(new Error("Could not read file"));
		reader.readAsDataURL(file);
	});
}

function requireAuth(onReady) {
	auth.onAuthStateChanged(async (user) => {
		if (!user) {
			window.location.href = "auth.html";
			return;
		}
		try {
			const doc = await db.collection("users").doc(user.uid).get();
			_currentProfile = doc.exists ? doc.data() : { username: user.email, email: user.email, nextInvoiceNumber: 1 };
		} catch (err) {
			console.error("Could not load profile:", err);
			_currentProfile = { username: user.email, email: user.email, nextInvoiceNumber: 1 };
		}
		if (typeof onReady === "function") onReady(_currentProfile, user);
	});
}

function logout() {
	auth.signOut().then(() => {
		window.location.href = "auth.html";
	});
}

function friendlyFirebaseError(err) {
	const map = {
		"auth/wrong-password": "Incorrect password.",
		"auth/invalid-credential": "Incorrect password.",
		"auth/invalid-login-credentials": "Incorrect password.",
		"auth/user-not-found": "No account found with that username.",
		"auth/email-already-in-use": "That email is already registered.",
		"auth/weak-password": "Password must be at least 6 characters.",
		"auth/invalid-email": "That email address looks invalid.",
		"auth/network-request-failed": "Network error - please check your connection.",
		"auth/too-many-requests": "Too many attempts. Please wait a moment and try again."
	};
	return (err && map[err.code]) || (err && err.message) || "Something went wrong. Please try again.";
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
	const MAX_SIZE = 300 * 1024;

	if (!username || !password) {
		showAuthMsg("regMsg", "Please fill in all fields.", true);
		return;
	}
	if (password !== confirmPassword) {
		showAuthMsg("regMsg", "Passwords do not match.", true);
		return;
	}
	if (password.length < 6) {
		showAuthMsg("regMsg", "Password must be at least 6 characters.", true);
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
		showAuthMsg("regMsg", "Please use images under 300KB each (resize or compress them if needed).", true);
		return;
	}

	setLoading(submitBtn, true);

	const key = usernameKey(username);
	let createdUid = null;

	try {
		const taken = await db.collection("usernames").doc(key).get();
		if (taken.exists) {
			showAuthMsg("regMsg", "That username is already taken.", true);
			setLoading(submitBtn, false);
			return;
		}

		const cred = await auth.createUserWithEmailAndPassword(email, password);
		createdUid = cred.user.uid;

		const [logoData, stampData] = await Promise.all([
			fileToDataURL(logoFile),
			fileToDataURL(stampFile)
		]);

		await db.collection("users").doc(createdUid).set({
			uid: createdUid,
			username: username,
			trn: trn,
			address: address,
			phone: phone,
			email: email,
			logoData: logoData,
			stampData: stampData,
			nextInvoiceNumber: 1,
			createdAt: firebase.firestore.FieldValue.serverTimestamp()
		});

		await db.collection("usernames").doc(key).set({
			uid: createdUid,
			email: email
		});

		await auth.signOut();

		showAuthMsg("regMsg", "Account created! Redirecting to login...", false);
		setTimeout(() => {
			event.target.reset();
			document.getElementById("logoPreview").style.display = "none";
			document.getElementById("stampPreview").style.display = "none";
			setLoading(submitBtn, false);
			goToMode("login");
		}, 900);
	} catch (err) {
		console.error(err);
		showAuthMsg("regMsg", friendlyFirebaseError(err), true);
		setLoading(submitBtn, false);
		if (createdUid && auth.currentUser && auth.currentUser.uid === createdUid) {
			auth.currentUser.delete().catch(() => {});
		}
	}
}

async function handleLogin(event) {
	event.preventDefault();
	const submitBtn = event.target.querySelector("button[type=submit]");

	const username = loginUsername.value.trim();
	const password = loginPassword.value;

	setLoading(submitBtn, true);

	try {
		const key = usernameKey(username);
		const lookup = await db.collection("usernames").doc(key).get();
		if (!lookup.exists) {
			showAuthMsg("loginMsg", "No account found with that username.", true);
			setLoading(submitBtn, false);
			return;
		}

		const email = lookup.data().email;
		await auth.signInWithEmailAndPassword(email, password);

		markLoggedInBefore();
		showAuthMsg("loginMsg", "Welcome back! Loading your invoices...", false);
		document.querySelector(".authWrapper").classList.add("isLeaving");
		setTimeout(() => { window.location.href = "home.html"; }, 260);
	} catch (err) {
		console.error(err);
		showAuthMsg("loginMsg", friendlyFirebaseError(err), true);
		setLoading(submitBtn, false);
	}
}
