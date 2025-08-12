// Register the service worker for offline & install prompt
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.hidden = true;
});

const el = (id) => document.getElementById(id);
const statusEl = el('status');
const nowCard = document.querySelector('.now');
const forecastCard = document.querySelector('.forecast');

const WMO = {
  0:['Clear','☀️'],1:['Mainly clear','🌤️'],2:['Partly cloudy','⛅'],3:['Overcast','☁️'],
  45:['Fog','🌫️'],48:['Rime fog','🌫️'],
  51:['Light Drizzle','🌦️'],53:['Drizzle','🌦️'],55:['Heavy Drizzle','🌧️'],
  61:['Light Rain','🌧️'],63:['Rain','🌧️'],65:['Heavy Rain','🌧️'],
  66:['Freezing Rain','🌧️'],67:['Freezing Rain','🌧️'],
  71:['Light Snow','🌨️'],73:['Snow','🌨️'],75:['Heavy Snow','❄️'],
  77:['Snow grains','🌨️'],
  80:['Rain showers','🌦️'],81:['Rain showers','🌧️'],82:['Violent showers','⛈️'],
  85:['Snow showers','🌨️'],86:['Snow showers','❄️'],
  95:['Thunderstorm','⛈️'],96:['Thunder w/ hail','⛈️'],99:['Thunder w/ hail','⛈️']
};

function fmtTemp(v){return Math.round(v) + '°'}
function dayName(dateStr){
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined,{weekday:'short'});
}

async function getWeather(lat, lon){
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: 'temperature_2m,weather_code,apparent_temperature,relative_humidity_2m,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto'
  });
  const res = await fetch(url);
  if(!res.ok) throw new Error('Weather fetch failed');
  return res.json();
}

async function init(){
  try{
    statusEl.textContent = 'Requesting location…';
    const pos = await new Promise((resolve, reject)=>{
      navigator.geolocation.getCurrentPosition(resolve, reject, {enableHighAccuracy:true, timeout:10000});
    });
    const {latitude:lat, longitude:lon} = pos.coords;
    statusEl.textContent = 'Fetching weather…';

    const data = await getWeather(lat, lon);

    // Current
    const c = data.current;
    const [desc, emoji] = WMO[c.weather_code] || ['—','ℹ️'];
    el('temp').textContent = fmtTemp(c.temperature_2m);
    el('desc').textContent = `${emoji} ${desc}`;
    el('meta').textContent = `Feels like ${fmtTemp(c.apparent_temperature)} · Humidity ${c.relative_humidity_2m}% · Wind ${Math.round(c.wind_speed_10m)} km/h`;
    el('location').textContent = `${data.latitude.toFixed(3)}, ${data.longitude.toFixed(3)} (${data.timezone})`;
    el('time').textContent = new Date(c.time).toLocaleString();

    nowCard.hidden = false;

    // Forecast
    const daysWrap = el('days');
    daysWrap.innerHTML = '';
    const {time:dates, weather_code:wcodes, temperature_2m_max:tmax, temperature_2m_min:tmin} = data.daily;
    dates.forEach((d,i)=>{
      const [dDesc, dEmoji] = WMO[wcodes[i]] || ['—','ℹ️'];
      const div = document.createElement('div');
      div.className='day';
      div.innerHTML = `
        <div class="name">${dayName(d)}</div>
        <div class="emoji">${dEmoji}</div>
        <div class="text">${dDesc}</div>
        <div class="range">${fmtTemp(tmin[i])} / ${fmtTemp(tmax[i])}</div>
      `;
      daysWrap.appendChild(div);
    });
    forecastCard.hidden = false;

    statusEl.remove();
  }catch(err){
    statusEl.textContent = 'Allow location to see local weather. Or try again.';
    console.error(err);
  }
}

init();