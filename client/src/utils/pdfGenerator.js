import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateOfferPdf(offerData) {
  const doc = new jsPDF();

  // Używamy tylko standardowych, bezpiecznych czcionek
  doc.setFont('helvetica', 'normal');

  // --- Nagłówek ---
  const companyName = 'Twoja Nazwa Firmy';
  const companyAddress = 'Twój Adres, 12-345 Miasto';
  const companyNip = 'NIP: 123-456-78-90';
  const companyPhone = 'tel: +48 123 456 789';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(companyName, 14, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(companyAddress, 14, 27);
  doc.text(companyNip, 14, 32);
  doc.text(companyPhone, 14, 37);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Oferta nr: ${offerData.offer_number}`, 200, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`z dnia: ${offerData.issue_date}`, 200, 27, { align: 'right' });
  doc.text('Przygotowana przez: Dawid Nikolajski', 200, 34, { align: 'right' });

  // --- Dane klienta ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Nabywca:', 14, 60);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(offerData.client_name || '', 14, 67);
  doc.text(offerData.client_address || '', 14, 72);
  doc.text(offerData.client_phone || '', 14, 77);
  doc.text(offerData.client_email || '', 14, 82);

  // --- Tabela z pozycjami ---
  const tableColumn = [
    'Lp.',
    'Nazwa towaru / usługi',
    'Ilość',
    'J.m.',
    'Cena netto',
    'VAT',
    'Wartość netto',
    'Wartość brutto',
  ];
  const tableRows = [];
  let totalNet = 0;
  let totalGross = 0;

  offerData.items.forEach((item, index) => {
    const netValue = item.quantity * item.net_price;
    const vatAmount = netValue * (offerData.vat_rate / 100);
    const grossValue = netValue + vatAmount;

    totalNet += netValue;
    totalGross += grossValue;

    const offerRow = [
      index + 1,
      item.name,
      item.quantity,
      item.unit,
      `${item.net_price.toFixed(2)} zl`, // usunięto 'ł'
      `${offerData.vat_rate}%`,
      `${netValue.toFixed(2)} zl`,
      `${grossValue.toFixed(2)} zl`,
    ];
    tableRows.push(offerRow);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 95,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    didDrawPage: (data) => {
      let finalY = data.cursor.y + 10;
      doc.setFontSize(10);
      doc.text(`Wartosc netto:`, 140, finalY, { align: 'right' });
      doc.text(`${totalNet.toFixed(2)} zl`, 200, finalY, { align: 'right' });
      doc.text(`Podatek VAT (${offerData.vat_rate}%):`, 140, finalY + 5, { align: 'right' });
      doc.text(`${(totalGross - totalNet).toFixed(2)} zl`, 200, finalY + 5, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.text(`Do zaplaty brutto:`, 140, finalY + 10, { align: 'right' });
      doc.text(`${totalGross.toFixed(2)} zl`, 200, finalY + 10, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      if (offerData.notes) {
        let notesY = doc.internal.pageSize.height - 40;
        if (finalY + 20 > notesY) {
          notesY = finalY + 20;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('Uwagi:', 14, notesY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(offerData.notes, 180);
        doc.text(splitNotes, 14, notesY + 5);
      }
    },
  });

  const fileName = `oferta-${offerData.offer_number.replace(/\//g, '_')}.pdf`;
  doc.save(fileName);
}
