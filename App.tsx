import React, { useState, useRef, useEffect, useCallback } from 'react';
import { composeStoryImage, generatePromptFromImage } from './services/geminiService';
import { UploadIcon, SparklesIcon, DownloadIcon, RefreshIcon, LinkIcon, SpinnerIcon } from './components/Icons';

const loadingMessages = [
    "Convocando diretores de arte...",
    "Ajustando a iluminação do estúdio virtual...",
    "Compondo a cena perfeita...",
    "Adicionando sombras e reflexos realistas...",
    "Finalizando os detalhes da sua obra-prima...",
];

const defaultPrompt = 'Um fundo vibrante e abstrato com toques de dourado e azul-petróleo, criando uma sensação luxuosa e moderna para a exibição de um produto.';

const urlToDataUrl = (url: string): Promise<string> => {
    // Utiliza um proxy público para contornar restrições de CORS do navegador.
    // Isso permite buscar imagens da maioria dos marketplaces.
    const PROXY_URL = 'https://corsproxy.io/?';
    const proxiedUrl = `${PROXY_URL}${url}`;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Necessário para operações no canvas, mesmo com proxy.
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_DIMENSION = 1024; // Redimensiona imagens grandes para melhor performance.
            let { naturalWidth: width, naturalHeight: height } = img;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
                width *= ratio;
                height *= ratio;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Não foi possível obter o contexto 2D do canvas.'));
                return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            try {
                // Usar JPEG pode resultar em uma string base64 menor.
                const dataURL = canvas.toDataURL('image/jpeg', 0.95);
                resolve(dataURL);
            } catch (e) {
                 reject(new Error('Não foi possível converter a imagem para Data URL.'));
            }
        };
        img.onerror = () => {
            // Mensagem de erro atualizada, já que CORS é uma causa menos provável agora.
            reject(new Error('Não foi possível carregar a imagem da URL. Verifique se o link é válido e aponta diretamente para uma imagem.'));
        };
        img.src = proxiedUrl;
    });
};


