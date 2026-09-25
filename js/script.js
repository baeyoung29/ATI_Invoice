// initInvoiceForm is called once from home.html, after Firebase confirms who
// is signed in and their profile has loaded (see requireAuth in auth.js).
function initInvoiceForm(profile) {
	document.getElementById("invNo").value = profile.nextInvoiceNumber || 1;

	if (!invDate.value) {
		invDate.value = new Date().toISOString().split("T")[0];
	}

	updateInvoice();
	loadInvoiceHistory();
}

function formatMoney(n) {
	return (n || 0).toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function sanitizePhone(input) {
	const cleaned = input.value.replace(/[^0-9+\-\s()]/g, "");
	if (cleaned !== input.value) {
		input.value = cleaned;
	}
}

function collectInvoiceData() {
	const items = [...document.querySelectorAll(".itemRow")].map(row => ({
		desc: row.querySelector(".desc").value,
		qty: parseFloat(row.querySelector(".qty").value) || 0,
		price: parseFloat(row.querySelector(".price").value) || 0
	}));

	const payments = [...document.querySelectorAll(".paymentRow")].map(row => ({
		mode: row.querySelector(".payMode").value,
		ref: row.querySelector(".payRef").value || "",
		amount: parseFloat(row.querySelector(".payAmount").value) || 0
	}));

	return {
		invoiceNo: parseInt(invNo.value) || 1,
		date: invDate.value,
		customer: {
			name: custName.value,
			address: custAddress.value,
			phone: custPhone.value,
			trn: custTRN.value
		},
		items: items,
		payments: payments,
		grandTotal: parseFloat((grandTotal.innerText || "0").replace(/,/g, "")) || 0
	};
}

// Saves the current invoice to Firestore under the signed-in user, and bumps
// their stored invoice counter so the next invoice number keeps incrementing
// even from a different device.
async function saveCurrentInvoice(statusElId) {
	if (!auth.currentUser) return false;
	const uid = auth.currentUser.uid;
	const data = collectInvoiceData();

	try {
		await db.collection("users").doc(uid).collection("invoices").add({
			...data,
			createdAt: firebase.firestore.FieldValue.serverTimestamp()
		});
		await db.collection("users").doc(uid).update({
			nextInvoiceNumber: data.invoiceNo + 1
		});
		invNo.value = data.invoiceNo + 1;
		updateInvoice();
		loadInvoiceHistory();
		if (statusElId) {
			const el = document.getElementById(statusElId);
			if (el) { el.textContent = "Saved."; setTimeout(() => { el.textContent = ""; }, 2000); }
		}
		return true;
	} catch (err) {
		console.error("Could not save invoice:", err);
		if (statusElId) {
			const el = document.getElementById(statusElId);
			if (el) el.textContent = "Could not save - check your connection.";
		}
		return false;
	}
}

async function saveInvoiceOnly() {
	if (!custName.value.trim()) {
		alert("Please enter a customer name before saving.");
		custName.focus();
		return;
	}
	if (document.querySelectorAll(".itemRow").length === 0) {
		alert("Please add at least one item before saving.");
		return;
	}
	await saveCurrentInvoice("saveStatus");
}

async function printInvoice() {
	if (!custName.value.trim()) {
		alert("Please enter a customer name before printing.");
		custName.focus();
		return;
	}

	if (document.querySelectorAll(".itemRow").length === 0) {
		alert("Please add at least one item before printing.");
		return;
	}

	await saveCurrentInvoice();
	window.print();
}

function addItem() {
	let div = document.createElement("div");
	div.className = "itemRow";

	div.innerHTML = `
		<textarea class="desc" placeholder="Description" oninput="updateInvoice()"></textarea>
		<input type="number" class="qty" value="1" oninput="updateInvoice()">
		<input type="number" class="price" placeholder="Unit Price Incl VAT" oninput="updateInvoice()">
		<button onclick="removeItem(this)">Remove</button>
	`;

	document.getElementById("itemList").appendChild(div);
}

function removeItem(btn) {
	btn.parentElement.remove();
	updateInvoice();
}

function addPayment() {
	let div = document.createElement("div");
	div.className = "paymentRow";

	div.innerHTML = `
		<select class="payMode" onchange="updateInvoice()">
			<option>CASH</option>
			<option>CARD</option>
			<option>BANK TRANSFER</option>
			<option>CHEQUE</option>
		</select>
		<input type="text" class="payRef" placeholder="Reference" oninput="updateInvoice()">
		<input type="number" class="payAmount" placeholder="Amount" oninput="updateInvoice()">
		<button onclick="removePayment(this)">Remove</button>
	`;

	document.getElementById("paymentList").appendChild(div);
}

function removePayment(btn) {
	btn.parentElement.remove();
	updateInvoice();
}

function numberToWords(num) {
	const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
		"Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
	const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

	function convertHundreds(n) {
		let str = "";
		if (n > 99) { str += ones[Math.floor(n / 100)] + " Hundred "; n %= 100; }
		if (n > 19) { str += tens[Math.floor(n / 10)] + " "; n %= 10; }
		if (n > 0) { str += ones[n] + " "; }
		return str;
	}

	function convertNumber(n) {
		let result = "";

		let billions = Math.floor(n / 1000000000);
		let millions = Math.floor((n % 1000000000) / 1000000);
		let thousands = Math.floor((n % 1000000) / 1000);
		let hundreds = n % 1000;

		if (billions) result += convertHundreds(billions) + " Billion ";
		if (millions) result += convertHundreds(millions) + " Million ";
		if (thousands) result += convertHundreds(thousands) + " Thousand ";
		if (hundreds) result += convertHundreds(hundreds);

		return result.trim();
	}

	let integer = Math.floor(num);
	let decimal = Math.round((num - integer) * 100);

	let words = (convertNumber(integer) || "Zero") + " Dirhams";

	if (decimal > 0) {
		words += " and " + convertNumber(decimal) + " Fils";
	}

	return (words + " Only").replace(/\s+/g, " ").trim();
}

function updateInvoice() {
	let invNumber = parseInt(invNo.value) || 1;

	pInvNo.innerText = "INV-" + String(invNumber).padStart(4, "0");
	pDate.innerText = invDate.value;

	pName.innerText = custName.value;
	pAddress.innerText = custAddress.value;
	pPhone.innerText = custPhone.value;
	pTRN.innerText = custTRN.value;

	let tbody = document.getElementById("invoiceItems");
	tbody.innerHTML = "";

	let subtotal = 0;
	let vatTotal = 0;

	document.querySelectorAll(".itemRow").forEach((row, i) => {
		let desc = row.querySelector(".desc").value;
		let qty = parseFloat(row.querySelector(".qty").value) || 0;
		let price = parseFloat(row.querySelector(".price").value) || 0;

		let unitExcl = price / 1.05;
		let taxable = unitExcl * qty;
		let vat = taxable * 0.05;
		let total = taxable + vat;

		subtotal += taxable;
		vatTotal += vat;

		let tr = document.createElement("tr");
		tr.innerHTML = `
			<td>#${i + 1}</td>
			<td class="desc">${desc.replace(/</g, "&lt;")}</td>
			<td>${qty}</td>
			<td>AED ${formatMoney(price)}</td>
			<td>AED ${formatMoney(unitExcl)}</td>
			<td>AED ${formatMoney(taxable)}</td>
			<td>5%</td>
			<td>AED ${formatMoney(vat)}</td>
			<td>AED ${formatMoney(total)}</td>
		`;

		tbody.appendChild(tr);
	});

	let grand = subtotal + vatTotal;

	grandTotal.innerText = formatMoney(grand);
	pWords.innerText = numberToWords(grand);

	let paymentBody = document.getElementById("paymentRows");
	paymentBody.innerHTML = "";

	let paidTotal = 0;

	document.querySelectorAll(".paymentRow").forEach(row => {
		let mode = row.querySelector(".payMode").value;
		let ref = row.querySelector(".payRef").value || "-";
		let amount = parseFloat(row.querySelector(".payAmount").value) || 0;

		paidTotal += amount;

		let taxable = amount / 1.05;
		let vat = taxable * 0.05;

		let tr = document.createElement("tr");
		tr.innerHTML = `
			<td>${mode}</td>
			<td>${ref.replace(/</g, "&lt;")}</td>
			<td>AED</td>
			<td>AED ${formatMoney(taxable)}</td>
			<td>AED ${formatMoney(vat)}</td>
			<td>AED ${formatMoney(amount)}</td>
		`;

		paymentBody.appendChild(tr);
	});

	let balanceEl = document.getElementById("balanceDue");
	if (balanceEl) {
		let balance = grand - paidTotal;
		balanceEl.innerText = formatMoney(balance);
		balanceEl.style.color = balance > 0.01 ? "#b00000" : "#1a7a1a";
	}
}

function resetEditorForNewInvoice(nextInvoiceNo) {
	invNo.value = nextInvoiceNo;
	custName.value = "";
	custAddress.value = "";
	custPhone.value = "";
	custTRN.value = "";
	document.getElementById("itemList").innerHTML = "";
	document.getElementById("paymentList").innerHTML = "";
	addItem();
	addPayment();
	updateInvoice();
}

// ---- Invoice history (Firestore) ----

async function loadInvoiceHistory() {
	const list = document.getElementById("invoiceHistoryList");
	if (!list || !auth.currentUser) return;

	list.innerHTML = "<li class='historyEmpty'>Loading...</li>";

	try {
		const uid = auth.currentUser.uid;
		const snap = await db.collection("users").doc(uid).collection("invoices")
			.orderBy("createdAt", "desc").limit(20).get();

		if (snap.empty) {
			list.innerHTML = "<li class='historyEmpty'>No saved invoices yet.</li>";
			return;
		}

		list.innerHTML = "";
		snap.forEach(doc => {
			const d = doc.data();
			const li = document.createElement("li");
			const custNameText = (d.customer && d.customer.name) ? d.customer.name : "Unnamed";
			const btn = document.createElement("button");
			btn.type = "button";
			btn.textContent = "INV-" + String(d.invoiceNo).padStart(4, "0") + " - " + custNameText + " - AED " + formatMoney(d.grandTotal);
			btn.onclick = () => loadInvoiceIntoEditor(doc.id);
			li.appendChild(btn);
			list.appendChild(li);
		});
	} catch (err) {
		console.error("Could not load invoice history:", err);
		list.innerHTML = "<li class='historyEmpty'>Could not load history.</li>";
	}
}

async function loadInvoiceIntoEditor(invoiceId) {
	if (!auth.currentUser) return;
	const uid = auth.currentUser.uid;

	try {
		const doc = await db.collection("users").doc(uid).collection("invoices").doc(invoiceId).get();
		if (!doc.exists) return;
		const d = doc.data();

		invNo.value = d.invoiceNo;
		invDate.value = d.date;
		custName.value = d.customer.name;
		custAddress.value = d.customer.address;
		custPhone.value = d.customer.phone;
		custTRN.value = d.customer.trn;

		document.getElementById("itemList").innerHTML = "";
		(d.items || []).forEach(it => {
			addItem();
			const row = document.querySelector("#itemList .itemRow:last-child");
			row.querySelector(".desc").value = it.desc;
			row.querySelector(".qty").value = it.qty;
			row.querySelector(".price").value = it.price;
		});

		document.getElementById("paymentList").innerHTML = "";
		(d.payments || []).forEach(p => {
			addPayment();
			const row = document.querySelector("#paymentList .paymentRow:last-child");
			row.querySelector(".payMode").value = p.mode;
			row.querySelector(".payRef").value = p.ref;
			row.querySelector(".payAmount").value = p.amount;
		});

		updateInvoice();
	} catch (err) {
		console.error("Could not load invoice:", err);
		alert("Could not load that invoice - check your connection.");
	}
}
