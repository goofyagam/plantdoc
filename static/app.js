const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const resultDiv = document.getElementById("result");
const loading = document.getElementById("loading");

// Image preview
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.width = "100%";
        img.style.borderRadius = "10px";

        preview.innerHTML = "";
        preview.appendChild(img);
    }
});

// Form submit
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
        resultDiv.innerText = "Please select an image first.";
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // UI states
    loading.classList.remove("hidden");
    resultDiv.classList.add("hidden");
    resultDiv.innerText = "";

    try {
        const res = await fetch("/api/analyze", {
            method: "POST",
            body: formData,
        });

        const data = await res.json();

        // ✅ Correct logic
        if (data.error) {
            resultDiv.innerText = "❌ " + data.error;
        } else {
            formatResult(data.result);
        }

    } catch (err) {
        resultDiv.innerText = "❌ Error: " + err.message;
    }

    loading.classList.add("hidden");
});

// Format AI result nicely
function formatResult(text) {
    resultDiv.classList.remove("hidden");

    // Split lines safely
    const lines = text.split("\n").filter(l => l.trim() !== "");

    // Clear previous
    resultDiv.innerHTML = "";

    // Title
    const title = document.createElement("h3");
    title.innerText = "Analysis Result";
    resultDiv.appendChild(title);

    // Show all lines cleanly
    lines.forEach(line => {
        const p = document.createElement("p");
        p.innerText = line;
        resultDiv.appendChild(p);
    });
}
