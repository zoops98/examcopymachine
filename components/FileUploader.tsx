
import React, { useCallback } from 'react';
import { Upload, Camera, FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploaderProps {
  onFilesSelected: (files: FileList) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFilesSelected }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) onFilesSelected(e.dataTransfer.files);
  }, [onFilesSelected]);

  return (
    <div 
      className="w-full border-[3px] border-dashed border-[#FFD600] rounded-[3.5rem] bg-white hover:bg-yellow-50/20 transition-all flex flex-col items-center justify-center p-10 md:p-14 text-center cursor-pointer group shadow-sm"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input id="file-input" type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files && onFilesSelected(e.target.files)} />
      
      <div className="bg-[#FFF9E6] p-6 rounded-full mb-8 group-hover:scale-110 transition-transform shadow-sm">
        <Upload className="w-12 h-12 text-[#FFD600]" />
      </div>
      
      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#111827] mb-4">이미지 또는 PDF를 올려주세요</h3>
      <p className="text-gray-400 max-w-xs text-sm sm:text-base font-medium leading-relaxed">
        파일을 드래그하거나 클릭하여 업로드하세요.<br/>
        시험지, 강의자료, 스캔본 모두 환영합니다.
      </p>

      <div className="mt-12 flex flex-wrap justify-center gap-4 w-full">
        <div className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-6 py-3.5 bg-[#FFF2EE] rounded-[1.8rem] text-[#FF6B3D] text-sm font-bold border border-[#FFE4DC]">
          <ImageIcon className="w-4 h-4" /> 이미지
        </div>
        <div className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-6 py-3.5 bg-[#EBF3FF] rounded-[1.8rem] text-[#3D8BFF] text-sm font-bold border border-[#D6E6FF]">
          <FileText className="w-4 h-4" /> PDF
        </div>
        <div className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-6 py-3.5 bg-[#F6EFFF] rounded-[1.8rem] text-[#A855F7] text-sm font-bold border border-[#E9D5FF]">
          <Camera className="w-4 h-4" /> 카메라
        </div>
      </div>
    </div>
  );
};
