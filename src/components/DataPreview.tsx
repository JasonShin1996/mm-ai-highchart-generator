
import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const DataPreview = ({ data }) => {
  const [tableData, setTableData] = useState({ headers: [], rows: [] });

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
    setTableData(prev => ({ ...prev, rows: newRows }));
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
    setTableData({ headers: newHeaders, rows: newRows });
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
                    value={row[header] || ''}
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
