const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const preview = document.getElementById("preview");
const resultDiv = document.getElementById("result");
const loading = document.getElementById("loading");

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.innerHTML = "";
    preview.appendChild(img);
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  loading.classList.remove("hidden");
  resultDiv.innerHTML = "";

  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (data.result) {
      resultDiv.innerText = data.result;
    } else {
      resultDiv.innerText = "Error: " + data.error;
    }

  } catch (err) {
    resultDiv.innerText = "Something went wrong.";
  }

  loading.classList.add("hidden");
});
