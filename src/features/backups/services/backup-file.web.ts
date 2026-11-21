export function chooseBackupFile(): Promise<{
  name: string;
  text: string;
} | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        if (file.size > 25 * 1024 * 1024)
          throw new Error("O backup deve ter no máximo 25 MB.");
        resolve({ name: file.name, text: await file.text() });
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}

export async function saveBackupFile(text: string, name: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return "shared" as const;
}
