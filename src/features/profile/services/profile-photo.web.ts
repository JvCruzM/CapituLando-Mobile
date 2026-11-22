export function chooseProfilePhoto(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.oncancel = () => resolve(null);
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      let uri: string | undefined;
      try {
        if (file.size > 10 * 1024 * 1024)
          throw new Error("Escolha uma imagem de até 10 MB.");
        uri = URL.createObjectURL(file);
        const image = new Image();
        image.src = uri;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context)
          throw new Error("Não foi possível preparar a foto neste navegador.");
        const side = Math.min(image.naturalWidth, image.naturalHeight);
        if (!side) throw new Error("O arquivo não contém uma imagem válida.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 512, 512);
        context.drawImage(
          image,
          (image.naturalWidth - side) / 2,
          (image.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          512,
          512,
        );
        const photo = canvas.toDataURL("image/jpeg", 0.8);
        if (photo.length > 1_500_000)
          throw new Error("A imagem é muito grande. Escolha outra foto.");
        resolve(photo);
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Não foi possível abrir a imagem selecionada."),
        );
      } finally {
        if (uri) URL.revokeObjectURL(uri);
      }
    };
    input.click();
  });
}
