
import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { FileItem } from './components/FileItem';
import { FileData } from './types';
import { performOCR, refineText } from './services/geminiService';
import { 
  Copy, 
  Sparkles, 
  FileText, 
  Trash2, 
  Wand2,
  FileSearch,
  Loader2,
  Camera,
  Sun,
  ShieldCheck,
  Check,
  FileCode,
  ArrowRight,
  Info,
  Key,
  ClipboardPaste
} from 'lucide-react';

declare const marked: any;

const App: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [highAccuracy, setHighAccuracy] = useState(true);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [userApiKey, setUserApiKey] = useState(localStorage.getItem('USER_GEMINI_API_KEY') || '');
  const [isCopied, setIsCopied] = useState(false);

  // 현재 선택된 파일 객체 도출
  const selectedFile = files.find(f => f.id === selectedFileId);

  useEffect(() => {
    if (userApiKey) {
      if (!(window as any).process) (window as any).process = { env: {} };
      (window as any).process.env.API_KEY = userApiKey;
    }
  }, [userApiKey]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setUserApiKey(newKey);
    localStorage.setItem('USER_GEMINI_API_KEY', newKey);
    if (!(window as any).process) (window as any).process = { env: {} };
    (window as any).process.env.API_KEY = newKey;
  };

  const addFiles = useCallback((incomingFiles: File[]) => {
    const newFiles: FileData[] = incomingFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'waiting',
      progress: 0,
      type: file.type.includes('pdf') ? 'pdf' : 'image',
    }));

    setFiles(prev => {
      const combined = [...prev, ...newFiles];
      // 현재 선택된 파일이 없거나, 선택된 ID가 목록에 없는 경우(삭제된 경우 등) 새로 추가된 첫 파일을 선택
      if (!selectedFileId || !prev.find(f => f.id === selectedFileId)) {
        setSelectedFileId(newFiles[0].id);
      }
      return combined;
    });
  }, [selectedFileId]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `pasted_image_${new Date().getTime()}.png`, { type: blob.type });
            pastedFiles.push(file);
          }
        }
      }

      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFiles]);

  const handleFilesSelected = (fileList: FileList) => {
    addFiles(Array.from(fileList));
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      if (selectedFileId === id) {
        setSelectedFileId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const clearAllFiles = () => {
    setFiles([]);
    setSelectedFileId(null);
  };

  const processFile = async (id: string) => {
    const target = files.find(f => f.id === id);
    if (!target || target.status === 'processing') return;

    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing', progress: 10, error: undefined } : f));

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          if (result) {
            resolve(result.split(',')[1]);
          } else {
            reject(new Error("파일 데이터를 읽을 수 없습니다."));
          }
        };
        reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
      });
      reader.readAsDataURL(target.file);
      const base64Data = await base64Promise;

      setFiles(prev => prev.map(f => f.id === id ? { ...f, progress: 30 } : f));
      const text = await performOCR(base64Data, target.file.type, highAccuracy);

      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'completed', 
        progress: 100, 
        extractedText: text 
      } : f));
    } catch (error: any) {
      console.error("Process error:", error);
      const errorMessage = error.message || '분석 중 예상치 못한 오류가 발생했습니다.';
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: 'error', 
        progress: 0,
        error: errorMessage
      } : f));
      alert(`오류 발생 (${target.file.name}): ${errorMessage}`);
    }
  };

  const handleProcessAll = async () => {
    if (!userApiKey) {
      alert("API 키를 먼저 입력해 주세요.");
      return;
    }
    setIsProcessingAll(true);
    const waiting = files.filter(f => f.status === 'waiting' || f.status === 'error');
    for (const f of waiting) {
      await processFile(f.id);
    }
    setIsProcessingAll(false);
  };

  const handleRefine = async (mode: 'summary' | 'correction') => {
    if (!selectedFile?.extractedText) return;
    setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, status: 'processing' } : f));
    try {
      const refined = await refineText(selectedFile.extractedText, mode);
      setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, status: 'completed', extractedText: refined } : f));
    } catch (error: any) {
      alert(`AI 처리 오류: ${error.message}`);
      setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, status: 'completed' } : f));
    }
  };

  const copyToClipboard = () => {
    if (selectedFile?.extractedText) {
      navigator.clipboard.writeText(selectedFile.extractedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const downloadAsA4HTML = () => {
    if (!selectedFile?.extractedText) return;

    const htmlContent = marked.parse(selectedFile.extractedText);
    const fileName = selectedFile.file.name.split('.')[0];

    const fullHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>${fileName} - 시험지 복사</title>
  <style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
    @page { 
      size: A4; 
      margin: 0; 
    }
    body {
      font-family: 'Pretendard', -apple-system, sans-serif;
      line-height: 1.6;
      color: #000;
      margin: 0;
      padding: 0;
      background: #f4f4f4;
      font-size: 10.5pt;
      -webkit-print-color-adjust: exact;
    }
    .page-wrapper {
      width: 210mm;
      min-height: 297mm;
      margin: 5mm auto;
      padding: 20mm 18mm;
      box-sizing: border-box;
      background: white;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      position: relative;
    }
    .exam-header {
      border-bottom: 2.5pt solid #000;
      margin-bottom: 25pt;
      padding-bottom: 12pt;
      text-align: center;
    }
    .main-title {
      font-size: 20pt;
      font-weight: 800;
      margin: 0 0 8pt 0;
      letter-spacing: -0.5pt;
    }
    .student-info {
      display: flex;
      justify-content: flex-end;
      gap: 25pt;
      font-size: 10.5pt;
      font-weight: 600;
    }
    
    p { 
      margin: 0 0 12pt 0; 
      white-space: pre-wrap; 
      word-break: keep-all;
    }
    
    strong {
      font-weight: 700;
    }

    u {
      text-underline-offset: 3px;
      text-decoration-thickness: 0.8px;
    }

    blockquote { 
      margin: 18pt 0; 
      padding: 18pt; 
      border: 1pt solid #000; 
      background: #fff; 
      font-size: 10pt;
      break-inside: avoid;
    }
    
    ol, ul { padding-left: 22pt; margin: 0 0 12pt 0; }
    li { margin-bottom: 5pt; }

    hr { border: none; border-top: 0.6pt dashed #000; margin: 20pt 0; }

    .branding-footer {
      position: absolute;
      bottom: 12mm;
      left: 18mm;
      right: 18mm;
      text-align: center;
      font-size: 8.5pt;
      color: #999;
      border-top: 0.4pt solid #eee;
      padding-top: 6pt;
    }

    @media print {
      body { background: white; }
      .page-wrapper { margin: 0; box-shadow: none; border: none; width: 100%; height: auto; }
      .branding-footer { position: fixed; }
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="content-area">
      ${htmlContent}
    </div>
    <div class="branding-footer">
      ExamCopy AI | High-Fidelity Underline Detection
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_fidelity.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-10">
      <nav className="bg-white border-b border-yellow-100 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-[#FFD600] p-1.5 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl tracking-tighter text-gray-800">ExamCopy <span className="text-yellow-500">AI</span></span>
        </div>

        <div className="flex-1 max-w-sm mx-8 hidden sm:block">
          <div className="relative group">
            <label className="absolute -top-2 left-3 px-1.5 bg-white text-[10px] font-bold text-gray-400 group-focus-within:text-yellow-500 transition-colors uppercase tracking-wider z-10">
              Your API Key
            </label>
            <div className="relative">
              <input 
                type="password"
                value={userApiKey}
                onChange={handleApiKeyChange}
                placeholder="Paste your Gemini API Key..."
                className="w-full pl-10 pr-4 py-2 text-sm border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-yellow-400 focus:bg-white bg-gray-50 transition-all font-medium"
              />
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-focus-within:text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
            <ClipboardPaste className="w-4 h-4 text-blue-500" /> Paste Enabled
          </div>
          <div className="h-4 w-[1px] bg-gray-200"></div>
          <div className="text-sm font-bold text-gray-500">
            Created by <span className="text-yellow-600">Zoops</span>
          </div>
        </div>
      </nav>

      <div className="max-w-[1600px] mx-auto p-4 sm:p-8">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">시험지 복사기</h1>
            <p className="text-gray-500 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" /> 정밀한 시험지 복사는 Zoops와 함께
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white p-2 rounded-3xl shadow-sm border border-yellow-50">
            <button 
              onClick={() => setHighAccuracy(!highAccuracy)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${highAccuracy ? 'bg-yellow-400 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}
            >
              <ShieldCheck className="w-4 h-4" /> 정밀 모드
            </button>
            <button 
              onClick={handleProcessAll}
              disabled={isProcessingAll || files.length === 0}
              className="px-8 py-2.5 bg-gray-900 text-white rounded-2xl text-xs font-bold hover:bg-black transition-all disabled:opacity-30 flex items-center gap-2 shadow-lg"
            >
              {isProcessingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} 전체 분석
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-8">
            <FileUploader onFilesSelected={handleFilesSelected} />
            <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-yellow-50 min-h-[400px] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-800">대기 목록 ({files.length})</h2>
                {files.length > 0 && (
                  <button onClick={clearAllFiles} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-3">
                {files.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-20 opacity-50">
                    <FileSearch className="w-12 h-12 mb-3" />
                    <p className="text-sm font-bold tracking-tight">이미지를 붙여넣어 시작하세요</p>
                  </div>
                ) : (
                  files.map(f => (
                    <FileItem key={f.id} item={f} isSelected={selectedFileId === f.id} onSelect={() => setSelectedFileId(f.id)} onRemove={removeFile} />
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-[2.5rem] shadow-xl border border-yellow-50 overflow-hidden flex flex-col min-h-[800px]">
            {selectedFile ? (
              <>
                <div className="p-6 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4 bg-white sticky top-0 z-20">
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-50 p-2.5 rounded-xl text-yellow-600"><FileText className="w-5 h-5" /></div>
                    <div>
                      <h3 className="font-bold text-gray-900 truncate text-sm">{selectedFile.file.name}</h3>
                      <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider">{selectedFile.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRefine('correction')} disabled={!selectedFile.extractedText || selectedFile.status === 'processing'} className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold border border-green-100">교정</button>
                    <button onClick={() => handleRefine('summary')} disabled={!selectedFile.extractedText || selectedFile.status === 'processing'} className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-xs font-bold border border-purple-100">요약</button>
                    <div className="w-[1px] h-5 bg-gray-100 mx-1" />
                    
                    <button 
                      onClick={copyToClipboard} 
                      title="텍스트 복사"
                      className={`relative p-2.5 rounded-xl transition-all flex items-center gap-2 group ${isCopied ? 'bg-green-500 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-5 h-5 animate-in zoom-in duration-300" />
                          <span className="text-[10px] font-black absolute -bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded-md whitespace-nowrap opacity-100 transition-opacity">복사됨!</span>
                        </>
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>

                    <button onClick={downloadAsA4HTML} title="A4 인쇄용 다운로드" className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-all active:scale-95">
                      <FileCode className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-6 sm:p-10 bg-gray-50/30 overflow-hidden flex flex-col">
                  {selectedFile.status === 'processing' ? (
                    <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                      <div className="w-16 h-16 border-4 border-yellow-100 rounded-full animate-spin border-t-yellow-500" />
                      <p className="text-xl font-black text-gray-800 tracking-tight">밑줄 및 서식 분석 중...</p>
                    </div>
                  ) : selectedFile.extractedText ? (
                    <textarea 
                      className="flex-1 w-full p-8 text-gray-800 bg-white font-mono text-sm leading-relaxed resize-none custom-scrollbar outline-none rounded-3xl border border-gray-100 shadow-inner"
                      value={selectedFile.extractedText}
                      onChange={(e) => setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, extractedText: e.target.value } : f))}
                      placeholder="밑줄은 <u>내용</u> 형식으로 표시됩니다."
                    />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                      <Sun className="w-16 h-16 text-yellow-200 mb-6" />
                      <h3 className="text-2xl font-black text-gray-700 mb-3">준비 완료</h3>
                      <button onClick={() => processFile(selectedFile.id)} className="px-10 py-4 bg-yellow-400 text-white rounded-2xl font-black shadow-lg">분석 시작</button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-20">
                <Camera className="w-24 h-24 text-gray-100 mb-8" />
                <h2 className="text-3xl font-black text-gray-800 mb-4">시작하기</h2>
                <p className="text-gray-400 font-medium">스크린샷 찍고 여기서 붙여넣으세요.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
