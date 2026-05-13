import { identifyAnimal } from '../../Others/Gemini/animalIdentifier.js';

export const identifyController = {
  handleRequest: async (req, res) => {
    const action = req.query.action || req.body?.action || 'identify';

    if (action === 'health') {
      return res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'Animal Identification Prototype API'
      });
    }

    if (action === 'identify') {
      try {
        const { imageBuffer, imageBase64, mimeType, location } = req.body;

        if (!imageBuffer && !imageBase64) {
          return res.status(400).json({
            success: false,
            error: 'No image provided. Send imageBase64 in request body.'
          });
        }

        const resolvedMimeType = mimeType || 'image/jpeg';
        if (!resolvedMimeType.startsWith('image/')) {
          return res.status(400).json({
            success: false,
            error: 'Only image media types are supported (e.g. image/jpeg, image/png, image/webp).'
          });
        }

        const buffer = imageBase64
          ? Buffer.from(imageBase64, 'base64')
          : Buffer.from(imageBuffer);

        const result = await identifyAnimal(buffer, resolvedMimeType, location);

        if (result.success) {
          return res.json({
            success: true,
            data: {
              commonName: result.commonName,
              scientificName: result.scientificName,
              imageUrl: result.imageUrl
            },
            modelUsed: result.modelUsed,
            debugLogs: result.debugLogs
          });
        } else {
          return res.status(400).json({
            success: false,
            error: result.error,
            debugLogs: result.debugLogs
          });
        }
      } catch (error) {
        console.error('Controller Error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
    }

    return res.status(400).json({
      success: false,
      error: `Unknown action: ${action}. Use 'identify' or 'health'.`
    });
  }
};
