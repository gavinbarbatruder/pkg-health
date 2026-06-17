'use strict';

function daysSince(date) {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function fmtDownloads(n) {
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M / week`;
  if (n >= 1000) return `${Math.round(n / 1000)}K / week`;
  return `${n} / week`;
}

function fmtDate(date) {
  if (!date) return 'Unknown';
  const d = daysSince(date);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d} days ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `${(d / 365).toFixed(1)} years ago`;
}

function scorePackage(pkg) {
  const days = daysSince(pkg.lastRelease);
  const findings = [];
  let score = 100;

  if (pkg.deprecated) {
    score -= 50;
    findings.push({ text: `Marked as deprecated: ${pkg.deprecated}`, severity: 'bad' });
  }

  let releaseStatus, releaseSeverity;
  if (days === null) {
    score -= 20;
    releaseStatus = 'Unknown';
    releaseSeverity = 'warn';
    findings.push({ text: 'No release date found in registry', severity: 'warn' });
  } else if (days < 90) {
    releaseStatus = fmtDate(pkg.lastRelease);
    releaseSeverity = 'good';
    findings.push({ text: `Actively maintained — last release ${fmtDate(pkg.lastRelease)}`, severity: 'good' });
  } else if (days < 365) {
    score -= 10;
    releaseStatus = fmtDate(pkg.lastRelease);
    releaseSeverity = 'warn';
    findings.push({ text: `Last release was ${fmtDate(pkg.lastRelease)} — activity has slowed`, severity: 'warn' });
  } else if (days < 730) {
    score -= 25;
    releaseStatus = fmtDate(pkg.lastRelease);
    releaseSeverity = 'warn';
    findings.push({ text: `No release in over a year — may be unmaintained`, severity: 'warn' });
  } else {
    score -= 40;
    releaseStatus = fmtDate(pkg.lastRelease);
    releaseSeverity = 'bad';
    findings.push({ text: `No release in ${Math.floor(days / 365)} years — likely abandoned`, severity: 'bad' });
  }

  let maintainedVal, maintainedStatus;
  if (pkg.deprecated) {
    maintainedVal = 'Deprecated'; maintainedStatus = 'bad';
  } else if (days === null || days > 730) {
    maintainedVal = 'Abandoned'; maintainedStatus = 'bad';
  } else if (days > 365) {
    maintainedVal = 'Minimal'; maintainedStatus = 'warn';
  } else {
    maintainedVal = 'Active'; maintainedStatus = 'good';
  }

  const dlLabel = fmtDownloads(pkg.weeklyDownloads);
  let dlVal, dlStatus;
  if (!dlLabel) {
    dlVal = 'Unknown'; dlStatus = 'warn';
  } else if (pkg.weeklyDownloads > 100000) {
    dlVal = dlLabel; dlStatus = 'good';
    findings.push({ text: `High adoption with ${dlLabel} downloads`, severity: 'good' });
  } else if (pkg.weeklyDownloads > 1000) {
    dlVal = dlLabel; dlStatus = 'warn';
  } else {
    dlVal = dlLabel; dlStatus = 'warn';
    score -= 5;
  }

  if (!pkg.repositoryUrl && !pkg.homepage) {
    score -= 5;
    findings.push({ text: 'No repository or homepage listed', severity: 'warn' });
  }

  if (pkg.totalVersions > 10) {
    findings.push({ text: `${pkg.totalVersions} releases — established release history`, severity: 'good' });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    metrics: {
      maintained:  { value: maintainedVal, status: maintainedStatus },
      lastRelease: { value: releaseStatus, status: releaseSeverity },
      downloads:   { value: dlVal, status: dlStatus },
      versions:    { value: `${pkg.totalVersions} releases`, status: pkg.totalVersions > 5 ? 'good' : 'warn' },
    },
    findings: findings.slice(0, 4),
  };
}
