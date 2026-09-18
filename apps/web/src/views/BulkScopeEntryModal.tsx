import React, { useState, useRef } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Modal, Textarea } from '../components/DesignSystem.js';
import {
  formatQuantityAndUnit,
  inferPhysicalUnitAndQuantity,
  normalizeEngineeringUnit,
} from '@e3-eos/domain';

interface BulkScopeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: (createdCount: number) => void;
  onSaved?: () => void;
}

export const BulkScopeEntryModal: React.FC<BulkScopeEntryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  onSaved,
}) => {
  const { apiClient, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [rawText, setRawText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    validCount: number;
    errorCount: number;
    errors: any[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'preview'>('paste');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const normalizeDate = (val?: string): string | undefined => {
    if (!val || !val.trim()) return undefined;
    const s = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    const parsed = Date.parse(s);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().slice(0, 10);
    }
    return undefined;
  };

  const parseCsvLines = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { rows: [], validation: { isValid: false, validCount: 0, errorCount: 0, errors: [] } };

    // Detect delimiter: tab or comma or semicolon
    const firstLine = lines[0];
    let separator = ',';
    if (firstLine.includes('\t')) separator = '\t';
    else if (firstLine.includes(';') && !firstLine.includes(',')) separator = ';';

    // CSV tokenizer handling quotes
    const tokenizeLine = (line: string): string[] => {
      const tokens: string[] = [];
      let current = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === separator && !insideQuotes) {
          tokens.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      tokens.push(current.trim());
      return tokens.map((t) => t.replace(/^["']|["']$/g, '').trim());
    };

    const headers = tokenizeLine(firstLine).map((h) => h.toLowerCase());
    const hasHeader = headers.some(
      (h) => h.includes('title') || h.includes('scope') || h.includes('requirement') || h.includes('item')
    );

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const rows: any[] = [];

    dataLines.forEach((line, idx) => {
      const parts = tokenizeLine(line);
      if (parts.length === 0 || parts.every((p) => p.length === 0)) return;

      if (hasHeader) {
        const rowObj: any = { index: idx + 1 };
        headers.forEach((h, hIdx) => {
          const val = parts[hIdx] || '';
          if (h.includes('title') || h.includes('requirement') || (h.includes('item') && !h.includes('code'))) rowObj.title = val;
          else if (h.includes('desc')) rowObj.description = val;
          else if (h.includes('pack')) rowObj.scopePackage = val;
          else if (h.includes('cat')) rowObj.category = val;
          else if (h.includes('disc')) rowObj.discipline = val;
          else if (h.includes('owner') || h.includes('lead')) rowObj.ownerName = val;
          else if (h.includes('date') || h.includes('due')) rowObj.dueDate = val;
          else if (h.includes('qty') || h.includes('quant')) rowObj.quantity = val ? Number(val) : undefined;
          else if (h.includes('unit')) rowObj.unit = val;
          else if (h.includes('cost') || h.includes('budget') || h.includes('price'))
            rowObj.targetCostQar = val && !isNaN(Number(val)) ? Number(val) : undefined;
          else if (h.includes('ref')) rowObj.sourceReference = val;
          else if (h.includes('crit')) rowObj.acceptanceCriteria = val;
        });
        if (!rowObj.title && parts[0]) rowObj.title = parts[0];
        rows.push(rowObj);
      } else {
        rows.push({
          index: idx + 1,
          title: parts[0] || '',
          category: parts[1] || 'staging_technical',
          ownerName: parts[2] || '',
          dueDate: parts[3] || '',
          quantity: parts[4] ? Number(parts[4]) : undefined,
          unit: parts[5] || '',
          description: parts[6] || '',
        });
      }
    });

    const errors: any[] = [];
    rows.forEach((r) => {
      // Normalize and infer physical engineering unit and quantity
      const inferred = inferPhysicalUnitAndQuantity(r.title, r.description, r.quantity, r.unit);
      r.quantity = r.quantity !== undefined ? r.quantity : inferred.quantity;
      r.unit = (r.unit && !['units', 'unit'].includes(r.unit.trim().toLowerCase()))
        ? normalizeEngineeringUnit(r.unit)
        : inferred.unit;

      const rowErrors: string[] = [];
      if (!r.title || r.title.trim().length === 0) {
        rowErrors.push('Requirement Title is required');
      }
      if (r.dueDate) {
        const norm = normalizeDate(r.dueDate);
        if (!norm) {
          rowErrors.push(`Invalid due date format: "${r.dueDate}". Use YYYY-MM-DD.`);
        } else {
          r.dueDate = norm;
        }
      }
      if (rowErrors.length > 0) {
        errors.push({ index: r.index, title: r.title, errors: rowErrors });
      }
    });

    const validation = {
      isValid: errors.length === 0,
      validCount: rows.length - errors.length,
      errorCount: errors.length,
      errors,
    };

    return { rows, validation };
  };

  const handleProcessText = (text: string, sourceFileName?: string) => {
    const { rows, validation } = parseCsvLines(text);
    setParsedRows(rows);
    setValidationResult(validation);
    if (rows.length > 0) {
      setActiveTab('preview');
    }
  };

  const handleFile = (file: File) => {
    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setFileName(file.name);
    setFileSize(sizeStr);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setRawText(content);
      handleProcessText(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };

  const handleClearFile = () => {
    setFileName(null);
    setFileSize(null);
    setRawText('');
    setParsedRows([]);
    setValidationResult(null);
    setActiveTab('paste');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteRow = (indexToDelete: number) => {
    const updated = parsedRows.filter((_, idx) => idx !== indexToDelete);
    const reIndexed = updated.map((r, i) => ({ ...r, index: i + 1 }));
    setParsedRows(reIndexed);

    const errors: any[] = [];
    reIndexed.forEach((r) => {
      const rowErrors: string[] = [];
      if (!r.title || r.title.trim().length === 0) {
        rowErrors.push('Requirement Title is required');
      }
      if (r.dueDate && !normalizeDate(r.dueDate)) {
        rowErrors.push(`Invalid due date format: "${r.dueDate}".`);
      }
      if (rowErrors.length > 0) {
        errors.push({ index: r.index, title: r.title, errors: rowErrors });
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      validCount: reIndexed.length - errors.length,
      errorCount: errors.length,
      errors,
    });
  };

  const handleUpdateRowField = (indexToUpdate: number, field: string, value: any) => {
    const updated = parsedRows.map((r, idx) => {
      if (idx === indexToUpdate) {
        return { ...r, [field]: value };
      }
      return r;
    });
    setParsedRows(updated);

    const errors: any[] = [];
    updated.forEach((r) => {
      const rowErrors: string[] = [];
      if (!r.title || r.title.trim().length === 0) {
        rowErrors.push('Requirement Title is required');
      }
      if (r.dueDate && !normalizeDate(r.dueDate)) {
        rowErrors.push(`Invalid due date format: "${r.dueDate}".`);
      }
      if (rowErrors.length > 0) {
        errors.push({ index: r.index, title: r.title, errors: rowErrors });
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      validCount: updated.length - errors.length,
      errorCount: errors.length,
      errors,
    });
  };

  const handleSaveRows = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
      const validRowsToSave = parsedRows.filter(
        (r) => r.title && r.title.trim().length > 0
      );

      const res = await apiClient.bulkCreateRequirements(projectId, {
        items: validRowsToSave,
        saveIncompleteAsDraft: true,
      });

      const count = res.data?.payload?.count || validRowsToSave.length;
      alert(`Successfully created ${count} scope requirements in project register.`);
      if (onSuccess) onSuccess(count);
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to save bulk scope requirements');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadCsvTemplate = () => {
    const csvContent =
      'Requirement Title,Scope Package,Category,Discipline,Owner Name,Due Date,Quantity,Unit,Acceptance Criteria,Notes\n' +
      '"360-Degree LED Arch Construction","PKG-01 Arch","creative_visual","staging","Karim Haddad","2026-11-15",1,"set","Dynamic rotation with dual safety steels","Primary stage focal point"\n' +
      '"Perimeter Cable Trenching & Protection","PKG-04 Civil","staging_technical","logistics","Faisal Al-Kuwari","2026-11-01",450,"LM","Heavy load vehicular rubber cable trenching","Across Boulevard service lanes"';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'EOS_Scope_Bulk_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CSV & Spreadsheet Bulk Scope Entry">
      <div className="space-y-4 text-slate-100 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'paste'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Upload CSV or Paste Spreadsheet
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              disabled={parsedRows.length === 0}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'preview'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 disabled:opacity-40'
              }`}
            >
              2. Grid Preview & Row Validation ({parsedRows.length})
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadCsvTemplate}
            className="text-xs text-slate-400 hover:text-amber-400"
          >
            📥 Download CSV Template
          </Button>
        </div>

        {activeTab === 'paste' && (
          <div className="space-y-4">
            {/* File Upload Drag & Drop Area */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.tsv,.txt,.tab"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-900/40 hover:bg-slate-900/70'
              }`}
            >
              <span className="text-3xl mb-2">📂</span>
              <div className="font-semibold text-sm text-slate-200">
                {isDragging ? 'Drop your CSV file here' : 'Click to Browse or Drag & Drop CSV File'}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Supports standard comma-separated (.csv), tab-separated (.tsv / .txt), and spreadsheet exports.
              </p>
            </div>

            {/* Loaded File Indicator */}
            {fileName && (
              <div className="flex items-center justify-between bg-slate-900 border border-slate-700 px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">✓</span>
                  <span className="font-semibold text-slate-200">{fileName}</span>
                  <span className="text-slate-400">({fileSize})</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearFile();
                  }}
                  className="text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-1"
                >
                  ✕ Clear File
                </button>
              </div>
            )}

            {/* Or Paste Raw Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Or Paste Raw Spreadsheet Rows (Excel / Google Sheets):
                </label>
                {rawText && (
                  <button
                    onClick={() => setRawText('')}
                    className="text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    Clear Text
                  </button>
                )}
              </div>
              <Textarea
                value={rawText}
                onChange={(e: any) => setRawText(e.target.value)}
                placeholder="Paste spreadsheet rows here...&#10;Example:&#10;360-Degree LED Arch	creative_visual	Karim Haddad	2026-11-15	1	set&#10;Perimeter Heavy Cable Trenching	staging_technical	Faisal Al-Kuwari	2026-11-01	450	LM"
                rows={7}
                className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Progressive Invariant: Only Title is mandatory. Missing attributes are saved as null drafts.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleProcessText(rawText)}
                disabled={!rawText.trim()}
                className="bg-amber-500 text-slate-950 font-semibold text-xs"
              >
                Parse & Validate Grid →
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-4">
            {/* Validation Banner */}
            {validationResult && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  validationResult.isValid
                    ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{validationResult.isValid ? '✓' : '⚠️'}</span>
                  <span>
                    <strong>{validationResult.validCount} Valid Rows</strong> ready for import.
                    {validationResult.errorCount > 0 && (
                      <span className="text-rose-400 font-semibold ms-1">
                        ({validationResult.errorCount} rows have validation issues)
                      </span>
                    )}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Partial Save Enabled: Valid rows can be imported immediately.
                </span>
              </div>
            )}

            {/* Grid Table with Inline Editing & Row Deletion */}
            <div className="max-h-80 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/60 text-xs">
              <table className="w-full text-start">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5 text-start font-medium w-8">#</th>
                    <th className="p-2.5 text-start font-medium min-w-[200px]">Requirement Title *</th>
                    <th className="p-2.5 text-start font-medium">Category</th>
                    <th className="p-2.5 text-start font-medium">Owner</th>
                    <th className="p-2.5 text-start font-medium">Due Date</th>
                    <th className="p-2.5 text-start font-medium">Qty / Unit</th>
                    <th className="p-2.5 text-start font-medium text-center">Status</th>
                    <th className="p-2.5 text-center font-medium w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedRows.map((row, idx) => {
                    const rowError = validationResult?.errors.find((e) => e.index === row.index);
                    return (
                      <tr key={idx} className={rowError ? 'bg-rose-950/20' : 'hover:bg-slate-800/30'}>
                        <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.title || ''}
                            onChange={(e) => handleUpdateRowField(idx, 'title', e.target.value)}
                            placeholder="Enter title..."
                            className="bg-slate-800/80 border border-slate-700 text-slate-100 px-2 py-1 rounded w-full text-xs font-semibold focus:border-amber-400 focus:outline-none"
                          />
                          {rowError && (
                            <div className="text-[10px] text-rose-400 font-normal mt-0.5">
                              {rowError.errors.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-400 capitalize">
                          <select
                            value={row.category || 'staging_technical'}
                            onChange={(e) => handleUpdateRowField(idx, 'category', e.target.value)}
                            className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-1 rounded text-xs"
                          >
                            <option value="staging_technical">Staging</option>
                            <option value="creative_visual">Creative</option>
                            <option value="health_safety">HSE</option>
                            <option value="protocol_ceremony">Protocol</option>
                            <option value="crowd_security">Security</option>
                          </select>
                        </td>
                        <td className="p-2.5 text-slate-300">
                          <input
                            type="text"
                            value={row.ownerName || ''}
                            onChange={(e) => handleUpdateRowField(idx, 'ownerName', e.target.value)}
                            placeholder="Assign lead..."
                            className="bg-slate-800/80 border border-slate-700 text-slate-300 px-2 py-1 rounded text-xs w-28 focus:border-amber-400 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-slate-300 font-mono">
                          <input
                            type="text"
                            value={row.dueDate || ''}
                            onChange={(e) => handleUpdateRowField(idx, 'dueDate', e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="bg-slate-800/80 border border-slate-700 text-slate-300 px-2 py-1 rounded text-xs w-28 focus:border-amber-400 focus:outline-none"
                          />
                        </td>
                        <td className="p-2.5 text-slate-300">
                          {formatQuantityAndUnit(row.quantity, row.unit, row.title, row.description)}
                        </td>
                        <td className="p-2.5 text-center">
                          {rowError ? (
                            <Badge variant="danger" size="sm">
                              Invalid
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              Valid Draft
                            </Badge>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            title="Delete this row"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-400 transition"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveTab('paste')}>
                ← Back to Upload & Edit
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveRows}
                  disabled={isProcessing || !validationResult || validationResult.validCount === 0}
                  className="bg-amber-500 text-slate-950 font-semibold text-xs"
                >
                  {isProcessing
                    ? 'Importing...'
                    : `Import ${validationResult?.validCount || 0} Scope Requirements`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
