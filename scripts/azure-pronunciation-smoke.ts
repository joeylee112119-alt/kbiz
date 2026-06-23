import { AzurePronunciationProvider } from "../packages/pronunciation/src/index.js";

const speechKey = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;

if (!speechKey || !region) {
  console.log("SKIPPED: AZURE_SPEECH_KEY and AZURE_SPEECH_REGION are required for Azure pronunciation smoke.");
  process.exit(77);
}

const provider = new AzurePronunciationProvider({ speechKey, region, timeoutMs: 15_000 });
const result = await provider.assess({
  audio: createSilentWav(),
  referenceText: "hello",
  locale: "en-US",
  userIdHash: "smoke"
});

console.log(
  JSON.stringify({
    pronunciationStatus: result.pronunciationStatus,
    pronunciationScore: result.pronunciationScore,
    errorType: result.errorType
  })
);

if (result.pronunciationStatus === "FAILED") {
  process.exit(1);
}

function createSilentWav(): ArrayBuffer {
  const sampleRate = 16_000;
  const seconds = 1;
  const samples = sampleRate * seconds;
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  return buffer;
}

function writeAscii(view: DataView, offset: number, value: string): void {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}
