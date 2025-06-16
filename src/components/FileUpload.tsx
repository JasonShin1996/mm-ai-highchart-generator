
import React, { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Papa: any;
    XLSX: any;
  }
}

const FileUpload = ({ onFileUpload }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['csv', 'xls', 'xlsx'];

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast({
        title: "檔案格式錯誤",
        description: "請上傳 CSV、XLS 或 XLSX 格式的檔案。",
        variant: "destructive",
      });
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);

    try {
      if (fileExtension === 'csv') {
        await parseCsv(file);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        await parseExcel(file);
      }
    } catch (error) {
      toast({
        title: "檔案解析失敗",
        description: error.message,
        variant: "destructive",
      });
      setFileName('');
    } finally {
      setIsProcessing(false);
    }
  }, [onFileUpload, toast]);

  const parseCsv = (file) => {
    return new Promise((resolve, reject) => {
      if (!window.Papa) {
        reject(new Error('CSV 解析器未載入'));
        return;
      }

      window.Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error(`CSV 解析錯誤: ${results.errors[0].message}`));
            return;
          }
          onFileUpload(results);
          resolve(results);
        },
        error: (error) => {
          reject(new Error(`CSV 檔案解析失敗: ${error.message}`));
        }
      });
    });
  };

  const parseExcel = (file) => {
    return new Promise((resolve, reject) => {
      if (!window.XLSX) {
        reject(new Error('Excel 解析器未載入'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = window.XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (rawData.length < 1) {
            reject(new Error('Excel 檔案的工作表是空的'));
            return;
          }

          const headers = rawData[0];
          const dataRows = rawData.slice(1);
          const jsonData = dataRows.map(rowArray => {
            const rowObject = {};
            headers.forEach((header, index) => {
              rowObject[header] = rowArray[index] !== undefined ? rowArray[index] : '';
            });
            return rowObject;
          });

          const results = { meta: { fields: headers }, data: jsonData };
          onFileUpload(results);
          resolve(results);
        } catch (error) {
          reject(new Error(`Excel 檔案解析失敗: ${error.message}`));
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleChange = useCallback((e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const clearFile = () => {
    setFileName('');
    onFileUpload(null);
  };

  return (
    <div className="w-full">
      <div
        className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {isProcessing ? (
            <>
              <div className="w-8 h-8 mb-2 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-gray-600">處理檔案中...</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">
                <span className="font-semibold">點擊上傳</span> 或拖曳檔案至此
              </p>
              <p className="text-xs text-gray-500">支援 CSV, XLS, XLSX</p>
              {fileName && (
                <div className="flex items-center mt-2 px-3 py-1 bg-blue-100 rounded-full">
                  <FileText className="w-4 h-4 text-blue-600 mr-2" />
                  <span className="text-xs text-blue-600 mr-2">{fileName}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFile();
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={handleChange}
        />
      </div>
    </div>
  );
};

export default FileUpload;
