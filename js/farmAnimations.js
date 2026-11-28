const ROOT = new URL("../assets/vendor/sdxFarmGuiGame/assets/", import.meta.url).href;
const atlasCache = new Map();

async function loadAtlas(jsonPath, imagePath) {
  const key = jsonPath + "|" + imagePath;
  if (atlasCache.has(key)) return atlasCache.get(key);
  const promise = (async () => {
    const response = await fetch(jsonPath);
    if (!response.ok) throw new Error("Не удалось загрузить описание атласа: " + jsonPath);
    const raw = await response.text();
    const data = JSON.parse(raw.replace(/^\uFEFF/, ""));
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Не удалось загрузить атлас: " + imagePath));
      image.src = imagePath;
    });
    return { data, image };
  })();
  atlasCache.set(key, promise);
  return promise;
}

function drawFrame(ctx, image, res, frame, offsetX, offsetY, width, height) {
  const sprite = res[frame.res];
  if (!sprite) return;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(
    image,
    sprite.x, sprite.y, sprite.w, sprite.h,
    frame.x - offsetX, frame.y - offsetY, sprite.w, sprite.h
  );
}

function animateCanvas(canvas, atlas, clip) {
  const frames = clip.frames || [];
  if (!frames.length) return;
  const res = atlas.data.res || {};
  const bounds = frames.map(frame => {
    const sprite = res[frame.res];
    if (!sprite) return null;
    return { left: frame.x, top: frame.y, right: frame.x + sprite.w, bottom: frame.y + sprite.h };
  }).filter(Boolean);
  if (!bounds.length) return;
  const minX = Math.floor(Math.min(...bounds.map(item => item.left)));
  const minY = Math.floor(Math.min(...bounds.map(item => item.top)));
  const maxX = Math.ceil(Math.max(...bounds.map(item => item.right)));
  const maxY = Math.ceil(Math.max(...bounds.map(item => item.bottom)));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  canvas.width = width;
  canvas.height = height;
  canvas.style.aspectRatio = width + " / " + height;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", canvas.dataset.animationLabel || "Анимированное животное");
  const ctx = canvas.getContext("2d");
  const rate = Math.max(1, Number(clip.frameRate) || 24);
  const durations = frames.map(frame => Math.max(1, Number(frame.duration) || 1) * 1000 / rate);
  let frameIndex = 0;
  let elapsed = 0;
  let lastTime = 0;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const paint = () => drawFrame(ctx, atlas.image, res, frames[frameIndex], minX, minY, width, height);
  paint();
  if (reducedMotion) return;
  const tick = time => {
    if (document.visibilityState === "hidden") {
      lastTime = 0;
      requestAnimationFrame(tick);
      return;
    }
    if (lastTime) elapsed += Math.min(100, time - lastTime);
    lastTime = time;
    while (elapsed >= durations[frameIndex]) {
      elapsed -= durations[frameIndex];
      frameIndex = (frameIndex + 1) % frames.length;
      paint();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export async function initImportedFarmAnimations() {
  const animals = [...document.querySelectorAll(".farm-yard-animal")];
  if (!animals.length) return;
  const clips = [
    "chick_full_front",
    "cow_full_front",
    "pig_full_front",
    "sheep_full_front",
    "chick_walk_front",
    "cow_walk_front",
    "pig_walk_front"
  ];
  try {
    const atlas = await loadAtlas(
      ROOT + "animal/animal_animation.json",
      ROOT + "animal/animal_animation.png"
    );
    animals.forEach((original, index) => {
      const clipName = clips[index % clips.length];
      const clip = atlas.data.mc?.[clipName];
      if (!clip) return;
      const canvas = document.createElement("canvas");
      canvas.className = original.className;
      canvas.dataset.animationLabel = original.alt || "Животное на огороде";
      canvas.dataset.animationClip = clipName;
      original.replaceWith(canvas);
      animateCanvas(canvas, atlas, clip);
    });
  } catch (error) {
    console.error("Анимации фермы не загружены:", error);
  }
}
