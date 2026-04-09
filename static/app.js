// static/app.js
const fileInput = document.getElementById('fileInput');
const previewImg = document.getElementById('preview');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultCard = document.getElementById('resultCard');
const resultText = document.getElementById('resultText');
const toast = document.getElementById('toast');

const openCameraBtn = document.getElementById('openCamera');
const stopCameraBtn = document.getElementById('stopCamera');
const cameraFrame = document.getElementById('camera-frame');
const video = document.getElementById('video');
const snapBtn = document.getElementById('snap');

let currentBlob = null;
let stream = null;

function showToast(msg, timeout=2500){
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(()=>toast.classList.add('hidden'), timeout);
}

fileInput.addEventListener('change', (ev)=>{
  const file = ev.target.files && ev.target.files[0];
  if(!file) return;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  previewImg.classList.remove('hidden');
  cameraFrame.classList.add('hidden');
  currentBlob = file;
  resultCard.classList.add('hidden');
});

openCameraBtn.addEventListener('click', async ()=>{
  // Request camera (prefer rear camera on phones)
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: {ideal: 1280}, height: {ideal: 720} },
      audio: false
    });
    video.srcObject = stream;
    cameraFrame.classList.remove('hidden');
    previewImg.classList.add('hidden');
    showToast('Camera opened');
  } catch (err) {
    showToast('Camera permission denied or not available');
    console.error(err);
  }
});

stopCameraBtn.addEventListener('click', ()=>{
  if(stream){
    stream.getTracks().forEach(t=>t.stop());
    stream = null;
    video.srcObject = null;
  }
  cameraFrame.classList.add('hidden');
  showToast('Camera stopped');
});

snapBtn && snapBtn.addEventListener('click', ()=>{
  if(!stream) return;
  // draw current frame to canvas and convert to blob
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob=>{
    currentBlob = blob;
    previewImg.src = URL.createObjectURL(blob);
    previewImg.classList.remove('hidden');
    cameraFrame.classList.add('hidden');
    // stop camera after capture
    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream = null;
  }, 'image/jpeg', 0.9);
});

analyzeBtn.addEventListener('click', async ()=>{
  if(!currentBlob){
    showToast('Please pick a file or capture a photo first');
    return;
  }

  showToast('Uploading… (this may take a few seconds)', 4000);
  resultCard.classList.add('hidden');
  resultText.textContent = '';

  const form = new FormData();
  form.append('file', currentBlob, 'photo.jpg');

  try {
    const resp = await fetch('/api/analyze', {
      method: 'POST',
      body: form
    });
    const data = await resp.json();
    if(resp.ok && data.result){
      resultText.textContent = data.result;
      resultCard.classList.remove('hidden');
      // Smooth scroll to result
      resultCard.scrollIntoView({behavior:'smooth', block:'center'});
      showToast('Analysis complete');
    } else {
      console.error(data);
      showToast(data.error || 'Server error during analysis', 4000);
    }
  } catch (err) {
    console.error(err);
    showToast('Network error — check your connection', 4000);
  }
});
