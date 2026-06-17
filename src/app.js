'use strict';

let eco = 'npm';

function init() {
  document.querySelectorAll('.eco-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.eco-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      eco = btn.dataset.eco;
    });
  });

  document.getElementById('pkg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey) runCheck();
  });

  loadFromUrl();
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const pkg = params.get('pkg');
  const ecosystem = params.get('eco');
  if (pkg && ecosystem) {
    const btn = document.querySelector(`.eco-btn[data-eco="${ecosystem}"]`);
    if (btn) {
      document.querySelectorAll('.eco-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      eco = ecosystem;
    }
    document.getElementById('pkg-input').value = pkg;
    runCheck();
  }
}

function setLoading(on) {
  document.getElementById('check-btn').disabled = on;
  document.getElementById('btn-label').textContent = on ? 'Checking' : 'Check';
  document.getElementById('btn-spin').classList.toggle('hidden', !on);
}

function cat(score) {
  return score >= 70 ? 'good' : score >= 40 ? 'warn' : 'bad';
}

async function runCheck() {
  const input = document.getElementById('pkg-input');
  const packages = input.value.split('\n').map(p => p.trim()).filter(Boolean);
  if (!packages.length) { input.focus(); return; }

  setLoading(true);
  const area = document.getElementById('result');
  area.innerHTML = '';

  if (packages.length === 1) {
    const pkg = packages[0];
    history.replaceState(null, '', `?pkg=${encodeURIComponent(pkg)}&eco=${eco}`);
  }

  const results = await Promise.allSettled(
    packages.map(pkg => fetchPackageData(pkg, eco).then(data => ({ data, analysis: scorePackage(data) })))
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled') {
      render(r.value.data, r.value.analysis, area);
    } else {
      const msg = r.reason?.message === 'not found'
        ? `"${packages[i]}" was not found on ${eco}.`
        : `Could not fetch "${packages[i]}". Check your connection.`;
      const div = document.createElement('div');
      div.className = 'error';
      div.textContent = msg;
      area.appendChild(div);
    }
  }

  setLoading(false);
}

function render(pkg, a, area) {
  const tpl = document.getElementById('card-tpl').content.cloneNode(true);
  const c = cat(a.score);

  tpl.getElementById('r-name').textContent = pkg.name;
  tpl.getElementById('r-version').textContent = pkg.version;
  tpl.getElementById('r-eco').textContent = pkg.ecosystem;
  tpl.getElementById('r-license').textContent = pkg.license;

  const scoreEl = tpl.getElementById('r-score');
  scoreEl.textContent = a.score;
  scoreEl.className = `score-num ${c}`;

  const bar = tpl.getElementById('r-bar');
  bar.className = c;
  bar.style.width = `${a.score}%`;

  const metricLabels = {
    maintained: 'Maintenance',
    lastRelease: 'Last release',
    downloads: 'Downloads',
    versions: 'Versions'
  };

  const metricsEl = tpl.getElementById('r-metrics');
  for (const [key, m] of Object.entries(a.metrics)) {
    const div = document.createElement('div');
    div.className = 'metric';
    div.innerHTML = `<div class="metric-lbl">${metricLabels[key] || key}</div><div class="metric-val ${m.status}">${m.value}</div>`;
    metricsEl.appendChild(div);
  }

  const findingsEl = tpl.getElementById('r-findings');
  for (const f of a.findings) {
    const div = document.createElement('div');
    div.className = 'finding';
    div.innerHTML = `<div class="dot ${f.severity}"></div><span>${f.text}</span>`;
    findingsEl.appendChild(div);
  }

  const linksEl = tpl.getElementById('r-links');
  const links = [];
  if (pkg.repositoryUrl) links.push({ label: 'Repository', url: pkg.repositoryUrl });
  if (pkg.homepage && pkg.homepage !== pkg.repositoryUrl) links.push({ label: 'Homepage', url: pkg.homepage });

  const registryUrls = {
    npm: `https://www.npmjs.com/package/${pkg.name}`,
    pypi: `https://pypi.org/project/${pkg.name}`,
    cargo: `https://crates.io/crates/${pkg.name}`,
    composer: `https://packagist.org/packages/${pkg.name}`,
    rubygems: `https://rubygems.org/gems/${pkg.name}`,
    nuget: `https://www.nuget.org/packages/${pkg.name}`,
  };
  links.push({ label: 'Registry page', url: registryUrls[pkg.ecosystem] });

  const shareUrl = `${location.origin}${location.pathname}?pkg=${encodeURIComponent(pkg.name)}&eco=${pkg.ecosystem}`;
  links.push({ label: 'Share', url: shareUrl, copy: true });

  if (links.length) {
    const div = document.createElement('div');
    div.className = 'links';
    links.forEach(l => {
      if (l.copy) {
        const btn = document.createElement('button');
        btn.className = 'link-btn copy-btn';
        btn.textContent = 'Share';
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(l.url).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Share'; }, 2000);
          });
        });
        div.appendChild(btn);
      } else {
        const a = document.createElement('a');
        a.className = 'link-btn';
        a.href = l.url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = l.label;
        div.appendChild(a);
      }
    });
    linksEl.appendChild(div);
  }

  area.appendChild(tpl);
}

document.addEventListener('DOMContentLoaded', init);
