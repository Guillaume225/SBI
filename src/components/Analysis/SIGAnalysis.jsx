/**
 * Composant d'analyse SIG (Soldes Intermédiaires de Gestion)
 */

export default function SIGAnalysis({ data = null, loading = false }) {
  const sigItems = [
    { label: 'Chiffre d\'affaires net', key: 'revenue', level: 0 },
    { label: 'Production stockée', key: 'stored_production', level: 1 },
    { label: 'Production immobilisée', key: 'capitalized_production', level: 1 },
    { label: 'Production de l\'exercice', key: 'total_production', level: 0, bold: true },
    { label: 'Achats consommés', key: 'consumed_purchases', level: 1 },
    { label: 'Marge commerciale', key: 'commercial_margin', level: 0, bold: true },
    { label: 'Valeur ajoutée', key: 'value_added', level: 0, bold: true, highlight: true },
    { label: 'Charges de personnel', key: 'staff_costs', level: 1 },
    { label: 'Impôts et taxes', key: 'taxes', level: 1 },
    { label: 'Excédent brut d\'exploitation (EBE)', key: 'ebitda', level: 0, bold: true, highlight: true },
    { label: 'Dotations aux amortissements', key: 'depreciation', level: 1 },
    { label: 'Résultat d\'exploitation', key: 'operating_result', level: 0, bold: true, highlight: true },
    { label: 'Résultat financier', key: 'financial_result', level: 1 },
    { label: 'Résultat courant avant impôts', key: 'current_result', level: 0, bold: true },
    { label: 'Résultat exceptionnel', key: 'exceptional_result', level: 1 },
    { label: 'Impôt sur les bénéfices', key: 'income_tax', level: 1 },
    { label: 'Résultat net', key: 'net_result', level: 0, bold: true, highlight: true },
  ];

  const formatNumber = (val) => {
    if (val == null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white">
        <h5 className="mb-0 fw-semibold">Soldes Intermédiaires de Gestion (SIG)</h5>
      </div>
      <div className="card-body p-0">
        <table className="table table-sbi mb-0">
          <thead>
            <tr>
              <th>Libellé</th>
              <th className="text-end">Montant (€)</th>
              <th className="text-end">% CA</th>
            </tr>
          </thead>
          <tbody>
            {sigItems.map((item, i) => (
              <tr
                key={i}
                className={item.highlight ? 'table-primary' : ''}
                style={{ paddingLeft: item.level * 20 }}
              >
                <td
                  className={item.bold ? 'fw-bold' : ''}
                  style={{ paddingLeft: `${1 + item.level * 1.5}rem` }}
                >
                  {item.label}
                </td>
                <td className={`text-end ${item.bold ? 'fw-bold' : ''}`}>
                  {data ? formatNumber(data[item.key]) : '-'}
                </td>
                <td className="text-end text-muted">
                  {data && data.revenue && data[item.key]
                    ? `${((data[item.key] / data.revenue) * 100).toFixed(1)}%`
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
