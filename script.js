const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const spinBtn = document.getElementById('spin-button');

let originalSegments = [
  "Pen", "Spin Again", "Lip Ice", "Cooler Bag", "Pen",
  "Lip Ice", "Humidifier", "Pen", "Lip Ice",
  "Water bottle", "Pen", "Lip Ice", "Desk fan", "Nothing",
  "Pen", "Lip Ice", "Desk lamp", "Pen",
  "Lip Ice", "Phone holder", "Pen", "Lip Ice", "Umbrella"
];


function loadPrizeStock() {
  return JSON.parse(localStorage.getItem('prizeStock')) || {};
}


function getAvailableSegments() {
  const stock = loadPrizeStock();
  const coolerBagToggledOff = localStorage.getItem('coolerBagRemoved') === 'true';

  // Copy to avoid mutating the original
  const segmentsCopy = [...originalSegments];

  const firstCoolerIndex = segmentsCopy.indexOf("Cooler Bag");
  const penAvailable = stock["Pen"] > 0;

  if (firstCoolerIndex !== -1 && coolerBagToggledOff) {
    if (penAvailable) {
      segmentsCopy[firstCoolerIndex] = "Pen";
    } else {
      segmentsCopy.splice(firstCoolerIndex, 1);
    }
  }

  // Get unique prize categories with stock > 0, excluding 'Spin Again' and 'Nothing'
  const prizeCategories = Array.from(new Set(
    segmentsCopy.filter(prize => prize !== 'Spin Again' && prize !== 'Nothing' && stock[prize] > 0)
  ));

  // Filter out prizes with 0 stock, but always keep 'Spin Again' and 'Nothing' unless less than 3 categories
  let filtered = segmentsCopy.filter(prize => prize === 'Spin Again' || prize === 'Nothing' || stock[prize] > 0);

  if (prizeCategories.length < 4) {
    filtered = filtered.filter(prize => prize !== 'Spin Again' && prize !== 'Nothing');
  }

  return filtered;
}

function decrementPrize(prize) {
  const stock = loadPrizeStock();
  if (stock[prize] > 0) {
    stock[prize]--;
    localStorage.setItem('prizeStock', JSON.stringify(stock));
  }
}

let segments = getAvailableSegments();

const colors = [
  '#0063af', '#ffffff', '#0063af', '#ffffff',
  '#0063af', '#ffffff', '#0063af', '#ffffff',
  '#0063af', '#ffffff', '#0063af', '#ffffff',
  '#0063af', '#ffffff', '#0063af', '#ffffff',
  '#0063af', '#ffffff', '#0063af', '#ffffff'
];

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const radius = Math.min(centerX, centerY) - 5;

// Function to scale canvas for high DPI and prevent blurriness
function scaleCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  
  // Set the actual size of the canvas in memory
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  
  // Scale the drawing context to match device pixel ratio
  ctx.scale(dpr, dpr);
  
  // Set the canvas display size
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
}

let currentAngle = 0;  // Current rotation angle in radians
let isSpinning = false;

function drawWheel(rotation = 0) {
  // Update canvas dimensions and scaling
  scaleCanvas();
  
  // Recalculate center and radius based on new canvas size
  const centerX = canvas.width / (window.devicePixelRatio || 1) / 2;
  const centerY = canvas.height / (window.devicePixelRatio || 1) / 2;
  const radius = Math.min(centerX, centerY) - 5;
  
  const sliceAngle = (2 * Math.PI) / segments.length;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);

  for (let i = 0; i < segments.length; i++) {
    const startAngle = i * sliceAngle;
    const endAngle = startAngle + sliceAngle;

    // Draw slice with gradient
    const grad = ctx.createLinearGradient(
      Math.cos(startAngle) * radius, Math.sin(startAngle) * radius,
      Math.cos(endAngle) * radius, Math.sin(endAngle) * radius
    );
    grad.addColorStop(0, colors[i % colors.length]);
    grad.addColorStop(1, '#e0eafc');

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw text with better style
    ctx.save();
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px Quicksand, Arial, sans-serif';
    ctx.fillStyle = '#222';
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 4;
    const text = segments[i];
    ctx.fillStyle = '#222';
    // Center text vertically and horizontally in slice
    ctx.fillText(text, radius - 60, 0);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();
}


function getWinningSegment(angle) {
  let normalizedAngle = angle % (2 * Math.PI);
  if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;
  const sliceAngle = (2 * Math.PI) / segments.length;
  const adjustedAngle = (normalizedAngle + Math.PI / 2) % (2 * Math.PI);
  const index = Math.floor(segments.length - (adjustedAngle / sliceAngle)) % segments.length;
  return index;
}


