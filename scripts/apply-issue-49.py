from pathlib import Path


def replace_once(pathname, old, new):
    path = Path(pathname)
    text = path.read_text()
    if old not in text:
        raise SystemExit(f'missing anchor in {pathname}: {old[:80]!r}')
    path.write_text(text.replace(old, new, 1))


Path('src/lib/ipLookupProviders.js').write_text('''export const IP_LOOKUP_TIMEOUT_MS = 5000;

export function countryNameFromCode(code) {
  if (!code || !/^[A-Z]{2}$/i.test(code)) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || '';
  } catch {
    return '';
  }
}

export function finiteCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getIpLookupProviders(ip = '') {
  const encodedIp = encodeURIComponent(ip);
  return [
    { name: 'api.ip.sb', url: ip ? `https://api.ip.sb/geoip/${encodedIp}` : 'https://api.ip.sb/geoip' },
    { name: 'ipapi.co', url: ip ? `https://ipapi.co/${encodedIp}/json/` : 'https://ipapi.co/json/' },
    { name: 'ipinfo.io', url: ip ? `https://ipinfo.io/${encodedIp}/json` : 'https://ipinfo.io/json' },
  ];
}

export function normalizeProviderResponse(provider, data) {
  const common = {
    ip: data.ip || '',
    city: data.city || '',
    region: data.region || '',
    postal: data.postal || '',
    org: data.org || data.isp || data.organization || '',
    asn: data.asn ? String(data.asn).replace(/^AS/i, 'AS') : '',
    timezone: data.timezone || '',
    utc_offset: data.utc_offset || '',
    latitude: finiteCoordinate(data.latitude),
    longitude: finiteCoordinate(data.longitude),
  };

  if (provider === 'api.ip.sb') {
    return {
      ...common,
      country_name: data.country || '',
      country_code: (data.country_code || '').toUpperCase(),
      asn: data.asn ? `AS${String(data.asn).replace(/^AS/i, '')}` : '',
    };
  }

  if (provider === 'ipinfo.io') {
    const [latitude, longitude] = data.loc
      ? data.loc.split(',').map(finiteCoordinate)
      : [null, null];
    const countryCode = (data.country || '').toUpperCase();
    return {
      ...common,
      country_name: countryNameFromCode(countryCode),
      country_code: countryCode,
      latitude,
      longitude,
    };
  }

  return {
    ...common,
    country_name: data.country_name || '',
    country_code: (data.country_code || '').toUpperCase(),
  };
}

async function fetchProviderJson(provider, options) {
  const response = await options.fetchImpl(provider.url, {
    signal: options.signal,
    headers: options.headers,
  });
  if (!response.ok) throw new Error(`${provider.name} returned ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.reason || `${provider.name} rejected lookup`);
  return data;
}

export async function lookupIpGeolocation(ip = '', options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const timeoutMs = options.timeoutMs || IP_LOOKUP_TIMEOUT_MS;
  const headers = options.headers || {
    Accept: 'application/json',
    'User-Agent': 'Small-Web-Tools/1.0',
  };
  const onProviderError = options.onProviderError || (() => {});

  if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable');

  let lastError = null;
  for (const provider of getIpLookupProviders(ip)) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const data = await fetchProviderJson(provider, {
        fetchImpl,
        signal: controller.signal,
        headers,
      });
      return normalizeProviderResponse(provider.name, data);
    } catch (error) {
      lastError = error;
      onProviderError(provider, error);
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastError?.message || 'All IP lookup providers failed');
}
''')

