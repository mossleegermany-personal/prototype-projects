import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model configuration with fallbacks
const MODELS = {
  PRIMARY: 'gemini-2.5-pro',      // BEST accuracy (25 req/day per key)
  FALLBACK: 'gemini-2.5-flash',   // Good accuracy (500 req/day per key)
  FALLBACK2: 'gemini-2.0-flash'   // Good accuracy (1500 req/day per key)
};

export async function identifyAnimal(imageBuffer, location = null) {
  const modelsToTry = [MODELS.PRIMARY, MODELS.FALLBACK, MODELS.FALLBACK2];
  const debugLogs = [];

  const base64Image = imageBuffer.toString('base64');

  const locationContext = location
    ? `\nThe photo was taken in: ${location}. Consider species native to or commonly found in this region when making your identification.`
    : '';

  const prompt = `You are an expert wildlife biologist. Analyze this image and identify the animal species.${locationContext}

Respond with ONLY a JSON object in this exact format (no other text):
{"commonName": "Peregrine Falcon", "scientificName": "Falco peregrinus"}

If the image does not contain an animal or you cannot identify it, respond with:
{"commonName": null, "scientificName": null}`;

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const logMsg = `🔄 Trying model: ${modelName}`;
      console.log(logMsg);
      debugLogs.push(logMsg);

      const model = genAI.getGenerativeModel({ model: modelName });

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      const successMsg = `✅ Success with model: ${modelName}`;
      console.log(successMsg);
      debugLogs.push(successMsg);

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);

          if (data.commonName && data.scientificName) {
            const imageUrl = await fetchINaturalistImage(data.commonName);

            return {
              success: true,
              commonName: data.commonName,
              scientificName: data.scientificName,
              imageUrl: imageUrl,
              modelUsed: modelName,
              debugLogs: debugLogs
            };
          }
        }
      } catch (parseError) {
        const parseErrMsg = `JSON parse error: ${parseError.message}`;
        console.error(parseErrMsg);
        debugLogs.push(parseErrMsg);
      }

      return {
        success: false,
        error: 'Could not identify animal',
        modelUsed: modelName,
        debugLogs: debugLogs
      };

    } catch (error) {
      const errMsg = `❌ Error with ${modelName}: ${error.message}`;
      console.error(errMsg);
      debugLogs.push(errMsg);
      lastError = error;
    }
  }

  return {
    success: false,
    error: lastError?.message || 'All models failed',
    debugLogs: debugLogs
  };
}

async function fetchINaturalistImage(speciesName) {
  try {
    const searchUrl = `https://api.inaturalist.org/v1/taxa?q=${encodeURIComponent(speciesName)}&per_page=1`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const taxon = data.results[0];
      if (taxon.default_photo && taxon.default_photo.medium_url) {
        return taxon.default_photo.medium_url;
      }
    }
    return null;
  } catch (error) {
    console.error('iNaturalist fetch error:', error);
    return null;
  }
}
