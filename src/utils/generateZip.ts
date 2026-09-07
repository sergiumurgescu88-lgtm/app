import JSZip from 'jszip';
import {
  MANIFEST_JSON,
  BACKGROUND_JS,
  CONTENT_JS,
  POPUP_HTML,
  POPUP_JS,
  README_MD
} from '../data/extensionCode';

/**
 * Generează un icon PNG folosind HTML5 Canvas pentru a evita dependențele de fișiere externe
 */
function generateIconDataUrl(size: number): Promise<Uint8Array> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Gradient background
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, '#ff3366');
      grad.addColorStop(1, '#7928ca');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, Math.floor(size / 16));
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.4, 0, Math.PI * 2);
      ctx.stroke();

      // Central symbol 'G'
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.floor(size * 0.55)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('G', size / 2, size / 2 + size * 0.04);
    }

    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new Uint8Array());
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Creează și descarcă arhiva .ZIP completă a extensiei
 */
export async function downloadExtensionZip(): Promise<void> {
  const zip = new JSZip();

  // Adăugăm fișierele principale ale extensiei
  zip.file('manifest.json', MANIFEST_JSON);
  zip.file('background.js', BACKGROUND_JS);
  zip.file('content.js', CONTENT_JS);
  zip.file('popup.html', POPUP_HTML);
  zip.file('popup.js', POPUP_JS);
  zip.file('README.md', README_MD);

  // Generăm iconițele în folderul icons/
  const iconsFolder = zip.folder('icons');
  if (iconsFolder) {
    const [icon16, icon48, icon128] = await Promise.all([
      generateIconDataUrl(16),
      generateIconDataUrl(48),
      generateIconDataUrl(128)
    ]);

    iconsFolder.file('icon16.png', icon16);
    iconsFolder.file('icon48.png', icon48);
    iconsFolder.file('icon128.png', icon128);
  }

  // Generăm arhiva zip
  const content = await zip.generateAsync({ type: 'blob' });

  // Declanșează descărcarea în browser
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'GlowBot-Chaturbate-Extension-V3.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