function spin() {
  if (isSpinning || segments.length === 0) return;

  isSpinning = true;
  spinBtn.disabled = true;
  spinBtn.textContent = '';

  const spins = Math.floor(Math.random() * 3) + 4;
  const randomAngle = Math.random() * 2 * Math.PI;
  const targetAngle = spins * 2 * Math.PI + randomAngle;
  const duration = 4000; 
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    if (elapsed >= duration) {
      currentAngle = targetAngle % (2 * Math.PI);
      drawWheel(currentAngle);

      const winnerIndex = getWinningSegment(currentAngle);
      const prize = segments[winnerIndex];
      decrementPrize(prize);

      // Show modal and confetti
      const winModal = document.getElementById('win-modal');
      const prizeText = document.getElementById('prize-text');
      prizeText.textContent = `🎉 You won a: ${prize}! 🎉`;
      winModal.classList.remove('hidden');
      showConfetti();

      // Don't hide modal/confetti automatically here!

      // Reload segments & redraw wheel
      segments = getAvailableSegments();
      drawWheel();

      isSpinning = false;
      spinBtn.disabled = false;
      spinBtn.textContent = 'SPIN';
      return;
    }

    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const progress = easeOut(elapsed / duration);
    currentAngle = targetAngle * progress;
    drawWheel(currentAngle);
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

document.querySelector('#win-modal .close-button').addEventListener('click', () => {
  document.getElementById('win-modal').classList.add('hidden');
  hideConfetti();
});

window.addEventListener('click', (e) => {
  const modal = document.getElementById('win-modal');
  if (e.target === modal) {
    modal.classList.add('hidden');
  }
});

spinBtn.addEventListener('click', spin);

// Draw initial wheel
drawWheel();


function testWheelRandomness(spins = 10000) {
  const results = Array(segments.length).fill(0);

  for (let i = 0; i < spins; i++) {
    // Simulate random spin
    const randomAngle = Math.random() * 2 * Math.PI;
    const targetAngle = (Math.floor(Math.random() * 3) + 4) * 2 * Math.PI + randomAngle;

    const finalAngle = targetAngle % (2 * Math.PI);
    const winnerIndex = getWinningSegment(finalAngle);

    results[winnerIndex]++;
  }

  // Log results
  console.log(`Results after ${spins} spins:`);
  segments.forEach((label, index) => {
    const count = results[index];
    const probability = ((count / spins) * 100).toFixed(2);
    console.log(`${label}: ${count} times (${probability}%)`);
  });
}










let W = window.innerWidth;
let H = window.innerHeight;

const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas.getContext('2d');

const maxConfettis = 150;
const particles = [];

const possibleColors = [
  "DodgerBlue", "OliveDrab", "Gold", "Pink", "SlateBlue",
  "LightBlue", "Gold", "Violet", "PaleGreen", "SteelBlue",
  "SandyBrown", "Chocolate", "Crimson"
];

function randomFromTo(from, to) {
  return Math.floor(Math.random() * (to - from + 1) + from);
}

function ConfettiParticle() {
  this.x = Math.random() * W;
  this.y = Math.random() * H - H;
  this.r = randomFromTo(11, 33);
  this.d = Math.random() * maxConfettis + 11;
  this.color = possibleColors[Math.floor(Math.random() * possibleColors.length)];
  this.tilt = Math.floor(Math.random() * 33) - 11;
  this.tiltAngleIncremental = Math.random() * 0.07 + 0.05;
  this.tiltAngle = 0;

  this.draw = function () {
    confettiCtx.beginPath();
    confettiCtx.lineWidth = this.r / 2;
    confettiCtx.strokeStyle = this.color;
    confettiCtx.moveTo(this.x + this.tilt + this.r / 3, this.y);
    confettiCtx.lineTo(this.x + this.tilt, this.y + this.tilt + this.r / 5);
    confettiCtx.stroke();
  };
}

function resetConfetti() {
  for (let i = 0; i < maxConfettis; i++) {
    particles[i].x = Math.random() * W;
    particles[i].y = Math.random() * H - H;
    particles[i].tilt = Math.floor(Math.random() * 33) - 11;
    particles[i].tiltAngle = 0;
  }
}

function animateConfetti() {
  requestAnimationFrame(animateConfetti);
  confettiCtx.clearRect(0, 0, W, H);

  for (let i = 0; i < maxConfettis; i++) {
    const p = particles[i];
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;

    if (p.x > W + 30 || p.x < -30 || p.y > H) {
      p.x = Math.random() * W;
      p.y = -30;
      p.tilt = Math.floor(Math.random() * 10) - 20;
    }

    p.draw();
  }
}

window.addEventListener('resize', () => {
  W = window.innerWidth;
  H = window.innerHeight;
  confettiCanvas.width = W;
  confettiCanvas.height = H;
});

// Initialize confetti canvas size and particles
confettiCanvas.width = W;
confettiCanvas.height = H;

for (let i = 0; i < maxConfettis; i++) {
  particles.push(new ConfettiParticle());
}

// Start confetti animation but keep canvas hidden initially
confettiCanvas.style.display = 'none';
animateConfetti();

// --- USAGE: To show confetti, do ---
function showConfetti() {
  resetConfetti();
  confettiCanvas.style.display = 'block';
}

// To hide confetti when done:
function hideConfetti() {
  confettiCanvas.style.display = 'none';
}

// Initialize canvas and handle window resize
window.addEventListener('resize', () => {
  drawWheel(currentAngle);
});

// Handle orientation changes on mobile devices
window.addEventListener('orientationchange', () => {
  // Small delay to ensure the orientation change is complete
  setTimeout(() => {
    drawWheel(currentAngle);
  }, 100);
});

// Also listen for screen orientation API if available
if (screen && screen.orientation) {
  screen.orientation.addEventListener('change', () => {
    setTimeout(() => {
      drawWheel(currentAngle);
    }, 100);
  });
}

// Initial draw
drawWheel();