import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCompany } from '../../contexts/CompanyContext';
import ReportTable from '../../components/Reports/ReportTable';
import SIGAnalysis from '../../components/Analysis/SIGAnalysis';
import reportsService from '../../services/reportsService';
import { FaArrowLeft } from 'react-icons/fa';

const reportTitles = {
  trial_balance: 'Balance Générale',
  balance_sheet: 'Bilan Comptable',
  income_statement: 'Compte de Résultat',
  sig: 'Soldes Intermédiaires de Gestion',
  general_ledger: 'Grand Livre',
  subsidiary_balance: 'Balance Auxiliaire',
  analytical_balance: 'Balance Analytique',
};

const reportColumns = {
  trial_balance: [
    { key: 'account_number', label: 'N° Compte' },
    { key: 'account_label', label: 'Libellé' },
    { key: 'opening_debit', label: 'Débit ouv.', className: 'text-end' },
    { key: 'opening_credit', label: 'Crédit ouv.', className: 'text-end' },
    { key: 'period_debit', label: 'Débit période', className: 'text-end' },
    { key: 'period_credit', label: 'Crédit période', className: 'text-end' },
    { key: 'cumulative_debit', label: 'Cumul débit', className: 'text-end' },
    { key: 'cumulative_credit', label: 'Cumul crédit', className: 'text-end' },
    { key: 'balance', label: 'Solde', className: 'text-end fw-bold' },
  ],
  general_ledger: [
    { key: 'entry_date', label: 'Date' },
    { key: 'journal_code', label: 'Journal' },
    { key: 'account_number', label: 'Compte' },
    { key: 'label', label: 'Libellé' },
    { key: 'debit', label: 'Débit', className: 'text-end' },
    { key: 'credit', label: 'Crédit', className: 'text-end' },
    { key: 'balance', label: 'Solde', className: 'text-end fw-bold' },
  ],
  subsidiary_balance: [
    { key: 'auxiliary_number', label: 'N° Auxiliaire' },
    { key: 'account_label', label: 'Nom' },
    { key: 'debit', label: 'Débit', className: 'text-end' },
    { key: 'credit', label: 'Crédit', className: 'text-end' },
    { key: 'balance', label: 'Solde', className: 'text-end fw-bold' },
  ],
};

export default function ReportDetailPage({ reportId: propReportId, embedded = false }) {
  const routeParams = useParams();
  const reportId = propReportId || routeParams?.reportId;
  const { selectedCompany, fiscalYear } = useCompany();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const response = await reportsService.getReport(reportId, {
          company_id: selectedCompany?.id,
          fiscal_year: fiscalYear,
        });
        setReportData(response.data);
      } catch (err) {
        console.error('Erreur chargement reporting:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [reportId, selectedCompany, fiscalYear]);

  // Rendu spécial pour le SIG
  if (reportId === 'sig') {
    return (
      <div>
        {!embedded && (
          <Link to="/reports" className="btn btn-link text-decoration-none mb-3 p-0">
            <FaArrowLeft className="me-1" /> Retour aux reportings
          </Link>
        )}
        <SIGAnalysis data={reportData} loading={loading} />
      </div>
    );
  }

  const columns = reportColumns[reportId] || reportColumns.trial_balance;

  return (
    <div>
      {!embedded && (
        <Link to="/reports" className="btn btn-link text-decoration-none mb-3 p-0">
          <FaArrowLeft className="me-1" /> Retour aux reportings
        </Link>
      )}
      <ReportTable
        title={reportTitles[reportId] || reportId}
        columns={columns}
        rows={reportData?.rows || []}
        totals={reportData?.totals}
        loading={loading}
      />
    </div>
  );
}
