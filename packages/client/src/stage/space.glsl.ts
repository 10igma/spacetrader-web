export const SPACE_VERT = /* glsl */ `#version 300 es
in vec2 aPosition;
in vec2 aUV;
out vec2 vUV;
void main() {
  vUV = aUV;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/**
 * One full-screen pass: nebula (faction-tinted), stars, planet with atmosphere
 * and soft night-side city networks, warp tunnel with chromatic aberration,
 * encounter alert vignette, reveal rift, and filmic grading.
 */
export const SPACE_FRAG = /* glsl */ `#version 300 es
precision highp float;

in vec2 vUV;
out vec4 finalColor;

uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform vec3 uPlanet;   // center x, center y, radius (units: screen widths, y up)
uniform vec4 uRift;     // rgb = color, a = intensity 0..1
uniform vec4 uAlert;    // rgb = color, a = intensity 0..1 (radial encounter vignette)
uniform vec3 uFaction;  // current station faction tint for subtle nebula identity
uniform float uFlash;
uniform float uDetail;  // 0 = cheap, 1 = full
uniform float uWarp;    // 0 = docked, 1 = full warp
uniform float uSeed;    // world seed: shifts the planet's surface
uniform vec3 uAtmo;     // atmosphere colour
uniform vec3 uWater;
uniform vec3 uLand;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p, int octaves) {
  float amp = 0.5, sum = 0.0;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    sum += amp * noise(p);
    p = m * p;
    amp *= 0.5;
  }
  return sum;
}

vec3 nebula(vec2 p, float t) {
  int oct = uDetail > 0.5 ? 5 : 3;
  vec2 q = p * 1.5 + uPointer * 0.015;
  vec2 w = vec2(fbm(q + vec2(0.0, t * 0.012), oct), fbm(q + vec2(5.2, 1.3) - t * 0.009, oct));
  float n = fbm(q * 1.2 + 2.4 * w, oct);
  float n2 = fbm(q * 2.1 - 1.6 * w + 7.1, oct);
  float dust = smoothstep(0.15, 0.8, fbm(q * 0.6 + 3.0, 3));

  vec3 primary = mix(vec3(0.010, 0.085, 0.16), uFaction * 0.14, 0.34);
  vec3 secondary = mix(vec3(0.14, 0.022, 0.15), uFaction * 0.18, 0.28);

  vec3 col = vec3(0.004, 0.006, 0.016);
  col += primary * smoothstep(0.40, 0.95, n);
  col += secondary * smoothstep(0.42, 0.9, n2 * n * 1.9);
  col += vec3(0.46, 0.20, 0.08) * pow(smoothstep(0.55, 1.0, n * n2 * 2.2), 3.0) * 0.45;
  return col * (0.12 + 1.0 * dust * dust);
}

vec3 stars(vec2 p, float t) {
  vec3 col = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    float scale = 14.0 + fl * 19.0;
    vec2 g = (p + uPointer * (0.006 + 0.006 * fl)) * scale + fl * 37.0;
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash21(id);
    if (h < 0.74) continue;
    vec2 o = vec2(hash21(id + 11.3), hash21(id + 71.7)) - 0.5;
    float d = length(f - o * 0.7);
    float big = pow(hash21(id + 3.1), 14.0);
    float core = (0.0010 + 0.010 * big) / (d * d + 0.0009);
    float tw = 0.75 + 0.25 * sin(t * (0.8 + h * 2.5) + h * 40.0);
    vec3 tint = mix(vec3(0.75, 0.86, 1.0), vec3(1.0, 0.86, 0.7), hash21(id + 5.5));
    col += tint * core * tw * (0.035 + 0.05 * fl);
  }
  return col;
}

