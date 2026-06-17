'use strict';

const WORKER_URL = 'https://pkg-health-proxy.gavinbarbatruder.workers.dev';

async function pfetch(url) {
  const res = await fetch(`${WORKER_URL}/?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('not found');
  return res;
}

async function fetchPackageData(pkg, ecosystem) {
  switch (ecosystem) {
    case 'npm':      return fetchNpm(pkg);
    case 'pypi':     return fetchPypi(pkg);
    case 'cargo':    return fetchCargo(pkg);
    case 'composer': return fetchComposer(pkg);
    case 'rubygems': return fetchRubygems(pkg);
    case 'nuget':    return fetchNuget(pkg);
    default:         throw new Error('Unknown ecosystem');
  }
}

async function fetchNpm(pkg) {
  const reg = await pfetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}`).then(r => r.json());
  const dl = await pfetch(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg)}`).then(r => r.json()).catch(() => null);

  const latest = reg['dist-tags']?.latest;
  const v = reg.versions?.[latest] || {};
  const time = reg.time || {};

  return {
    name: reg.name, version: latest || 'unknown', license: v.license || 'unknown',
    description: reg.description || '', lastRelease: time[latest] ? new Date(time[latest]) : null,
    created: time.created ? new Date(time.created) : null,
    totalVersions: Object.keys(reg.versions || {}).length, weeklyDownloads: dl?.downloads || null,
    repositoryUrl: v.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, '') || null,
    homepage: reg.homepage || null, deprecated: v.deprecated || null, ecosystem: 'npm',
  };
}

async function fetchPypi(pkg) {
  const d = await pfetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`).then(r => r.json());
  const info = d.info;
  const allDates = Object.values(d.releases || {}).flat().map(r => r.upload_time).filter(Boolean).map(t => new Date(t)).sort((a, b) => b - a);

  return {
    name: info.name, version: info.version, license: info.license || 'unknown',
    description: info.summary || '', lastRelease: allDates[0] || null, created: null,
    totalVersions: Object.keys(d.releases || {}).length, weeklyDownloads: null,
    repositoryUrl: info.project_urls?.Source || info.project_urls?.Homepage || null,
    homepage: info.home_page || null, deprecated: info.yanked ? 'Yanked' : null, ecosystem: 'pypi',
  };
}

async function fetchCargo(pkg) {
  const d = await pfetch(`https://crates.io/api/v1/crates/${encodeURIComponent(pkg)}`).then(r => r.json());
  const crate = d.crate;
  const latest = d.versions?.[0];

  return {
    name: crate.name, version: crate.newest_version, license: latest?.license || 'unknown',
    description: crate.description || '', lastRelease: crate.updated_at ? new Date(crate.updated_at) : null,
    created: crate.created_at ? new Date(crate.created_at) : null,
    totalVersions: d.versions?.length || 0, weeklyDownloads: crate.recent_downloads || null,
    repositoryUrl: crate.repository || null, homepage: crate.homepage || null,
    deprecated: latest?.yanked ? 'Yanked' : null, ecosystem: 'cargo',
  };
}

async function fetchComposer(pkg) {
  const d = await pfetch(`https://packagist.org/packages/${pkg}.json`).then(r => r.json());
  const pk = d.package;
  const stable = Object.values(pk.versions || {})
    .filter(v => !v.version.includes('dev') && !v.version.startsWith('dev-'))
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  const latest = stable[0] || Object.values(pk.versions || {})[0];

  return {
    name: pk.name, version: latest?.version || 'unknown', license: latest?.license?.[0] || 'unknown',
    description: pk.description || '', lastRelease: latest?.time ? new Date(latest.time) : null, created: null,
    totalVersions: stable.length, weeklyDownloads: pk.downloads?.monthly || null,
    repositoryUrl: latest?.source?.url || null, homepage: latest?.homepage || null,
    deprecated: latest?.abandoned ? 'Abandoned' : null, ecosystem: 'composer',
  };
}

async function fetchRubygems(pkg) {
  const d = await pfetch(`https://rubygems.org/api/v1/gems/${encodeURIComponent(pkg)}.json`).then(r => r.json());

  return {
    name: d.name, version: d.version, license: d.licenses?.[0] || 'unknown',
    description: d.info || '', lastRelease: d.version_created_at ? new Date(d.version_created_at) : null,
    created: null, totalVersions: d.version_downloads || 0, weeklyDownloads: d.downloads || null,
    repositoryUrl: d.source_code_uri || d.homepage_uri || null,
    homepage: d.homepage_uri || null, deprecated: null, ecosystem: 'rubygems',
  };
}

async function fetchNuget(pkg) {
  const d = await pfetch(`https://api.nuget.org/v3/registration5-gz-semver2/${pkg.toLowerCase()}/index.json`).then(r => r.json());
  const pages = d.items || [];
  const latest = pages[pages.length - 1]?.items?.slice(-1)[0]?.catalogEntry;

  return {
    name: latest?.id || pkg, version: latest?.version || 'unknown',
    license: latest?.licenseExpression || 'unknown', description: latest?.description || '',
    lastRelease: latest?.published ? new Date(latest.published) : null, created: null,
    totalVersions: pages.reduce((a, p) => a + (p.count || 0), 0), weeklyDownloads: null,
    repositoryUrl: latest?.projectUrl || null, homepage: latest?.projectUrl || null,
    deprecated: latest?.deprecation ? 'Deprecated' : null, ecosystem: 'nuget',
  };
}
