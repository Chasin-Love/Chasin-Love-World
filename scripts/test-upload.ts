/* Temp test script to simulate upload and catch logging */
import { uploadSkyPhoto } from './src/platform/sky/skyRegistry';

async function test() {
  console.log("Starting test...");
  try {
    // Need a dummy file for testing.
    // In a real browser test, this uses the File object.
    // I can't do this easily in a script without DOM.
    // Maybe I just observe the logs?
    console.log("Waiting for user to upload in browser...");
  } catch (e) {
    console.error(e);
  }
}
test();