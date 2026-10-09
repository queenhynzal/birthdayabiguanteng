// Semua teks, umur, nama, dan lokasi foto yang mudah diganti ada di sini.
const birthday = {
  name: 'Abi',
  displayName: 'Abi Guanteng',
  age: 50,
  photos: [
    { src: encodeURI('./with umi.jpeg'), caption: 'Ciye Pacaran Niye' },
    { src: encodeURI('./lebaran 2016.jpeg'), caption: '10 Years Ago, Lebaran 2016' },
    { src: encodeURI('./lebaran 2026.jpeg'), caption: 'Now, Lebaran 2026' },
  ],
  message: []
};

birthday.message = [
    `Selamat ulang tahun yang ke-${birthday.age}, ${birthday.displayName}! \u2764\ufe0f`,
    'Terima kasih untuk semua kasih sayang, perhatian, dan perjuangan Abi untuk keluarga kita.',
    'Semoga di usia yang baru ini, Abi selalu diberikan kesehatan, kebahagiaan, ketenangan, dan umur yang penuh berkah.',
    'Semoga Abi selalu punya alasan untuk tersenyum, bisa terus menikmati hal-hal yang Abi sukai, dan memiliki banyak kenangan indah bersama keluarga.',
    'Terima kasih sudah menjadi Abi yang begitu berarti bagi kami. Semoga hari-hari ke depan membawa lebih banyak kebahagiaan dan hal-hal baik untuk Abi.',
    'Kami sayang Abi! Halalan Toyyiban'
  ];

const $ = (selector) => document.querySelector(selector);
const intro = $('#intro');
const memories = $('#memories');
const blowButton = $('#blow-button');
const manualBlowButton = $('#manual-blow-button');
const micFallbackButton = $('#mic-fallback-button');
const surpriseButton = $('#surprise-button');
const cakeWrap = $('.cake-wrap');

$('#intro-title').innerHTML = `HAPPY <span>${birthday.age}TH</span><br />BIRTHDAY, ${birthday.displayName.toUpperCase()}!`;
$('.closing-title').textContent = `Happy ${birthday.age}th Birthday, ${birthday.name}!`;

function renderMemories() {
  $('#memory-title').innerHTML = `Untuk ${birthday.name} <em>tersayang</em>`;
  $('#photo-grid').innerHTML = birthday.photos.map((photo, index) => `
    <figure class="photo-card photo-card-${index + 1}">
      <div class="photo-frame"><img src="${photo.src}" alt="${photo.alt || `Foto ${index + 1}`}" style="object-position: center" /></div>
      <figcaption><span>0${index + 1}</span>${photo.caption}</figcaption>
    </figure>`).join('');
  $('#letter-copy').innerHTML = birthday.message.map((paragraph, index) => `<p${index === 0 ? ' class="letter-greeting"' : ''}>${paragraph}</p>`).join('');
}

function celebrate() {
  if (blowButton.disabled) return;
  if (manualBlowButton && !manualBlowButton.hidden) {
    manualBlowButton.hidden = true;
  }
  if (micFallbackButton && !micFallbackButton.hidden) {
    micFallbackButton.hidden = true;
  }
  blowButton.disabled = true;
  intro.classList.add('celebrated');
  $('#wish').textContent = `Selamat ulang tahun ke-${birthday.age}, ${birthday.name}!`;
  $('#after-wish').hidden = false;
  blowButton.hidden = true;
  surpriseButton.hidden = false;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
  }
  stopMicMonitoring();
  const colors = ['#d6b66d', '#fbf3df', '#b8c9ad', '#fff'];
  const confetti = $('#confetti');
  confetti.replaceChildren(...Array.from({ length: 52 }, (_, index) => {
    const piece = document.createElement('i');
    piece.style.setProperty('--x', `${(index * 37) % 100}%`);
    piece.style.setProperty('--delay', `${(index % 13) * 35}ms`);
    piece.style.setProperty('--duration', `${1500 + (index % 8) * 170}ms`);
    piece.style.setProperty('--color', colors[index % colors.length]);
    piece.style.setProperty('--drift', `${((index * 19) % 180) - 90}px`);
    confetti.append(piece);
    return piece;
  }));
}

