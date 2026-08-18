// AudioWorklet processor script for capturing PCM16 audio
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      if (channelData && channelData.length > 0) {
        // Send Float32Array channel data to main thread
        this.port.postMessage(channelData);
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', AudioProcessor);