Path('src/lib/codeHighlighting.js').write_text('''import hljs from 'highlight.js/lib/common';

export const CODE_LANGUAGE_SPECS = [
  { id: 'plaintext', extension: 'txt', aliases: ['txt', 'text', 'plain', 'plaintext'] },
  { id: 'bash', extension: 'sh', aliases: ['sh', 'shell', 'zsh', 'bash'] },
  { id: 'javascript', extension: 'js', aliases: ['js', 'jsx', 'mjs', 'cjs', 'javascript'] },
  { id: 'typescript', extension: 'ts', aliases: ['ts', 'tsx', 'typescript'] },
  { id: 'html', extension: 'html', aliases: ['html', 'htm', 'xml', 'svg'] },
  { id: 'css', extension: 'css', aliases: ['css'] },
  { id: 'json', extension: 'json', aliases: ['json', 'jsonc'] },
  { id: 'markdown', extension: 'md', aliases: ['md', 'markdown'] },
  { id: 'python', extension: 'py', aliases: ['py', 'pyw', 'python'] },
  { id: 'java', extension: 'java', aliases: ['java'] },
  { id: 'c', extension: 'c', aliases: ['c', 'h'] },
  { id: 'cpp', extension: 'cpp', aliases: ['cpp', 'cc', 'cxx', 'hpp'] },
  { id: 'csharp', extension: 'cs', aliases: ['cs', 'csharp'] },
  { id: 'go', extension: 'go', aliases: ['go'] },
  { id: 'rust', extension: 'rs', aliases: ['rs', 'rust'] },
  { id: 'php', extension: 'php', aliases: ['php'] },
  { id: 'ruby', extension: 'rb', aliases: ['rb', 'ruby'] },
  { id: 'swift', extension: 'swift', aliases: ['swift'] },
  { id: 'kotlin', extension: 'kt', aliases: ['kt', 'kts', 'kotlin'] },
  { id: 'r', extension: 'r', aliases: ['r'] },
  { id: 'sql', extension: 'sql', aliases: ['sql'] },
  { id: 'yaml', extension: 'yml', aliases: ['yml', 'yaml'] },
  { id: 'diff', extension: 'diff', aliases: ['diff', 'patch'] },
  { id: 'graphql', extension: 'graphql', aliases: ['graphql', 'gql'] },
  { id: 'lua', extension: 'lua', aliases: ['lua'] },
  { id: 'perl', extension: 'pl', aliases: ['pl', 'pm', 'perl'] },
];

const languageIds = new Set(CODE_LANGUAGE_SPECS.map(({ id }) => id));
const languageByAlias = new Map(CODE_LANGUAGE_SPECS.flatMap(({ id, aliases }) => (
  aliases.map((alias) => [alias, id])
)));

export function normalizeCodeLanguage(languageId) {
  const candidate = String(languageId || '').trim().toLowerCase();
  if (!candidate) return 'plaintext';
  return languageIds.has(candidate) ? candidate : languageByAlias.get(candidate) ?? 'plaintext';
}

export function highlightCode(code, languageId) {
  return hljs.highlight(code, {
    language: normalizeCodeLanguage(languageId),
    ignoreIllegals: true,
  }).value;
}
''')

vite = Path('vite.config.js')
text = vite.read_text()
text = text.replace(
    "import { parseIpInput } from './src/lib/ipValidation';",
    "import { parseIpInput } from './src/lib/ipValidation';\nimport { lookupIpGeolocation } from './src/lib/ipLookupProviders.js';",
    1,
)
start = text.index('// Server-side geo lookup')
end = text.index('export default defineConfig')
text = text[:start] + '''// Server-side geo lookup — shared provider policy with Node-specific logging.\nasync function geoLookup(ip) {\n  return lookupIpGeolocation(ip, {\n    headers: { 'User-Agent': 'curl/7.88.1', Accept: 'application/json' },\n    onProviderError: (_provider, error) => {\n      console.warn('[ip-lookup]', error.message);\n    },\n  });\n}\n\n''' + text[end:]
vite.write_text(text)

