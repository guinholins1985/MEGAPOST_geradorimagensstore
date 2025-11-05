import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const composeStoryImage = async (productImageBase64: string, prompt: string): Promise<string> => {
    try {
        const match = productImageBase64.match(/^data:(image\/.+);base64,(.+)$/);
        if (!match) {
            throw new Error("Formato de string base64 inválido para a imagem do produto.");
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
            text: `Usando a imagem do produto fornecida, coloque-a profissionalmente na cena a seguir, garantindo uma composição realista com sombras e iluminação adequadas. A imagem final deve ser uma imagem de story completa e de alta qualidade para mídias sociais (proporção 9:16). Descrição da cena: ${prompt}`
        };

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [imagePart, textPart] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        
        throw new Error("Nenhuma imagem foi gerada pela API.");

    } catch (error) {
        console.error("Erro ao chamar a API Gemini (composeStoryImage):", error);
        throw new Error("Falha ao compor a imagem a partir da API Gemini.");
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
            text: "Analise a imagem deste produto. Crie uma descrição detalhada e profissional para uma cena completa onde este produto seria o destaque, para uma postagem de story em redes sociais (formato 9:16). A descrição deve ser criativa, atraente e focar em uma estética moderna e limpa. Descreva o ambiente, a iluminação, os elementos de suporte, as cores e o clima. A resposta deve ser apenas a descrição gerada, em português."
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
