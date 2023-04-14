#version 300 es
precision mediump float;

/* For reference: http://glsl.heroku.com/e#1686.0 */

uniform float uTime;
uniform vec2 uInverseTextureSize;

out vec4 fragColor;

// roはレイの原点
// rdはレイの向き
// sは球
float sphereIntersection(vec3 ro, vec3 rd, vec4 s) {
  // レイをオブジェクト空間に変換
  vec3 oro = ro - s.xyz;

  float a = dot(rd, rd);
  float b = 2.0 * dot(oro, rd);
  // wは球の半径
  float c = dot(oro, oro) - s.w * s.w;

  float d = b * b - 4.0 * a * c;

  // 交わらない
  if (d < 0.0) return d;

  return (-b - sqrt(d)) / 2.0;
}

vec3 sphereNormaml(vec3 pt, vec4 s) {
  return (pt - s.xyz) / s.w;
}

vec3 lightDirection = normalize(vec3(0.5));
vec3 eyePos = vec3(0.0, 1.0, 4.0);
vec3 backgroundColor = vec3(0.2);
vec3 ambient = vec3(0.05, 0.1, 0.1);

vec4 sphere = vec4(1.0);
vec3 sphereColor = vec3(0.9, 0.8, 0.6);
float maxDistance = 1024.0;

float intersect(vec3 ro, vec3 rd, out vec3 norm, out vec3 color) {
  float distance = maxDistance;

  // シーンに複数のオブジェクトを使用したければ、ここでそれらをループし
  // もっとも近い（距離がもっとも小さい）交点と、そこでの法線と色を返す
  float intersectionDistance = sphereIntersection(ro, rd, sphere);

  if (intersectionDistance > 0.0 && intersectionDistance < distance) {
    distance = intersectionDistance;
    // 交点
    vec3 pt = ro + distance * rd;
    // 点の法線を取得
    norm = sphereNormaml(pt, sphere);
    // 球の色を取得
    color = sphereColor;
  }

  return distance;
}


void main(void) {
  // 球を前後に少し振動させる
  sphere.x = 1.5 * sin(uTime);
  sphere.z = 0.5 * cos(uTime * 3.0);

  // 描画されるフラグメントのピクセル取得
  vec2 uv = gl_FragCoord.xy * uInverseTextureSize;
  float aspectRatio = uInverseTextureSize.y / uInverseTextureSize.x;

  // 視点位置からシーンにレイを飛ばす
  vec3 ro = eyePos;

  // シーンがよく見えるように飛ばすレイを少し下にずらす
  vec3 rd = normalize(vec3(-0.5 + uv * vec2(aspectRatio, 1.0), -1.0));

  // 交差しないときのデフォルトの色
  vec3 rayColor = backgroundColor;

  // レイが何かと交差するかどうか
  // もっとも近い交点の法線と色を渡す
  vec3 objectNormal, objectColor;
  float t = intersect(ro, rd, objectNormal, objectColor);

  if (t < maxDistance) {
    // 拡散反射係数
    float diffuse = clamp(dot(objectNormal, lightDirection), 0.0, 1.0);
    rayColor = objectColor * diffuse + ambient;
  }

  fragColor = vec4(rayColor, 1.0);
}