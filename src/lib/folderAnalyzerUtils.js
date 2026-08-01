import ignore from 'ignore';

export function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function createGitignoreMatcher(gitignoreText) {
  if (!gitignoreText) return () => false;
  const matcher = ignore().add(gitignoreText);

  return (filePath, isDirectory = false) => {
    const relativePath = filePath.replace(/\\/g, '/').split('/').slice(1).join('/');
    if (!relativePath) return false;
    return matcher.ignores(isDirectory ? `${relativePath}/` : relativePath);
  };
}
