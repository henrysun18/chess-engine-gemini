import React, { useState, useEffect } from 'react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (text: string) => void;
  title: string;
  defaultValue?: string; // For export
  isExport?: boolean;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen, onClose, onImport, title, defaultValue = '', isExport = false
}) => {
  const [text, setText] = useState(defaultValue);

  useEffect(() => {
    setText(defaultValue);
  }, [defaultValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <div className="p-4 flex-1">
          <textarea
            className="w-full h-40 bg-slate-900 border border-slate-700 rounded p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-amber-500 resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={isExport ? "" : "Paste text here..."}
            readOnly={isExport}
            onClick={(e) => isExport && (e.target as HTMLTextAreaElement).select()}
          />
        </div>

        <div className="p-4 border-t border-slate-700 flex justify-end gap-3 bg-slate-800/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white font-medium transition-colors"
          >
            {isExport ? 'Close' : 'Cancel'}
          </button>
          
          {isExport ? (
            <button
              onClick={() => {
                navigator.clipboard.writeText(text);
                alert("Copied to clipboard!");
              }}
               className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-colors"
            >
              Copy to Clipboard
            </button>
          ) : (
             <button
              onClick={() => {
                onImport(text);
                onClose();
              }}
              disabled={!text.trim()}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium transition-colors"
            >
              Import
            </button>
          )}
        </div>
      </div>
    </div>
  );
};