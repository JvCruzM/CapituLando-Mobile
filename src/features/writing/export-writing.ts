import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

interface ExpoPrintModule {
  printToFileAsync: (options: { html: string }) => Promise<{ uri: string }>;
  printAsync: (options: { html: string }) => Promise<void>;
}

async function loadExpoPrint(): Promise<ExpoPrintModule | null> {
  try {
    const expoPrintPackageName = 'expo-print';
    const mod = (await import(expoPrintPackageName)) as unknown as ExpoPrintModule;
    if (typeof mod?.printToFileAsync === 'function') {
      return mod;
    }
    return null;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBodyToHtml(content: string): string {
  const lines = content.split('\n');
  const parts: string[] = [];
  let inList = false;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (/^-\s+/.test(trimmed)) {
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      const itemHtml = escapeHtml(trimmed.replace(/^-\s+/, ''))
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');
      parts.push(`<li>${itemHtml}</li>`);
      continue;
    }

    if (inList) {
      parts.push('</ul>');
      inList = false;
    }

    if (!trimmed) {
      parts.push('<div class="spacer"></div>');
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      const hashes = headingMatch[1] ?? '#';
      const headingText = headingMatch[2] ?? '';
      const level = Math.min(6, hashes.length);
      parts.push(`<h${level}>${escapeHtml(headingText)}</h${level}>`);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      parts.push(`<blockquote>${escapeHtml(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    const formatted = escapeHtml(rawLine)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, '<u>$1</u>');

    parts.push(`<p>${formatted}</p>`);
  }

  if (inList) {
    parts.push('</ul>');
  }

  return parts.join('\n');
}

function sanitizeFileBaseName(title: string): string {
  const clean = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return clean || 'capitulo';
}

function resolveWritableDir(): string | null {
  const fsAny = FileSystem as unknown as {
    documentDirectory?: string | null;
    cacheDirectory?: string | null;
    Paths?: {
      document?: { uri?: string };
      cache?: { uri?: string };
    };
  };

  return (
    fsAny.Paths?.document?.uri ||
    fsAny.Paths?.cache?.uri ||
    fsAny.documentDirectory ||
    fsAny.cacheDirectory ||
    null
  );
}

export async function exportWritingAsTxt(
  title: string,
  content: string,
): Promise<void> {
  const safeName = sanitizeFileBaseName(title);
  const fullText = `${title.trim() || 'Sem Título'}\n\n${content}`;

  const baseDir = resolveWritableDir();
  const fsAny = FileSystem as unknown as {
    writeAsStringAsync?: (
      uri: string,
      data: string,
      options?: { encoding?: string },
    ) => Promise<void>;
    EncodingType?: { UTF8?: string };
  };

  if (baseDir && typeof fsAny.writeAsStringAsync === 'function') {
    const normalizedDir = baseDir.endsWith('/') ? baseDir : `${baseDir}/`;
    const fileUri = `${normalizedDir}${safeName}_${Date.now()}.txt`;
    await fsAny.writeAsStringAsync(fileUri, fullText, {
      encoding: fsAny.EncodingType?.UTF8 ?? 'utf8',
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: `Exportar ${title || 'TXT'}`,
        UTI: 'public.plain-text',
      });
      return;
    }
  }

  await Share.share({ title, message: fullText });
}

export async function exportWritingAsPdf(
  title: string,
  content: string,
  storyTitle?: string,
): Promise<void> {
  const safeTitle = escapeHtml(title.trim() || 'Sem Título');
  const safeStory = storyTitle ? escapeHtml(storyTitle) : '';
  const bodyHtml = formatBodyToHtml(content);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Georgia, "Times New Roman", serif;
            color: #1c1917;
            padding: 36px;
            line-height: 1.7;
          }
          .meta {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }
          h1 {
            font-size: 24px;
            margin: 0 0 20px 0;
            color: #4b1d3f;
          }
          p {
            margin: 0 0 12px 0;
            text-indent: 1.5em;
          }
          blockquote {
            margin: 14px 0;
            padding-left: 14px;
            border-left: 3px solid #9d174d;
            color: #44403c;
            font-style: italic;
          }
          ul {
            margin: 10px 0 14px 20px;
          }
          .spacer {
            height: 10px;
          }
        </style>
      </head>
      <body>
        ${safeStory ? `<div class="meta">${safeStory}</div>` : ''}
        <h1>${safeTitle}</h1>
        ${bodyHtml}
      </body>
    </html>
  `;

  const printMod = await loadExpoPrint();
  if (!printMod) {
    await Share.share({
      title,
      message: `${title.trim() || 'Sem Título'}\n\n${content}`,
    });
    return;
  }

  const { uri } = await printMod.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Exportar ${title || 'PDF'}`,
      UTI: 'com.adobe.pdf',
    });
  } else {
    await printMod.printAsync({ html });
  }
}