import React, { useState } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { Badge, Button, Modal, Textarea } from '../components/DesignSystem.js';

interface BulkScopeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess?: (createdCount: number) => void;
}

export const BulkScopeEntryModal: React.FC<BulkScopeEntryModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
}) => {
  const { apiClient, currentLanguage } = useEosContext();
  const isRtl = currentLanguage === 'ar';

  const [rawText, setRawText] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    validCount: number;
    errorCount: number;
    errors: any[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'paste' | 'preview'>('paste');

  if (!isOpen) return null;

  const handleParseText = () => {
    if (!rawText.trim()) return;

    const lines = rawText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return;

    // Detect delimiter: tab (Excel copy/paste) or comma
    const firstLine = lines[0];
    const isTab = firstLine.includes('\t');
    const separator = isTab ? '\t' : ',';

    // Check if first line is a header
    const headers = firstLine
      .split(separator)
      .map((h) => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const hasHeader =
      headers.some((h) => h.includes('title') || h.includes('scope') || h.includes('requirement'));

    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: any[] = [];

    dataLines.forEach((line, idx) => {
      const parts = line
        .split(separator)
        .map((p) => p.replace(/^["']|["']$/g, '').trim());

      if (parts.length === 0 || parts.every((p) => p.length === 0)) return;

      if (hasHeader) {
        const rowObj: any = { index: idx + 1 };
        headers.forEach((h, hIdx) => {
          const val = parts[hIdx] || '';
          if (h.includes('title') || h.includes('requirement')) rowObj.title = val;
          else if (h.includes('desc')) rowObj.description = val;
          else if (h.includes('pack')) rowObj.scopePackage = val;
          else if (h.includes('cat')) rowObj.category = val;
          else if (h.includes('disc')) rowObj.discipline = val;
          else if (h.includes('owner')) rowObj.ownerName = val;
          else if (h.includes('date') || h.includes('due')) rowObj.dueDate = val;
          else if (h.includes('qty') || h.includes('quant')) rowObj.quantity = val ? Number(val) : undefined;
          else if (h.includes('unit')) rowObj.unit = val;
          else if (h.includes('cost') || h.includes('budget')) rowObj.targetCostQar = val ? Number(val) : undefined;
          else if (h.includes('ref')) rowObj.sourceReference = val;
          else if (h.includes('crit')) rowObj.acceptanceCriteria = val;
        });
        if (!rowObj.title && parts[0]) rowObj.title = parts[0];
        rows.push(rowObj);
      } else {
        // Positional defaults: 0: title, 1: category, 2: owner, 3: dueDate, 4: qty, 5: unit
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

    setParsedRows(rows);

    // Validate rows
    const errors: any[] = [];
    rows.forEach((r) => {
      const rowErrors: string[] = [];
      if (!r.title || r.title.trim().length === 0) {
        rowErrors.push('Requirement Title is required');
      }
      if (r.dueDate && isNaN(Date.parse(r.dueDate))) {
        rowErrors.push(`Invalid due date format: "${r.dueDate}". Use YYYY-MM-DD.`);
      }
      if (rowErrors.length > 0) {
        errors.push({ index: r.index, title: r.title, errors: rowErrors });
      }
    });

    setValidationResult({
      isValid: errors.length === 0,
      validCount: rows.length - errors.length,
      errorCount: errors.length,
      errors,
    });

    setActiveTab('preview');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Excel & CSV Bulk Scope Entry">
      <div className="space-y-4 text-slate-100 max-w-3xl" dir={isRtl ? 'rtl' : 'ltr'}>
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
              1. Paste Excel / CSV
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
              2. Grid Preview & Validation ({parsedRows.length})
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
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              Copy columns directly from Microsoft Excel or Google Sheets and paste below. Tab-separated and
              comma-separated rows are automatically recognized.
            </p>
            <Textarea
              value={rawText}
              onChange={(e: any) => setRawText(e.target.value)}
              placeholder="Paste spreadsheet rows here...&#10;Example:&#10;360-Degree LED Arch	creative_visual	Karim Haddad	2026-11-15	1	set&#10;Perimeter Heavy Cable Trenching	staging_technical	Faisal Al-Kuwari	2026-11-01	450	LM"
              rows={10}
              className="bg-slate-900 border-slate-700 text-slate-100 font-mono text-xs"
            />
            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                Progressive Invariant: Only Title is mandatory. Missing attributes are saved as null drafts.
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleParseText}
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

            {/* Grid Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl bg-slate-900/60 text-xs">
              <table className="w-full text-start">
                <thead className="bg-slate-950/80 sticky top-0 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5 text-start font-medium">#</th>
                    <th className="p-2.5 text-start font-medium">Requirement Title *</th>
                    <th className="p-2.5 text-start font-medium">Category</th>
                    <th className="p-2.5 text-start font-medium">Owner</th>
                    <th className="p-2.5 text-start font-medium">Due Date</th>
                    <th className="p-2.5 text-start font-medium">Qty / Unit</th>
                    <th className="p-2.5 text-start font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {parsedRows.map((row, idx) => {
                    const rowError = validationResult?.errors.find((e) => e.index === row.index);
                    return (
                      <tr key={idx} className={rowError ? 'bg-rose-950/10' : 'hover:bg-slate-800/30'}>
                        <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-200">
                          {row.title || <span className="text-rose-400 italic">Missing Title</span>}
                          {rowError && (
                            <div className="text-[10px] text-rose-400 font-normal mt-0.5">
                              {rowError.errors.join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 text-slate-400 capitalize">{row.category || 'staging'}</td>
                        <td className="p-2.5 text-slate-300">{row.ownerName || '—'}</td>
                        <td className="p-2.5 text-slate-300 font-mono">{row.dueDate || '—'}</td>
                        <td className="p-2.5 text-slate-300">
                          {row.quantity ? `${row.quantity} ${row.unit || ''}` : '—'}
                        </td>
                        <td className="p-2.5">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveTab('paste')}>
                ← Back to Edit
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