let fallbackTimer = null;
let micState = { stream: null, context: null, analyser: null, rafId: null, source: null };

function stopMicMonitoring() {
  if (micState.rafId) {
    cancelAnimationFrame(micState.rafId);
    micState.rafId = null;
  }
  if (micState.stream) {
    micState.stream.getTracks().forEach((track) => track.stop());
    micState.stream = null;
  }
  if (micState.context) {
    micState.context.close();
    micState.context = null;
  }
  micState.analyser = null;
  micState.source = null;
  if (manualBlowButton && manualBlowButton.disabled) {
    manualBlowButton.disabled = false;
    manualBlowButton.textContent = 'TIUP MIC 🎤';
  }
}

function showFallbackBlowButton() {
  if (blowButton.disabled || surpriseButton.hidden === false) return;
  manualBlowButton.hidden = true;
  micFallbackButton.hidden = false;
  blowButton.hidden = false;
  $('#wish').textContent = 'Mic nggak kebaca. Kalau gitu, tiup pakai tombol ini ya.';
}

async function startMicBlow() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showFallbackBlowButton();
    return;
  }

  try {
    manualBlowButton.disabled = true;
    manualBlowButton.textContent = 'MENDENGARKAN...';
    $('#wish').textContent = 'Tiup ke mic sekarang, ya...';

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const context = new AudioCtx();
    const analyser = context.createAnalyser();
    analyser.fftSize = 2048;
    const source = context.createMediaStreamSource(stream);
    source.connect(analyser);

    micState = { stream, context, analyser, source, rafId: null };

    const buffer = new Uint8Array(analyser.fftSize);
    let loudSamples = 0;

    const checkVolume = () => {
      if (blowButton.disabled || surpriseButton.hidden === false) {
        stopMicMonitoring();
        return;
      }

      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      let peak = 0;

      for (let i = 0; i < buffer.length; i += 1) {
        const value = (buffer[i] - 128) / 128;
        sum += value * value;
        peak = Math.max(peak, Math.abs(value));
      }

      const rms = Math.sqrt(sum / buffer.length);

      if (rms > 0.18 || peak > 0.42) {
        loudSamples += 1;
        if (loudSamples >= 12) {
          celebrate();
          return;
        }
      } else {
        loudSamples = 0;
      }

      micState.rafId = requestAnimationFrame(checkVolume);
    };

    micState.rafId = requestAnimationFrame(checkVolume);
  } catch (error) {
    console.error('Mic access failed:', error);
    showFallbackBlowButton();
  }
}

manualBlowButton.addEventListener('click', () => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
  }
  startMicBlow();
});

micFallbackButton.addEventListener('click', () => {
  micFallbackButton.hidden = true;
  manualBlowButton.hidden = true;
  blowButton.hidden = false;
  $('#wish').textContent = 'Kalau mic kurang cocok, pakai tombol ini aja.';
});

cakeWrap.addEventListener('click', () => {
  if (blowButton.disabled || surpriseButton.hidden === false) return;
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
  }
  if (!manualBlowButton.hidden) {
    startMicBlow();
    return;
  }
  celebrate();
});

cakeWrap.setAttribute('tabindex', '0');
cakeWrap.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !blowButton.disabled && surpriseButton.hidden) {
    event.preventDefault();
    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
    }
    if (!manualBlowButton.hidden) {
      startMicBlow();
      return;
    }
    celebrate();
  }
});

blowButton.addEventListener('click', () => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
  }
  celebrate();
});

surpriseButton.addEventListener('click', () => {
  renderMemories();
  intro.hidden = true;
  memories.hidden = false;
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});

fallbackTimer = window.setTimeout(showFallbackBlowButton, 5000);
