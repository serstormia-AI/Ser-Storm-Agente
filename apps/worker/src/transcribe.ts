import axios from 'axios';
import FormData from 'form-data';

export async function transcribeAudioBuffer(audioBuffer: Buffer, mimetype: string = 'audio/ogg'): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log('[Transcribe] No OPENAI_API_KEY or GROQ_API_KEY configured. Skipping audio transcription.');
    return null;
  }

  const isGroq = !!process.env.GROQ_API_KEY;
  const endpoint = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions';

  try {
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: 'voice_note.ogg',
      contentType: mimetype,
    });
    formData.append('model', isGroq ? 'whisper-large-v3' : 'whisper-1');
    formData.append('language', 'es');

    const response = await axios.post(endpoint, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    });

    const text = response.data?.text?.trim();
    console.log(`[Transcribe] Success: "${text?.slice(0, 50)}..."`);
    return text || null;
  } catch (error: any) {
    console.error('[Transcribe] Transcription failed:', error.response?.data || error.message);
    return null;
  }
}
