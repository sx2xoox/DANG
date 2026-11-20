async function render(node: HTMLElement): Promise<string> {
  // 글꼴이 다 불러와진 뒤에 찍어야 글자가 깨지지 않습니다.
  await document.fonts?.ready;
  const { toPng } = await import("html-to-image");
  return toPng(node, {
    pixelRatio: 2,
    cacheBust: true,
    // 저장 이미지에서 숨길 요소 (버튼 등)
    filter: (el) => !(el instanceof HTMLElement && el.dataset.noCapture === "true"),
  });
}

/** 화면의 카드를 PNG 로 저장합니다. */
export async function saveNodeAsImage(node: HTMLElement, filename: string) {
  const url = await render(node);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** 공유하기: 휴대폰은 공유 시트, 지원하지 않으면 이미지 저장 */
export async function shareNodeAsImage(node: HTMLElement, filename: string, text: string) {
  const url = await render(node);
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text });
      return "shared";
    } catch {
      return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "saved";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}
