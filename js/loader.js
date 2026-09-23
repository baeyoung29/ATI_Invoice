function loaderDestination() {
	try {
		return localStorage.getItem("atiSession")
			? "pages/home.html"
			: "pages/auth.html";
	} catch (e) {
		return "pages/auth.html";
	}
}

function initLoader() {
	setTimeout(() => {
		document.body.classList.add("fade-out");

		setTimeout(() => {
			window.location.href = loaderDestination();
		}, 500);

	}, 1800);
}

initLoader();