Path('functions/api/iplookup.js').write_text('''import { enforceRateLimit } from '../_shared/rateLimit';
import { errorResponse } from '../_shared/errorResponse';
import { parseIpInput } from '../../src/lib/ipValidation';
import {
  countryNameFromCode,
  finiteCoordinate,
  lookupIpGeolocation,
} from '../../src/lib/ipLookupProviders.js';

function jsonResponse(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: {
      'Cache-Control': 'no-store',
      ...init.headers,
    },
  });
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const parsed = parseIpInput(url.searchParams.get('ip') || '');
  if (parsed.error) {
    return errorResponse('VALIDATION_FAILED', 400, {
      diagnostic: 'ip-input',
    });
  }

  if (!parsed.value && context.request.cf) {
    const cf = context.request.cf;
    return jsonResponse({
      ok: true,
      data: {
        ip: context.request.headers.get('CF-Connecting-IP') || '',
        city: cf.city || '',
        region: cf.region || '',
        country_name: countryNameFromCode(cf.country),
        country_code: cf.country || '',
        postal: cf.postalCode || '',
        org: cf.asOrganization || '',
        asn: cf.asn ? `AS${cf.asn}` : '',
        timezone: cf.timezone || '',
        utc_offset: '',
        latitude: finiteCoordinate(cf.latitude),
        longitude: finiteCoordinate(cf.longitude),
      },
    });
  }

  const limited = await enforceRateLimit(context, { name: 'iplookup', limit: 60 });
  if (limited) return limited;

  try {
    return jsonResponse({ ok: true, data: await lookupIpGeolocation(parsed.value) });
  } catch (error) {
    return errorResponse('PROVIDER_UNAVAILABLE', 502, {
      error,
      diagnostic: 'ip-geolocation-providers',
    });
  }
}
''')

code_domain = Path('src/components/CodePreviewer/lib/codePreviewDomain.js')
text = code_domain.read_text()
text = text.replace("import hljs from 'highlight.js/lib/common';\n\n", "import { CODE_LANGUAGE_SPECS, normalizeCodeLanguage } from '../../../lib/codeHighlighting.js';\n\n", 1)
start = text.index('export const CODE_LANGUAGES = [')
end = text.index('const languageById')
labels = '''const LANGUAGE_LABELS = {
  plaintext: 'Plain text', bash: 'Bash / Shell', javascript: 'JavaScript / JSX',
  typescript: 'TypeScript / TSX', html: 'HTML / XML', css: 'CSS', json: 'JSON',
  markdown: 'Markdown', python: 'Python', java: 'Java', c: 'C', cpp: 'C++',
  csharp: 'C#', go: 'Go', rust: 'Rust', php: 'PHP', ruby: 'Ruby', swift: 'Swift',
  kotlin: 'Kotlin', r: 'R', sql: 'SQL', yaml: 'YAML', diff: 'Diff / Patch',
  graphql: 'GraphQL', lua: 'Lua', perl: 'Perl',
};

export const CODE_LANGUAGES = CODE_LANGUAGE_SPECS.map((language) => ({
  ...language,
  label: LANGUAGE_LABELS[language.id],
}));

'''
text = text[:start] + labels + text[end:]
normalize_start = text.index('export function normalizeCodeLanguage')
highlight_end = text.index('export function getLineCount')
text = text[:normalize_start] + text[highlight_end:]
code_domain.write_text(text)

replace_once(
    'src/components/CodePreviewer.jsx',
    "import ToolHeader from './ui/ToolHeader.jsx';",
    "import ToolHeader from './ui/ToolHeader.jsx';\nimport { highlightCode } from '../lib/codeHighlighting.js';",
)
replace_once('src/components/CodePreviewer.jsx', '  highlightCode,\n', '')
replace_once(
    'src/components/MarkdownPreviewer.jsx',
    "import { highlightCode, normalizeCodeLanguage } from './CodePreviewer/lib/codePreviewDomain';",
    "import { highlightCode, normalizeCodeLanguage } from '../lib/codeHighlighting.js';",
)
replace_once(
    'src/tests/ipLookup.test.js',
    "import {\n  normalizeProviderResponse,\n  onRequestGet,\n} from '../../functions/api/iplookup.js';",
    "import { onRequestGet } from '../../functions/api/iplookup.js';\nimport { normalizeProviderResponse } from '../lib/ipLookupProviders.js';",
)

