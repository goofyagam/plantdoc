const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const resultDiv = document.getElementById("result");
const loading = document.getElementById("loading");

// Show image preview
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.innerHTML = "";
    preview.appendChild(img);
  }
});

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  loading.classList.remove("hidden");
  resultDiv.classList.add("hidden");

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.result) {
      formatResult(data.result);
    } else {
      resultDiv.innerText = "Error: " + data.error;
    }
  } catch (err) {
    resultDiv.innerText = "Something went wrong.";
  }

  loading.classList.add("hidden");
});

// Format and display result
function formatResult(text) {
  const resultDiv = document.getElementById("result");
  resultDiv.classList.remove("hidden");

  const lines = text.split("\n");

  // Disease
  document.getElementById("disease").innerText =
    lines[0] || "Not detected";

  // Confidence
  document.getElementById("confidence").innerText =
    "Based on AI analysis";

  const symptomsList = document.getElementById("symptoms");
  const remediesList = document.getElementById("remedies");

  symptomsList.innerHTML = "";
  remediesList.innerHTML = "";

  // Symptoms (first few lines)
  lines.slice(1, 6).forEach((line) => {
    if (line.trim()) {
      let li = document.createElement("li");
      li.innerText = line.trim();
      symptomsList.appendChild(li);
    }
  });

  // Remedies (remaining lines)
  lines.slice(6).forEach((line) => {
    if (line.trim()) {
      let li = document.createElement("li");
      li.innerText = line.trim();
      remediesList.appendChild(li);
    }
  });
}
