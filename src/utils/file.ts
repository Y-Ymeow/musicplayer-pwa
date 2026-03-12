const audioExtensions = [
  ".mp3",
  ".flac",
  ".wav",
  ".aac",
  ".m4a",
  ".ogg",
  ".opus",
];

export function isAudioFile(name: string) {
  const lower = name.toLowerCase();
  return audioExtensions.some((ext) => lower.endsWith(ext));
}

export async function pickAudioFiles(): Promise<FileSystemFileHandle[]> {
  if ("showOpenFilePicker" in window) {
    const handles = await (window as any).showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: "Audio files",
          accept: {
            "audio/*": audioExtensions,
          },
        },
      ],
    });

    return handles;
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "audio/*";
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      const handles = files.map((file) => ({
        kind: "file",
        name: file.name,
        getFile: async () => file,
      })) as FileSystemFileHandle[];
      resolve(handles);
    };
    input.click();
  });
}

export async function pickAudioDirectory(): Promise<FileSystemFileHandle[]> {
  return [];
}