Path('src/tests/ipLookupProviders.test.js').write_text('''import { describe, expect, it, vi } from 'vitest';
import {
  getIpLookupProviders,
  lookupIpGeolocation,
  normalizeProviderResponse,
} from '../lib/ipLookupProviders.js';

describe('shared IP lookup provider domain', () => {
  it('keeps provider order and URL construction deterministic', () => {
    expect(getIpLookupProviders('2001:db8::1')).toEqual([
      { name: 'api.ip.sb', url: 'https://api.ip.sb/geoip/2001%3Adb8%3A%3A1' },
      { name: 'ipapi.co', url: 'https://ipapi.co/2001%3Adb8%3A%3A1/json/' },
      { name: 'ipinfo.io', url: 'https://ipinfo.io/2001%3Adb8%3A%3A1/json' },
    ]);
  });

  it('normalizes provider-specific payloads through one source', () => {
    expect(normalizeProviderResponse('api.ip.sb', {
      country: 'Taiwan', country_code: 'tw', asn: 3462,
    })).toMatchObject({ country_name: 'Taiwan', country_code: 'TW', asn: 'AS3462' });
    expect(normalizeProviderResponse('ipinfo.io', {
      country: 'TW', loc: '25.03,121.56',
    })).toMatchObject({ country_code: 'TW', latitude: 25.03, longitude: 121.56 });
  });

  it('falls back in provider order and returns normalized data', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('{}', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ip: '203.0.113.9', country_name: 'Taiwan', country_code: 'TW',
        latitude: '25.03', longitude: '121.56',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const failures = [];
    await expect(lookupIpGeolocation('203.0.113.9', {
      fetchImpl,
      onProviderError: (provider) => failures.push(provider.name),
    })).resolves.toMatchObject({
      ip: '203.0.113.9', country_name: 'Taiwan', country_code: 'TW',
      latitude: 25.03, longitude: 121.56,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(failures).toEqual(['api.ip.sb']);
  });
});
''')

replace_once(
    'src/tests/codePreviewDomain.test.js',
    "import { describe, expect, it } from 'vitest';",
    "import { describe, expect, it } from 'vitest';\nimport { highlightCode } from '../lib/codeHighlighting.js';",
)
replace_once('src/tests/codePreviewDomain.test.js', '  highlightCode,\n', '')

for filename, anchor, block in [
    ('ARCHITECTURE.md', '## Application architecture', '''## Shared domain modules

`src/lib/ipLookupProviders.js` is the single source for IP geolocation provider order, URL construction, timeout behavior, fallback, and response normalization. `vite.config.js` retains local middleware plumbing and logging; `functions/api/iplookup.js` retains Cloudflare metadata and rate limiting. `src/lib/codeHighlighting.js` owns syntax-language aliases, normalization, and Highlight.js rendering for both Code Previewer and Markdown Previewer; neither feature imports the other feature's internal domain module.

'''),
    ('ARCHITECTURE.zh-TW.md', '## 應用程式架構', '''## 共用領域模組

`src/lib/ipLookupProviders.js` 是 IP 地理位置 provider 順序、URL 建構、逾時、fallback 與回應正規化的單一來源。`vite.config.js` 只保留本機 middleware plumbing 與記錄；`functions/api/iplookup.js` 保留 Cloudflare metadata 與 rate limiting。`src/lib/codeHighlighting.js` 統一管理 Code Previewer 與 Markdown Previewer 使用的語法語言別名、正規化與 Highlight.js rendering；兩個功能都不再匯入另一功能的內部領域模組。

'''),
]:
    path = Path(filename)
    text = path.read_text()
    if block.strip() not in text:
        if anchor not in text:
            raise SystemExit(f'missing architecture anchor: {filename}')
        path.write_text(text.replace(anchor, block + anchor, 1))
