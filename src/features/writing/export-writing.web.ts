import { fileName, writingText, writingHtml } from "./export-content";
export async function exportWritingAsTxt(title: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([writingText(title, content)], {
      type: "text/plain;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName(title) + ".txt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportWritingAsPdf(
  title: string,
  content: string,
  storyTitle?: string,
) {
  const popup = window.open("", "_blank");
  if (!popup)
    throw new Error(
      "Permita a abertura da janela de impressão para salvar o PDF.",
    );
  popup.onload = () => {
    popup.focus();
    popup.print();
  };
  popup.document.write(writingHtml(title, content, storyTitle));
  popup.document.close();
}