vec3 planet(vec2 p, float t, vec3 bg, vec2 d, float dist, float aa) {
  vec3 L = normalize(vec3(-0.80, 0.52, -0.02));
  vec3 col = bg;

  if (dist < 1.0) {
    float z = sqrt(1.0 - dist * dist);
    vec3 n = vec3(d, z);
    float ca = cos(0.38), sa = sin(0.38);
    vec3 nn = vec3(ca * n.x - sa * n.y, sa * n.x + ca * n.y, n.z);
    float lon = atan(nn.x, nn.z) + t * 0.018;
    float lat = asin(clamp(nn.y, -1.0, 1.0));
    vec2 sp = vec2(lon * 1.5, lat * 1.9) + uSeed;
    int oct = uDetail > 0.5 ? 6 : 4;

    float land = fbm(sp * 2.1 + 3.0, oct);
    float landMask = smoothstep(0.49, 0.55, land);
    vec3 ocean = mix(uWater * 0.35, uWater, fbm(sp * 4.0, 3));
    vec3 ground = mix(uLand * 0.3, uLand, fbm(sp * 6.0 + 9.0, 4));
    vec3 surf = mix(ocean, ground, landMask);
    float clouds = smoothstep(0.56, 0.86, fbm(sp * 2.8 + vec2(t * 0.012, 0.0) + 20.0, oct));

    float ndl = dot(n, L);
    float diff = max(ndl, 0.0);
    float term = smoothstep(-0.18, 0.30, ndl);

    vec3 day = surf * (0.10 + 1.5 * diff) + vec3(0.62, 0.74, 0.86) * clouds * diff * 0.55;
    vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
    day += mix(vec3(1.0), uAtmo, 0.5) * pow(max(dot(n, H), 0.0), 180.0) * (1.0 - landMask) * (1.0 - clouds) * 0.2;

    // Night side: softer orbital city networks (less high-frequency pixel noise behind stations).
    float grid = noise(sp * 58.0) * noise(sp * 112.0 + 4.0);
    float urban = smoothstep(0.45, 0.74, fbm(sp * 4.8 + 50.0, 3));
    float cities = smoothstep(0.24, 0.62, grid) * landMask * urban;
    float lanes = smoothstep(0.014, 0.0, abs(fbm(sp * 8.0 + 80.0, 3) - 0.5)) * landMask * smoothstep(0.32, 0.62, urban);
    vec3 night = mix(vec3(1.0, 0.62, 0.26), uAtmo, 0.25) * (cities * 1.45 + lanes * 0.95 + urban * landMask * 0.08) * (1.0 - clouds * 0.78);
    night += vec3(0.0, 0.02, 0.05) * clouds;

    vec3 body = mix(night, day, term);
    float fres = pow(1.0 - z, 3.0);
    body += uAtmo * 0.9 * fres * (0.18 + 1.3 * term);
    // Warm scattering along the terminator.
    body += vec3(1.0, 0.42, 0.18) * fres * smoothstep(0.35, 0.0, abs(ndl + 0.02)) * 0.35;

    col = mix(bg, body, aa);
  }

  // Atmosphere halo outside the limb, brighter on the lit side.
  float outside = max(dist - 1.0, 0.0);
  float lit = clamp(dot(normalize(d + 1e-5), L.xy) * 0.75 + 0.45, 0.0, 1.0);
  float halo = (exp(-outside * 16.0) + exp(-outside * 4.5) * 0.18) * (1.0 - aa);
  col += uAtmo * halo * lit * 0.95;
  return col;
}

vec3 rift(vec2 p, float t, vec3 col) {
  float a = uRift.a;
  if (a <= 0.001) return col;
  vec2 q = p - vec2(0.0, 0.05);
  float width = mix(60.0, 9.0, a);
  float wob = (fbm(vec2(q.y * 6.0, t * 1.4), 3) - 0.5) * 0.05 * a;
  float beam = exp(-abs(q.x + wob) * width);
  float streak = fbm(vec2(q.x * 40.0, q.y * 2.5 - t * 4.0), 3);
  float core = exp(-abs(q.x + wob) * width * 5.0);
  float bloom = exp(-length(q * vec2(1.0, 0.45)) * 3.2);
  col *= mix(1.0, 0.22, a);
  col += uRift.rgb * a * (beam * (0.5 + 1.1 * streak) + bloom * 0.55);
  col += vec3(1.0) * core * a * 0.9;
  return col;
}

vec3 alertVignette(vec2 uv, float t, vec3 col) {
  float a = uAlert.a;
  if (a <= 0.001) return col;
  vec2 q = (uv - 0.5) * vec2(1.05, 1.0);
  float edge = smoothstep(0.24, 0.72, length(q));
  float pulse = 0.72 + 0.28 * sin(t * 5.2);
  float scan = 0.92 + 0.08 * sin(uv.y * 140.0 - t * 9.0);
  col *= mix(1.0, 0.55, a * 0.65);
  col += uAlert.rgb * edge * a * pulse * scan * 0.52;
  return col;
}

