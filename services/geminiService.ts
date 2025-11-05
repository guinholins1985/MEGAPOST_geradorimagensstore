import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateBackgroundImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '9:16',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const image = response.generatedImages[0];
            if (image.image?.imageBytes) {
                return image.image.imageBytes;
            }
        }
        throw new Error("Nenhuma imagem foi gerada pela API.");
    } catch (error) {
        console.error("Erro ao chamar a API Gemini (generateImages):", error);
        throw new Error("Falha ao gerar a imagem de fundo a partir da API Gemini.");
    }
};


export const generatePromptFromImage = async (imageBase64: string): Promise<string> => {
    try {
        // Extrai o tipo de mime e os dados base64 puros
        const match = imageBase64.match(/^data:(image\/.+);base64,(.+)$/);
        if (!match) {
            throw new Error("Formato de string base64 inválido.");
        }
        const mimeType = match[1];
        const pureBase64 = match[2];

        const imagePart = {
            inlineData: {
                mimeType: mimeType,
                data: pureBase64,
            },
        };

        const textPart = {
            text: "Analise a imagem deste produto. Crie uma descrição detalhada e profissional para um fundo de imagem que complemente e destaque este produto para uma postagem de story em redes sociais. A descrição deve ser criativa, atraente e focar em uma estética moderna e limpa. Descreva a cena, a iluminação, as cores e o clima. A resposta deve ser apenas a descrição gerada, em português."
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePart, textPart] },
        });

        return response.text;

    } catch (error) {
        console.error("Erro ao chamar a API Gemini (generateContent):", error);
        throw new Error("Falha ao gerar a descrição a partir da imagem.");
    }
};
