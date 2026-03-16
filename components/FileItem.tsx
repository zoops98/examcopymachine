
import React from 'react';
import { FileData } from '../types';
import { CheckCircle2, Loader2, AlertCircle, X, Image as ImageIcon, FileText, File as FileIcon } from 'lucide-react';

interface FileItemProps {
  item: FileData;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
}

export const FileItem: React.FC<FileItemProps> = ({ item, isSelected, onSelect, onRemove }) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'processing': return <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-gray-200" />;
    }
  };

  const getStatusColor = () => {
    if (isSelected) {
      return item.type === 'pdf' 
        ? 'bg-white border-blue-400 ring-4 ring-blue-50' 
        : 'bg-white border-yellow-400 ring-4 ring-yellow-50';
    }
    switch (item.status) {
      case 'completed': return 'bg-white border-green-200';
      case 'processing': return 'bg-white border-yellow-200';
      case 'error': return 'bg-white border-red-200';
      default: return 'bg-white border-gray-100 hover:border-gray-200';
    }
  };

  const getProgressColor = () => {
    if (item.status === 'error') return 'bg-red-400';
    if (item.status === 'completed') return 'bg-green-500';
    return item.type === 'pdf' ? 'bg-blue-600' : 'bg-orange-500';
  };

  return (
    <div 
      onClick={onSelect}
      className={`relative p-4 border-2 rounded-[2.2rem] cursor-pointer transition-all ${getStatusColor()} flex items-center gap-4 group mb-3 shadow-sm active:scale-95 overflow-hidden`}
    >
      {/* Type-specific side accent */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${item.type === 'pdf' ? 'bg-blue-600' : 'bg-orange-500'}`} />

      <div className={`relative w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 border shadow-inner group-hover:shadow-md transition-all ${item.type === 'pdf' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
        {item.type === 'image' ? (
          <>
            <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-transparent transition-colors" />
            <div className="absolute top-1 left-1 bg-orange-500 rounded-lg p-1 shadow-sm border border-white/20">
              <ImageIcon className="w-3 h-3 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <FileText className="w-7 h-7 text-blue-600 mb-0.5" />
            <div className="absolute top-1 left-1 bg-blue-600 rounded-lg p-1 shadow-sm border border-white/20">
              <FileIcon className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-bold truncate text-gray-800 flex-1">{item.file.name}</h4>
        </div>
        
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
             <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border ${
               item.type === 'pdf' 
                ? 'bg-blue-600 text-white border-blue-700' 
                : 'bg-orange-500 text-white border-orange-600'
             }`}>
               {item.type}
             </span>
             <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter ${
               item.status === 'completed' ? 'bg-green-100 text-green-700' : 
               item.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 
               item.status === 'error' ? 'bg-red-100 text-red-700' : 
               'bg-gray-100 text-gray-500'
             }`}>
               {item.status}
             </span>
           </div>
           <span className="text-[10px] text-gray-400 font-black">{item.progress}%</span>
        </div>
        
        <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-50/50">
          <div 
            className={`h-full transition-all duration-700 ease-out relative ${getProgressColor()}`} 
            style={{ width: `${item.progress}%` }}
          >
            {item.status === 'processing' && (
              <div className="absolute inset-0 progress-shimmer" />
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center justify-center w-8">
        {getStatusIcon()}
      </div>

      <button 
        onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
        className="absolute -top-2 -right-2 bg-white shadow-lg rounded-full p-1.5 opacity-0 group-hover:opacity-100 transform hover:scale-110 active:scale-90 transition-all border border-gray-100 z-10"
      >
        <X className="w-4 h-4 text-gray-400 hover:text-red-500" />
      </button>
    </div>
  );
};