vec3 warpLayer(float r, float a, float t, float w, float fl) {
  float lanes = 170.0 + fl * 135.0;
  float lane = a / 6.2831853 * lanes + fl * 0.37;
  float id = floor(lane);
  float h = hash21(vec2(id, 7.0 + fl * 13.0));
  if (h < 0.54) return vec3(0.0);
  float across = abs(fract(lane) - 0.5);
  float speed = (1.1 + fl * 0.65) + h * 2.4;
  float along = fract(log(r) * (0.85 + h * 0.9) - t * speed + h * 17.0);
  // Soft tail + sharp bright head for volumetric depth.
  float head = pow(along, mix(14.0, 4.2, w)) * smoothstep(1.0, 0.88, along);
  float line = smoothstep(0.42, 0.04, across);
  vec3 tint = mix(vec3(0.45, 0.82, 1.0), vec3(0.95, 0.55, 1.0), step(0.90, h));
  float depthWeight = mix(0.45, 1.0, fl * 0.5);
  return tint * head * line * (0.45 + h) * depthWeight;
}

vec3 warp(vec2 p, float t, vec3 col) {
  float w = uWarp;
  if (w <= 0.001) return col;
  float r = length(p) + 1e-4;
  float a = atan(p.y, p.x);

  // Subtle radial chromatic aberration along tunnel depth.
  float ca = 0.018 * w * smoothstep(0.05, 0.65, r);
  vec3 streaks = vec3(0.0);
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    vec3 mid = warpLayer(r, a, t, w, fl);
    if (uDetail > 0.5 && layer == 1) {
      vec3 redShift = warpLayer(r * (1.0 + ca), a, t, w, fl);
      vec3 blueShift = warpLayer(r * (1.0 - ca), a, t, w, fl);
      streaks += vec3(redShift.r, mid.g, blueShift.b);
    } else {
      streaks += mid;
    }
  }

  // Soft volumetric tunnel body behind the streaks.
  float body = fbm(vec2(a * 8.0, log(r) * 2.4 - t * 2.3), 3);
  float core = exp(-r * 7.2);
  float fade = smoothstep(0.04, 0.42, r);
  // Completely fade out the planet/background by w=0.55 so no planet ghosting leaks through.
  col *= 1.0 - smoothstep(0.0, 0.55, w);
  col += vec3(0.03, 0.14, 0.34) * body * body * fade * w * 1.25;
  col += streaks * fade * w * 0.92;
  col += vec3(0.52, 0.82, 1.0) * core * w * 0.62;
  return col;
}

void main() {
  float aspect = uRes.y / uRes.x;
  vec2 p = (vUV - 0.5) * vec2(1.0, aspect);
  float t = uTime;

  vec3 col = vec3(0.0);

  // Early-out: skip nebula, stars, and planet completely during full warp.
  if (uWarp < 0.96) {
    vec2 pc = uPlanet.xy + uPointer * 0.006;
    float pr = uPlanet.z;
    vec2 pd = pr > 0.0 ? (p - pc) / pr : vec2(99.0);
    float pdist = length(pd);
    float px = pr > 0.0 ? 1.5 / (uRes.x * pr) : 0.01;
    float paa = pr > 0.0 ? smoothstep(1.0, 1.0 - 2.0 * px, pdist) : 0.0;

    // Early-out: inside the opaque planet disc, skip expensive nebula & star passes.
    if (paa < 0.999) {
      col = nebula(p, t);
      col += stars(p, t);
      float sun = length(p - vec2(-0.62, 0.5 * aspect + 0.08));
      col += vec3(0.55, 0.75, 1.0) * (0.012 / (sun * sun + 0.03));
    }
    if (pr > 0.0) {
      col = planet(p, t, col, pd, pdist, paa);
    }
  }

  col = warp(p, t, col);
  col = alertVignette(vUV, t, col);
  col = rift(p, t, col);

  // Grade: filmic tone map, vignette, grain.
  col = col * (2.51 * col + 0.03) / (col * (2.43 * col + 0.59) + 0.14);
  col *= 1.0 - 0.55 * pow(length((vUV - 0.5) * vec2(0.9, 1.0)) * 1.25, 2.4);
  col += (hash21(vUV * uRes + fract(t) * 91.0) - 0.5) * 0.008;
  col += uFlash;
  finalColor = vec4(pow(max(col, 0.0), vec3(1.0 / 2.2)), 1.0);
}
`;
