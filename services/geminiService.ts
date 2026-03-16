
import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { OCR_SYSTEM_PROMPT, SUMMARY_PROMPT, CORRECTION_PROMPT } from "../constants";

/**
 * Ensures we have a valid API Key and returns a fresh GoogleGenAI instance.
 */
const getAIClient = (): GoogleGenAI => {
  const apiKey = (window as any).process?.env?.API_KEY || localStorage.getItem('USER_GEMINI_API_KEY') || "";
  
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API 키가 설정되지 않았습니다. 상단 입력창에 키를 입력하고 다시 시도해 주세요.");
  }
  
  return new GoogleGenAI({ apiKey });
};

/**
 * Performs OCR on the provided image or PDF data using Gemini 3 Pro.
 */
export const performOCR = async (
  base64Data: string,
  mimeType: string,
  highAccuracy: boolean
): Promise<string> => {
  if (!base64Data || !mimeType) {
    throw new Error("유효하지 않은 파일 데이터입니다.");
  }

  const ai = getAIClient();
  const model = "gemini-3-pro-preview";

  // 명령어를 더 간결하고 엄격하게 수정
  const promptText = "원본 문서에 없는 설명이나 라벨을 절대 추가하지 마세요. 오직 문서 내의 텍스트와 구조만 똑같이 추출하세요. 선택지 줄바꿈과 대화문 형식을 엄격히 유지하세요.";

  const contents: Content[] = [
    {
      role: "user",
      parts: [
        { inlineData: { data: base64Data, mimeType: mimeType } },
        { text: promptText }
      ]
    }
  ];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: OCR_SYSTEM_PROMPT,
        temperature: 0.0, // 일관성을 위해 가장 낮은 온도로 설정
        topP: 0.1,
        topK: 1
      }
    });

    if (!response || !response.text) {
      throw new Error("모델로부터 응답을 받지 못했습니다.");
    }

    // 결과물에서 혹시라도 모델이 추가했을지 모르는 서술형 문구들 제거 시도 (방어적 코드)
    let cleanedText = response.text.trim();
    const noisePatterns = [
      /^다음은.*결과입니다\.?/i,
      /^\[왼쪽 단\]/i,
      /^\[오른쪽 단\]/i,
      /^여기.*있습니다\.?/i
    ];
    
    noisePatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '').trim();
    });

    return cleanedText;
  } catch (error: any) {
    console.error("Gemini OCR Error:", error);
    throw error;
  }
};

/**
 * Refines the extracted text using Gemini 3 Flash.
 */
export const refineText = async (text: string, mode: 'summary' | 'correction'): Promise<string> => {
  if (!text) return "";

  const ai = getAIClient();
  const model = "gemini-3-flash-preview";
  
  const instruction = mode === 'summary' ? SUMMARY_PROMPT : CORRECTION_PROMPT;
  
  const contents: Content[] = [
    {
      role: "user",
      parts: [{ text: `${instruction}\n\nContent:\n${text}` }]
    }
  ];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents,
      config: {
        temperature: 0.1,
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Gemini Refine Error:", error);
    throw error;
  }
};
