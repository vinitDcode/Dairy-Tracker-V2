/**
 * BHULLAR DAIRY — Weather Proxy Edge Function
 *
 * Proxies OpenWeatherMap so no API key ever reaches client code.
 * Falls back to a hemisphere-aware seasonal estimate when no key is set.
 *
 * Deploy:
 *   supabase functions deploy weather-proxy --project-ref <ref>
 *   supabase secrets set OPENWEATHER_API_KEY=<key> --project-ref <ref>
 *
 * Usage (called by genetics-boost.js):
 *   GET /functions/v1/weather-proxy?lat=30.9&lon=75.8
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
};

interface WeatherResponse {
  thi:       number;
  temp:      number;
  humidity:  number;
  synthetic: boolean;
}

/** THI = (1.8×T + 32) − [(0.55 − 0.0055×RH) × (1.8×T − 26)] */
function computeTHI(tempC: number, rh: number): number {
  const tempF = tempC * 1.8 + 32;
  const thi   = tempF - (0.55 - 0.0055 * rh) * (tempF - 26);
  return Math.round(thi);
}

/** Hemisphere-aware seasonal temperature/humidity estimate (no API key needed). */
function seasonalEstimate(lat: number): { temp: number; humidity: number } {
  const month      = new Date().getMonth(); // 0-indexed
  const isNorth    = lat >= 0;
  const summerNorth = month >= 3 && month <= 6; // Apr-Jul
  const summerSouth = month >= 9 || month <= 1;  // Oct-Jan

  const inSummer = isNorth ? summerNorth : summerSouth;

  // Punjab-calibrated defaults; adjust as needed for other regions
  if (isNorth) {
    return inSummer
      ? { temp: 42, humidity: 32 }  // Punjab peak summer
      : { temp: 18, humidity: 68 }; // Punjab winter/spring
  }
  return inSummer
    ? { temp: 34, humidity: 55 }    // Southern hemisphere summer
    : { temp: 20, humidity: 60 };
}

serve(async (req: Request): Promise<Response> => {
  // Pre-flight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat') ?? '');
    const lon = parseFloat(url.searchParams.get('lon') ?? '');

    if (isNaN(lat) || isNaN(lon)) {
      return new Response(JSON.stringify({ error: 'lat and lon query params required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('OPENWEATHER_API_KEY');

    let payload: WeatherResponse;

    if (!apiKey) {
      // No key — return calibrated seasonal estimate (non-zero value for THI)
      const { temp, humidity } = seasonalEstimate(lat);
      payload = { thi: computeTHI(temp, humidity), temp, humidity, synthetic: true };
    } else {
      // Live OWM call — key never leaves server
      const owmUrl =
        `https://api.openweathermap.org/data/2.5/weather` +
        `?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;

      const owmRes = await fetch(owmUrl);
      if (!owmRes.ok) {
        // Degrade gracefully to seasonal estimate on OWM error
        const { temp, humidity } = seasonalEstimate(lat);
        payload = { thi: computeTHI(temp, humidity), temp, humidity, synthetic: true };
      } else {
        const data = await owmRes.json() as {
          main: { temp: number; humidity: number };
        };
        const { temp, humidity } = data.main;
        payload = { thi: computeTHI(temp, humidity), temp, humidity, synthetic: false };
      }
    }

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type':  'application/json',
        'Cache-Control': 'public, max-age=1800', // 30-min CDN cache
      },
    });
  } catch (err) {
    const { temp, humidity } = seasonalEstimate(30.9); // Punjab default on hard error
    const fallback: WeatherResponse = {
      thi: computeTHI(temp, humidity), temp, humidity, synthetic: true,
    };
    console.error('[weather-proxy] Error:', err);
    return new Response(JSON.stringify(fallback), {
      status: 200, // 200 with synthetic data — never break the client
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