const App: React.FC = () => {
    const [productImage, setProductImage] = useState<string | null>(null);
    const [prompt, setPrompt] = useState<string>(defaultPrompt);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [finalImageURI, setFinalImageURI] = useState<string | null>(null);
    const [currentLoadingMessage, setCurrentLoadingMessage] = useState<string>('');
    const [productUrl, setProductUrl] = useState<string>('');
    const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState<boolean>(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isLoading) {
            let i = 0;
            setCurrentLoadingMessage(loadingMessages[i]);
            interval = setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setCurrentLoadingMessage(loadingMessages[i]);
            }, 2500);
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [isLoading]);
    
    
    const handleAnalyzeImage = useCallback(async () => {
        if (!productImage) return;
        setIsGeneratingPrompt(true);
        setError(null);
        try {
            const generatedPrompt = await generatePromptFromImage(productImage);
            setPrompt(generatedPrompt);
        } catch (e) {
            setError('Não foi possível analisar a imagem. Por favor, tente descrever o fundo manualmente.');
            setPrompt(defaultPrompt); // Reset to default on error
        } finally {
            setIsGeneratingPrompt(false);
        }
    }, [productImage]);

    useEffect(() => {
        if (productImage && !finalImageURI) { // Only analyze if there's no final image yet
            handleAnalyzeImage();
        }
    }, [productImage, finalImageURI, handleAnalyzeImage]);


    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            handleReset();
            const reader = new FileReader();
            reader.onloadend = () => {
                setProductImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleUrlImport = async () => {
        if (!productUrl) return;
        handleReset();
        setIsLoadingUrl(true);
        setError(null);
        try {
            const dataUrl = await urlToDataUrl(productUrl);
            setProductImage(dataUrl);
            setProductUrl('');
        } catch (e: any) {
            setError(e.message || 'Ocorreu um erro desconhecido ao importar da URL.');
        } finally {
            setIsLoadingUrl(false);
        }
    };


    const handleGenerate = async () => {
        if (!prompt || !productImage) return;
        setIsLoading(true);
        setError(null);
        setFinalImageURI(null);
        try {
            const finalImage = await composeStoryImage(productImage, prompt);
            setFinalImageURI(finalImage);
        } catch (e) {
            console.error(e);
            setError('Falha ao compor a imagem profissional. Por favor, tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!finalImageURI) return;
        const link = document.createElement('a');
        link.href = finalImageURI;
        link.download = 'story-profissional.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReset = () => {
        setProductImage(null);
        setFinalImageURI(null);
        setError(null);
        setIsLoading(false);
        setProductUrl('');
        setIsLoadingUrl(false);
        setPrompt(defaultPrompt);
        if(fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    
    const triggerFileUpload = () => {
        if (isLoadingUrl) return;
        fileInputRef.current?.click();
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 lg:p-8">
            <main className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Controls Panel */}
                <div className="flex flex-col space-y-6 bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <div className="text-center">
                        <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                            Gerador de Imagens para Stories com IA
                        </h1>
                        <p className="mt-2 text-gray-400">
                           Crie visuais incríveis para seus stories em segundos. Envie um produto, descreva um cenário e deixe a IA fazer a mágica.
                        </p>
                    </div>

                    {/* Step 1: Upload */}
                    <div className="space-y-2">
                         <label className="text-lg font-semibold text-gray-300">Passo 1: Envie seu Produto</label>
                         <p className="text-sm text-gray-500">Para melhores resultados, use uma imagem PNG com fundo transparente.</p>
                         <div
                            onClick={triggerFileUpload}
                            className={`cursor-pointer border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-gray-700 transition-all duration-300 ${isLoadingUrl ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                            {productImage ? (
                                 <img src={productImage} alt="Produto enviado" className="max-h-32 mx-auto rounded-md" />
                            ) : (
                                <div className="flex flex-col items-center text-gray-400">
                                    <UploadIcon className="w-10 h-10 mb-2"/>
                                    <p>Clique para procurar ou arraste e solte</p>
                                </div>
                            )}
                        </div>
                        <div className="relative flex items-center justify-center my-4">
                            <div className="flex-grow border-t border-gray-600"></div>
                            <span className="flex-shrink mx-4 text-gray-400 uppercase text-sm">Ou</span>
                            <div className="flex-grow border-t border-gray-600"></div>
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="url-input" className="text-sm font-medium text-gray-400">Importar de uma URL</label>
                             <div className="flex gap-2">
                                 <input
                                    id="url-input"
                                    type="url"
                                    value={productUrl}
                                    onChange={(e) => setProductUrl(e.target.value)}
                                    placeholder="Cole a URL da imagem do produto aqui"
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                                    disabled={isLoadingUrl}
                                 />
                                 <button
                                    onClick={handleUrlImport}
                                    disabled={!productUrl || isLoadingUrl}
                                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Importar Imagem da URL"
                                 >
                                    <LinkIcon className="w-5 h-5"/>
                                    <span>{isLoadingUrl ? 'Importando...' : 'Importar'}</span>
                                 </button>
                             </div>
                        </div>
                    </div>
                    
                     {/* Step 2: Describe Background */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label htmlFor="prompt" className="text-lg font-semibold text-gray-300">Passo 2: Descreva a Cena</label>
                            <button
                                onClick={handleAnalyzeImage}
                                disabled={!productImage || isGeneratingPrompt || isLoading}
                                className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Gerar outra sugestão"
                            >
                                <RefreshIcon className="w-4 h-4"/>
                                Gerar Outra Sugestão
                            </button>
                        </div>
                        <div className="relative">
                             <textarea
                                id="prompt"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                rows={4}
                                placeholder="Descreva o fundo que você imagina..."
                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors disabled:opacity-50"
                                disabled={!productImage || isLoading || isGeneratingPrompt}
                             />
                            {isGeneratingPrompt && <SpinnerIcon className="absolute top-3 right-3 w-5 h-5 text-gray-400" />}
                        </div>
                    </div>

                    {/* Step 3: Generate */}
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            onClick={handleGenerate}
                            disabled={!productImage || !prompt || isLoading || isLoadingUrl || isGeneratingPrompt}
                            className="w-full flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                        >
                            <SparklesIcon className="w-6 h-6"/>
                            {isLoading ? 'Compondo...' : 'Criar Story Profissional'}
                        </button>
                    </div>
                    {productImage && (
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleDownload}
                            disabled={!finalImageURI || isLoading || isLoadingUrl}
                            className="w-full flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DownloadIcon className="w-6 h-6"/>
                            Baixar
                        </button>
                        <button
                            onClick={handleReset}
                            className="w-full flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors duration-300"
                        >
                            <RefreshIcon className="w-6 h-6"/>
                            Começar de Novo
                        </button>
                    </div>
                    )}
                </div>

                {/* Preview Panel */}
                <div className="bg-gray-800 p-4 rounded-2xl shadow-lg flex items-center justify-center min-h-[60vh] lg:min-h-0">
                    <div className="w-full max-w-[360px] aspect-[9/16] bg-gray-900 rounded-xl flex items-center justify-center overflow-hidden relative">
                        {(isLoading || isLoadingUrl) && (
                            <div className="text-center p-4">
                                <SparklesIcon className="w-12 h-12 text-purple-400 animate-pulse mx-auto"/>
                                <p className="mt-4 font-semibold">{isLoading ? currentLoadingMessage : 'Importando imagem...'}</p>

                            </div>
                        )}
                        {error && !isLoading && !isLoadingUrl && <p className="text-red-400 p-4 text-center">{error}</p>}
                        
                        {!isLoading && !isLoadingUrl && !finalImageURI && !error && (
                            <div className="text-center text-gray-500 p-4">
                                <p>Sua imagem de story profissional aparecerá aqui.</p>
                            </div>
                        )}

                        {finalImageURI && !isLoading && !isLoadingUrl && (
                            <img src={finalImageURI} alt="Story gerado profissionalmente" className="w-full h-full object-cover" />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
