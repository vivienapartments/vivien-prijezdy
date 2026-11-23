/** Krátký otisk nasazení pro patičku (majitel pozná novou verzi). */
export function textBuildVerze(): string {
  const sha = (
    process.env.NEXT_PUBLIC_BUILD_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    'local'
  ).slice(0, 7);
  const cas =
    process.env.NEXT_PUBLIC_BUILD_CAS ||
    new Date().toISOString().slice(0, 16).replace('T', ' ');
  return `${sha} · ${cas}`;
}
