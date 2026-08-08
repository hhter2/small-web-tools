import { enforceRateLimit } from '../_shared/rateLimit';
import { errorResponse } from '../_shared/errorResponse';
import { withBaselineHeaders } from '../_shared/responseHeaders.js';
import { parseIpInput } from '../../src/lib/ipValidation';
import {
  countryNameFromCode,
  finiteCoordinate,
  lookupIpGeolocation,
  normalizeProviderResponse,
} from '../../src/lib/ipLookupProviders.js';

export { normalizeProviderResponse };

function jsonResponse(body, init = {}) {
  return Response.json(body, {
    ...init,
    headers: withBaselineHeaders({
      'Cache-Control': 'no-store',
      ...init.headers,
    }),
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

  const limited = await enforceRateLimit(context, { name: 'iplookup' });
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
