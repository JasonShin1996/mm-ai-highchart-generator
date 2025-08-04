import React, { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Papa: any;
    XLSX: any;
  }
}

const FileUpload = ({ onFileUpload, colorTheme = 'blue' }) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoConvertDates] = useState(true); // 默認開啟自動轉換日期
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
  }, [onFileUpload, toast, autoConvertDates]);

  // 處理空值 headers 的函數
  const processHeaders = (headers) => {
    return headers.map((header, index) => {
      if (!header || String(header).trim() === '') {
        return `unnamed: ${index + 1}`;
      }
      return header;
    });
  };

  const parseCsv = (file) => {
    return new Promise((resolve, reject) => {
      if (!window.Papa) {
        reject(new Error('CSV 解析器未載入'));
        return;
      }

      window.Papa.parse(file, {
        header: true,
        dynamicTyping: autoConvertDates,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors && results.errors.length > 0) {
            reject(new Error(`CSV 解析錯誤: ${results.errors[0].message}`));
            return;
          }
          
          // 處理空值 headers
          const originalHeaders = results.meta.fields;
          const processedHeaders = processHeaders(originalHeaders);
          
          // 如果 headers 有變化，需要重新構建數據
          if (JSON.stringify(originalHeaders) !== JSON.stringify(processedHeaders)) {
            const newData = results.data.map(row => {
              const newRow = {};
              processedHeaders.forEach((newHeader, index) => {
                const originalHeader = originalHeaders[index];
                newRow[newHeader] = row[originalHeader];
              });
              return newRow;
            });
            
            const processedResults = {
              ...results,
              meta: { ...results.meta, fields: processedHeaders },
              data: newData
            };
            onFileUpload(processedResults);
            resolve(processedResults);
          } else {
            onFileUpload(results);
            resolve(results);
          }
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
          const result = e.target?.result;
          if (!result || typeof result === 'string') {
            reject(new Error('檔案讀取失敗'));
            return;
          }
          
          const data = new Uint8Array(result as ArrayBuffer);
          const workbook = window.XLSX.read(data, { 
            type: 'array', 
            cellDates: autoConvertDates 
          });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (rawData.length < 1) {
            reject(new Error('Excel 檔案的工作表是空的'));
            return;
          }

          const originalHeaders = rawData[0];
          const processedHeaders = processHeaders(originalHeaders);
          const dataRows = rawData.slice(1);
          
          const jsonData = dataRows.map(rowArray => {
            const rowObject = {};
            processedHeaders.forEach((header, index) => {
              rowObject[header] = rowArray[index] !== undefined ? rowArray[index] : '';
            });
            return rowObject;
          });

          const results = { meta: { fields: processedHeaders }, data: jsonData };
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
    <div className="w-full max-w-md">
      {fileName ? (
        // 已上傳文件的簡潔顯示
        <div className={`flex items-center justify-between p-3 rounded-lg ${
          colorTheme === 'red' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center space-x-2 min-w-0">
            <FileText className={`w-4 h-4 flex-shrink-0 ${
              colorTheme === 'red' ? 'text-red-600' : 'text-blue-600'
            }`} />
            <span className={`text-sm font-medium truncate ${
              colorTheme === 'red' ? 'text-red-900' : 'text-blue-900'
            }`}>{fileName}</span>
          </div>
          <button
            onClick={clearFile}
            className={`p-1 rounded-full flex-shrink-0 ${
              colorTheme === 'red' 
                ? 'text-red-600 hover:text-red-800 hover:bg-red-100' 
                : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // 上傳區域的簡潔設計
        <div
          className={`relative flex items-center justify-center h-12 border border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
            dragActive 
              ? colorTheme === 'red' 
                ? 'border-red-400 bg-red-50' 
                : 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
        >
          {isProcessing ? (
            <div className="flex items-center space-x-2">
              <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                colorTheme === 'red' ? 'border-red-500' : 'border-blue-500'
              }`}></div>
              <span className="text-sm text-gray-600">處理檔案中...</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                <span className="font-medium">點擊上傳</span> 或拖曳檔案至此
              </span>
              <span className="text-xs text-gray-400 ml-2">CSV, XLS, XLSX</span>
            </div>
          )}
          
          <input
            id="file-input"
            type="file"
            className="hidden"
            accept=".csv,.xls,.xlsx"
            onChange={handleChange}
            disabled={isProcessing}
          />
        </div>
      )}
    </div>
  );
};

export default FileUpload;
