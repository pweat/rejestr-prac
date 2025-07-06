import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function generateOfferPdf(offerData) {
  // 1. Inicjalizacja dokumentu PDF
  const doc = new jsPDF();
  doc.setFont('helvetica', 'normal');

  // 2. Nagłówek i dane firmy
  const companyName = 'Twoja Nazwa Firmy';
  const companyAddress = 'Twój Adres, 12-345 Miasto';
  const companyNip = 'NIP: 123-456-78-90';
  const companyPhone = 'tel: +48 123 456 789';

  doc.setFontSize(10);
  doc.text(companyName, 14, 20);
  doc.text(companyAddress, 14, 25);
  doc.text(companyNip, 14, 30);
  doc.text(companyPhone, 14, 35);

  doc.setFillColor(230, 230, 230);
  doc.rect(14, 40, 40, 20, 'F');
  doc.setTextColor(150, 150, 150);
  doc.text('LOGO', 26, 52);
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Oferta nr: ${offerData.offer_number}`, 205, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`z dnia: ${offerData.issue_date}`, 205, 27, { align: 'right' });
  doc.text('Przygotowana przez: Dawid Nikolajski', 205, 34, { align: 'right' });

  // 3. Dane klienta
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Nabywca:', 120, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(offerData.client_name || '', 120, 57);
  doc.text(offerData.client_address || '', 120, 62);
  doc.text(offerData.client_phone || '', 120, 67);
  doc.text(offerData.client_email || '', 120, 72);

  // 4. Przygotowanie danych do tabeli
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
      `${item.net_price.toFixed(2)} zł`,
      `${offerData.vat_rate}%`,
      `${netValue.toFixed(2)} zł`,
      `${grossValue.toFixed(2)} zł`,
    ];
    tableRows.push(offerRow);
  });

  // 5. Rysowanie tabeli, podsumowania i notatek
  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 85,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9 },
    headStyles: { fillColor: [22, 160, 133], textColor: [255, 255, 255] },
    didDrawPage: (data) => {
      // --- Podsumowanie ---
      let finalY = data.cursor.y + 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Do zapłaty:', 14, finalY);
      doc.text(`${totalGross.toFixed(2)} zł`, 205, finalY, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`W tym VAT (${offerData.vat_rate}%):`, 14, finalY + 5);
      doc.text(`${(totalGross - totalNet).toFixed(2)} zł`, 205, finalY + 5, { align: 'right' });

      doc.text(`Wartość netto:`, 14, finalY + 10);
      doc.text(`${totalNet.toFixed(2)} zł`, 205, finalY + 10, { align: 'right' });

      // --- Notatki ---
      if (offerData.notes) {
        finalY += 25; // Zwiększamy odstęp
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Uwagi:', 14, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const splitNotes = doc.splitTextToSize(offerData.notes, 180);
        doc.text(splitNotes, 14, finalY + 5);
      }
    },
  });

  // 6. Zapisanie pliku PDF
  const fileName = `oferta-${offerData.offer_number.replace(/\//g, '_')}.pdf`;
  doc.save(fileName);
}
