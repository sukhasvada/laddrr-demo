
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import type { AuditEvent, Feedback, OneOnOneHistoryItem } from '@/services/feedback-service';
import type { PoshComplaint, PoshAuditEvent } from '@/services/posh-service';
import type { Role } from '@/hooks/use-role';
import { roleUserMapping } from './role-mapping';
import { addAdminLogEntry } from '@/services/admin-service';


// Extend jsPDF with autoTable plugin
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: any) => jsPDFWithAutoTable;
}

interface CaseDetails {
    title: string;
    trackingId: string;
    initialMessage: string;
    aiSummary?: string;
    finalResolution?: string;
    trail: AuditEvent[];
    isCaseClosed?: boolean;
}

const addWrappedText = (doc: jsPDF, text: string, x: number, y: number, maxWidth: number) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + (lines.length * 5); // Approximate line height
};

export const downloadAuditTrailPDF = (caseDetails: CaseDetails) => {
  try {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 20;

    const displayTrackingId = caseDetails.isCaseClosed === false ? 'ID Hidden Until Closure' : caseDetails.trackingId;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    yPos = addWrappedText(doc, caseDetails.title, 14, yPos, 180);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tracking ID: ${displayTrackingId}`, 14, yPos + 2);
    doc.text(`Report Generated: ${format(new Date(), 'PPP p')}`, 14, yPos + 7);
    yPos += 15;

    // --- Initial Submission ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Initial Submission', 14, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(doc, caseDetails.initialMessage, 14, yPos, 180);
    yPos += 5;
    
    // --- AI Summary ---
    if (caseDetails.aiSummary) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('AI Analysis Summary', 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPos = addWrappedText(doc, caseDetails.aiSummary, 14, yPos, 180);
        yPos += 5;
    }

    // --- Audit Trail Table ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Case History', 14, yPos);
    yPos += 2;

    const tableColumn = ["Timestamp", "Event", "Actor", "Details"];
    const tableRows: (string | undefined)[][] = [];

    caseDetails.trail.forEach(event => {
      const eventData = [
        format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        event.event,
        String(event.actor), // Actor can be Role or string
        event.details || 'N/A'
      ];
      tableRows.push(eventData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [26, 94, 78], textColor: 255 }, // #1A5E4E
      columnStyles: {
          0: { cellWidth: 35 }, // Timestamp
          1: { cellWidth: 35 }, // Event
          2: { cellWidth: 25 }, // Actor
          3: { cellWidth: 'auto' }, // Details
      },
      didDrawPage: function (data) {
        // Footer
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // --- Final Resolution ---
    if (caseDetails.finalResolution) {
        if (yPos > 250) doc.addPage(); // Add a new page if there's not enough space
        yPos = yPos > 250 ? 20 : yPos;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Final Resolution', 14, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        addWrappedText(doc, caseDetails.finalResolution, 14, yPos, 180);
    }


    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    doc.save(`Audit_Trail_${caseDetails.trackingId}_${timestamp}.pdf`);
  } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("There was an error generating the PDF. Please check the console for details.");
  }
};

export const downloadPoshCasePDF = (caseDetails: PoshComplaint, downloadedBy: Role) => {
  try {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    let yPos = 15;
    const margin = 14;
    const maxWidth = 180;
    
    const downloaderName = roleUserMapping[downloadedBy]?.name || downloadedBy;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('POSH Complaint Report', margin, yPos);
    yPos += 8;

    // Sub-header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Case ID: ${caseDetails.caseId}`, margin, yPos);
    doc.text(`Status: ${caseDetails.caseStatus}`, margin + 80, yPos);
    yPos += 5;
    doc.text(`Filed On: ${format(new Date(caseDetails.createdAt), 'PPP p')}`, margin, yPos);
    doc.text(`Downloaded By: ${downloaderName} on ${format(new Date(), 'PPP p')}`, margin + 80, yPos);
    yPos += 10;

    doc.setDrawColor(200);
    doc.line(margin, yPos, 200, yPos);
    yPos += 8;

    // Case Details Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Case Details', margin, yPos);
    yPos += 6;

    const caseData = [
        ['Title', caseDetails.title],
        ['Date of Incident', format(new Date(caseDetails.dateOfIncident), 'PPP')],
        ['Location', caseDetails.location],
        ['Complainant', `${caseDetails.complainantInfo.name} (${caseDetails.complainantInfo.department})`],
        ['Respondent', `${caseDetails.respondentInfo.name} (${caseDetails.respondentInfo.details || 'N/A'})`],
    ];

    doc.autoTable({
        body: caseData,
        startY: yPos,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
    
    // Narrative
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Incident Narrative', margin, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = addWrappedText(doc, caseDetails.incidentDetails, margin, yPos, maxWidth);
    yPos += 5;

    // Witnesses
    if (caseDetails.witnesses) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Witnesses:', margin, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      yPos = addWrappedText(doc, caseDetails.witnesses, margin, yPos, maxWidth);
      yPos += 5;
    }

    // Audit Trail
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Case Audit Trail', margin, yPos);
    yPos += 6;

    const tableColumn = ["Timestamp", "Event", "Actor", "Details"];
    const tableRows = caseDetails.auditTrail.map(event => [
      format(new Date(event.timestamp), 'yyyy-MM-dd HH:mm'),
      event.event,
      String(event.actor),
      event.details || 'N/A'
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: yPos,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [78, 26, 94], textColor: 255 }, // Dark Purple
      columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 40 },
          2: { cellWidth: 25 },
          3: { cellWidth: 'auto' },
      },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.text(`Page ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    // Log the download action
    addAdminLogEntry(downloadedBy, 'Downloaded POSH Case PDF', caseDetails.caseId);

    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    doc.save(`POSH_Report_${caseDetails.caseId}_${timestamp}.pdf`);
  } catch (error) {
    console.error("Failed to generate POSH case PDF:", error);
    alert("There was an error generating the PDF. Please check the console for details.");
  }
};
