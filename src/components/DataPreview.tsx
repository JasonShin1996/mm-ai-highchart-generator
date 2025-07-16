
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DataPreview = ({ data, onDataChange = null }) => {
  const [tableData, setTableData] = useState({ headers: [], rows: [] });

  // 格式化值的函數，特別處理Date對象和數字
  const formatValue = (value) => {
    if (value instanceof Date) {
      // 檢查是否為有效的日期
      if (isNaN(value.getTime())) {
        return '';
      }
      // 格式化為 YYYY-MM-DD 或 YYYY-MM-DD HH:MM:SS 格式
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const hours = value.getHours();
      const minutes = value.getMinutes();
      const seconds = value.getSeconds();
      
      // 如果時間為 00:00:00，只顯示日期
      if (hours === 0 && minutes === 0 && seconds === 0) {
        return `${year}-${month}-${day}`;
      } else {
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        return `${year}-${month}-${day} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
      }
    }
    
    // 處理數字格式
    if (typeof value === 'number' && !isNaN(value)) {
      // 如果是整數，直接返回
      if (Number.isInteger(value)) {
        return value.toString();
      }
      // 如果是小數，格式化為最多4位小數，並去除尾隨零
      const formatted = value.toFixed(4);
      return parseFloat(formatted).toString();
    }
    
    // 處理字符串形式的數字
    if (typeof value === 'string' && value.trim() !== '') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && isFinite(numValue)) {
        // 檢查原始字符串是否看起來像數字（避免處理日期字符串等）
        const trimmedValue = value.trim();
        if (/^-?\d*\.?\d+([eE][-+]?\d+)?$/.test(trimmedValue)) {
          if (Number.isInteger(numValue)) {
            return numValue.toString();
          }
          const formatted = numValue.toFixed(4);
          return parseFloat(formatted).toString();
        }
      }
    }
    
    return value;
  };

  useEffect(() => {
    if (!data || !data.data || !data.meta || !data.meta.fields) {
      setTableData({ headers: [], rows: [] });
      return;
    }

    const headers = data.meta.fields;
    const filteredData = data.data.filter(row =>
      headers.some(header => {
        const value = row[header];
        return value !== null && value !== undefined && String(value).trim() !== '';
      })
    );

    const headersToKeep = headers.filter((header, index) => {
      const hasHeader = String(header).trim() !== '';
      const hasData = filteredData.some(row => {
        const value = Object.values(row)[index];
        return value !== null && value !== undefined && String(value).trim() !== '';
      });
      return hasHeader || hasData;
    });

    setTableData({
      headers: headersToKeep,
      rows: filteredData.slice(0, 50) // 只顯示前50行
    });
  }, [data]);

  const handleCellEdit = (rowIndex, header, newValue) => {
    const newRows = [...tableData.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [header]: newValue };
    const newTableData = { ...tableData, rows: newRows };
    setTableData(newTableData);
    
    // 通知父組件數據變化
    if (onDataChange) {
      onDataChange({
        ...data,
        data: newRows,
        meta: { ...data.meta, fields: tableData.headers }
      });
    }
  };

  const handleHeaderEdit = (oldHeader, newHeader) => {
    const newHeaders = tableData.headers.map(h => h === oldHeader ? newHeader : h);
    const newRows = tableData.rows.map(row => {
      const newRow = { ...row };
      if (oldHeader !== newHeader) {
        newRow[newHeader] = newRow[oldHeader];
        delete newRow[oldHeader];
      }
      return newRow;
    });
    const newTableData = { headers: newHeaders, rows: newRows };
    setTableData(newTableData);
    
    // 通知父組件數據變化
    if (onDataChange) {
      onDataChange({
        ...data,
        data: newRows,
        meta: { ...data.meta, fields: newHeaders }
      });
    }
  };

  if (!tableData.headers.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        沒有可顯示的數據
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 bg-gray-100">
          <TableRow>
            {tableData.headers.map((header, index) => (
              <TableHead key={index} className="min-w-[120px]">
                <input
                  type="text"
                  value={header}
                  onChange={(e) => handleHeaderEdit(header, e.target.value)}
                  className="w-full bg-transparent border-none outline-none font-medium focus:bg-blue-50 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.rows.map((row, rowIndex) => (
            <TableRow key={rowIndex} className="hover:bg-gray-50">
              {tableData.headers.map((header, cellIndex) => (
                <TableCell key={cellIndex}>
                  <input
                    type="text"
                    value={formatValue(row[header]) || ''}
                    onChange={(e) => handleCellEdit(rowIndex, header, e.target.value)}
                    className="w-full bg-transparent border-none outline-none focus:bg-yellow-50 focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.data.length > 50 && (
        <div className="p-3 text-sm text-gray-500 text-center border-t">
          顯示前 50 行，共 {data.data.length} 行數據
        </div>
      )}
    </div>
  );
};

export default DataPreview;
